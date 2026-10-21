import { useEffect, useState } from 'react';
import PasswordInput from './PasswordInput';
import { getMessage } from '../modules/i18n';
import { extensionStorage } from '../modules/security';
import { requestEndpointPermission } from '../utils/permissions';
import { ConnectionConfig, connectionEndpoint, connectionProtocol, Protocol } from '../config/connections';

const emptyForm = { name: '', protocol: 'openai' as Protocol, baseURL: '', apiKey: '', selectedModel: '' };
const storedKey = 'STORED_SECURELY';
const text = (key: string, fallback: string) => {
  const value = getMessage(key);
  return value && value !== key ? value : fallback;
};

export default function ConnectionsSettings() {
  const [connections, setConnections] = useState<Record<string, ConnectionConfig>>({});
  const [selected, setSelected] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingConnection, setLoadingConnection] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    chrome.storage.local.get(['providers', 'selectedProvider']).then(result => {
      setConnections(result.providers || {});
      setSelected(result.selectedProvider || '');
      setReady(true);
    }).catch(error => setStatus(error.message));
  }, []);

  const edit = async (key: string) => {
    setLoadingConnection(true);
    try {
      const config = connections[key];
      const apiKey = await extensionStorage.getApiKey(key);
      setForm({
        name: config.name || key, protocol: connectionProtocol(config, key),
        baseURL: connectionEndpoint({ ...config, providerId: key }),
        apiKey: apiKey || (config.apiKey === storedKey ? '' : config.apiKey) || '',
        selectedModel: config.selectedModel || ''
      });
      setEditing(key);
      setStatus('');
    } catch (error: any) { setStatus(error.message); }
    finally { setLoadingConnection(false); }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const key = editing || `custom-${crypto.randomUUID()}`;
    setSaving(true);
    setStatus('');
    try {
      // Request permission before the first await, while the save click is still active.
      if (![form.name, form.baseURL, form.apiKey, form.selectedModel].every(value => value.trim())) {
        throw new Error(text('connection_required', 'Complete all connection fields'));
      }
      const access = requestEndpointPermission(form.baseURL);
      if (!await access) throw new Error(text('connection_permission_required', 'Network permissions required for this endpoint'));
      const apiKey = form.apiKey.trim();
      await extensionStorage.storeApiKey(key, apiKey);
      const updated = {
        ...connections,
        [key]: {
          name: form.name.trim(), protocol: form.protocol, baseURL: form.baseURL.trim(),
          // Empty suffix marks an exact endpoint; older records may hold base URL + suffix.
          endpoint: '', apiKey: storedKey, selectedModel: form.selectedModel.trim(), configured: true
        }
      };
      const nextSelected = selected || key;
      await chrome.storage.local.set({ providers: updated, selectedProvider: nextSelected });
      setConnections(updated);
      setSelected(nextSelected);
      setEditing(null);
      setForm(emptyForm);
      setStatus(text('connection_saved', 'Connection saved'));
    } catch (error: any) { setStatus(error.message); }
    finally { setSaving(false); }
  };

  const select = async (key: string) => {
    try {
      await chrome.storage.local.set({ selectedProvider: key });
      setSelected(key);
    } catch (error: any) { setStatus(error.message); }
  };

  const remove = async (key: string) => {
    if (!confirm(text('connection_delete_confirm', 'Delete this connection?'))) return;
    try {
      const updated = { ...connections };
      delete updated[key];
      const nextSelected = selected === key ? '' : selected;
      await chrome.storage.local.set({ providers: updated, selectedProvider: nextSelected });
      setConnections(updated);
      setSelected(nextSelected);
      // Remove only this connection's credential, leaving every other key intact.
      await extensionStorage.removeApiKey(key);
    } catch (error: any) { setStatus(error.message); }
  };

  const update = (field: keyof typeof emptyForm, value: string) => setForm(previous => ({ ...previous, [field]: value }));

  return <div className="content-page active" id="page-providers">
    <div className="page-header">
      <h3>{text('nav_providers', 'Connections')}</h3>
      <p>{text('connections_description', 'Add a named connection using OpenAI or Anthropic compatible APIs.')}</p>
    </div>
    <div className="settings-section">
      <div className="form-group">
        <label htmlFor="connectionSelect">{text('connection_active', 'Active connection')}</label>
        <select id="connectionSelect" value={selected} disabled={!ready || saving || loadingConnection || editing !== null} onChange={event => void select(event.target.value)}>
          <option value="">{text('connection_none', 'Select a connection')}</option>
          {Object.entries(connections).map(([key, config]) => <option key={key} value={key}>{config.name || key}</option>)}
        </select>
      </div>
      <button id="addConnection" className="btn btn-primary" disabled={!ready || saving || loadingConnection || editing !== null} onClick={() => { setForm(emptyForm); setEditing(''); setStatus(''); }}>
        {text('connection_add', 'Add connection')}
      </button>
      <div className="providers-items">
        {Object.entries(connections).map(([key, config]) => <div key={key} className="provider-item">
          <div className="provider-info"><div className="provider-name">{config.name || key}</div><div className="provider-details">{config.selectedModel}</div></div>
          <div className="provider-actions">
            <button className="btn btn-secondary" data-edit={key} disabled={saving || loadingConnection} onClick={() => void edit(key)}>{text('edit', 'Edit')}</button>
            <button className="btn btn-secondary" data-delete={key} disabled={saving || loadingConnection || editing !== null} onClick={() => void remove(key)}>{text('delete', 'Delete')}</button>
          </div>
        </div>)}
      </div>
    </div>
    {editing !== null && <form className="settings-section" onSubmit={save}>
      <div className="form-group">
        <label htmlFor="connectionName">{text('connection_name', 'Name')}</label>
        <input id="connectionName" required value={form.name} onChange={event => update('name', event.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="connectionProtocol">{text('connection_protocol', 'Protocol')}</label>
        <select id="connectionProtocol" value={form.protocol} onChange={event => update('protocol', event.target.value)}>
          <option value="openai">OpenAI {text('connection_compatible', 'compatible')}</option>
          <option value="anthropic">Anthropic {text('connection_compatible', 'compatible')}</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="connectionEndpoint">{text('connection_endpoint', 'Full endpoint URL')}</label>
        <input id="connectionEndpoint" type="url" required value={form.baseURL} placeholder={form.protocol === 'openai' ? 'https://example.com/v1/chat/completions' : 'https://example.com/v1/messages'} onChange={event => update('baseURL', event.target.value)} />
      </div>
      <div className="form-group">
        <label htmlFor="connectionApiKey">API Key</label>
        <PasswordInput id="connectionApiKey" required value={form.apiKey} onChange={value => update('apiKey', value)} />
      </div>
      <div className="form-group">
        <label htmlFor="connectionModel">{text('connection_model', 'Model name')}</label>
        <input id="connectionModel" required value={form.selectedModel} onChange={event => update('selectedModel', event.target.value)} />
      </div>
      <div className="form-actions">
        <button id="saveConnection" className="btn btn-primary" type="submit" disabled={saving || loadingConnection}>{text('save', 'Save')}</button>
        <button className="btn btn-secondary" type="button" disabled={saving || loadingConnection} onClick={() => { setEditing(null); setForm(emptyForm); }}>{text('cancel', 'Cancel')}</button>
      </div>
    </form>}
    <p role="status">{status}</p>
  </div>;
}
