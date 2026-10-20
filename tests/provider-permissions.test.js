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
    if (id.endsWith('/modules/security')) return { extensionStorage: { getApiKey: async () => 'test-key', storeApiKey } };
    if (!id.startsWith('.')) return require(id);
    const target = path.resolve(path.dirname(filename), id);
    return loadSource(fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`);
  };
  new Function('require', 'module', 'exports', code)(sourceRequire, module, module.exports);
  return module.exports;
}

const Options = loadSource('options.tsx').default;
const permissions = loadSource('utils/permissions.ts');
const baseURL = 'https://provider.example/v1';
const origins = ['https://provider.example/*'];
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.location.hash = '#providers';
  chrome.permissions.request.mockReset();
  chrome.permissions.contains.mockReset();
  chrome.permissions.remove.mockReset();
  chrome.storage.local.set.mockResolvedValue();
  AbortSignal.timeout = jest.fn(() => undefined);
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
});

async function openRefreshButton(providerKey, modal = false) {
  chrome.storage.local.get.mockResolvedValue({
    selectedProvider: providerKey,
    providers: { [providerKey]: { baseURL, apiKey: 'STORED_SECURELY', models: [] } }
  });
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Options)));
  if (modal) {
    await act(async () => document.querySelector('[data-i18n="tab_manage_providers"]').click());
    await act(async () => document.querySelector('[title="Configure provider"]').click());
  } else {
    await act(async () => document.getElementById('configureProviderBtn').click());
  }
  return document.querySelector('.model-refresh-btn');
}

test('custom HTTP and HTTPS hosts can be requested without granting all hosts on install', () => {
  const manifest = require('../src/manifest.json');
  expect(manifest.optional_host_permissions).toEqual(expect.arrayContaining(['https://*/*', 'http://*/*']));
  expect(manifest.host_permissions || []).not.toContain('<all_urls>');
});

test.each(['custom', 'custom-123'])(
  'refreshing %s models waits for domain approval and shows returned models',
  async (providerKey) => {
    const button = await openRefreshButton(providerKey);
    let approve;
    chrome.permissions.request.mockImplementation(() => new Promise(resolve => { approve = resolve; }));
    fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'example-model' }] }) });
    await act(async () => {
      button.click();
      // A permission request must start during the click, before any async work.
      expect(chrome.permissions.request).toHaveBeenCalledWith({ origins });
      expect(fetch).not.toHaveBeenCalled();
      approve(true);
    });
    expect(fetch).toHaveBeenCalledWith(`${baseURL}/models`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' })
    }));
    expect(document.getElementById('modelSelect').textContent).toContain('example-model');
  }
);

test.each([false, true])('denying model refresh permission prevents any request (modal=%s)', async (modal) => {
  const button = await openRefreshButton(modal ? 'openai' : 'custom-123', modal);
  chrome.permissions.request.mockResolvedValue(false);
  await act(async () => button.click());
  expect(chrome.permissions.request).toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.getElementById('status-message').textContent).toMatch(/permissions required/i);
  expect(button.disabled).toBe(false);
});

test('the provider modal also requests permission before loading models', async () => {
  const button = await openRefreshButton('openai', true);
  chrome.permissions.request.mockResolvedValue(true);
  fetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'modal-model' }] }) });
  await act(async () => {
    button.click();
    expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['https://api.openai.com/*'] });
    expect(fetch).not.toHaveBeenCalled();
  });
  expect(document.getElementById('modalSelectedModel').textContent).toContain('modal-model');
});

test('saved custom providers use their URL for permission checks and removal', async () => {
  chrome.permissions.contains.mockResolvedValue(true);
  chrome.permissions.remove.mockResolvedValue(true);
  await expect(permissions.hasProviderPermissions('custom-123', baseURL)).resolves.toBe(true);
  await expect(permissions.revokeProviderPermissions('custom-123', baseURL)).resolves.toBe(true);
  expect(chrome.permissions.contains).toHaveBeenCalledWith({ origins });
  expect(chrome.permissions.remove).toHaveBeenCalledWith({ origins });
});

test('saving a custom provider requests access during the click and preserves secure key storage', async () => {
  await openRefreshButton('custom-123');
  chrome.permissions.request.mockResolvedValue(true);
  await act(async () => {
    document.querySelector('.form-actions .btn-primary').click();
    expect(chrome.permissions.request).toHaveBeenCalledWith({ origins });
  });
  expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({ providers: {
    'custom-123': expect.objectContaining({ baseURL, apiKey: 'STORED_SECURELY' })
  } }));
});
