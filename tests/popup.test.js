/**
 * Popup脚本单元测试
 * 测试popup页面的基本功能
 */

const { setupFullChromeMock, mockTabs } = require('./mocks/chrome-mocks.js');

// 模拟popup.js的主要功能
class MockPopupScript {
  constructor() {
    this.isGrouping = false;
  }

  async displayTabs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_TABS' }, (response) => {
        if (response && response.tabs) {
          resolve(response.tabs);
        } else {
          resolve([]);
        }
      });
    });
  }

  async startGrouping() {
    if (this.isGrouping) {
      return { success: false, error: '分组正在进行中' };
    }

    this.isGrouping = true;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'START_GROUPING' }, (response) => {
        this.isGrouping = false;
        resolve(response);
      });
    });
  }

  async ungroupTabs() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'UNGROUP_TABS' }, (response) => {
        resolve(response);
      });
    });
  }

  async checkSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        const hasSettings = !!(response && response.apiKey && response.baseURL && response.selectedModel);
        resolve(hasSettings);
      });
    });
  }

  updateUI(state) {
    const states = {
      loading: '加载中...',
      ready: '准备就绪',
      grouping: '分组中...',
      error: '错误',
      no_settings: '请先配置AI设置'
    };

    return states[state] || '未知状态';
  }
}

describe('Popup Script', () => {
  let popupScript;

  beforeEach(() => {
    popupScript = new MockPopupScript();
    
    setupFullChromeMock({
      storageData: {
        selectedProvider: 'openai',
        providers: {
          openai: {
            apiKey: 'test-key',
            baseURL: 'https://api.openai.com/v1',
            selectedModel: 'gpt-3.5-turbo'
          }
        }
      },
      tabs: mockTabs
    });

    // Mock chrome.runtime.sendMessage
    chrome.runtime.sendMessage = jest.fn();
  });

  describe('displayTabs', () => {
    test('应该能够获取并显示标签页列表', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_TABS') {
          callback({ tabs: mockTabs });
        }
      });

      const tabs = await popupScript.displayTabs();
      
      expect(tabs).toEqual(mockTabs);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'GET_TABS' },
        expect.any(Function)
      );
    });

    test('获取标签页失败时应该返回空数组', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_TABS') {
          callback(null);
        }
      });

      const tabs = await popupScript.displayTabs();
      
      expect(tabs).toEqual([]);
    });
  });

  describe('startGrouping', () => {
    test('应该能够启动分组过程', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_GROUPING') {
          callback({ success: true, message: '分组完成' });
        }
      });

      const result = await popupScript.startGrouping();
      
      expect(result.success).toBe(true);
      expect(result.message).toBe('分组完成');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'START_GROUPING' },
        expect.any(Function)
      );
    });

    test('重复启动分组应该被阻止', async () => {
      popupScript.isGrouping = true;

      const result = await popupScript.startGrouping();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('分组正在进行中');
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test('分组失败时应该返回错误信息', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_GROUPING') {
          callback({ success: false, error: '配置错误' });
        }
      });

      const result = await popupScript.startGrouping();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('配置错误');
    });
  });

  describe('ungroupTabs', () => {
    test('应该能够取消所有分组', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'UNGROUP_TABS') {
          callback({ success: true });
        }
      });

      const result = await popupScript.ungroupTabs();
      
      expect(result.success).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'UNGROUP_TABS' },
        expect.any(Function)
      );
    });

    test('取消分组失败时应该返回错误', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'UNGROUP_TABS') {
          callback({ success: false, error: '操作失败' });
        }
      });

      const result = await popupScript.ungroupTabs();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('操作失败');
    });
  });

  describe('checkSettings', () => {
    test('完整配置时应该返回true', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SETTINGS') {
          callback({
            apiKey: 'test-key',
            baseURL: 'https://api.openai.com/v1',
            selectedModel: 'gpt-3.5-turbo',
            selectedProvider: 'openai'
          });
        }
      });

      const hasSettings = await popupScript.checkSettings();
      
      expect(hasSettings).toBe(true);
    });

    test('配置不完整时应该返回false', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SETTINGS') {
          callback({
            apiKey: '',
            baseURL: 'https://api.openai.com/v1',
            selectedModel: 'gpt-3.5-turbo'
          });
        }
      });

      const hasSettings = await popupScript.checkSettings();
      
      expect(hasSettings).toBe(false);
    });

    test('获取设置失败时应该返回false', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SETTINGS') {
          callback(null);
        }
      });

      const hasSettings = await popupScript.checkSettings();
      
      expect(hasSettings).toBe(false);
    });
  });

  describe('updateUI', () => {
    test('应该返回正确的状态文本', () => {
      expect(popupScript.updateUI('loading')).toBe('加载中...');
      expect(popupScript.updateUI('ready')).toBe('准备就绪');
      expect(popupScript.updateUI('grouping')).toBe('分组中...');
      expect(popupScript.updateUI('error')).toBe('错误');
      expect(popupScript.updateUI('no_settings')).toBe('请先配置AI设置');
    });

    test('未知状态应该返回默认文本', () => {
      expect(popupScript.updateUI('unknown')).toBe('未知状态');
    });
  });

  describe('状态管理', () => {
    test('分组状态应该正确切换', async () => {
      expect(popupScript.isGrouping).toBe(false);

      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'START_GROUPING') {
          // 模拟异步操作
          setTimeout(() => {
            callback({ success: true });
          }, 100);
        }
      });

      const groupingPromise = popupScript.startGrouping();
      expect(popupScript.isGrouping).toBe(true);

      await groupingPromise;
      expect(popupScript.isGrouping).toBe(false);
    });
  });

  describe('错误处理', () => {
    test('Chrome runtime错误应该被处理', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        // 模拟Chrome runtime错误
        chrome.runtime.lastError = { message: 'Extension context invalidated' };
        callback(null);
      });

      const tabs = await popupScript.displayTabs();
      
      expect(tabs).toEqual([]);
    });

    test('消息发送失败应该被处理', async () => {
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        // 模拟消息发送失败
        throw new Error('Message sending failed');
      });

      await expect(popupScript.displayTabs()).rejects.toThrow('Message sending failed');
    });
  });
}); 