const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const messages = require('../src/_locales/en/messages.json');

// Exercise the production entry points; only browser, storage and network are faked.
function loadSource(file) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const module = { exports: {} };
  const sourceRequire = (id) => {
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
const singleton = { groups: [{ name: 'AI Tabs 扩展设置', tabs: [{ url: settingsTab.url, title: settingsTab.title }] }] };
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
  fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] })
  });
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
  const prompt = JSON.parse(fetch.mock.calls[0][1].body).messages[0].content;
  expect(prompt).toContain('at least 3 tabs');
  expect(prompt).toContain('{"groups": []}');
});

test('a single-tab group is created when the user sets the minimum to one', async () => {
  settings.minTabsInGroup = 1;
  respondWith(singleton);
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [3] });
});

test.each([false, true])('related tabs are grouped, including reuse of an existing group (reuse=%s)', async (reuse) => {
  tabs = [
    { id: 4, windowId: 1, groupId: reuse ? 10 : -1, url: 'https://example.com/a', title: 'Article A' },
    { id: 5, windowId: 1, groupId: -1, url: 'https://example.com/b', title: 'Article B' }
  ];
  if (reuse) chrome.tabGroups.query.mockResolvedValue([{ id: 10, title: 'Articles' }]);
  respondWith({ groups: [{ name: 'Articles', tabs: reuse ? [tabs[1]] : tabs }] });
  expect(await startGrouping()).toMatchObject({ success: true });
  expect(chrome.tabs.group).toHaveBeenCalledWith(reuse ? { tabIds: [5], groupId: 10 } : { tabIds: [4, 5] });
});

test.each(['not JSON', { result: [] }])('malformed AI responses still fail: %j', async (response) => {
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
