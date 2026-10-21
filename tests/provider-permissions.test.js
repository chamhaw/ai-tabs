const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const storeApiKey = jest.fn(async () => {});

// Run the real TypeScript modules without adding a test-only build dependency.
const modules = new Map();
function loadSource(relativePath) {
  const filename = path.resolve(__dirname, '../src', relativePath);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  const sourceRequire = (id) => {
    if (id.endsWith('/modules/i18n')) return { initI18n: async () => {}, getMessage: (key) => key };
    if (id.endsWith('/modules/security')) return { extensionStorage: { getApiKey: async () => 'test-key', storeApiKey, removeApiKey: async key => chrome.storage.local.remove([`secure_api_${key}`]) } };
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(filename), id);
    return loadSource(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
  };
  new Function('require', 'module', 'exports', code)(sourceRequire, module, module.exports);
  return module.exports;
}

const Options = loadSource('options.tsx').default;
const baseURL = 'https://provider.example/v1';
const origins = ['https://provider.example/*'];
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  crypto.randomUUID = jest.fn(() => 'new-connection');
  window.location.hash = '#providers';
  chrome.permissions.request.mockReset();
  chrome.permissions.contains.mockReset();
  chrome.permissions.remove.mockReset();
  chrome.storage.local.set.mockResolvedValue();
  storeApiKey.mockClear();
  fetch.mockReset();
  chrome.storage.local.set.mockClear();
  chrome.storage.local.remove.mockResolvedValue();
  AbortSignal.timeout = jest.fn(() => undefined);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
});


async function openSettings(providers = {}, selectedProvider = '') {
  chrome.storage.local.get.mockResolvedValue({ providers, selectedProvider });
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Options)));
}

async function input(id, value) {
  const element = document.getElementById(id);
  const setter = Object.getOwnPropertyDescriptor(
    element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value'
  ).set;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}

async function fillConnection() {
  await input('connectionName', 'My work API');
  await input('connectionProtocol', 'anthropic');
  await input('connectionEndpoint', baseURL + '/messages');
  await input('connectionApiKey', 'new-key');
  await input('connectionModel', 'work-model');
}

test('the settings start empty and offer only two protocols when adding a named connection', async () => {
  await openSettings();
  expect(document.querySelectorAll('.provider-item')).toHaveLength(0);
  await act(async () => document.getElementById('addConnection').click());
  expect(Array.from(document.getElementById('connectionProtocol').options).map(o => o.value))
    .toEqual(['openai', 'anthropic']);
  await fillConnection();
  let approve;
  chrome.permissions.request.mockImplementation(() => new Promise(resolve => { approve = resolve; }));
  await act(async () => {
    document.getElementById('saveConnection').click();
    expect(chrome.permissions.request).toHaveBeenCalledWith({ origins });
    expect(storeApiKey).not.toHaveBeenCalled();
    approve(true);
  });
  const saved = chrome.storage.local.set.mock.calls.map(([value]) => value).find(value => value.providers);
  expect(Object.values(saved.providers)).toEqual([expect.objectContaining({
    name: 'My work API', protocol: 'anthropic', baseURL: baseURL + '/messages',
    apiKey: 'STORED_SECURELY', selectedModel: 'work-model'
  })]);
  expect(saved.selectedProvider).toBe(Object.keys(saved.providers)[0]);
  expect(storeApiKey).toHaveBeenCalledWith(saved.selectedProvider, 'new-key');
  expect(JSON.stringify(saved)).not.toContain('new-key');
});

test('denied access leaves the form editable and does not save credentials', async () => {
  await openSettings();
  await act(async () => document.getElementById('addConnection').click());
  await fillConnection();
  chrome.permissions.request.mockResolvedValue(false);
  await act(async () => document.getElementById('saveConnection').click());
  expect(storeApiKey).not.toHaveBeenCalled();
  expect(chrome.storage.local.set).not.toHaveBeenCalled();
  expect(document.getElementById('saveConnection').disabled).toBe(false);
});

test('existing named connections can be selected, edited and deleted without losing another key', async () => {
  await openSettings({
    'custom-123': { name: 'Personal', protocol: 'openai', baseURL, apiKey: 'STORED_SECURELY', selectedModel: 'm1' },
    anthropic: { name: 'Work', baseURL, endpoint: '/messages', apiKey: 'STORED_SECURELY', selectedModel: 'm2' }
  }, 'custom-123');
  await input('connectionSelect', 'anthropic');
  expect(chrome.storage.local.set).toHaveBeenCalledWith({ selectedProvider: 'anthropic' });
  await act(async () => document.querySelector('[data-edit="anthropic"]').click());
  expect(document.getElementById('connectionProtocol').value).toBe('anthropic');
  expect(document.getElementById('connectionEndpoint').value).toBe(baseURL + '/messages');
  await input('connectionName', 'Office');
  chrome.permissions.request.mockResolvedValue(true);
  await act(async () => document.getElementById('saveConnection').click());
  expect(document.body.textContent).toContain('Office');
  global.confirm = jest.fn(() => true);
  await act(async () => document.querySelector('[data-delete="anthropic"]').click());
  const saved = chrome.storage.local.set.mock.calls.map(([value]) => value).filter(value => value.providers).pop();
  expect(Object.keys(saved.providers)).toEqual(['custom-123']);
  expect(saved.selectedProvider).toBe('');
  expect(chrome.storage.local.remove).toHaveBeenCalledWith(['secure_api_anthropic']);
});

test('editing switches directly between saved connections and saves only the displayed item', async () => {
  await openSettings({
    first: { name: 'Personal', protocol: 'openai', baseURL, apiKey: 'STORED_SECURELY', selectedModel: 'personal-model' },
    second: { name: 'Work', protocol: 'anthropic', baseURL, apiKey: 'STORED_SECURELY', selectedModel: 'work-model' }
  }, 'first');
  await act(async () => document.querySelector('[data-edit="first"]').click());
  await input('connectionName', 'Unsaved personal edit');
  await act(async () => document.querySelector('[data-edit="second"]').click());
  expect(document.getElementById('connectionName').value).toBe('Work');
  expect(document.getElementById('connectionProtocol').value).toBe('anthropic');
  expect(document.getElementById('connectionModel').value).toBe('work-model');
  await input('connectionName', 'Office');
  chrome.permissions.request.mockResolvedValue(true);
  await act(async () => document.getElementById('saveConnection').click());
  const saved = chrome.storage.local.set.mock.calls.map(([value]) => value).find(value => value.providers);
  expect(saved.providers.first.name).toBe('Personal');
  expect(saved.providers.second.name).toBe('Office');
  expect(saved.selectedProvider).toBe('first');
  expect(storeApiKey).toHaveBeenCalledWith('second', 'test-key');
});

test('host access is optional at install time', () => {
  const manifest = require('../src/manifest.json');
  expect(manifest.optional_host_permissions).toEqual(expect.arrayContaining(['https://*/*', 'http://*/*']));
  expect(manifest.host_permissions || []).not.toContain('<all_urls>');
});
