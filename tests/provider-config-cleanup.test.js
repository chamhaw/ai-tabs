/**
 * Provider Configuration Cleanup Tests
 * 供应商配置清理测试
 * 
 * 此测试文件验证在中文字符清理过程中供应商配置功能保持完整
 * 测试内容包括：
 * 1. 供应商名称的正确显示（中英文）
 * 2. 配置状态的正确判断
 * 3. 错误消息的国际化
 * 4. 配置保存和加载功能
 */

const { setupFullChromeMock } = require('./mocks/chrome-mocks.js');

// Mock the options.js PROVIDER_CONFIG
const MOCK_PROVIDER_CONFIG = {
  '01ai': {
    name: '零一万物',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    chatEndpoint: '/chat/completions'
  },
  'openai': {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    chatEndpoint: '/chat/completions'
  },
  'anthropic': {
    name: 'Anthropic',
    baseURL: 'https://api.anthropic.com/v1',
    chatEndpoint: '/messages'
  },
  'alibaba': {
    name: '阿里云通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    chatEndpoint: '/chat/completions'
  }
};

// Mock MultiProviderConfig class
class MockMultiProviderConfig {
  static mockProviders = {};
  
  static async getAllProviders() {
    const providers = { ...this.mockProviders };
    
    // Fix missing configured field for legacy configurations
    Object.keys(providers).forEach(key => {
      const provider = providers[key];
      if (typeof provider.configured !== 'boolean') {
        // Judge configuration status based on whether encrypted API key exists and can be correctly decrypted
        let isConfigured = false;
        if (provider.apiKey && provider.apiKey.trim()) {
          try {
            // Try to decrypt to verify API key validity
            const decrypted = secureStorage.encryption.decrypt(provider.apiKey);
            isConfigured = !!(decrypted && decrypted.trim());
          } catch (e) {
            // Decryption failed, means API key is invalid
            isConfigured = false;
          }
        }
        provider.configured = isConfigured;
      }
    });
    
    return providers;
  }
  
  static async getProvider(providerKey) {
    const provider = this.mockProviders[providerKey];
    if (provider && provider.apiKey) {
      // Simulate decryption
      const decryptedProvider = { ...provider };
      try {
        decryptedProvider.apiKey = secureStorage.encryption.decrypt(provider.apiKey);
        // If decryption fails or returns empty, set configured to false
        if (!decryptedProvider.apiKey || decryptedProvider.apiKey.trim() === '') {
          decryptedProvider.configured = false;
        }
      } catch (e) {
        // Decryption failed, return empty API key
        decryptedProvider.apiKey = '';
        decryptedProvider.configured = false;
      }
      return decryptedProvider;
    }
    return provider || null;
  }
  
  static async saveProvider(providerKey, config) {
    if (!this.mockProviders[providerKey]) {
      this.mockProviders[providerKey] = {
        name: MOCK_PROVIDER_CONFIG[providerKey]?.name || providerKey,
        baseURL: MOCK_PROVIDER_CONFIG[providerKey]?.baseURL || '',
        apiKey: '',
        selectedModel: '',
        models: [],
        configured: false
      };
    }
    
    const configToSave = { ...config };
    
    // Simulate encryption
    if (configToSave.apiKey && configToSave.apiKey.trim()) {
      configToSave.apiKey = secureStorage.encryption.encrypt(configToSave.apiKey.trim());
    }
    
    Object.assign(this.mockProviders[providerKey], configToSave);
    
    // Set configured status
    this.mockProviders[providerKey].configured = !!(config.apiKey && config.apiKey.trim());
    
    return Promise.resolve();
  }
  
  static async deleteProvider(providerKey) {
    delete this.mockProviders[providerKey];
    return Promise.resolve();
  }
}

describe('Provider Configuration Cleanup Tests', () => {
  let mockGetMessage;
  
  beforeEach(() => {
    setupFullChromeMock();
    
    // Reset mock providers
    MockMultiProviderConfig.mockProviders = {};
    
    // Mock getMessage function
    mockGetMessage = jest.fn((key, params) => {
      const messages = {
        'status_configured': 'Configured',
        'status_not_configured': 'Not configured',
        'provider_01ai': '零一万物',
        'provider_openai': 'OpenAI',
        'provider_anthropic': 'Anthropic',
        'provider_alibaba': '阿里云通义千问',
        'save_settings': 'Save Settings',
        'provider_config_saved': 'Provider configuration saved',
        'api_key_invalid': 'Invalid API key',
        'network_error': 'Network error: {error}',
        'save_failed': 'Save failed: {error}',
        'load_failed': 'Load failed: {error}',
        'refresh_models_failed': 'Failed to refresh model list: {error}',
        'custom_suffix': 'Custom',
        'type_custom': 'Custom',
        'type_builtin': 'Built-in',
        'type_label': 'Type'
      };
      
      let message = messages[key] || key;
      if (params && typeof params === 'object') {
        Object.keys(params).forEach(param => {
          message = message.replace(`{${param}}`, params[param]);
        });
      }
      return message;
    });
    
    // Make getMessage available globally
    global.getMessage = mockGetMessage;
  });
  
  afterEach(() => {
    delete global.getMessage;
  });

  describe('Provider Name Display', () => {
    test('should display Chinese provider names correctly', () => {
      const chineseProviders = ['01ai', 'alibaba'];
      
      chineseProviders.forEach(providerKey => {
        const config = MOCK_PROVIDER_CONFIG[providerKey];
        expect(config.name).toBeDefined();
        expect(config.name).toMatch(/[\u4e00-\u9fa5]/); // Contains Chinese characters
      });
    });

    test('should display English provider names correctly', () => {
      const englishProviders = ['openai', 'anthropic'];
      
      englishProviders.forEach(providerKey => {
        const config = MOCK_PROVIDER_CONFIG[providerKey];
        expect(config.name).toBeDefined();
        expect(config.name).not.toMatch(/[\u4e00-\u9fa5]/); // No Chinese characters
      });
    });

    test('should handle internationalization for provider names', () => {
      expect(mockGetMessage('provider_01ai')).toBe('零一万物');
      expect(mockGetMessage('provider_openai')).toBe('OpenAI');
      expect(mockGetMessage('provider_anthropic')).toBe('Anthropic');
      expect(mockGetMessage('provider_alibaba')).toBe('阿里云通义千问');
    });
  });

  describe('Configuration Status Display', () => {
    test('should show configured status correctly', async () => {
      // Configure a provider
      await MockMultiProviderConfig.saveProvider('openai', {
        apiKey: 'test-api-key',
        baseURL: 'https://api.openai.com/v1',
        selectedModel: 'gpt-3.5-turbo'
      });
      
      const provider = await MockMultiProviderConfig.getProvider('openai');
      expect(provider.configured).toBe(true);
      expect(provider.apiKey).toBe('test-api-key');
      
      // Test status message
      const statusMessage = provider.configured ? 
        mockGetMessage('status_configured') : 
        mockGetMessage('status_not_configured');
      expect(statusMessage).toBe('Configured');
    });

    test('should show not configured status correctly', async () => {
      // Don't configure the provider
      const provider = await MockMultiProviderConfig.getProvider('openai');
      expect(provider).toBeNull();
      
      // Test status message
      const statusMessage = mockGetMessage('status_not_configured');
      expect(statusMessage).toBe('Not configured');
    });
  });

  describe('Error Message Internationalization', () => {
    test('should use internationalized error messages', () => {
      // Test basic error messages
      expect(mockGetMessage('api_key_invalid')).toBe('Invalid API key');
      expect(mockGetMessage('provider_config_saved')).toBe('Provider configuration saved');
      
      // Test parameterized error messages
      expect(mockGetMessage('network_error', { error: 'Connection timeout' }))
        .toBe('Network error: Connection timeout');
      expect(mockGetMessage('save_failed', { error: 'Permission denied' }))
        .toBe('Save failed: Permission denied');
      expect(mockGetMessage('refresh_models_failed', { error: 'Invalid API key' }))
        .toBe('Failed to refresh model list: Invalid API key');
    });

    test('should handle missing parameters gracefully', () => {
      // Test with missing parameters
      expect(mockGetMessage('network_error', {})).toBe('Network error: {error}');
      expect(mockGetMessage('save_failed')).toBe('Save failed: {error}');
    });
  });

  describe('Configuration Save and Load', () => {
    test('should save provider configuration correctly', async () => {
      const config = {
        apiKey: 'test-api-key-123',
        baseURL: 'https://api.test.com/v1',
        selectedModel: 'test-model'
      };
      
      await MockMultiProviderConfig.saveProvider('openai', config);
      
      const savedProvider = await MockMultiProviderConfig.getProvider('openai');
      expect(savedProvider.apiKey).toBe('test-api-key-123');
      expect(savedProvider.baseURL).toBe('https://api.test.com/v1');
      expect(savedProvider.selectedModel).toBe('test-model');
      expect(savedProvider.configured).toBe(true);
    });

    test('should handle Chinese provider names in configuration', async () => {
      const config = {
        apiKey: 'test-01ai-key',
        baseURL: 'https://api.lingyiwanwu.com/v1',
        selectedModel: 'yi-large'
      };
      
      await MockMultiProviderConfig.saveProvider('01ai', config);
      
      const savedProvider = await MockMultiProviderConfig.getProvider('01ai');
      expect(savedProvider.name).toBe('零一万物');
      expect(savedProvider.apiKey).toBe('test-01ai-key');
      expect(savedProvider.configured).toBe(true);
    });

    test('should encrypt API keys correctly', async () => {
      const config = {
        apiKey: 'sensitive-api-key-123',
        baseURL: 'https://api.test.com/v1'
      };
      
      await MockMultiProviderConfig.saveProvider('openai', config);
      
      // Check that the stored API key is encrypted
      const storedProvider = MockMultiProviderConfig.mockProviders['openai'];
      expect(storedProvider.apiKey).not.toBe('sensitive-api-key-123');
      expect(storedProvider.apiKey).toBeDefined();
      expect(storedProvider.apiKey.length).toBeGreaterThan(0);
      
      // Check that retrieval decrypts correctly
      const retrievedProvider = await MockMultiProviderConfig.getProvider('openai');
      expect(retrievedProvider.apiKey).toBe('sensitive-api-key-123');
    });
  });

  describe('Model Loading Functionality', () => {
    test('should handle model loading errors with internationalized messages', async () => {
      // Mock a failed model loading scenario
      const mockError = new Error('Invalid API key');
      
      // Test error message formatting
      const errorMessage = mockGetMessage('refresh_models_failed', { error: mockError.message });
      expect(errorMessage).toBe('Failed to refresh model list: Invalid API key');
    });

    test('should validate model data correctly', () => {
      // Test model validation logic
      const validModels = [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' }
      ];
      
      const filteredModels = validModels.filter(model => model.id);
      expect(filteredModels).toHaveLength(2);
      
      // Test invalid models
      const invalidModels = [
        { name: 'Invalid Model' }, // No ID
        { id: '', name: 'Empty ID' } // Empty ID
      ];
      
      const filteredInvalidModels = invalidModels.filter(model => model.id);
      expect(filteredInvalidModels).toHaveLength(0);
    });
  });

  describe('Custom Provider Management', () => {
    test('should handle custom provider names correctly', () => {
      const customProviderName = 'My Custom Provider';
      const customSuffix = mockGetMessage('custom_suffix');
      const displayName = `${customProviderName} (${customSuffix})`;
      
      expect(displayName).toBe('My Custom Provider (Custom)');
    });

    test('should differentiate between built-in and custom providers', () => {
      const builtinType = mockGetMessage('type_builtin');
      const customType = mockGetMessage('type_custom');
      
      expect(builtinType).toBe('Built-in');
      expect(customType).toBe('Custom');
    });
  });

  describe('Provider Sorting and Display', () => {
    test('should sort providers correctly (configured first, then by name)', async () => {
      // Configure some providers
      await MockMultiProviderConfig.saveProvider('openai', { apiKey: 'key1' });
      await MockMultiProviderConfig.saveProvider('01ai', { apiKey: 'key2' });
      
      const allProviders = await MockMultiProviderConfig.getAllProviders();
      
      // Prepare provider list for sorting
      const providerList = Object.keys(MOCK_PROVIDER_CONFIG).map(key => ({
        key,
        name: MOCK_PROVIDER_CONFIG[key].name,
        configured: allProviders[key]?.configured || false
      }));
      
      // Sort: configured first, then by name
      providerList.sort((a, b) => {
        if (a.configured !== b.configured) {
          return b.configured - a.configured;
        }
        return a.name.localeCompare(b.name, 'zh-CN');
      });
      
      // Verify sorting
      const configuredProviders = providerList.filter(p => p.configured);
      const unconfiguredProviders = providerList.filter(p => !p.configured);
      
      expect(configuredProviders.length).toBe(2);
      expect(unconfiguredProviders.length).toBe(2);
      
      // Configured providers should come first
      expect(providerList[0].configured).toBe(true);
      expect(providerList[1].configured).toBe(true);
    });
  });

  describe('Configuration Form Validation', () => {
    test('should validate required fields correctly', () => {
      const validateConfig = (config) => {
        const errors = [];
        
        if (!config.name || !config.name.trim()) {
          errors.push('Provider name is required');
        }
        
        if (!config.baseURL || !config.baseURL.trim()) {
          errors.push('Base URL is required');
        }
        
        if (config.baseURL) {
          try {
            new URL(config.baseURL);
          } catch {
            errors.push('Invalid URL format');
          }
        }
        
        return errors;
      };
      
      // Test valid configuration
      const validConfig = {
        name: 'Test Provider',
        baseURL: 'https://api.test.com/v1'
      };
      
      expect(validateConfig(validConfig)).toHaveLength(0);
      
      // Test invalid configuration
      const invalidConfig = {
        name: '',
        baseURL: 'invalid-url'
      };
      
      const errors = validateConfig(invalidConfig);
      expect(errors).toContain('Provider name is required');
      expect(errors).toContain('Invalid URL format');
    });
  });

  describe('Migration and Compatibility', () => {
    test('should handle legacy configurations correctly', async () => {
      // Simulate legacy configuration without 'configured' field
      MockMultiProviderConfig.mockProviders['legacy'] = {
        name: 'Legacy Provider',
        apiKey: secureStorage.encryption.encrypt('legacy-key'),
        baseURL: 'https://legacy.api.com/v1'
        // No 'configured' field
      };
      
      const allProviders = await MockMultiProviderConfig.getAllProviders();
      const legacyProvider = allProviders['legacy'];
      
      // Should automatically set configured status based on API key
      expect(legacyProvider.configured).toBe(true);
    });

    test('should handle corrupted API keys gracefully', async () => {
      // Simulate corrupted API key
      MockMultiProviderConfig.mockProviders['corrupted'] = {
        name: 'Corrupted Provider',
        apiKey: 'corrupted-data-not-base64',
        baseURL: 'https://test.api.com/v1',
        configured: true
      };
      
      const provider = await MockMultiProviderConfig.getProvider('corrupted');
      
      // Should return empty API key for corrupted data
      expect(provider.apiKey).toBe('');
      expect(provider.configured).toBe(false);
    });
  });
}); 