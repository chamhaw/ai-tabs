/**
 * Background脚本单元测试
 * 测试标签页分组、消息处理和AI分类功能
 */

const { setupFullChromeMock, createTabsMock, createWindowsMock, mockTabs } = require('./mocks/chrome-mocks.js');

// 模拟安全存储
global.secureStorage = {
  encryption: {
    encrypt: (data) => data ? btoa(data) : '',
    decrypt: (data) => data ? atob(data) : ''
  }
};

// 模拟i18n函数
global.getMessage = jest.fn((key, params) => {
  const messages = {
    'error_ai_settings_not_configured': '请先配置AI设置',
    'system_prompt_intro': '你是一个智能标签页分组助手。请根据标签页的URL和标题对它们进行智能分组。',
    'system_prompt_existing_groups': '当前已存在的分组有：$1',
    'system_prompt_forbidden_rules': '请不要创建过于宽泛或无意义的分组名称。',
    'default_grouping_strategy': '根据网站功能和内容类型进行分组',
    'system_prompt_strategy_prefix': '分组策略：',
    'system_prompt_format_instructions': '请以JSON格式返回结果，包含groups数组。',
    'error_no_valid_groups': '未找到有效的分组结果',
    'error_invalid_api_url': 'API URL无效'
  };
  
  let message = messages[key] || key;
  if (params && Array.isArray(params)) {
    params.forEach((param, index) => {
      message = message.replace(`$${index + 1}`, param);
    });
  }
  return Promise.resolve(message);
});

// 模拟background.js中的主要函数
class MockBackgroundScript {
  constructor() {
    this.ongoingGroupingRequests = new Set();
    this.lastAutoGroupTime = 0;
    this.AUTO_GROUP_RATE_LIMIT = 3000;
  }

  async getCurrentProviderConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['selectedProvider', 'providers'], (result) => {
        const selectedProvider = result.selectedProvider;
        const providers = result.providers || {};
        
        if (!selectedProvider || !providers[selectedProvider]) {
          resolve(null);
          return;
        }
        
        const providerConfig = providers[selectedProvider];
        let decryptedApiKey = '';
        
        if (providerConfig.apiKey) {
          try {
            decryptedApiKey = secureStorage.encryption.decrypt(providerConfig.apiKey);
            
            // Validate decrypted API key format (added in fix)
            if (decryptedApiKey && (
              decryptedApiKey.includes('\u0000') ||  // null characters
              decryptedApiKey.includes('\u001F') ||  // control characters
              decryptedApiKey.length < 10 ||         // too short
              decryptedApiKey.length > 200 ||        // too long
              /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(decryptedApiKey) // control characters
            )) {
              console.warn('Decrypted API key contains invalid characters, clearing...');
              decryptedApiKey = '';
              // Clear the corrupted key from storage
              const updatedProviders = { ...providers };
              delete updatedProviders[selectedProvider].apiKey;
              updatedProviders[selectedProvider].configured = false;
              chrome.storage.local.set({ providers: updatedProviders });
            }
          } catch (e) {
            console.warn('API密钥解密失败，请重新配置:', e);
            decryptedApiKey = '';
          }
        }

        const baseURLMap = {
          'openai': 'https://api.openai.com/v1',
          'deepseek': 'https://api.deepseek.com/v1',
          'anthropic': 'https://api.anthropic.com/v1'
        };

        resolve({
          selectedProvider: selectedProvider,
          apiKey: decryptedApiKey,
          baseURL: providerConfig.baseURL || baseURLMap[selectedProvider] || '',
          selectedModel: providerConfig.selectedModel || '',
          models: providerConfig.models || []
        });
      });
    });
  }

  async getSecureSettings(keys) {
    const providerConfig = await this.getCurrentProviderConfig();
    
    if (!providerConfig || !providerConfig.apiKey || !providerConfig.apiKey.trim()) {
      throw new Error(await getMessage('error_ai_settings_not_configured'));
    }
    
    // 获取全局设置（如minTabsInGroup, groupingStrategy）
    const globalSettings = await new Promise((resolve) => {
      chrome.storage.local.get(['minTabsInGroup', 'groupingStrategy'], (result) => {
        resolve(result);
      });
    });
    
    const result = {};
    
    keys.forEach(key => {
      switch (key) {
        case 'apiKey':
          result[key] = providerConfig.apiKey;
          break;
        case 'baseURL':
          result[key] = providerConfig.baseURL;
          break;
        case 'model':
        case 'selectedModel':
          result[key] = providerConfig.selectedModel;
          break;
        case 'selectedProvider':
        case 'currentProvider':
          result[key] = providerConfig.selectedProvider;
          break;
        case 'minTabsInGroup':
          result[key] = globalSettings.minTabsInGroup;
          break;
        case 'groupingStrategy':
          result[key] = globalSettings.groupingStrategy;
          break;
      }
    });
    
    return result;
  }

  buildApiUrl(baseURL) {
    if (!baseURL) return null;
    
    const cleanBaseURL = baseURL.replace(/\/$/, '');
    
    if (baseURL.includes('/chat/completions')) {
      return baseURL;
    }
    
    if (baseURL.includes('api.openai.com') || 
        baseURL.includes('api.deepseek.com')) {
      return cleanBaseURL + '/chat/completions';
    }
    
    if (baseURL.includes('api.anthropic.com')) {
      return cleanBaseURL + '/messages';
    }
    
    return cleanBaseURL + '/chat/completions';
  }

  async groupTabs(groups, windowId) {
    const allWindowTabs = await chrome.tabs.query({ windowId, windowType: 'normal' });
    const allWindowTabGroups = await chrome.tabGroups.query({ windowId });

    const urlToTabsMap = new Map();
    for (const tab of allWindowTabs) {
      if (!tab.url) continue;
      if (!urlToTabsMap.has(tab.url)) {
        urlToTabsMap.set(tab.url, []);
      }
      urlToTabsMap.get(tab.url).push(tab);
    }

    const groupIdToTitle = new Map(allWindowTabGroups.map(g => [g.id, g.title]));
    const tabsToMove = new Set();
    const groupPlan = new Map();

    for (const group of groups) {
      const groupName = group.name || 'AI Group';
      
      if (!groupPlan.has(groupName)) {
        groupPlan.set(groupName, []);
      }
      
      const tabIdsForThisGroup = groupPlan.get(groupName);
      
      for (const tabInfo of group.tabs) {
        if (!tabInfo.url) continue;
        
        const availableTabs = urlToTabsMap.get(tabInfo.url);
        
        if (availableTabs && availableTabs.length > 0) {
          for (const tab of availableTabs) {
            tabIdsForThisGroup.push(tab.id);
            const currentGroupName = groupIdToTitle.get(tab.groupId);
            
            if (currentGroupName !== groupName) {
              tabsToMove.add(tab.id);
            }
          }
          availableTabs.length = 0;
        }
      }
    }

    if (tabsToMove.size > 0) {
      await chrome.tabs.ungroup([...tabsToMove]);
    }
    
    for (const [groupName, tabIdsInPlan] of groupPlan.entries()) {
      const finalTabIds = tabIdsInPlan.filter(id => tabsToMove.has(id));

      if (finalTabIds.length === 0) continue;

      const newGroupId = await chrome.tabs.group({ tabIds: finalTabIds });
      await chrome.tabGroups.update(newGroupId, { title: groupName });
    }
  }

  async initiateAndGroupTabs(tabsToGroup, windowId) {
    const settings = await this.getSecureSettings([
      'apiKey', 'baseURL', 'model', 'groupingStrategy', 'minTabsInGroup', 
      'currentProvider', 'selectedProvider', 'selectedModel'
    ]);
    
    const baseURL = settings.baseURL;
    const model = settings.selectedModel || settings.model;
    
    if (!settings.apiKey || !baseURL || !model) {
      throw new Error(await getMessage('error_ai_settings_not_configured'));
    }
    
    // Check for corrupted API key (contains invalid characters) - added in fix
    const apiKeyTrimmed = settings.apiKey.trim();
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(apiKeyTrimmed)) {
      throw new Error('API密钥损坏，请重新配置。API key is corrupted, please reconfigure.');
    }

    if (!tabsToGroup) {
      tabsToGroup = await chrome.tabs.query({ windowId, windowType: 'normal' });
    }

    const tabs = tabsToGroup;
    if (tabs.length === 0) {
      return;
    }

    const tabGroups = await chrome.tabGroups.query({ windowId });
    const existingGroupTitles = tabGroups.map(g => g.title).filter(t => t);

    const systemPrompt = await getMessage('system_prompt_intro');
    const tabsData = tabs.map(t => ({ url: t.url, title: t.title }));
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(tabsData) }
    ];

    const apiUrl = this.buildApiUrl(settings.baseURL);
    
    if (!apiUrl) {
      throw new Error(await getMessage('error_invalid_api_url'));
    }

    const mockAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            groups: [
              {
                name: '开发工具',
                tabs: [
                  { url: 'https://github.com/user/repo', title: 'GitHub Repository' }
                ]
              },
              {
                name: '文档资料',
                tabs: [
                  { url: 'https://docs.google.com/document/123', title: 'Google Docs' }
                ]
              }
            ]
          })
        }
      }]
    };

    // 模拟API调用
    if (global.mockAIResponse) {
      const data = global.mockAIResponse;
      const aiResponse = data.choices?.[0]?.message?.content;
      const groupResult = aiResponse ? JSON.parse(aiResponse).groups : null;

      if (Array.isArray(groupResult)) {
        const minTabs = settings.minTabsInGroup || 1;
        const filteredGroups = groupResult.filter(group => group.tabs && group.tabs.length >= minTabs);
        
        await this.groupTabs(filteredGroups, windowId);
        return { success: true, groups: filteredGroups };
      } else {
        throw new Error(await getMessage('error_no_valid_groups'));
      }
    }

    // 如果没有mock响应，使用默认响应并应用同样的过滤逻辑
    const groupResult = mockAIResponse.choices[0].message.content;
    const parsedResult = JSON.parse(groupResult).groups;
    
    if (Array.isArray(parsedResult)) {
      const minTabs = settings.minTabsInGroup || 1;
      const filteredGroups = parsedResult.filter(group => group.tabs && group.tabs.length >= minTabs);
      
      await this.groupTabs(filteredGroups, windowId);
      return { success: true, groups: filteredGroups };
    } else {
      throw new Error(await getMessage('error_no_valid_groups'));
    }
  }
}

describe('Background Script', () => {
  let backgroundScript;

  beforeEach(() => {
    backgroundScript = new MockBackgroundScript();
    
    // 先设置基本的mock环境
    setupFullChromeMock();
    
    // 重置所有mock
    jest.clearAllMocks();
    
    // 重新创建完整的secureStorage，避免被mock污染
    global.secureStorage = {
      encryption: {
        encrypt: function(data) {
          if (!data) return '';
          
          let result = '';
          const key = this.getDeviceFingerprint();
          
          for (let i = 0; i < data.length; i++) {
            const textChar = data.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            result += String.fromCharCode(textChar ^ keyChar);
          }
          
          return btoa(result);
        },
        decrypt: function(encryptedData) {
          if (!encryptedData) return '';
          
          try {
            const encrypted = atob(encryptedData);
            let result = '';
            const key = this.getDeviceFingerprint();
            
            for (let i = 0; i < encrypted.length; i++) {
              const encryptedChar = encrypted.charCodeAt(i);
              const keyChar = key.charCodeAt(i % key.length);
              result += String.fromCharCode(encryptedChar ^ keyChar);
            }
            
            return result;
          } catch (e) {
            return '';
          }
        },
        getDeviceFingerprint: () => 'test-device-fingerprint-12345'
      }
    };

    // 设置存储数据，使用真正的加密
    const encryptedApiKey = global.secureStorage.encryption.encrypt('test-api-key');
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
        selectedProvider: 'openai',
        providers: {
          openai: {
            baseURL: 'https://api.openai.com/v1',
            apiKey: encryptedApiKey,
            selectedModel: 'gpt-3.5-turbo',
            models: [
              { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
              { id: 'gpt-4', name: 'GPT-4' }
            ]
          }
        },
        groupingStrategy: '根据网站功能进行分组',
        minTabsInGroup: 2
      });
    });

    // Mock chrome.tabGroups API
    chrome.tabGroups = {
      query: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue()
    };

    // 重置全局mock
    global.mockAIResponse = null;
  });

  describe('getCurrentProviderConfig', () => {
    test('应该返回正确解密的供应商配置', async () => {
      const config = await backgroundScript.getCurrentProviderConfig();
      
      expect(config).toBeDefined();
      expect(config.selectedProvider).toBe('openai');
      expect(config.apiKey).toBe('test-api-key');
      expect(config.baseURL).toBe('https://api.openai.com/v1');
      expect(config.selectedModel).toBe('gpt-3.5-turbo');
    });

    test('没有配置时应该返回null', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ selectedProvider: null, providers: {} });
      });

      const config = await backgroundScript.getCurrentProviderConfig();
      expect(config).toBeNull();
    });

    test('解密失败时应该返回空API密钥', async () => {
      global.secureStorage.encryption.decrypt = jest.fn().mockImplementation(() => {
        throw new Error('解密失败');
      });

      const config = await backgroundScript.getCurrentProviderConfig();
      
      expect(config.apiKey).toBe('');
      expect(console.warn).toHaveBeenCalledWith(
        'API密钥解密失败，请重新配置:', expect.any(Error)
      );
    });
  });

  describe('getSecureSettings', () => {
    test('应该返回请求的设置项', async () => {
      const settings = await backgroundScript.getSecureSettings([
        'apiKey', 'baseURL', 'selectedModel', 'selectedProvider'
      ]);

      expect(settings.apiKey).toBe('test-api-key');
      expect(settings.baseURL).toBe('https://api.openai.com/v1');
      expect(settings.selectedModel).toBe('gpt-3.5-turbo');
      expect(settings.selectedProvider).toBe('openai');
    });

    test('没有配置时应该抛出错误', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ selectedProvider: null, providers: {} });
      });

      await expect(
        backgroundScript.getSecureSettings(['apiKey'])
      ).rejects.toThrow('请先配置AI设置');
    });
  });

  describe('buildApiUrl', () => {
    test('应该为OpenAI构建正确的API URL', () => {
      const url = backgroundScript.buildApiUrl('https://api.openai.com/v1');
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    test('应该为Anthropic构建正确的API URL', () => {
      const url = backgroundScript.buildApiUrl('https://api.anthropic.com/v1');
      expect(url).toBe('https://api.anthropic.com/v1/messages');
    });

    test('应该处理尾随斜杠', () => {
      const url = backgroundScript.buildApiUrl('https://api.openai.com/v1/');
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    test('已经包含端点的URL应该直接返回', () => {
      const existingUrl = 'https://api.openai.com/v1/chat/completions';
      const url = backgroundScript.buildApiUrl(existingUrl);
      expect(url).toBe(existingUrl);
    });

    test('空URL应该返回null', () => {
      const url = backgroundScript.buildApiUrl('');
      expect(url).toBeNull();
    });
  });

  describe('groupTabs', () => {
    test('应该成功创建标签页分组', async () => {
      const mockGroups = [
        {
          name: '开发工具',
          tabs: [
            { url: 'https://github.com/user/repo', title: 'GitHub Repository' }
          ]
        }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.group.mockResolvedValue(123);
      chrome.tabs.ungroup.mockResolvedValue();

      await backgroundScript.groupTabs(mockGroups, 1);

      expect(chrome.tabs.ungroup).toHaveBeenCalled();
      expect(chrome.tabs.group).toHaveBeenCalledWith(
        expect.objectContaining({
          tabIds: expect.any(Array)
        })
      );
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(
        123,
        { title: '开发工具' }
      );
    });

    test('应该跳过没有匹配标签页的分组', async () => {
      const mockGroups = [
        {
          name: '不存在的分组',
          tabs: [
            { url: 'https://nonexistent.com', title: 'Non-existent' }
          ]
        }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);

      await backgroundScript.groupTabs(mockGroups, 1);

      expect(chrome.tabs.group).not.toHaveBeenCalled();
    });

    test('应该处理空分组数组', async () => {
      await backgroundScript.groupTabs([], 1);

      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(chrome.tabs.group).not.toHaveBeenCalled();
    });
  });

  describe('initiateAndGroupTabs', () => {
    test('应该成功执行完整的分组流程', async () => {
      global.mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              groups: [
                {
                  name: '开发工具',
                  tabs: [
                    { url: 'https://github.com/user/repo', title: 'GitHub Repository' },
                    { url: 'https://stackoverflow.com/questions/123', title: 'Stack Overflow Question' }
                  ]
                }
              ]
            })
          }
        }]
      };

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.group.mockResolvedValue(123);

      const result = await backgroundScript.initiateAndGroupTabs(null, 1);

      expect(result.success).toBe(true);
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe('开发工具');
    });

    test('没有AI设置时应该抛出错误', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ selectedProvider: null, providers: {} });
      });

      await expect(
        backgroundScript.initiateAndGroupTabs(null, 1)
      ).rejects.toThrow('请先配置AI设置');
    });

    test('空标签页列表应该直接返回', async () => {
      chrome.tabs.query.mockResolvedValue([]);

      const result = await backgroundScript.initiateAndGroupTabs(null, 1);

      expect(result).toBeUndefined();
    });

    test('AI响应格式错误时应该抛出错误', async () => {
      global.mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({ invalid: 'format' })
          }
        }]
      };

      chrome.tabs.query.mockResolvedValue(mockTabs);

      await expect(
        backgroundScript.initiateAndGroupTabs(null, 1)
      ).rejects.toThrow('未找到有效的分组结果');
    });

    test('应该过滤不足最少标签页数量的分组', async () => {
      global.mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              groups: [
                {
                  name: '单个标签页',
                  tabs: [
                    { url: 'https://single.com', title: 'Single Tab' }
                  ]
                },
                {
                  name: '多个标签页',
                  tabs: [
                    { url: 'https://github.com/user/repo', title: 'GitHub Repository' },
                    { url: 'https://stackoverflow.com/questions/123', title: 'Stack Overflow Question' }
                  ]
                }
              ]
            })
          }
        }]
      };

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.group.mockResolvedValue(123);

      const result = await backgroundScript.initiateAndGroupTabs(null, 1);

      // 测试过滤逻辑：应该过滤掉标签页数量少于minTabsInGroup的分组
      // minTabsInGroup = 2，所以"单个标签页"(1个标签)应该被过滤，只保留"多个标签页"(2个标签)
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe('多个标签页');
      expect(result.groups[0].tabs).toHaveLength(2);
    });
  });

  describe('消息处理', () => {
    let messageHandler;

    beforeEach(() => {
      // 模拟消息处理器
      messageHandler = (request, sender, sendResponse) => {
        if (request.type === 'GET_TABS') {
          chrome.tabs.query({ currentWindow: true }, (tabs) => {
            sendResponse({ tabs });
          });
          return true;
        }
        
        if (request.type === 'GET_SETTINGS') {
          backgroundScript.getSecureSettings(['baseURL', 'apiKey', 'model', 'selectedProvider', 'selectedModel'])
            .then((result) => {
              sendResponse(result);
            })
            .catch((error) => {
              sendResponse({ error: error.message });
            });
          return true;
        }
        
        if (request.type === 'START_GROUPING') {
          chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
            if (chrome.runtime.lastError || !window) {
              sendResponse({ success: false, error: chrome.runtime.lastError?.message || "No active normal window found." });
              return;
            }
            
            try {
              await backgroundScript.initiateAndGroupTabs(null, window.id);
              sendResponse({ success: true, message: "Grouping process completed." });
            } catch (e) {
              sendResponse({ success: false, error: e.message });
            }
          });
          return true;
        }
        
        if (request.type === 'UNGROUP_TABS') {
          chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
            if (chrome.runtime.lastError || !window) {
              sendResponse({ success: false, error: chrome.runtime.lastError?.message || "No active normal window found." });
              return;
            }
            
            try {
              const tabs = await chrome.tabs.query({ windowId: window.id, windowType: 'normal' });
              const tabIds = tabs.map(tab => tab.id);
              if (tabIds.length > 0) {
                await chrome.tabs.ungroup(tabIds);
              }
              sendResponse({ success: true });
            } catch (e) {
              sendResponse({ success: false, error: e.message });
            }
          });
          return true;
        }

        return false;
      };
    });

    test('GET_TABS消息应该返回标签页列表', (done) => {
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback(mockTabs);
      });

      const request = { type: 'GET_TABS' };
      const sendResponse = jest.fn((response) => {
        expect(response.tabs).toEqual(mockTabs);
        done();
      });

      messageHandler(request, {}, sendResponse);
    });

    test('GET_SETTINGS消息应该返回安全设置', (done) => {
      const request = { type: 'GET_SETTINGS' };
      const sendResponse = jest.fn((response) => {
        expect(response.apiKey).toBe('test-api-key');
        expect(response.baseURL).toBe('https://api.openai.com/v1');
        expect(response.selectedProvider).toBe('openai');
        done();
      });

      messageHandler(request, {}, sendResponse);
    });

    test('START_GROUPING消息应该启动分组过程', (done) => {
      global.mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              groups: [
                {
                  name: '测试分组',
                  tabs: [
                    { url: 'https://github.com/user/repo', title: 'GitHub Repository' }
                  ]
                }
              ]
            })
          }
        }]
      };

      chrome.windows.getLastFocused.mockImplementation((options, callback) => {
        callback({ id: 1, type: 'normal' });
      });

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.group.mockResolvedValue(123);

      const request = { type: 'START_GROUPING' };
      const sendResponse = jest.fn((response) => {
        expect(response.success).toBe(true);
        expect(response.message).toBe('Grouping process completed.');
        done();
      });

      messageHandler(request, {}, sendResponse);
    });

    test('UNGROUP_TABS消息应该取消所有分组', (done) => {
      chrome.windows.getLastFocused.mockImplementation((options, callback) => {
        callback({ id: 1, type: 'normal' });
      });

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.ungroup.mockResolvedValue();

      const request = { type: 'UNGROUP_TABS' };
      const sendResponse = jest.fn((response) => {
        expect(response.success).toBe(true);
        expect(chrome.tabs.ungroup).toHaveBeenCalledWith([1, 2, 3]);
        done();
      });

      messageHandler(request, {}, sendResponse);
    });

    test('无效消息类型应该返回false', () => {
      const request = { type: 'INVALID_TYPE' };
      const result = messageHandler(request, {}, jest.fn());
      expect(result).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('Chrome API错误应该被正确处理', async () => {
      chrome.tabs.query.mockImplementation(() => {
        throw new Error('Chrome API error');
      });

      await expect(
        backgroundScript.initiateAndGroupTabs(null, 1)
      ).rejects.toThrow('Chrome API error');
    });

    test('空窗口ID应该被正确处理', async () => {
      chrome.windows.getLastFocused.mockImplementation((options, callback) => {
        callback({ id: 1, type: 'normal' });
      });

      chrome.tabs.query.mockResolvedValue(mockTabs);
      chrome.tabs.group.mockResolvedValue(123);

      global.mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              groups: [
                {
                  name: '测试分组',
                  tabs: [
                    { url: 'https://github.com/user/repo', title: 'GitHub Repository' }
                  ]
                }
              ]
            })
          }
        }]
      };

      // 应该能够处理空窗口ID
      await backgroundScript.initiateAndGroupTabs(null, null);
      
      expect(chrome.windows.getLastFocused).not.toHaveBeenCalled();
    });
  });

  // 新增：测试密钥损坏检测和修复逻辑
  describe('API密钥损坏检测和修复', () => {
    beforeEach(() => {
      // 重置console.warn和console.error的mock
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('getCurrentProviderConfig - 损坏密钥检测', () => {
      test('应该检测到包含控制字符的损坏密钥', async () => {
        // 模拟返回包含控制字符的解密结果
        global.secureStorage.encryption.decrypt = jest.fn().mockReturnValue('sk-test\u0000corrupted');
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
          callback({
            selectedProvider: 'openai',
            providers: {
              openai: {
                apiKey: 'encrypted-corrupted-key',
                baseURL: 'https://api.openai.com/v1',
                selectedModel: 'gpt-3.5-turbo'
              }
            }
          });
        });

        const config = await backgroundScript.getCurrentProviderConfig();
        
        expect(config.apiKey).toBe('');
        expect(console.warn).toHaveBeenCalledWith('Decrypted API key contains invalid characters, clearing...');
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          providers: expect.objectContaining({
            openai: expect.objectContaining({
              configured: false
            })
          })
        });
      });

      test('应该检测到长度异常的解密结果', async () => {
        // 测试太短的密钥
        global.secureStorage.encryption.decrypt = jest.fn().mockReturnValue('abc');
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
          callback({
            selectedProvider: 'openai',
            providers: {
              openai: {
                apiKey: 'encrypted-short-key',
                baseURL: 'https://api.openai.com/v1',
                selectedModel: 'gpt-3.5-turbo'
              }
            }
          });
        });

        const config = await backgroundScript.getCurrentProviderConfig();
        
        expect(config.apiKey).toBe('');
        expect(console.warn).toHaveBeenCalledWith('Decrypted API key contains invalid characters, clearing...');
      });

      test('应该正确处理正常的API密钥', async () => {
        global.secureStorage.encryption.decrypt = jest.fn().mockReturnValue('sk-1234567890abcdef');
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
          callback({
            selectedProvider: 'openai',
            providers: {
              openai: {
                apiKey: 'encrypted-valid-key',
                baseURL: 'https://api.openai.com/v1',
                selectedModel: 'gpt-3.5-turbo'
              }
            }
          });
        });

        const config = await backgroundScript.getCurrentProviderConfig();
        
        expect(config.apiKey).toBe('sk-1234567890abcdef');
        expect(console.warn).not.toHaveBeenCalled();
        expect(chrome.storage.local.set).not.toHaveBeenCalled();
      });

      test('应该处理解密异常', async () => {
        global.secureStorage.encryption.decrypt = jest.fn().mockImplementation(() => {
          throw new Error('Decryption failed');
        });
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
          callback({
            selectedProvider: 'openai',
            providers: {
              openai: {
                apiKey: 'invalid-encrypted-key',
                baseURL: 'https://api.openai.com/v1',
                selectedModel: 'gpt-3.5-turbo'
              }
            }
          });
        });

        const config = await backgroundScript.getCurrentProviderConfig();
        
        expect(config.apiKey).toBe('');
        expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('API密钥解密失败'), expect.any(Error));
      });
    });

    describe('getSecureSettings - 验证流程', () => {
      test('损坏的密钥应该导致配置无效', async () => {
        global.secureStorage.encryption.decrypt = jest.fn().mockReturnValue('');
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
          callback({
            selectedProvider: 'openai',
            providers: {
              openai: {
                apiKey: 'corrupted-key',
                baseURL: 'https://api.openai.com/v1',
                selectedModel: 'gpt-3.5-turbo'
              }
            }
          });
        });

        await expect(backgroundScript.getSecureSettings(['apiKey']))
          .rejects.toThrow('请先配置AI设置');
      });

      test('正常密钥应该返回有效配置', async () => {
        global.secureStorage.encryption.decrypt = jest.fn().mockReturnValue('sk-valid123456789');
        
        chrome.storage.local.get.mockImplementation((keys, callback) => {
          callback({
            selectedProvider: 'openai',
            providers: {
              openai: {
                apiKey: 'valid-encrypted-key',
                baseURL: 'https://api.openai.com/v1',
                selectedModel: 'gpt-3.5-turbo'
              }
            }
          });
        });

        const settings = await backgroundScript.getSecureSettings(['apiKey', 'baseURL']);
        
        expect(settings.apiKey).toBe('sk-valid123456789');
        expect(settings.baseURL).toBe('https://api.openai.com/v1');
      });
    });
  });
}); 