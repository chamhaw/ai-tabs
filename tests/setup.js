/**
 * Jest 测试环境设置
 * 为Chrome扩展API提供mock支持
 */

// 导入 jest-chrome 来模拟 Chrome API
const { chrome } = require('jest-chrome');

// 全局Chrome API mock
global.chrome = chrome;

// Mock fetch API
global.fetch = jest.fn();

// Mock TextEncoder/TextDecoder (Node.js 环境可能需要)
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Mock crypto API (用于安全模块测试)
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      digest: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn()
    }
  }
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// 模拟安全存储 - 与实际security.js保持一致
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

// Mock DOM methods
Object.defineProperty(window, 'location', {
  value: {
    href: 'chrome-extension://test/options.html',
    protocol: 'chrome-extension:',
    host: 'test',
    pathname: '/options.html'
  }
});

// Mock console methods for cleaner test output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  info: jest.fn()
};

// 在每个测试前重置所有的mock
beforeEach(() => {
  // 重置Chrome API mocks (安全检查)
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get.mockReset && chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset && chrome.storage.local.set.mockReset();
    chrome.storage.local.remove.mockReset && chrome.storage.local.remove.mockReset();
  }
  if (chrome.tabs) {
    chrome.tabs.query.mockReset && chrome.tabs.query.mockReset();
    chrome.tabs.group && chrome.tabs.group.mockReset && chrome.tabs.group.mockReset();
    chrome.tabs.ungroup && chrome.tabs.ungroup.mockReset && chrome.tabs.ungroup.mockReset();
    chrome.tabs.move && chrome.tabs.move.mockReset && chrome.tabs.move.mockReset();
  }
  if (chrome.tabGroups) {
    chrome.tabGroups.query && chrome.tabGroups.query.mockReset && chrome.tabGroups.query.mockReset();
    chrome.tabGroups.update && chrome.tabGroups.update.mockReset && chrome.tabGroups.update.mockReset();
  }
  if (chrome.windows) {
    chrome.windows.getLastFocused.mockReset && chrome.windows.getLastFocused.mockReset();
  }
  if (chrome.runtime) {
    chrome.runtime.getURL.mockReset && chrome.runtime.getURL.mockReset();
  }
  if (chrome.i18n) {
    chrome.i18n.getUILanguage.mockReset && chrome.i18n.getUILanguage.mockReset();
  }
  
  // 重置fetch mock
  fetch.mockReset();
  
  // 重置localStorage mock
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  
  // 重置console mocks
  console.warn.mockReset();
  console.error.mockReset();
  console.log.mockReset();
  console.info.mockReset();
});

// 测试后清理
afterEach(() => {
  // 清理DOM变化
  document.body.innerHTML = '';
  document.head.innerHTML = '';
}); 