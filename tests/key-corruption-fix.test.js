/**
 * API密钥损坏修复功能单元测试
 * 测试 getMessageWithParams 函数和密钥验证逻辑
 */

const { setupFullChromeMock } = require('./mocks/chrome-mocks.js');

// 模拟 getMessage 函数
const mockGetMessage = jest.fn();

// 模拟修复后的 getMessageWithParams 函数
async function getMessageWithParams(key, params = {}) {
  let message = await mockGetMessage(key);
  if (message && typeof message === 'string' && typeof params === 'object' && params !== null) {
    Object.keys(params).forEach(param => {
      const placeholder = `{${param}}`;
      if (message.includes(placeholder)) {
        message = message.replace(placeholder, params[param]);
      }
    });
  }
  return message;
}

// 模拟损坏的API密钥检测逻辑
function validateApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'error_api_key_empty' };
  }
  
  // Check for corrupted API key (contains invalid characters)
  const apiKeyTrimmed = apiKey.trim();
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(apiKeyTrimmed)) {
    return { valid: false, error: 'API密钥损坏，请重新配置。API key is corrupted, please reconfigure.' };
  }
  
  // Additional validations
  if (apiKeyTrimmed.includes('\n') || apiKeyTrimmed.includes('\r')) {
    return { valid: false, error: 'error_api_key_format_invalid' };
  }
  
  if (apiKeyTrimmed.length < 10 || apiKeyTrimmed.length > 200) {
    return { valid: false, error: 'error_api_key_invalid_length' };
  }
  
  return { valid: true };
}

// 模拟当前供应商配置中的解密验证逻辑
function validateDecryptedApiKey(decryptedApiKey) {
  if (decryptedApiKey && (
    decryptedApiKey.includes('\u0000') ||  // null characters
    decryptedApiKey.includes('\u001F') ||  // control characters
    decryptedApiKey.length < 10 ||         // too short
    decryptedApiKey.length > 200 ||        // too long
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(decryptedApiKey) // control characters
  )) {
    return { valid: false, shouldClear: true };
  }
  return { valid: true, shouldClear: false };
}

describe('API密钥损坏修复功能测试', () => {
  beforeEach(() => {
    setupFullChromeMock();
    jest.clearAllMocks();
    
    // 设置默认的getMessage模拟
    mockGetMessage.mockImplementation((key) => {
      const messages = {
        'system_prompt_existing_groups': '当前已存在的分组有：{groups}',
        'system_prompt_intro': '你是一个智能标签页分组助手',
        'error_api_key_empty': 'API密钥为空',
        'error_api_key_format_invalid': 'API密钥格式无效',
        'fallback_system_prompt': '请对标签页进行智能分组'
      };
      return Promise.resolve(messages[key] || key);
    });
  });

  describe('getMessageWithParams 函数修复测试', () => {
    test('应该正确处理异步 getMessage 调用', async () => {
      const result = await getMessageWithParams('system_prompt_existing_groups', { groups: 'Group1, Group2' });
      
      expect(mockGetMessage).toHaveBeenCalledWith('system_prompt_existing_groups');
      expect(result).toBe('当前已存在的分组有：Group1, Group2');
    });

    test('应该处理不存在的消息键', async () => {
      const result = await getMessageWithParams('non_existent_key', { param: 'value' });
      
      expect(result).toBe('non_existent_key');
    });

    test('应该处理空参数对象', async () => {
      const result = await getMessageWithParams('system_prompt_intro', {});
      
      expect(result).toBe('你是一个智能标签页分组助手');
    });

    test('应该处理null参数', async () => {
      const result = await getMessageWithParams('system_prompt_intro', null);
      
      expect(result).toBe('你是一个智能标签页分组助手');
    });

    test('应该处理多个参数替换', async () => {
      mockGetMessage.mockResolvedValueOnce('错误: {error}, 状态: {status}');
      
      const result = await getMessageWithParams('multi_param_message', { 
        error: '连接失败', 
        status: '503' 
      });
      
      expect(result).toBe('错误: 连接失败, 状态: 503');
    });

    test('应该处理getMessage返回非字符串值的情况', async () => {
      mockGetMessage.mockResolvedValueOnce(null);
      
      const result = await getMessageWithParams('null_message', { param: 'value' });
      
      expect(result).toBe(null);
    });

    test('应该处理getMessage返回Promise的情况', async () => {
      // 这是修复的核心：确保等待异步结果
      mockGetMessage.mockImplementation((key) => {
        return new Promise(resolve => {
          setTimeout(() => resolve('异步消息'), 10);
        });
      });
      
      const result = await getMessageWithParams('async_message', {});
      
      expect(result).toBe('异步消息');
    });

    test('应该处理不存在的占位符', async () => {
      mockGetMessage.mockResolvedValueOnce('消息不包含占位符');
      
      const result = await getMessageWithParams('no_placeholder_message', { 
        nonexistent: 'value' 
      });
      
      expect(result).toBe('消息不包含占位符');
    });

    test('应该处理特殊字符在参数中的情况', async () => {
      mockGetMessage.mockResolvedValueOnce('错误: {error}');
      
      const result = await getMessageWithParams('special_char_message', { 
        error: 'API密钥包含特殊字符: \u0000\u0001' 
      });
      
      expect(result).toBe('错误: API密钥包含特殊字符: \u0000\u0001');
    });
  });

  describe('API密钥验证逻辑测试', () => {
    test('应该检测空或null的API密钥', () => {
      expect(validateApiKey('')).toEqual({ valid: false, error: 'error_api_key_empty' });
      expect(validateApiKey(null)).toEqual({ valid: false, error: 'error_api_key_empty' });
      expect(validateApiKey(undefined)).toEqual({ valid: false, error: 'error_api_key_empty' });
      expect(validateApiKey('   ')).toEqual({ valid: false, error: 'error_api_key_empty' });
    });

    test('应该检测包含控制字符的损坏API密钥', () => {
      const corruptedKeys = [
        'sk-test\u0000key',           // null character
        'sk-test\u0001key',           // start of heading
        'sk-test\u0008key',           // backspace
        'sk-test\u000Bkey',           // vertical tab
        'sk-test\u000Ckey',           // form feed
        'sk-test\u000Ekey',           // shift out
        'sk-test\u001Fkey',           // unit separator
        'sk-test\u007Fkey'            // delete
      ];

      corruptedKeys.forEach(key => {
        const result = validateApiKey(key);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('API密钥损坏，请重新配置。API key is corrupted, please reconfigure.');
      });
    });

    test('应该检测包含换行符的API密钥', () => {
      const keysWithNewlines = [
        'sk-test\nkey',
        'sk-test\rkey',
        'sk-test\r\nkey'
      ];

      keysWithNewlines.forEach(key => {
        const result = validateApiKey(key);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('error_api_key_format_invalid');
      });
    });

    test('应该检测长度不合理的API密钥', () => {
      // 太短的密钥
      const tooShort = 'sk-123';
      expect(validateApiKey(tooShort)).toEqual({ 
        valid: false, 
        error: 'error_api_key_invalid_length' 
      });

      // 太长的密钥
      const tooLong = 'sk-' + 'a'.repeat(300);
      expect(validateApiKey(tooLong)).toEqual({ 
        valid: false, 
        error: 'error_api_key_invalid_length' 
      });
    });

    test('应该接受正常的API密钥', () => {
      const validKeys = [
        'sk-1234567890abcdef',
        'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
        'sk-' + 'a'.repeat(50),
        'API_KEY_1234567890',
        'Bearer_token_12345'
      ];

      validKeys.forEach(key => {
        const result = validateApiKey(key);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('应该处理包含合法特殊字符的API密钥', () => {
      const validSpecialChars = [
        'sk-test_key-123',
        'sk-test.key.123',
        'sk-test-key_123.abc'
      ];

      validSpecialChars.forEach(key => {
        const result = validateApiKey(key);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('解密后密钥验证测试', () => {
    test('应该检测包含null字符的解密结果', () => {
      const corruptedKey = 'sk-test\u0000key';
      const result = validateDecryptedApiKey(corruptedKey);
      
      expect(result.valid).toBe(false);
      expect(result.shouldClear).toBe(true);
    });

    test('应该检测长度异常的解密结果', () => {
      // 太短
      let result = validateDecryptedApiKey('abc');
      expect(result.valid).toBe(false);
      expect(result.shouldClear).toBe(true);

      // 太长
      result = validateDecryptedApiKey('x'.repeat(250));
      expect(result.valid).toBe(false);
      expect(result.shouldClear).toBe(true);
    });

    test('应该检测包含控制字符的解密结果', () => {
      const controlChars = ['\u0000', '\u0001', '\u0008', '\u000E', '\u001F', '\u007F'];
      
      controlChars.forEach(char => {
        const corruptedKey = `sk-test${char}key`;
        const result = validateDecryptedApiKey(corruptedKey);
        
        expect(result.valid).toBe(false);
        expect(result.shouldClear).toBe(true);
      });
    });

    test('应该接受正常的解密结果', () => {
      const validKeys = [
        'sk-1234567890abcdef',
        'sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
        'API_KEY_1234567890'
      ];

      validKeys.forEach(key => {
        const result = validateDecryptedApiKey(key);
        expect(result.valid).toBe(true);
        expect(result.shouldClear).toBe(false);
      });
    });

    test('应该处理空或null的解密结果', () => {
      expect(validateDecryptedApiKey('')).toEqual({ valid: true, shouldClear: false });
      expect(validateDecryptedApiKey(null)).toEqual({ valid: true, shouldClear: false });
      expect(validateDecryptedApiKey(undefined)).toEqual({ valid: true, shouldClear: false });
    });
  });

  describe('集成测试：完整的密钥处理流程', () => {
    test('应该能处理从加密到解密再到验证的完整流程', async () => {
      // 模拟完整的密钥处理流程
      const originalKey = 'sk-1234567890abcdef';
      
      // 1. 验证原始密钥
      const originalValidation = validateApiKey(originalKey);
      expect(originalValidation.valid).toBe(true);
      
      // 2. 模拟加密
      const encrypted = btoa(originalKey); // 简化的加密
      
      // 3. 模拟解密
      const decrypted = atob(encrypted);
      
      // 4. 验证解密结果
      const decryptedValidation = validateDecryptedApiKey(decrypted);
      expect(decryptedValidation.valid).toBe(true);
      expect(decryptedValidation.shouldClear).toBe(false);
      
      // 5. 最终验证
      const finalValidation = validateApiKey(decrypted);
      expect(finalValidation.valid).toBe(true);
    });

    test('应该能处理损坏密钥的清理流程', async () => {
      // 模拟损坏的密钥
      const corruptedKey = 'sk-test\u0000corrupted';
      
      // 1. 解密验证应该检测到损坏
      const decryptedValidation = validateDecryptedApiKey(corruptedKey);
      expect(decryptedValidation.valid).toBe(false);
      expect(decryptedValidation.shouldClear).toBe(true);
      
      // 2. API密钥验证也应该检测到损坏
      const apiValidation = validateApiKey(corruptedKey);
      expect(apiValidation.valid).toBe(false);
      expect(apiValidation.error).toBe('API密钥损坏，请重新配置。API key is corrupted, please reconfigure.');
    });

    test('应该能处理国际化消息的完整流程', async () => {
      // 测试带参数的国际化消息
      mockGetMessage.mockImplementation((key) => {
        const messages = {
          'error_api_call_parameters_invalid': 'API调用参数无效: URL={url}, 模型={model}',
          'error_network_request_failed': '网络请求失败: {message}'
        };
        return Promise.resolve(messages[key] || key);
      });
      
      const apiError = await getMessageWithParams('error_api_call_parameters_invalid', {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-3.5-turbo'
      });
      
      expect(apiError).toBe('API调用参数无效: URL=https://api.openai.com/v1/chat/completions, 模型=gpt-3.5-turbo');
      
      const networkError = await getMessageWithParams('error_network_request_failed', {
        message: 'Connection timeout'
      });
      
      expect(networkError).toBe('网络请求失败: Connection timeout');
    });
  });

  describe('错误边界测试', () => {
    test('应该处理getMessage抛出异常的情况', async () => {
      mockGetMessage.mockRejectedValueOnce(new Error('i18n loading failed'));
      
      await expect(getMessageWithParams('failing_key', {})).rejects.toThrow('i18n loading failed');
    });

    test('应该处理极端长度的参数', async () => {
      mockGetMessage.mockResolvedValueOnce('错误: {error}');
      
      const veryLongError = 'x'.repeat(10000);
      const result = await getMessageWithParams('long_error', { error: veryLongError });
      
      expect(result).toBe(`错误: ${veryLongError}`);
    });

    test('应该处理包含特殊字符的占位符', async () => {
      mockGetMessage.mockResolvedValueOnce('测试 {special-char} 和 {another_char}');
      
      const result = await getMessageWithParams('special_placeholder', { 
        'special-char': '值1',
        'another_char': '值2'
      });
      
      expect(result).toBe('测试 值1 和 值2');
    });

    test('应该处理循环引用的参数对象', async () => {
      mockGetMessage.mockResolvedValueOnce('参数: {param}');
      
      const circularObj = { param: 'test' };
      circularObj.self = circularObj;
      
      // 不应该抛出错误，但可能无法正确处理循环引用
      const result = await getMessageWithParams('circular_param', circularObj);
      
      expect(typeof result).toBe('string');
    });
  });
}); 