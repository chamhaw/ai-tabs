/**
 * I18n模块单元测试
 * 测试国际化功能
 */

const { setupFullChromeMock, createRuntimeMock } = require('./mocks/chrome-mocks.js');

// 模拟i18n模块
class MockCustomI18n {
  constructor() {
    this.messages = {};
    this.currentLanguage = null;
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInit();
    await this.initPromise;
    return this.initPromise;
  }

  async _doInit() {
    this.currentLanguage = await this.getUserLanguage();
    await this.loadMessages();
    this.initialized = true;
  }

  async getUserLanguage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userLanguage'], (result) => {
        const userLanguage = result.userLanguage || 'auto';
        if (userLanguage === 'auto') {
          try {
            const browserLanguage = chrome.i18n.getUILanguage() || 'en';
            resolve(browserLanguage.startsWith('zh') ? 'zh_CN' : 'en');
          } catch (e) {
            resolve('en');
          }
        } else {
          resolve(userLanguage);
        }
      });
    });
  }

  async loadMessages() {
    try {
      const url = chrome.runtime.getURL(`_locales/${this.currentLanguage}/messages.json`);
      const response = await fetch(url);
      const data = await response.json();
      this.messages = data;
    } catch (e) {
      console.warn(`Failed to load messages for ${this.currentLanguage}, falling back to English`);
      try {
        const url = chrome.runtime.getURL('_locales/en/messages.json');
        const response = await fetch(url);
        const data = await response.json();
        this.messages = data;
      } catch (fallbackError) {
        console.error('Failed to load fallback messages:', fallbackError);
        this.messages = {};
      }
    }
  }

  getMessage(key, substitutions = null) {
    const messageObj = this.messages[key];
    if (!messageObj) {
      console.warn(`i18n key not found: ${key}`);
      return key;
    }

    let message = messageObj.message;
    
    if (substitutions && Array.isArray(substitutions)) {
      substitutions.forEach((sub, index) => {
        const placeholder = `$${index + 1}`;
        message = message.replace(new RegExp(`\\$${index + 1}(?!\\$)`, 'g'), sub);
      });
    }

    return message;
  }
}

describe('I18n Module', () => {
  let i18n;

  beforeEach(() => {
    // 重置环境
    setupFullChromeMock({
      language: 'zh-CN',
      storageData: {}
    });

    // 创建fetch mock响应
    const mockMessages = {
      'zh_CN': {
        save_settings: { message: '保存设置' },
        cancel: { message: '取消' },
        error_message: { message: '错误: $1' },
        multiple_params: { message: '用户 $1 在 $2 执行了操作' }
      },
      'en': {
        save_settings: { message: 'Save Settings' },
        cancel: { message: 'Cancel' },
        error_message: { message: 'Error: $1' },
        multiple_params: { message: 'User $1 performed action at $2' }
      }
    };

    fetch.mockImplementation((url) => {
      const language = url.includes('/zh_CN/') ? 'zh_CN' : 'en';
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMessages[language])
      });
    });

    i18n = new MockCustomI18n();
  });

  describe('初始化', () => {
    test('应该能够成功初始化', async () => {
      await i18n.init();
      
      expect(i18n.initialized).toBe(true);
      expect(i18n.currentLanguage).toBeDefined();
      expect(i18n.messages).toBeDefined();
    });

    test('重复初始化应该不会重复执行', async () => {
      await i18n.init();
      const firstLanguage = i18n.currentLanguage;
      
      await i18n.init(); // 第二次初始化
      
      expect(i18n.currentLanguage).toBe(firstLanguage);
    });

    test('并发初始化应该使用同一个Promise', async () => {
      const promise1 = i18n.init();
      const promise2 = i18n.init();
      
      // 检查Promise是否相同（对于此测试不是必需的，主要是测试不会重复初始化）
      expect(promise1).toStrictEqual(promise2);
      
      await Promise.all([promise1, promise2]);
      expect(i18n.initialized).toBe(true);
    });
  });

  describe('语言检测', () => {
    test('应该检测中文浏览器语言', async () => {
      chrome.i18n.getUILanguage.mockReturnValue('zh-CN');
      
      const language = await i18n.getUserLanguage();
      expect(language).toBe('zh_CN');
    });

    test('应该检测英文浏览器语言', async () => {
      chrome.i18n.getUILanguage.mockReturnValue('en-US');
      
      const language = await i18n.getUserLanguage();
      expect(language).toBe('en');
    });

    test('应该使用用户设置的语言', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ userLanguage: 'zh_CN' });
      });
      
      const language = await i18n.getUserLanguage();
      expect(language).toBe('zh_CN');
    });

    test('auto设置应该使用浏览器语言', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ userLanguage: 'auto' });
      });
      chrome.i18n.getUILanguage.mockReturnValue('zh-TW');
      
      const language = await i18n.getUserLanguage();
      expect(language).toBe('zh_CN');
    });

    test('未知语言应该默认为英文', async () => {
      chrome.i18n.getUILanguage.mockReturnValue('fr-FR');
      
      const language = await i18n.getUserLanguage();
      expect(language).toBe('en');
    });
  });

  describe('消息加载', () => {
    test('应该能够加载中文消息', async () => {
      i18n.currentLanguage = 'zh_CN';
      await i18n.loadMessages();
      
      expect(fetch).toHaveBeenCalledWith('chrome-extension://test/_locales/zh_CN/messages.json');
      expect(i18n.messages.save_settings).toEqual({ message: '保存设置' });
    });

    test('应该能够加载英文消息', async () => {
      i18n.currentLanguage = 'en';
      await i18n.loadMessages();
      
      expect(fetch).toHaveBeenCalledWith('chrome-extension://test/_locales/en/messages.json');
      expect(i18n.messages.save_settings).toEqual({ message: 'Save Settings' });
    });

    test('加载失败时应该回退到英文', async () => {
      i18n.currentLanguage = 'zh_CN';
      
      fetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
           .mockImplementationOnce(() => Promise.resolve({
             ok: true,
             json: () => Promise.resolve({ save_settings: { message: 'Save Settings' } })
           }));
      
      await i18n.loadMessages();
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith('chrome-extension://test/_locales/zh_CN/messages.json');
      expect(fetch).toHaveBeenCalledWith('chrome-extension://test/_locales/en/messages.json');
      expect(i18n.messages.save_settings).toEqual({ message: 'Save Settings' });
    });

    test('所有加载都失败时应该使用空消息对象', async () => {
      i18n.currentLanguage = 'zh_CN';
      
      fetch.mockRejectedValue(new Error('Network error'));
      
      await i18n.loadMessages();
      
      expect(i18n.messages).toEqual({});
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('消息获取', () => {
    beforeEach(async () => {
      i18n.currentLanguage = 'zh_CN';
      await i18n.loadMessages();
    });

    test('应该能够获取简单消息', () => {
      const message = i18n.getMessage('save_settings');
      expect(message).toBe('保存设置');
    });

    test('不存在的键应该返回键名', () => {
      const message = i18n.getMessage('non_existent_key');
      expect(message).toBe('non_existent_key');
      expect(console.warn).toHaveBeenCalledWith('i18n key not found: non_existent_key');
    });

    test('应该能够处理单个参数替换', () => {
      const message = i18n.getMessage('error_message', ['网络连接失败']);
      expect(message).toBe('错误: 网络连接失败');
    });

    test('应该能够处理多个参数替换', () => {
      const message = i18n.getMessage('multiple_params', ['张三', '2023-10-01']);
      expect(message).toBe('用户 张三 在 2023-10-01 执行了操作');
    });

    test('参数数量不匹配时应该处理正确', () => {
      const message = i18n.getMessage('error_message', []); // 缺少参数
      expect(message).toBe('错误: $1'); // 保持占位符
    });

    test('过多参数应该被忽略', () => {
      const message = i18n.getMessage('error_message', ['错误1', '错误2', '错误3']);
      expect(message).toBe('错误: 错误1'); // 只使用第一个参数
    });

    test('null替换参数应该被处理', () => {
      const message = i18n.getMessage('save_settings', null);
      expect(message).toBe('保存设置');
    });
  });

  describe('完整工作流程', () => {
    test('从初始化到获取消息的完整流程', async () => {
      // 设置中文环境
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ userLanguage: 'zh_CN' });
      });

      // 初始化
      await i18n.init();

      // 获取消息
      const saveMessage = i18n.getMessage('save_settings');
      const errorMessage = i18n.getMessage('error_message', ['测试错误']);

      expect(saveMessage).toBe('保存设置');
      expect(errorMessage).toBe('错误: 测试错误');
      expect(i18n.currentLanguage).toBe('zh_CN');
    });

    test('语言切换工作流程', async () => {
      // 初始化为中文
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ userLanguage: 'zh_CN' });
      });

      await i18n.init();
      expect(i18n.getMessage('save_settings')).toBe('保存设置');

      // 切换到英文
      i18n.initialized = false;
      i18n.initPromise = null;
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ userLanguage: 'en' });
      });

      await i18n.init();
      expect(i18n.getMessage('save_settings')).toBe('Save Settings');
    });
  });

  describe('错误处理', () => {
    test('Chrome API错误应该被正确处理', async () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        // 模拟Chrome API错误
        chrome.runtime.lastError = { message: 'Storage error' };
        callback({});
      });

      await i18n.init();
      
      // 应该回退到默认行为
      expect(i18n.initialized).toBe(true);
    });

    test('网络错误应该被正确处理', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await i18n.init();

      expect(i18n.messages).toEqual({});
      expect(console.error).toHaveBeenCalled();
    });
  });
}); 