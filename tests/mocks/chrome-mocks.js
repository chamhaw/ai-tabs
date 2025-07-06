/**
 * Chrome API Mock Helpers
 * 为不同测试场景提供预配置的Chrome API mock
 */

/**
 * 创建标准的storage.local mock响应
 */
function createStorageMock(data = {}) {
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    const result = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        if (key in data) {
          result[key] = data[key];
        }
      });
    } else if (typeof keys === 'string') {
      if (keys in data) {
        result[keys] = data[keys];
      }
    } else if (keys === null || keys === undefined) {
      Object.assign(result, data);
    }
    callback(result);
  });

  chrome.storage.local.set.mockImplementation((items, callback) => {
    Object.assign(data, items);
    if (callback) callback();
  });

  return data;
}

/**
 * 创建tabs API mock
 */
function createTabsMock(tabs = []) {
  // 确保chrome.tabs存在所有需要的方法
  if (!chrome.tabs.group) {
    chrome.tabs.group = jest.fn();
  }
  if (!chrome.tabs.ungroup) {
    chrome.tabs.ungroup = jest.fn();
  }
  if (!chrome.tabs.move) {
    chrome.tabs.move = jest.fn();
  }

  chrome.tabs.query.mockImplementation((queryInfo, callback) => {
    if (callback) callback(tabs);
    return Promise.resolve(tabs);
  });

  chrome.tabs.group.mockImplementation((options, callback) => {
    const groupId = Math.floor(Math.random() * 1000);
    if (callback) callback(groupId);
    return Promise.resolve(groupId);
  });

  chrome.tabs.ungroup.mockImplementation((tabIds, callback) => {
    if (callback) callback();
    return Promise.resolve();
  });

  chrome.tabs.move.mockImplementation((tabIds, moveProperties, callback) => {
    if (callback) callback();
    return Promise.resolve();
  });

  return tabs;
}

/**
 * 创建windows API mock
 */
function createWindowsMock(window = { id: 1, type: 'normal' }) {
  // 确保chrome.windows存在所有需要的方法
  if (!chrome.windows.get) {
    chrome.windows.get = jest.fn();
  }

  chrome.windows.getLastFocused.mockImplementation((options, callback) => {
    callback(window);
  });

  chrome.windows.get.mockImplementation((windowId, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
    }
    callback(window);
  });

  return window;
}

/**
 * 创建runtime API mock
 */
function createRuntimeMock() {
  chrome.runtime.getURL.mockImplementation((path) => {
    return `chrome-extension://test/${path}`;
  });

  chrome.runtime.onMessage.addListener = jest.fn();
  chrome.runtime.sendMessage = jest.fn();
}

/**
 * 创建i18n API mock
 */
function createI18nMock(language = 'zh-CN') {
  chrome.i18n.getUILanguage.mockReturnValue(language);
  chrome.i18n.getMessage.mockImplementation((key) => {
    // 返回简单的mock消息
    return key.replace(/_/g, ' ');
  });
}

/**
 * 创建完整的Chrome API mock环境
 */
function setupFullChromeMock(config = {}) {
  const {
    storageData = {},
    tabs = [],
    window = { id: 1, type: 'normal' },
    language = 'zh-CN'
  } = config;

  createStorageMock(storageData);
  createTabsMock(tabs);
  createWindowsMock(window);
  createRuntimeMock();
  createI18nMock(language);
  createTabGroupsMock();

  return {
    storageData,
    tabs,
    window,
    language
  };
}

/**
 * 创建tabGroups API mock
 */
function createTabGroupsMock() {
  // 确保chrome.tabGroups存在
  if (!chrome.tabGroups) {
    chrome.tabGroups = {};
  }
  if (!chrome.tabGroups.query) {
    chrome.tabGroups.query = jest.fn();
  }
  if (!chrome.tabGroups.update) {
    chrome.tabGroups.update = jest.fn();
  }

  chrome.tabGroups.query.mockImplementation((queryInfo, callback) => {
    const mockGroups = [];
    if (callback) callback(mockGroups);
    return Promise.resolve(mockGroups);
  });

  chrome.tabGroups.update.mockImplementation((groupId, updateProperties, callback) => {
    if (callback) callback();
    return Promise.resolve();
  });
}

/**
 * 创建fetch API mock
 */
function createFetchMock(responses = {}) {
  fetch.mockImplementation((url, options) => {
    const response = responses[url] || { ok: true, json: () => Promise.resolve({}) };
    
    return Promise.resolve({
      ok: response.ok !== false,
      status: response.status || 200,
      statusText: response.statusText || 'OK',
      json: () => Promise.resolve(response.data || response.json || {}),
      text: () => Promise.resolve(response.text || ''),
      ...response
    });
  });
}

/**
 * 供应商配置mock数据
 */
const mockProviderConfig = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    apiKey: 'test-api-key',
    selectedModel: 'gpt-3.5-turbo',
    models: [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'gpt-4', name: 'GPT-4' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    apiKey: 'test-deepseek-key',
    selectedModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' }
    ]
  }
};

/**
 * 标签页mock数据
 */
const mockTabs = [
  {
    id: 1,
    url: 'https://github.com/user/repo',
    title: 'GitHub Repository',
    windowId: 1,
    groupId: -1
  },
  {
    id: 2,
    url: 'https://stackoverflow.com/questions/123',
    title: 'Stack Overflow Question',
    windowId: 1,
    groupId: -1
  },
  {
    id: 3,
    url: 'https://docs.google.com/document/123',
    title: 'Google Docs',
    windowId: 1,
    groupId: -1
  }
];

// CommonJS exports
module.exports = {
  createStorageMock,
  createTabsMock,
  createWindowsMock,
  createRuntimeMock,
  createI18nMock,
  createTabGroupsMock,
  setupFullChromeMock,
  createFetchMock,
  mockProviderConfig,
  mockTabs
}; 