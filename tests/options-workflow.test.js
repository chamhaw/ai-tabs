const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const messages = { en: require('../src/_locales/en/messages.json'), zh_CN: require('../src/_locales/zh_CN/messages.json') };
const manifest = require('../src/manifest.json');

// Run the real options and i18n code, faking only the extension and HTTP boundaries.
const modules = new Map();
function loadSource(file) {
  const filename = path.resolve(__dirname, '../src', file);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  new Function('require', 'module', 'exports', source)(id => {
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(filename), id);
    return loadSource(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
  }, module, module.exports);
  return module.exports;
}
const Options = loadSource('options.tsx').default;
let root, storage;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.location.hash = '#general';
  storage = { userLanguage: 'en', language: 'en' };
  chrome.storage.local.get.mockImplementation(async () => ({ ...storage }));
  chrome.storage.local.set.mockImplementation(async value => Object.assign(storage, value));
  chrome.storage.local.remove.mockImplementation(async keys => keys.forEach(key => delete storage[key]));
  chrome.storage.local.clear.mockImplementation(async () => { storage = {}; });
  chrome.runtime.getManifest.mockReturnValue(manifest);
  chrome.runtime.getURL.mockImplementation(file => `chrome-extension://test/${file}`);
  chrome.i18n.getUILanguage.mockReturnValue('zh-CN');
  fetch.mockImplementation(async url => ({ ok: true, json: async () => messages[url.includes('zh_CN') ? 'zh_CN' : 'en'] }));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); root = undefined; });
async function open() {
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Options)));
}
async function navigate(index) { await act(async () => document.querySelectorAll('.nav-button')[index].click()); }
async function language(value) {
  await act(async () => {
    const select = document.getElementById('languageSelect');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

test('language changes keep navigation icons and translate pages opened afterwards', async () => {
  await open();
  expect(document.querySelectorAll('.nav-button svg')).toHaveLength(3);
  await language('zh_CN');
  await navigate(2);
  expect(document.querySelector('#page-about .page-header h3').textContent).toBe(messages.zh_CN.nav_about.message);
  expect(document.querySelectorAll('.nav-button svg')).toHaveLength(3);
  await navigate(0);
  await language('en');
  await navigate(2);
  expect(document.querySelector('#page-about .page-header h3').textContent).toBe(messages.en.nav_about.message);
});

test('about displays the installed version and the manifest project link', async () => {
  await open(); await navigate(2);
  expect(document.getElementById('page-about').textContent).toContain(`v${manifest.version}`);
  expect(document.querySelector('#page-about a').href).toBe(manifest.homepage_url);
});

test('clearing cache preserves connection credentials and reset restores auto language and defaults', async () => {
  storage = { ...storage, providers: { test: { name: 'Saved connection' } }, secure_api_test: 'encrypted-fixture', modelCache: ['old-model'], providerCache: {} };
  await open();
  await act(async () => document.querySelector('[data-i18n="clear_cache"]').click());
  expect(storage.modelCache).toBeUndefined(); expect(storage.providerCache).toBeUndefined();
  expect(storage.secure_api_test).toBe('encrypted-fixture');
  global.confirm = jest.fn(() => true);
  await act(async () => document.querySelector('[data-i18n="reset_settings"]').click());
  expect(storage).toEqual({});
  expect(document.getElementById('languageSelect').value).toBe('auto');
  expect(document.querySelector('#page-general .page-header h3').textContent).toBe(messages.zh_CN.nav_general.message);
});
