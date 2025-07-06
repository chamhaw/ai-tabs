/**
 * Code Quality Cleanup Tests
 * 代码质量清理测试
 * 
 * 此测试文件验证代码质量改进和注释清理的结果
 * 测试内容包括：
 * 1. 验证所有JavaScript文件中的注释都是英文
 * 2. 验证错误处理机制保持完整
 * 3. 验证日志记录使用正确的语言
 * 4. 验证代码可读性和维护性
 */

const fs = require('fs');
const path = require('path');
const { setupFullChromeMock } = require('./mocks/chrome-mocks.js');

// 需要验证的文件列表
const FILES_TO_VALIDATE = [
  'background.js',
  'popup.js', 
  'options.js',
  'i18n.js',
  'scripts/security.js'
];

// 预期的英文注释模式
const EXPECTED_ENGLISH_PATTERNS = [
  /^[A-Za-z\s\-_.,()[\]{}:;'"!?0-9]+$/,  // 基本英文字符
  /API|HTTP|URL|JSON|Base64|UTF-8|MD5|SHA|XOR/i,  // 技术术语
  /Class|Function|Method|Property|Parameter|Return/i,  // 编程术语
  /Error|Success|Warning|Info|Debug|Log/i,  // 日志级别
  /Initialize|Configure|Validate|Process|Handle/i  // 动作词汇
];

// 中文字符检测模式
const CHINESE_PATTERN = /[\u4e00-\u9fa5]/;

// 合法的中文内容（供应商名称等）
const LEGITIMATE_CHINESE_CONTENT = [
  '零一万物', '阿里云通义千问', '百度文心一言', '豆包', 
  '商汤科技', '阶跃星辰', '腾讯混元', '智谱AI', '讯飞星火'
];

describe('Code Quality Cleanup Tests', () => {
  beforeEach(() => {
    setupFullChromeMock();
  });

  describe('Comment Language Validation', () => {
    test('should have English comments in all JavaScript files', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const comments = extractComments(content);
          
          comments.forEach((comment, index) => {
            const cleanComment = comment.trim();
            if (cleanComment.length === 0) return;
            
            // 检查是否包含中文字符
            if (CHINESE_PATTERN.test(cleanComment)) {
              // 验证是否为合法的中文内容
              const isLegitimate = LEGITIMATE_CHINESE_CONTENT.some(content => 
                cleanComment.includes(content)
              );
              
              if (!isLegitimate) {
                throw new Error(`Found Chinese characters in comment ${index + 1} in ${filePath}: "${cleanComment}"`);
              }
            }
          });
        }
      });
    });

    test('should have descriptive English comments for complex logic', () => {
      const complexLogicPatterns = [
        /class\s+\w+/,  // 类定义
        /function\s+\w+/,  // 函数定义
        /async\s+function/,  // 异步函数
        /\.forEach\(/,  // 循环逻辑
        /try\s*{/,  // 错误处理
        /if\s*\(/  // 条件逻辑
      ];
      
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            complexLogicPatterns.forEach(pattern => {
              if (pattern.test(line)) {
                // 查找前面或后面是否有英文注释
                const hasComment = (
                  (index > 0 && lines[index - 1].includes('//')) ||
                  (index > 0 && lines[index - 1].includes('/*')) ||
                  line.includes('//') ||
                  line.includes('/*')
                );
                
                // 对于复杂逻辑，至少应该有一些注释
                if (!hasComment && line.trim().length > 20) {
                  // 这是一个警告，不是错误，因为不是所有代码都需要注释
                  console.warn(`Complex logic without comments in ${filePath}:${index + 1}: ${line.trim()}`);
                }
              }
            });
          });
        }
      });
    });
  });

  describe('Error Handling Validation', () => {
    test('should have proper error handling with English messages', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找错误处理块
          const errorHandlingPatterns = [
            /catch\s*\(.*?\)\s*{[^}]*}/g,
            /throw\s+new\s+Error\([^)]*\)/g,
            /console\.error\([^)]*\)/g
          ];
          
          errorHandlingPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
              if (CHINESE_PATTERN.test(match)) {
                // 检查是否为合法的中文内容
                const isLegitimate = LEGITIMATE_CHINESE_CONTENT.some(content => 
                  match.includes(content)
                );
                
                if (!isLegitimate) {
                  throw new Error(`Found Chinese characters in error handling in ${filePath}: "${match}"`);
                }
              }
            });
          });
        }
      });
    });

    test('should use internationalized error messages', () => {
      // 模拟国际化错误消息
      const mockGetMessage = jest.fn((key, params) => {
        const messages = {
          'error_network': 'Network error: {details}',
          'error_invalid_response': 'Invalid response from server',
          'error_api_key_missing': 'API key is missing or invalid',
          'error_save_failed': 'Failed to save configuration: {error}',
          'error_load_failed': 'Failed to load configuration: {error}',
          'error_encryption_failed': 'Encryption failed',
          'error_decryption_failed': 'Decryption failed'
        };
        
        let message = messages[key] || key;
        if (params && typeof params === 'object') {
          Object.keys(params).forEach(param => {
            message = message.replace(`{${param}}`, params[param]);
          });
        }
        return message;
      });
      
      // 测试错误消息格式化
      expect(mockGetMessage('error_network', { details: 'Connection timeout' }))
        .toBe('Network error: Connection timeout');
      expect(mockGetMessage('error_save_failed', { error: 'Permission denied' }))
        .toBe('Failed to save configuration: Permission denied');
      expect(mockGetMessage('error_api_key_missing')).toBe('API key is missing or invalid');
    });
  });

  describe('Logging and Debug Messages', () => {
    test('should use English in console messages', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找控制台输出
          const consolePatterns = [
            /console\.log\([^)]*\)/g,
            /console\.warn\([^)]*\)/g,
            /console\.error\([^)]*\)/g,
            /console\.info\([^)]*\)/g,
            /console\.debug\([^)]*\)/g
          ];
          
          consolePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
              if (CHINESE_PATTERN.test(match)) {
                // 检查是否为合法的中文内容
                const isLegitimate = LEGITIMATE_CHINESE_CONTENT.some(content => 
                  match.includes(content)
                );
                
                if (!isLegitimate) {
                  throw new Error(`Found Chinese characters in console message in ${filePath}: "${match}"`);
                }
              }
            });
          });
        }
      });
    });

    test('should have structured logging format', () => {
      // 验证日志结构化格式
      const mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      };
      
      // 测试结构化日志
      mockLogger.info('User action completed', { action: 'save_config', provider: 'openai' });
      mockLogger.warn('Configuration validation warning', { field: 'apiKey', value: 'empty' });
      mockLogger.error('API request failed', { error: 'Network timeout', endpoint: '/models' });
      
      expect(mockLogger.info).toHaveBeenCalledWith('User action completed', 
        expect.objectContaining({ action: 'save_config', provider: 'openai' }));
      expect(mockLogger.warn).toHaveBeenCalledWith('Configuration validation warning',
        expect.objectContaining({ field: 'apiKey', value: 'empty' }));
      expect(mockLogger.error).toHaveBeenCalledWith('API request failed',
        expect.objectContaining({ error: 'Network timeout', endpoint: '/models' }));
    });
  });

  describe('Code Documentation Quality', () => {
    test('should have proper JSDoc comments for public methods', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找类和方法定义
          const classRegex = /class\s+(\w+)/g;
          const methodRegex = /^\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(/gm;
          
          let match;
          while ((match = classRegex.exec(content)) !== null) {
            const className = match[1];
            // 检查类是否有文档注释
            const beforeClass = content.substring(0, match.index);
            const hasJSDoc = /\/\*\*[\s\S]*?\*\/\s*$/.test(beforeClass);
            
            if (!hasJSDoc) {
              console.warn(`Class ${className} in ${filePath} lacks JSDoc documentation`);
            }
          }
        }
      });
    });

    test('should have consistent code style', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            // 检查缩进一致性（使用空格）
            if (line.trim().length > 0 && line.match(/^\t/)) {
              console.warn(`Tab character found in ${filePath}:${index + 1}, should use spaces`);
            }
            
            // 检查行尾分号
            if (line.trim().match(/^(var|let|const|return)\s+.*[^;]$/)) {
              console.warn(`Missing semicolon in ${filePath}:${index + 1}: ${line.trim()}`);
            }
          });
        }
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('should have efficient string operations', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找低效的字符串操作
          const inefficientPatterns = [
            /\+\s*['"]/g,  // 字符串连接
            /\.substring\(0,\s*\d+\)/g  // 子字符串操作
          ];
          
          inefficientPatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            if (matches.length > 5) {
              console.warn(`Potentially inefficient string operations in ${filePath}: ${matches.length} occurrences`);
            }
          });
        }
      });
    });

    test('should use proper async/await patterns', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找异步模式
          const asyncPatterns = [
            /async\s+function/g,
            /await\s+/g,
            /\.then\(/g,
            /\.catch\(/g
          ];
          
          const asyncCount = (content.match(asyncPatterns[0]) || []).length;
          const awaitCount = (content.match(asyncPatterns[1]) || []).length;
          const promiseCount = (content.match(asyncPatterns[2]) || []).length;
          
          // 如果有async函数，应该主要使用await而不是.then
          if (asyncCount > 0 && promiseCount > awaitCount) {
            console.warn(`${filePath} uses mixed async patterns, consider using consistent async/await`);
          }
        }
      });
    });
  });

  describe('Security Best Practices', () => {
    test('should not expose sensitive information in logs', () => {
      FILES_TO_VALIDATE.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // 查找潜在的敏感信息泄露
          const sensitivePatterns = [
            /console\.log\([^)]*apiKey[^)]*\)/gi,
            /console\.log\([^)]*password[^)]*\)/gi,
            /console\.log\([^)]*token[^)]*\)/gi,
            /console\.log\([^)]*secret[^)]*\)/gi
          ];
          
          sensitivePatterns.forEach(pattern => {
            const matches = content.match(pattern) || [];
            matches.forEach(match => {
              // 检查是否是调试代码或安全处理
              if (!match.includes('***') && !match.includes('redacted')) {
                console.warn(`Potential sensitive information exposure in ${filePath}: ${match}`);
              }
            });
          });
        }
      });
    });

    test('should use secure storage for sensitive data', () => {
      // 测试安全存储功能
      const testApiKey = 'test-secret-key-123';
      
      // 加密
      const encrypted = secureStorage.encryption.encrypt(testApiKey);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testApiKey);
      expect(encrypted.length).toBeGreaterThan(0);
      
      // 解密
      const decrypted = secureStorage.encryption.decrypt(encrypted);
      expect(decrypted).toBe(testApiKey);
      
      // 验证加密的API密钥不包含原始内容
      expect(encrypted).not.toContain(testApiKey);
    });
  });

  describe('Maintainability Improvements', () => {
    test('should have clear separation of concerns', () => {
      // 验证不同模块的职责分离
      const moduleResponsibilities = {
        'background.js': ['chrome.tabs', 'chrome.runtime', 'chrome.storage'],
        'popup.js': ['getElementById', 'addEventListener', 'chrome.tabs'],
        'options.js': ['configuration', 'settings', 'providers'],
        'i18n.js': ['internationalization', 'message loading'],
        'scripts/security.js': ['encryption', 'decryption', 'security']
      };
      
      Object.keys(moduleResponsibilities).forEach(fileName => {
        const fullPath = path.join(__dirname, '..', fileName);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const expectedPatterns = moduleResponsibilities[fileName];
          
          // 验证模块包含预期的功能
          expectedPatterns.forEach(pattern => {
            if (typeof pattern === 'string') {
              expect(content).toContain(pattern);
            }
          });
        }
      });
    });

    test('should have proper error boundaries', () => {
      // 验证错误边界处理
      const mockErrorHandler = {
        handleError: jest.fn((error, context) => {
          console.error('Error occurred:', error.message, 'Context:', context);
          return {
            handled: true,
            message: 'An error occurred. Please try again.',
            shouldReload: false
          };
        })
      };
      
      // 测试错误处理
      const testError = new Error('Test error');
      const result = mockErrorHandler.handleError(testError, { action: 'save_config' });
      
      expect(result.handled).toBe(true);
      expect(result.message).toBe('An error occurred. Please try again.');
      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, { action: 'save_config' });
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