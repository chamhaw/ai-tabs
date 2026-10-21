const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const messages = require('../src/_locales/en/messages.json');
const { client, chatResponse } = require('./helpers/model-client');

// Exercise the production entry points; only browser, storage and network are faked.
function loadSource(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const module = { exports: {} };
  const sourceRequire = (id) => {
    if (id in dependencies) return dependencies[id];
    if (id === './modules/model-client') return client;
    if (id === './modules/security') return { extensionStorage: { getApiKey: async () => 'test-key' } };
    if (id === './modules/i18n') return {
      initI18n: async () => {},
      customI18n: {
        initialized: true,
        currentLanguage: 'en',
        getMessage: (key, substitutions) => (messages[key]?.message || key).replace('$1', substitutions || '')
      }
    };
    return require(id);
  };
  new Function('require', 'module', 'exports', code)(sourceRequire, module, module.exports);
  return module.exports;
}

const settingsTab = {
  id: 3, windowId: 1, groupId: -1,
  url: 'chrome-extension://pjkjljebedjkcnojgpjhpnppokicnnnl/options.html#providers',
  title: 'AI Tabs 设置'
};
const singleton = { groups: [{ name: 'AI Tabs 扩展设置', tabIds: [3] }] };
let tabs;
let settings;
let startGrouping;
let root;

beforeEach(() => {
  jest.clearAllMocks();
  tabs = [
    { id: 1, windowId: 1, groupId: -1, url: 'chrome://newtab/', title: 'New Tab' },
    { id: 2, windowId: 1, groupId: -1, url: 'chrome://newtab/', title: 'New Tab' },
    settingsTab
  ];
  settings = {
    selectedProvider: 'custom',
    providers: { custom: { apiKey: 'stored-key', baseURL: 'https://provider.example', selectedModel: 'pub-deepseek-v4-flash' } },
    reuseExistingGroups: true
  };
  chrome.storage.local.get.mockImplementation(async () => settings);
  chrome.tabs.query.mockImplementation(async () => tabs);
  chrome.tabs.get.mockImplementation(async (id) => tabs.find(tab => tab.id === id));
  chrome.tabs.group = jest.fn().mockResolvedValue(10);
  chrome.tabs.ungroup = jest.fn().mockResolvedValue(undefined);
  chrome.tabGroups = {
    TAB_GROUP_ID_NONE: -1,
    query: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ id: 10 })
  };
  chrome.windows.get.mockResolvedValue({ id: 1, type: 'normal' });
  chrome.windows.getLastFocused.mockImplementation((options, callback) => callback({ id: 1, type: 'normal' }));
  chrome.runtime.sendMessage.mockResolvedValue(undefined);
  jest.spyOn(chrome.runtime.onMessage, 'addListener').mockImplementation(() => {});
  chrome.i18n.getUILanguage.mockReturnValue('en');
  loadSource('background.ts');
  const listener = chrome.runtime.onMessage.addListener.mock.calls.slice(-1)[0][0];
  startGrouping = () => new Promise(resolve => listener({ type: 'START_GROUPING' }, {}, resolve));
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  jest.restoreAllMocks();
});

function respondWith(content) {
  fetch.mockResolvedValue(chatResponse(typeof content === 'string' ? content : JSON.stringify(content)));
}

test.each([singleton, { groups: [] }])('no eligible groups finishes normally and leaves tabs alone: %j', async (response) => {
  respondWith(response);
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).not.toHaveBeenCalled();
  expect(chrome.tabs.ungroup).not.toHaveBeenCalled();
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
    type: 'GROUPING_FINISHED', success: true, messageKey: 'grouping_no_matches'
  });
});

test('the AI receives the configured minimum and permission to return no groups', async () => {
  settings.minTabsInGroup = 3;
  respondWith({ groups: [] });
  await startGrouping();
  const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
  expect(prompt).toContain('at least 3 tabs');
  expect(prompt).toContain('{"groups": []}');
});

test.each([
  ['pub-deepseek-v4-flash', true],
  ['deepseek/deepseek-v4-pro', true],
  ['custom-model', false]
])('grouping uses supported non-thinking mode without sending vendor parameters to unrelated models: %s', async (model, supported) => {
  settings.providers.custom.selectedModel = model;
  respondWith({ groups: [] });
  expect(await startGrouping()).toMatchObject({ success: true });
  const request = JSON.parse(fetch.mock.calls[0][1].body);
  expect(request.model).toBe(model);
  expect(request.thinking).toEqual(supported ? { type: 'disabled' } : undefined);
});

test('a single-tab group is created when the user sets the minimum to one', async () => {
  settings.minTabsInGroup = 1;
  respondWith(singleton);
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [3], createProperties: { windowId: 1 } });
});

test.each([false, true])('related tabs are grouped, including reuse of an existing group (reuse=%s)', async (reuse) => {
  tabs = [
    { id: 4, windowId: 1, groupId: reuse ? 10 : -1, url: 'https://example.com/a', title: 'Article A' },
    { id: 5, windowId: 1, groupId: -1, url: 'https://example.com/b', title: 'Article B' }
  ];
  if (reuse) chrome.tabGroups.query.mockResolvedValue([{ id: 10, title: 'Articles' }]);
  respondWith({ groups: [{ name: 'Articles', tabIds: reuse ? [5] : [4, 5] }] });
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledWith(reuse ? { tabIds: [5], groupId: 10 } : { tabIds: [4, 5], createProperties: { windowId: 1 } });
});

test.each(['not JSON', { result: [] }, { groups: [{ name: 'Invalid', tabs: [settingsTab] }] }])('malformed AI responses still fail: %j', async (response) => {
  respondWith(response);
  expect(await startGrouping()).toMatchObject({ success: false });
  expect(chrome.tabs.group).not.toHaveBeenCalled();
  expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
    type: 'GROUPING_FINISHED', success: false
  }));
});

test('browser grouping failures remain errors rather than reporting no changes', async () => {
  settings.minTabsInGroup = 1;
  respondWith(singleton);
  chrome.tabs.group.mockRejectedValue(new Error('Tabs cannot be edited right now'));
  expect(await startGrouping()).toMatchObject({ success: false, error: 'Tabs cannot be edited right now' });
}, 10000);

test('the popup explains that no tabs meet the grouping criteria', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  chrome.runtime.sendMessage.mockImplementation(async (request) => ({ message: messages[request.key]?.message || request.key }));
  const Popup = loadSource('popup.tsx').default;
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Popup)));
  const listener = chrome.runtime.onMessage.addListener.mock.calls.slice(-1)[0][0];
  await act(async () => listener({ type: 'GROUPING_FINISHED', success: true, messageKey: 'grouping_no_matches' }));
  expect(container.textContent).toContain('No tab groups meet the current grouping criteria.');
});

test('a large batch uses compact IDs and groups duplicate URLs as separate tabs', async () => {
  tabs = Array.from({ length: 200 }, (_, index) => ({
    id: index + 10, windowId: 1, groupId: -1,
    url: `https://example.com/article/${Math.floor(index / 2)}`, title: `Article ${index}`
  }));
  const ids = tabs.map(tab => tab.id);
  tabs.push({ id: 999, windowId: 1, groupId: -1, url: 'chrome://newtab/' });
  respondWith({ groups: [{ name: 'Articles', tabIds: ids }] });
  expect(await startGrouping()).toMatchObject({ success: true });
  const request = JSON.parse(fetch.mock.calls[0][1].body);
  expect(JSON.parse(request.messages.find(message => message.role === 'user').content)).toEqual(tabs.slice(0, 200).map(({ id, url, title }) => ({ id, url, title })));
  expect(request.messages.filter(message => message.role === 'system').map(message => message.content).join('\n')).toContain('"tabIds"');
  expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: ids, createProperties: { windowId: 1 } });
  // Per-tab browser round trips must not grow with the size of the batch.
  expect(chrome.tabs.get).not.toHaveBeenCalled();
});

test('only requested tabs still eligible in the target window can be grouped', async () => {
  settings.minTabsInGroup = 1;
  tabs = [
    { id: 4, windowId: 1, groupId: -1, url: 'https://example.com', title: 'A' },
    { id: 5, windowId: 1, groupId: -1, url: 'https://example.com', title: 'B' },
    { id: 8, windowId: 1, groupId: 10, url: 'https://example.com', title: 'Already grouped' }
  ];
  fetch.mockImplementation(async () => {
    tabs[0] = { ...tabs[0], windowId: 2 };
    tabs.push(
      { id: 6, windowId: 1, groupId: -1, url: 'https://example.com', title: 'Opened later' },
      { id: 7, windowId: 2, groupId: -1, url: 'https://example.com', title: 'Other window' }
    );
    return chatResponse(JSON.stringify({ groups: [{ name: 'Articles', tabIds: [4, 4, 5, 6, 7, 8, 12345] }] }));
  });
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledTimes(1);
  expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [5], createProperties: { windowId: 1 } });
});

test('a tab repeated across AI groups is assigned only once', async () => {
  settings.minTabsInGroup = 1;
  respondWith({ groups: [
    { name: 'Settings', tabIds: [3, 3] },
    { name: 'Extension', tabIds: [3] }
  ] });
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledTimes(1);
  expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [3], createProperties: { windowId: 1 } });
});

test('later groups skip tabs moved out while earlier groups are being applied', async () => {
  settings.minTabsInGroup = 1;
  tabs = [
    { id: 4, windowId: 1, groupId: -1, url: 'https://example.com/a', title: 'A' },
    { id: 5, windowId: 1, groupId: -1, url: 'https://example.com/b', title: 'B' }
  ];
  respondWith({ groups: [{ name: 'A', tabIds: [4] }, { name: 'B', tabIds: [5] }] });
  chrome.tabs.group.mockImplementation(async () => {
    tabs[1] = { ...tabs[1], windowId: 2 };
    return 10;
  });
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledTimes(1);
  expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [4], createProperties: { windowId: 1 } });
});

test('system pages alone finish without sending an AI request', async () => {
  tabs = tabs.slice(0, 2);
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(fetch).not.toHaveBeenCalled();
});

test('a cold worker prepares the prompt in the saved language with one language lookup', async () => {
  const i18n = loadSource('modules/i18n.ts');
  settings.language = 'zh_CN';
  chrome.runtime.getURL.mockImplementation(file => `chrome-extension://test/${file}`);
  let prompt;
  let languageReads = 0;
  chrome.storage.local.get.mockImplementation(async (keys) => {
    if (keys.includes('userLanguage')) languageReads++;
    return settings;
  });
  fetch.mockImplementation(async (url, options) => {
    if (url.startsWith('chrome-extension://')) {
      return { ok: true, json: async () => require('../src/_locales/zh_CN/messages.json') };
    }
    prompt = JSON.parse(options.body).messages.filter(message => message.role === 'system').map(message => message.content).join('\n');
    return chatResponse('{"groups":[]}');
  });
  loadSource('background.ts', { './modules/i18n': i18n });
  const listener = chrome.runtime.onMessage.addListener.mock.calls.slice(-1)[0][0];
  const response = await new Promise(resolve => listener({ type: 'START_GROUPING' }, {}, resolve));
  expect(response.success).toBe(true);
  expect(prompt).toContain('新建分组必须至少包含 2 个标签页');
  expect(prompt).toContain('"tabIds"');
  expect(languageReads).toBe(1);
});

test('clicking starts grouping without waiting for progress translation and stays disabled until done', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  let finishProgress;
  chrome.runtime.sendMessage.mockImplementation((request) => {
    if (request.key === 'grouping_in_progress') return new Promise(resolve => { finishProgress = resolve; });
    return Promise.resolve({ message: messages[request.key]?.message || request.key });
  });
  const Popup = loadSource('popup.tsx').default;
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Popup)));
  const button = container.querySelector('#smart-group-button');
  await act(async () => button.click());
  const startedImmediately = chrome.runtime.sendMessage.mock.calls.some(([request]) => request.type === 'START_GROUPING');
  expect(button.disabled).toBe(true);
  const listener = chrome.runtime.onMessage.addListener.mock.calls.slice(-1)[0][0];
  await act(async () => listener({ type: 'GROUPING_FINISHED', success: true }));
  await act(async () => finishProgress({ message: 'Grouping in progress' }));
  // A late translation must not replace the result or re-enable a second request mid-flight.
  expect(container.textContent).toContain(messages.log_grouping_completed.message);
  expect(button.disabled).toBe(false);
  expect(startedImmediately).toBe(true);
});
