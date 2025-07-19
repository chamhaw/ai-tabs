import React, { useState, useEffect } from 'react';

const ProvidersManagement = () => {
  const [providers, setProviders] = useState<any>({});
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [formState, setFormState] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Load providers from chrome.storage.local
    chrome.storage.local.get('providers', (result) => {
      if (result.providers) {
        setProviders(result.providers);
      }
    });
  }, []);

  const handleAddProvider = () => {
    setIsEditing(false);
    setFormState({});
    setShowProviderForm(true);
  };

  const handleEditProvider = (providerKey: string) => {
    setIsEditing(true);
    setFormState(providers[providerKey]);
    setShowProviderForm(true);
  };

  const handleDeleteProvider = (providerKey: string) => {
    const newProviders = { ...providers };
    delete newProviders[providerKey];
    chrome.storage.local.set({ providers: newProviders }, () => {
      setProviders(newProviders);
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProvider = () => {
    const newProviders = { ...providers };
    const providerKey = isEditing ? formState.key : `custom-${Date.now()}`;
    newProviders[providerKey] = formState;
    chrome.storage.local.set({ providers: newProviders }, () => {
      setProviders(newProviders);
      setShowProviderForm(false);
    });
  };

  return (
    <div className="tab-content active" id="tab-manage">
      <div className="providers-management">
        <div className="providers-header">
          <h4 data-i18n="configured_providers">已配置供应商</h4>
          <button type="button" className="btn btn-primary btn-small" onClick={handleAddProvider}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>添加自定义供应商</span>
          </button>
        </div>
        <div id="providersList" className="providers-items">
          {Object.keys(providers).map((key) => (
            <div key={key} className="provider-item">
              <div className="provider-info">
                <div className="provider-name">{providers[key].name}</div>
              </div>
              <div className="provider-actions">
                <button type="button" className="btn btn-secondary btn-icon" onClick={() => handleEditProvider(key)}>编辑</button>
                <button type="button" className="btn btn-secondary btn-icon" onClick={() => handleDeleteProvider(key)}>删除</button>
              </div>
            </div>
          ))}
        </div>
        {showProviderForm && (
          <div id="providerForm" className="provider-form">
            <h4>{isEditing ? '编辑供应商' : '添加自定义供应商'}</h4>
            <div className="form-group">
              <label htmlFor="providerName">供应商名称</label>
              <input type="text" id="providerName" name="name" value={formState.name || ''} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="providerBaseURL">API基础URL</label>
              <input type="url" id="providerBaseURL" name="baseURL" value={formState.baseURL || ''} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="providerEndpoint">聊天端点</label>
              <input type="text" id="providerEndpoint" name="endpoint" value={formState.endpoint || ''} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="providerModels">默认模型</label>
              <textarea id="providerModels" name="models" value={formState.models || ''} onChange={handleFormChange}></textarea>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleSaveProvider}>保存</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowProviderForm(false)}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvidersManagement;
