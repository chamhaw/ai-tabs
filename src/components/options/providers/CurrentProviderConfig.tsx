import React, { useState, useEffect } from 'react';

const CurrentProviderConfig = () => {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providerConfig, setProviderConfig] = useState<any>({});
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [formState, setFormState] = useState<any>({});
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<any>({});

  useEffect(() => {
    // Load initial data from chrome.storage.local
    chrome.storage.local.get(['selectedProvider', 'providers', 'globalSettings'], (result) => {
      const { selectedProvider, providers, globalSettings } = result;
      if (selectedProvider) {
        setSelectedProvider(selectedProvider);
        if (providers && providers[selectedProvider]) {
          const providerConfig = providers[selectedProvider];
          
          // Decrypt API key with unified secureStorage
          let decryptedConfig = { ...providerConfig };
          if (providerConfig.apiKey && typeof providerConfig.apiKey === 'string') {
            try {
              const ss = (window as any).secureStorage;
              if (ss && ss.encryption && typeof ss.encryption.decrypt === 'function') {
                decryptedConfig.apiKey = ss.encryption.decrypt(providerConfig.apiKey);
              } else {
                decryptedConfig.apiKey = '';
              }
            } catch (e) {
              decryptedConfig.apiKey = '';
            }
          }
          
          setProviderConfig(decryptedConfig);
          setFormState(decryptedConfig);
          if (providerConfig.models) {
            setModels(providerConfig.models);
          }
        }
      }
      if (globalSettings) {
        setGlobalSettings(globalSettings);
      }
    });
  }, []);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setSelectedProvider(provider);
    // Load provider config
    chrome.storage.local.get('providers', (result) => {
      if (result.providers && result.providers[provider]) {
        const providerConfig = result.providers[provider];
        
        // Decrypt API key with unified secureStorage
        let decryptedConfig = { ...providerConfig };
        if (providerConfig.apiKey && typeof providerConfig.apiKey === 'string') {
          try {
            const ss = (window as any).secureStorage;
            if (ss && ss.encryption && typeof ss.encryption.decrypt === 'function') {
              decryptedConfig.apiKey = ss.encryption.decrypt(providerConfig.apiKey);
            } else {
              decryptedConfig.apiKey = '';
            }
          } catch (e) {
            decryptedConfig.apiKey = '';
          }
        }
        
        setProviderConfig(decryptedConfig);
        setFormState(decryptedConfig);
        if (providerConfig.models) {
          setModels(providerConfig.models);
        } else {
          setModels([]);
        }
      } else {
        setProviderConfig({});
        setFormState({});
        setModels([]);
      }
    });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveConfig = () => {
    chrome.storage.local.get('providers', (result) => {
      const providers = result.providers || {};
      
      // Prepare config to save
      const configToSave = { ...formState };
      
      // Encrypt API key if provided using unified secureStorage
      if (configToSave.apiKey && configToSave.apiKey.trim()) {
        try {
          const ss = (window as any).secureStorage;
          if (ss && ss.encryption && typeof ss.encryption.encrypt === 'function') {
            configToSave.apiKey = ss.encryption.encrypt(configToSave.apiKey.trim());
          } else {
            throw new Error('secureStorage not available');
          }
        } catch (e) {
          console.error('API key encryption failed:', e);
          return;
        }
      }
      
      providers[selectedProvider] = configToSave;
      chrome.storage.local.set({ providers }, () => {
        setProviderConfig(formState); // Keep decrypted version in UI
        setShowConfigForm(false);
      });
    });
  };

  const handleRefreshModels = async () => {
    setLoadingModels(true);
    // Mock model loading
    setTimeout(() => {
      const newModels = ['model-1', 'model-2', 'model-3'];
      setModels(newModels);
      setFormState({
        ...formState,
        models: newModels,
      });
      setLoadingModels(false);
    }, 1000);
  };

  const handleGlobalSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGlobalSettings({
      ...globalSettings,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveGlobalSettings = () => {
    chrome.storage.local.set({ globalSettings });
  };

  return (
    <div className="tab-content active" id="tab-current">
      <div className="settings-section">
        <div className="form-group">
          <label htmlFor="providerSelect" data-i18n="provider_select">Provider</label>
          <select id="providerSelect" value={selectedProvider} onChange={handleProviderChange}>
            <option value="openai" data-i18n="provider_openai"></option>
            <option value="deepseek" data-i18n="provider_deepseek"></option>
            <option value="anthropic" data-i18n="provider_anthropic"></option>
            <option value="google" data-i18n="provider_google"></option>
            <option value="alibaba" data-i18n="provider_alibaba"></option>
            <option value="baidu" data-i18n="provider_baidu"></option>
            <option value="zhipu" data-i18n="provider_zhipu"></option>
            <option value="moonshot" data-i18n="provider_moonshot"></option>
            <option value="01ai" data-i18n="provider_01ai"></option>
            <option value="minimax" data-i18n="provider_minimax"></option>
            <option value="doubao" data-i18n="provider_doubao"></option>
            <option value="xunfei" data-i18n="provider_xunfei"></option>
            <option value="sensetime" data-i18n="provider_sensetime"></option>
            <option value="stepfun" data-i18n="provider_stepfun"></option>
            <option value="tencent" data-i18n="provider_tencent"></option>
            <option value="custom" data-i18n="provider_custom"></option>
          </select>
          <small className="form-description" data-i18n="provider_select_description">Choose AI provider</small>
        </div>

        <div id="providerConfigStatus" className="provider-config-status">
          <div className="config-status-item">
            <span className="config-label" data-i18n="api_key_status">API Key Status</span>
            <span id="apiKeyStatus" className="config-value">{providerConfig.apiKey ? 'Configured' : 'Not Configured'}</span>
          </div>
          <div className="config-status-item">
            <span className="config-label" data-i18n="base_url_status">Base URL</span>
            <span id="baseURLStatus" className="config-value">{providerConfig.baseURL || '--'}</span>
          </div>
          <div className="config-status-item">
            <span className="config-label" data-i18n="selected_model_status">Selected Model</span>
            <span id="selectedModelStatus" className="config-value">{providerConfig.selectedModel || 'Not Selected'}</span>
          </div>
          <button type="button" id="configureProviderBtn" className="btn btn-primary btn-small" onClick={() => setShowConfigForm(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <span>Configure</span>
          </button>
        </div>

        {showConfigForm && (
          <div id="providerConfigForm" className="provider-config-form">
            <div className="form-group">
              <label htmlFor="baseURL">API Base URL</label>
              <input type="text" id="baseURL" name="baseURL" value={formState.baseURL || ''} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="apiKey">API Key</label>
              <input type="password" id="apiKey" name="apiKey" value={formState.apiKey || ''} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label htmlFor="selectedModel">Model</label>
              <div className="model-select-container">
                <select id="selectedModel" name="selectedModel" value={formState.selectedModel || ''} onChange={handleFormChange}>
                  {models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                <button type="button" className="refresh-btn" onClick={handleRefreshModels} disabled={loadingModels}>
                  {loadingModels ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={handleSaveConfig}>Save</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowConfigForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h4 data-i18n="global_settings">Global Settings</h4>
          <div className="form-group">
            <label htmlFor="groupingStrategy">Grouping Strategy</label>
            <input type="text" id="groupingStrategy" name="groupingStrategy" value={globalSettings.groupingStrategy || ''} onChange={handleGlobalSettingsChange} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={handleSaveGlobalSettings}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentProviderConfig;