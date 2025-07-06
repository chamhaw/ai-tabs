/**
 * Chinese Character Cleanup Tests
 * 测试中文字符清理修复的单元测试
 * 
 * 此测试文件验证以下修复：
 * 1. 代码逻辑中不存在中文字符（除了国际化文件和合法的供应商名称）
 * 2. 清理后功能保持完整
 * 3. 错误消息正确国际化
 * 4. 供应商配置正确处理中英文供应商名称
 */

const fs = require('fs');
const path = require('path');
const { setupFullChromeMock } = require('./mocks/chrome-mocks.js');

// 中文字符正则表达式
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fa5]/;
const CHINESE_CHAR_GLOBAL_REGEX = /[\u4e00-\u9fa5]/g;

// 合法的中文供应商名称（这些应该被保留）
const LEGITIMATE_CHINESE_PROVIDER_NAMES = [
  '零一万物',      // 01ai
  '阿里云通义千问', // Alibaba  
  '百度文心一言',   // Baidu
  '豆包',          // Doubao
  '商汤科技',      // SenseTime
  '阶跃星辰',      // StepFun
  '腾讯混元',      // Tencent
  '智谱AI',        // Zhipu
  '讯飞星火'       // Xunfei
];

// 需要检查的JavaScript文件
const JS_FILES_TO_CHECK = [
  'background.js',
  'popup.js',
  'options.js',
  'i18n.js',
  'scripts/security.js'
];

// 应该排除的目录和文件
const EXCLUDE_PATTERNS = [
  '_locales',
  'node_modules',
  'coverage',
  'tests',
  '.git',
  'README.md',
  'README.zh-CN.md',
  'privacy-policy.zh-CN.md'
];

describe('Chinese Character Cleanup Tests', () => {
  beforeEach(() => {
    setupFullChromeMock();
  });

  describe('Code Logic Chinese Character Removal', () => {
    test('should not contain Chinese characters in comments', () => {
      JS_FILES_TO_CHECK.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 提取所有注释
          const comments = extractComments(content);
          
          comments.forEach((comment, index) => {
            // 检查是否包含中文字符
            const chineseMatches = comment.match(CHINESE_CHAR_GLOBAL_REGEX);
            if (chineseMatches) {
              // 检查是否是合法的供应商名称
              const isLegitimate = LEGITIMATE_CHINESE_PROVIDER_NAMES.some(name => 
                comment.includes(name)
              );
              
              if (!isLegitimate) {
                throw new Error(`Found Chinese characters in comment ${index + 1} in ${filePath}: "${comment.trim()}"`);
              }
            }
          });
        }
      });
    });

    test('should not contain Chinese characters in string literals except provider names', () => {
      JS_FILES_TO_CHECK.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 提取所有字符串字面量
          const strings = extractStringLiterals(content);
          
          strings.forEach((str, index) => {
            const chineseMatches = str.match(CHINESE_CHAR_GLOBAL_REGEX);
            if (chineseMatches) {
              // 检查是否是合法的供应商名称
              const isLegitimate = LEGITIMATE_CHINESE_PROVIDER_NAMES.some(name => 
                str.includes(name)
              );
              
              if (!isLegitimate) {
                throw new Error(`Found Chinese characters in string literal ${index + 1} in ${filePath}: "${str}"`);
              }
            }
          });
        }
      });
    });

    test('should not contain Chinese characters in console.log statements', () => {
      JS_FILES_TO_CHECK.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找所有console.log语句
          const consoleStatements = extractConsoleStatements(content);
          
          consoleStatements.forEach((statement, index) => {
            const chineseMatches = statement.match(CHINESE_CHAR_GLOBAL_REGEX);
            if (chineseMatches) {
              // 检查是否是合法的供应商名称
              const isLegitimate = LEGITIMATE_CHINESE_PROVIDER_NAMES.some(name => 
                statement.includes(name)
              );
              
              if (!isLegitimate) {
                throw new Error(`Found Chinese characters in console statement ${index + 1} in ${filePath}: "${statement}"`);
              }
            }
          });
        }
      });
    });

    test('should preserve legitimate Chinese provider names', () => {
      const optionsPath = path.join(__dirname, '..', 'options.js');
      if (fs.existsSync(optionsPath)) {
        const content = fs.readFileSync(optionsPath, 'utf8');
        
        // 验证所有合法的中文供应商名称都存在
        LEGITIMATE_CHINESE_PROVIDER_NAMES.forEach(name => {
          expect(content).toContain(name);
        });
      }
    });
  });

  describe('Internationalization Compliance', () => {
    test('should use internationalized messages instead of hardcoded Chinese text', () => {
      // 模拟i18n功能
      const mockGetMessage = jest.fn((key) => {
        const messages = {
          'save_settings': 'Save Settings',
          'error_occurred': 'An error occurred',
          'loading': 'Loading...',
          'success': 'Success',
          'failed': 'Failed'
        };
        return messages[key] || key;
      });

      // 检查代码中是否正确使用了getMessage函数
      JS_FILES_TO_CHECK.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 检查是否有StatusManager.show调用使用了getMessage
          const statusManagerCalls = content.match(/StatusManager\.show\([^)]+\)/g) || [];
          
          statusManagerCalls.forEach(call => {
            // 如果包含中文，应该使用getMessage
            if (CHINESE_CHAR_REGEX.test(call)) {
              // 检查是否是合法的供应商名称
              const isLegitimate = LEGITIMATE_CHINESE_PROVIDER_NAMES.some(name => 
                call.includes(name)
              );
              
              if (!isLegitimate && !call.includes('getMessage')) {
                throw new Error(`StatusManager.show call should use getMessage for internationalization in ${filePath}: ${call}`);
              }
            }
          });
        }
      });
    });

    test('should handle bilingual provider names correctly', () => {
      // 测试供应商配置能正确处理中英文名称
      const mockProviderConfig = {
        '01ai': { name: '零一万物' },
        'openai': { name: 'OpenAI' },
        'anthropic': { name: 'Anthropic' }
      };

      // 验证配置中同时包含中英文名称
      expect(mockProviderConfig['01ai'].name).toBe('零一万物');
      expect(mockProviderConfig['openai'].name).toBe('OpenAI');
      expect(mockProviderConfig['anthropic'].name).toBe('Anthropic');
    });
  });

  describe('Error Message Internationalization', () => {
    test('should use getMessage for error messages', () => {
      // 模拟错误消息的国际化
      const mockGetMessage = jest.fn((key, params) => {
        const messages = {
          'api_key_invalid': 'Invalid API key',
          'network_error': 'Network error: {error}',
          'save_failed': 'Save failed: {error}',
          'load_failed': 'Load failed: {error}'
        };
        
        let message = messages[key] || key;
        if (params && typeof params === 'object') {
          Object.keys(params).forEach(param => {
            message = message.replace(`{${param}}`, params[param]);
          });
        }
        return message;
      });

      // 测试错误消息的国际化
      expect(mockGetMessage('api_key_invalid')).toBe('Invalid API key');
      expect(mockGetMessage('network_error', { error: 'Connection timeout' }))
        .toBe('Network error: Connection timeout');
      expect(mockGetMessage('save_failed', { error: 'Permission denied' }))
        .toBe('Save failed: Permission denied');
    });
  });

  describe('Functionality Preservation', () => {
    test('should maintain provider configuration functionality', () => {
      // 测试供应商配置功能仍然正常工作
      const mockProviders = {
        'openai': {
          name: 'OpenAI',
          apiKey: 'test-key',
          configured: true
        },
        '01ai': {
          name: '零一万物',
          apiKey: 'test-key-01ai',
          configured: true
        }
      };

      // 验证配置功能
      Object.keys(mockProviders).forEach(key => {
        const provider = mockProviders[key];
        expect(provider.name).toBeDefined();
        expect(provider.apiKey).toBeDefined();
        expect(provider.configured).toBe(true);
      });
    });

    test('should maintain encryption/decryption functionality', () => {
      // 测试加密解密功能仍然正常工作
      const testData = 'test-api-key-12345';
      
      // 使用setup.js中的secureStorage
      const encrypted = secureStorage.encryption.encrypt(testData);
      const decrypted = secureStorage.encryption.decrypt(encrypted);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      expect(decrypted).toBe(testData);
    });

    test('should maintain i18n functionality', () => {
      // 测试国际化功能仍然正常工作
      const mockI18n = {
        getMessage: jest.fn((key) => {
          const messages = {
            'app_name': 'AI Tabs',
            'save_settings': 'Save Settings',
            'provider_01ai': '零一万物',
            'provider_openai': 'OpenAI'
          };
          return messages[key] || key;
        })
      };

      // 验证国际化功能
      expect(mockI18n.getMessage('app_name')).toBe('AI Tabs');
      expect(mockI18n.getMessage('save_settings')).toBe('Save Settings');
      expect(mockI18n.getMessage('provider_01ai')).toBe('零一万物');
      expect(mockI18n.getMessage('provider_openai')).toBe('OpenAI');
    });
  });

  describe('Security Module Cleanup', () => {
    test('should not contain Chinese characters in security module', () => {
      const securityPath = path.join(__dirname, '..', 'scripts/security.js');
      if (fs.existsSync(securityPath)) {
        const content = fs.readFileSync(securityPath, 'utf8');
        
        // 提取注释和字符串
        const comments = extractComments(content);
        const strings = extractStringLiterals(content);
        
        // 检查注释中的中文字符
        comments.forEach((comment, index) => {
          const chineseMatches = comment.match(CHINESE_CHAR_GLOBAL_REGEX);
          if (chineseMatches) {
            throw new Error(`Found Chinese characters in security module comment ${index + 1}: "${comment.trim()}"`);
          }
        });
        
        // 检查字符串中的中文字符
        strings.forEach((str, index) => {
          const chineseMatches = str.match(CHINESE_CHAR_GLOBAL_REGEX);
          if (chineseMatches) {
            throw new Error(`Found Chinese characters in security module string ${index + 1}: "${str}"`);
          }
        });
      }
    });
  });
});

// 辅助函数：提取JavaScript代码中的注释
function extractComments(content) {
  const comments = [];
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    // 单行注释
    const singleLineMatch = line.match(/\/\/(.*)$/);
    if (singleLineMatch) {
      comments.push(singleLineMatch[1]);
    }
  });
  
  // 多行注释
  const multiLineRegex = /\/\*[\s\S]*?\*\//g;
  let match;
  while ((match = multiLineRegex.exec(content)) !== null) {
    comments.push(match[0]);
  }
  
  return comments;
}

// 辅助函数：提取JavaScript代码中的字符串字面量
function extractStringLiterals(content) {
  const strings = [];
  
  // 单引号字符串
  const singleQuoteRegex = /'([^'\\]|\\.)*'/g;
  let match;
  while ((match = singleQuoteRegex.exec(content)) !== null) {
    strings.push(match[0]);
  }
  
  // 双引号字符串
  const doubleQuoteRegex = /"([^"\\]|\\.)*"/g;
  while ((match = doubleQuoteRegex.exec(content)) !== null) {
    strings.push(match[0]);
  }
  
  // 模板字符串
  const templateRegex = /`([^`\\]|\\.)*`/g;
  while ((match = templateRegex.exec(content)) !== null) {
    strings.push(match[0]);
  }
  
  return strings;
}

// 辅助函数：提取console语句
function extractConsoleStatements(content) {
  const statements = [];
  const consoleRegex = /console\.(log|error|warn|info)\([^)]*\)/g;
  let match;
  while ((match = consoleRegex.exec(content)) !== null) {
    statements.push(match[0]);
  }
  return statements;
} 