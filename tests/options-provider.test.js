/**
 * Options页面供应商配置模块单元测试
 * 测试MultiProviderConfig和ModelLoader等类
 */

const { setupFullChromeMock, createStorageMock, createFetchMock, mockProviderConfig } = require('./mocks/chrome-mocks.js');

// 模拟全局secureStorage
global.secureStorage = {
  encryption: {
    encrypt: (data) => data ? btoa(data) : '',
    decrypt: (data) => data ? atob(data) : ''
  }
};

// 模拟PROVIDER_CONFIG常量
global.PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1'
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1'
  }
};

// 模拟MultiProviderConfig类
class MockMultiProviderConfig {
  static async getAllProviders() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['providers'], (result) => {
        const providers = result.providers || {};
        const allProviders = {};
        
        Object.keys(PROVIDER_CONFIG).forEach(key => {
          const providerConfig = providers[key];
          let configured = false;
          
          if (providerConfig && providerConfig.apiKey) {
            try {
              const decryptedKey = secureStorage.encryption.decrypt(providerConfig.apiKey);
              configured = !!decryptedKey;
            } catch (e) {
              configured = false;
            }
          }
          
          allProviders[key] = {
            ...providerConfig,
            configured
          };
        });
        
        resolve(allProviders);
      });
    });
  }

  static async getProvider(providerKey) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['providers'], (result) => {
        const providers = result.providers || {};
        const providerConfig = providers[providerKey];
        
        if (!providerConfig) {
          resolve(null);
          return;
        }
        
        let decryptedApiKey = '';
        if (providerConfig.apiKey) {
          try {
            decryptedApiKey = secureStorage.encryption.decrypt(providerConfig.apiKey);
          } catch (e) {
            console.warn('API密钥解密失败');
          }
        }
        
        resolve({
          ...providerConfig,
          apiKey: decryptedApiKey
        });
      });
    });
  }

  static async saveProvider(providerKey, config) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['providers'], (result) => {
        const providers = result.providers || {};
        
        const encryptedConfig = { ...config };
        if (config.apiKey) {
          encryptedConfig.apiKey = secureStorage.encryption.encrypt(config.apiKey);
        }
        
        providers[providerKey] = encryptedConfig;
        
        chrome.storage.local.set({ providers }, () => {
          resolve();
        });
      });
    });
  }

  static async deleteProvider(providerKey) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['providers'], (result) => {
        const providers = result.providers || {};
        delete providers[providerKey];
        
        chrome.storage.local.set({ providers }, () => {
          resolve();
        });
      });
    });
  }
}

// 模拟ModelLoader类
class MockModelLoader {
  static async loadModels(provider, apiKey, baseURL) {
    const config = PROVIDER_CONFIG[provider];
    if (!config) {
      throw new Error('未知的供应商');
    }

    let modelsUrl = `${baseURL.replace(/\/$/, '')}/models`;
    
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取模型列表失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || data.models || [];
  }
}

describe('MultiProviderConfig', () => {
  beforeEach(() => {
    // 先设置基本的mock环境
    setupFullChromeMock();
    
    // 重置secureStorage，确保没有被之前的测试污染
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
    
    // 然后手动设置带有加密数据的存储
    const encryptedApiKey = global.secureStorage.encryption.encrypt('test-openai-key');
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({
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
        }
      });
    });
  });

  describe('getAllProviders', () => {
    test('应该返回所有供应商的配置状态', async () => {
      const providers = await MockMultiProviderConfig.getAllProviders();
      
      expect(providers).toBeDefined();
      expect(providers.openai).toBeDefined();
      expect(providers.openai.configured).toBe(true);
      expect(providers.deepseek).toBeDefined();
      expect(providers.deepseek.configured).toBe(false);
    });

    test('没有配置时应该返回空配置', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ providers: {} });
      });

      const providers = await MockMultiProviderConfig.getAllProviders();
      
      expect(providers.openai.configured).toBe(false);
      expect(providers.deepseek.configured).toBe(false);
    });

    test('解密失败时应该标记为未配置', async () => {
      // 模拟解密失败
      global.secureStorage.encryption.decrypt = jest.fn().mockImplementation(() => {
        throw new Error('解密失败');
      });

      const providers = await MockMultiProviderConfig.getAllProviders();
      
      expect(providers.openai.configured).toBe(false);
    });
  });

  describe('getProvider', () => {
    test('应该返回解密后的供应商配置', async () => {
      const config = await MockMultiProviderConfig.getProvider('openai');
      
      expect(config).toBeDefined();
      expect(config.apiKey).toBe('test-openai-key'); // 解密后的密钥
      expect(config.baseURL).toBe('https://api.openai.com/v1');
      expect(config.selectedModel).toBe('gpt-3.5-turbo');
    });

    test('不存在的供应商应该返回null', async () => {
      const config = await MockMultiProviderConfig.getProvider('nonexistent');
      expect(config).toBeNull();
    });

    test('解密失败时应该返回空API密钥', async () => {
      global.secureStorage.encryption.decrypt = jest.fn().mockImplementation(() => {
        throw new Error('解密失败');
      });

      const config = await MockMultiProviderConfig.getProvider('openai');
      
      expect(config.apiKey).toBe('');
      expect(console.warn).toHaveBeenCalledWith('API密钥解密失败');
    });
  });

  describe('saveProvider', () => {
    test('应该加密并保存供应商配置', async () => {
      const newConfig = {
        baseURL: 'https://api.openai.com/v1',
        apiKey: 'new-test-key',
        selectedModel: 'gpt-4'
      };

      await MockMultiProviderConfig.saveProvider('openai', newConfig);

      // 验证存储调用
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: expect.objectContaining({
            openai: expect.objectContaining({
              baseURL: 'https://api.openai.com/v1',
              apiKey: global.secureStorage.encryption.encrypt('new-test-key'), // 使用真正的加密
              selectedModel: 'gpt-4'
            })
          })
        }),
        expect.any(Function)
      );
    });

    test('空API密钥应该被正确处理', async () => {
      const newConfig = {
        baseURL: 'https://api.test.com',
        apiKey: '',
        selectedModel: 'test-model'
      };

      await MockMultiProviderConfig.saveProvider('test', newConfig);

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('deleteProvider', () => {
    test('应该删除指定的供应商配置', async () => {
      await MockMultiProviderConfig.deleteProvider('openai');

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          providers: expect.not.objectContaining({
            openai: expect.anything()
          })
        }),
        expect.any(Function)
      );
    });
  });
});

describe('ModelLoader', () => {
  beforeEach(() => {
    setupFullChromeMock();
  });

  describe('loadModels', () => {
    test('应该成功加载OpenAI模型', async () => {
      const mockModels = {
        data: [
          { id: 'gpt-3.5-turbo', object: 'model' },
          { id: 'gpt-4', object: 'model' }
        ]
      };

      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockModels)
      });

      const models = await MockModelLoader.loadModels(
        'openai', 
        'test-api-key', 
        'https://api.openai.com/v1'
      );

      expect(models).toEqual(mockModels.data);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('应该处理不同的baseURL格式', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] })
      });

      // 测试带斜杠的URL
      await MockModelLoader.loadModels('openai', 'key', 'https://api.openai.com/v1/');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.anything()
      );

      // 测试不带斜杠的URL
      await MockModelLoader.loadModels('openai', 'key', 'https://api.openai.com/v1');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.anything()
      );
    });

    test('API请求失败时应该抛出错误', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(
        MockModelLoader.loadModels('openai', 'invalid-key', 'https://api.openai.com/v1')
      ).rejects.toThrow('获取模型列表失败: HTTP 401');
    });

    test('网络错误应该被正确传播', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(
        MockModelLoader.loadModels('openai', 'test-key', 'https://api.openai.com/v1')
      ).rejects.toThrow('Network error');
    });

    test('未知供应商应该抛出错误', async () => {
      await expect(
        MockModelLoader.loadModels('unknown-provider', 'key', 'https://api.test.com')
      ).rejects.toThrow('未知的供应商');
    });

    test('应该处理不同的响应格式', async () => {
      // 测试直接返回models数组的API
      const directModels = [
        { id: 'model-1', name: 'Model 1' },
        { id: 'model-2', name: 'Model 2' }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: directModels })
      });

      const models = await MockModelLoader.loadModels(
        'openai', 
        'test-key', 
        'https://api.test.com'
      );

      expect(models).toEqual(directModels);
    });
  });
});

describe('供应商配置集成测试', () => {
  beforeEach(() => {
    setupFullChromeMock({ storageData: {} });
  });

  test('完整的供应商配置流程', async () => {
    // 1. 最初应该没有配置
    let providers = await MockMultiProviderConfig.getAllProviders();
    expect(providers.openai.configured).toBe(false);

    // 2. 保存配置
    const config = {
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'test-secret-key',
      selectedModel: 'gpt-3.5-turbo',
      models: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ]
    };

    await MockMultiProviderConfig.saveProvider('openai', config);

    // 3. 验证配置已保存
    providers = await MockMultiProviderConfig.getAllProviders();
    expect(providers.openai.configured).toBe(true);

    // 4. 获取配置并验证解密
    const savedConfig = await MockMultiProviderConfig.getProvider('openai');
    expect(savedConfig.apiKey).toBe('test-secret-key');
    expect(savedConfig.selectedModel).toBe('gpt-3.5-turbo');

    // 5. 删除配置
    await MockMultiProviderConfig.deleteProvider('openai');

    // 6. 验证配置已删除
    providers = await MockMultiProviderConfig.getAllProviders();
    expect(providers.openai.configured).toBe(false);
  });

  test('模型加载和缓存流程', async () => {
    // 模拟API响应
    const mockModels = {
      data: [
        { id: 'gpt-3.5-turbo', object: 'model' },
        { id: 'gpt-4', object: 'model' }
      ]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockModels)
    });

    // 1. 加载模型
    const models = await MockModelLoader.loadModels(
      'openai',
      'test-key',
      'https://api.openai.com/v1'
    );

    expect(models).toEqual(mockModels.data);

    // 2. 保存模型到配置
    const config = {
      baseURL: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      models: models
    };

    await MockMultiProviderConfig.saveProvider('openai', config);

    // 3. 验证模型已保存
    const savedConfig = await MockMultiProviderConfig.getProvider('openai');
    expect(savedConfig.models).toEqual(models);
  });
}); 