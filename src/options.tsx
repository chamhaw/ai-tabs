import React, { useState, useEffect } from 'react';
import FormField from './components/FormField';
import PasswordInput from './components/PasswordInput';
import ModelSelect from './components/ModelSelect';
import FormModal from './components/FormModal';

// Provider configuration from original options.js
const PROVIDER_CONFIG: { [key: string]: { name: string; baseURL: string } } = {
  'openai': { name: 'OpenAI', baseURL: 'https://api.openai.com/v1' },
  'deepseek': { name: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1' },
  'anthropic': { name: 'Anthropic', baseURL: 'https://api.anthropic.com/v1' },
  'google': { name: 'Google AI', baseURL: 'https://generativelanguage.googleapis.com/v1beta' },
  'alibaba': { name: '阿里云通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1' },
  'baidu': { name: '百度文心一言', baseURL: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1' },
  'zhipu': { name: '智谱AI', baseURL: 'https://open.bigmodel.cn/api/paas/v4' },
  'moonshot': { name: 'Moonshot AI', baseURL: 'https://api.moonshot.cn/v1' },
  '01ai': { name: '零一万物', baseURL: 'https://api.lingyiwanwu.com/v1' },
  'minimax': { name: 'MiniMax', baseURL: 'https://api.minimax.chat/v1' },
  'doubao': { name: '豆包', baseURL: 'https://ark.cn-beijing.volces.com/api/v3' },
  'xunfei': { name: '讯飞星火', baseURL: 'https://spark-api-open.xf-yun.com/v1' },
  'sensetime': { name: '商汤科技', baseURL: 'https://api.sensenova.cn/v1' },
  'stepfun': { name: '阶跃星辰', baseURL: 'https://api.stepfun.com/v1' },
  'tencent': { name: '腾讯混元', baseURL: 'https://hunyuan.tencentcloudapi.com' },
  'custom': { name: '自定义', baseURL: '' }
};

const Options = () => {
  // Initialize activePage from URL hash or default to 'general'
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const validPages = ['general', 'providers', 'advanced', 'about'];
    return validPages.includes(hash) ? hash : 'general';
  });
  const [activeTab, setActiveTab] = useState('current');
  const [language, setLanguage] = useState('auto');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providers, setProviders] = useState<any>({});
  const [customProviders, setCustomProviders] = useState<any>({});
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [showPasswordVisible, setShowPasswordVisible] = useState(false);
  const [isEditingProvider, setIsEditingProvider] = useState(false);
  const [editingProviderKey, setEditingProviderKey] = useState('');
  const [formState, setFormState] = useState<any>({});
  
  // Modal states
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'config'>('add');
  const [modalProviderKey, setModalProviderKey] = useState<string>('');
  const [modalForm, setModalForm] = useState<any>({});
  const [modalAvailableModels, setModalAvailableModels] = useState<string[]>([]);
  const [modalLoadingModels, setModalLoadingModels] = useState(false);
  
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelCacheStatus, setModelCacheStatus] = useState('');
  const [advancedSettings, setAdvancedSettings] = useState({
    maxTabs: 20,
    autoSave: false,
    cacheTimeout: 30
  });

  useEffect(() => {
    initializeOptions();
    
    // Listen for hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validPages = ['general', 'providers', 'advanced', 'about'];
      if (validPages.includes(hash) && hash !== activePage) {
        setActivePage(hash);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activePage]);

  const initializeOptions = async () => {
    // Initialize i18n
    if (typeof window !== 'undefined' && (window as any).initI18n) {
      await (window as any).initI18n();
    }

    // Load all settings
    await loadAllSettings();
  };

  const loadAllSettings = async () => {
    try {
      // Load basic settings including providers data
      const basicResult = await chrome.storage.local.get([
        'userLanguage',
        'language',
        'selectedProvider',
        'providers',
        'customProviders',
        'groupingStrategy'
      ]);

      console.log('Loaded settings:', basicResult); // Debug log

      if (basicResult.userLanguage || basicResult.language) {
        setLanguage(basicResult.userLanguage || basicResult.language);
      }
      
      // Load all providers data first
      if (basicResult.providers) {
        console.log('Setting providers:', basicResult.providers); // Debug log
        setProviders(basicResult.providers);
      }
      
      // Load custom providers
      if (basicResult.customProviders) {
        console.log('Setting custom providers:', basicResult.customProviders); // Debug log
        setCustomProviders(basicResult.customProviders);
      }
      
      if (basicResult.selectedProvider) {
        console.log('Setting selected provider:', basicResult.selectedProvider); // Debug log
        setSelectedProvider(basicResult.selectedProvider);
        
        // Load provider specific config if exists
        if (basicResult.providers && basicResult.providers[basicResult.selectedProvider]) {
          const providerConfig = basicResult.providers[basicResult.selectedProvider];
          console.log('Loading provider config:', providerConfig); // Debug log
          
          // Decrypt API key if needed (handle encrypted data)
          let decryptedConfig = { ...providerConfig };
          if (providerConfig.apiKey && typeof providerConfig.apiKey === 'string') {
            try {
              // Try to decrypt if it looks like base64 encoded
              if (providerConfig.apiKey.length > 20 && !providerConfig.apiKey.includes(' ')) {
                decryptedConfig.apiKey = atob(providerConfig.apiKey);
              }
            } catch (e) {
              // If decryption fails, use as-is
              console.log('API key decryption failed, using as-is');
            }
          }
          
          setFormState(decryptedConfig);
          
          if (providerConfig.models && Array.isArray(providerConfig.models)) {
            setAvailableModels(providerConfig.models);
          }
        } else {
          // If selected provider exists but no config, set default config
          const defaultConfig = PROVIDER_CONFIG[basicResult.selectedProvider] || {};
          setFormState({
            baseURL: defaultConfig.baseURL || '',
            apiKey: '',
            selectedModel: '',
            models: []
          });
        }
      }
      
      if (basicResult.groupingStrategy) {
        setGlobalSettings((prev: any) => ({ ...prev, groupingStrategy: basicResult.groupingStrategy }));
      }

      // Load advanced settings
      const advancedResult = await chrome.storage.local.get([
        'maxTabs',
        'autoSave', 
        'cacheTimeout'
      ]);

      setAdvancedSettings({
        maxTabs: advancedResult.maxTabs || 20,
        autoSave: advancedResult.autoSave || false,
        cacheTimeout: advancedResult.cacheTimeout || 30
      });

    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleNavigation = (page: string) => {
    setActivePage(page);
    // Update URL hash
    window.location.hash = page;
  };

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    
    try {
      await chrome.storage.local.set({ 
        language: newLanguage,
        userLanguage: newLanguage 
      });
      
      // Show status message
      showStatusMessage('Language settings saved, please refresh page', 'success');
      
      // Re-initialize i18n if available
      if (typeof (window as any).initI18n === 'function') {
        await (window as any).initI18n();
        updateUITranslations();
      }
    } catch (error) {
      console.error('Failed to save language:', error);
      showStatusMessage('Failed to save language settings', 'error');
    }
  };

  const handleProviderChange = async (provider: string) => {
    setSelectedProvider(provider);
    
    try {
      await chrome.storage.local.set({ selectedProvider: provider });
      
      // Load provider config
      if (providers[provider]) {
        setFormState(providers[provider]);
        if (providers[provider].models) {
          setAvailableModels(providers[provider].models);
        } else {
          setAvailableModels([]);
        }
      } else {
        // Set default config for new provider
        const defaultConfig = PROVIDER_CONFIG[provider] || {};
        setFormState({
          baseURL: defaultConfig.baseURL || '',
          apiKey: '',
          selectedModel: '',
          models: []
        });
        setAvailableModels([]);
      }
      
      setShowProviderForm(false); // Hide form when switching providers
      showStatusMessage('Provider selection saved', 'success');
    } catch (error) {
      console.error('Failed to save provider selection:', error);
      showStatusMessage('Failed to save provider selection', 'error');
    }
  };

  const handleProviderConfigChange = (field: string, value: string) => {
    setFormState((prev: any) => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = () => {
    setShowPasswordVisible(!showPasswordVisible);
  };

  const refreshModels = async () => {
    if (!selectedProvider || !formState.apiKey || !formState.baseURL) {
      showStatusMessage('Please configure API Key and Base URL first', 'error');
      return;
    }

    setLoadingModels(true);
    setModelCacheStatus('refreshing');
    
    try {
      showStatusMessage('Fetching model list...', 'info');
      
      // Build correct model endpoint URL
      let modelsUrl;
      const baseURL = formState.baseURL.trim();
      if (baseURL.endsWith('/v1')) {
        modelsUrl = `${baseURL}/models`;
      } else if (baseURL.endsWith('/')) {
        modelsUrl = `${baseURL}models`;
      } else {
        modelsUrl = `${baseURL}/models`;
      }
      
      console.log('Fetching models from:', modelsUrl); // Debug log
      
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${formState.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to get model list: HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response:', data); // Debug log
      
      let models: string[] = [];
      
      if (data.data && Array.isArray(data.data)) {
        // Standard OpenAI-compatible format
        models = data.data
          .filter((model: any) => model.id) // Ensure has ID
          .map((model: any) => model.id)
          .sort();
      } else if (data.models && Array.isArray(data.models)) {
        // Alternative format
        models = data.models
          .filter((model: any) => typeof model === 'string' || model.id)
          .map((model: any) => typeof model === 'string' ? model : model.id)
          .sort();
      } else if (Array.isArray(data)) {
        // Direct array format
        models = data
          .filter((model: any) => typeof model === 'string' || model.id)
          .map((model: any) => typeof model === 'string' ? model : model.id)
          .sort();
      }
      
      if (models.length === 0) {
        console.warn('No models found in API response:', data);
        showStatusMessage('No available models found, please check API configuration', 'warning');
        setAvailableModels([]);
        return;
      }
      
      console.log('Parsed models:', models); // Debug log
      setAvailableModels(models);
      
      // Update formState with models and save to storage
      const updatedFormState = { ...formState, models };
      setFormState(updatedFormState);
      
      // Save models to provider config
      const updatedProviders = {
        ...providers,
        [selectedProvider]: updatedFormState
      };
      setProviders(updatedProviders);
      await chrome.storage.local.set({ providers: updatedProviders });
      
      setModelCacheStatus('cached');
      showStatusMessage(`Successfully loaded ${models.length} models`, 'success');
      
    } catch (error: any) {
      console.error('Failed to refresh models:', error);
      
      if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
        showStatusMessage('Request timeout - please check your network connection', 'error');
      } else if (error.message?.includes('Failed to fetch')) {
        showStatusMessage('Network error - please check API URL and network connection', 'error');
      } else if (error.message?.includes('401')) {
        showStatusMessage('Authentication failed - please check your API key', 'error');
      } else if (error.message?.includes('403')) {
        showStatusMessage('Access forbidden - please check API key permissions', 'error');
      } else if (error.message?.includes('404')) {
        showStatusMessage('API endpoint not found - please check the base URL', 'error');
      } else {
        showStatusMessage(`Failed to refresh models: ${error.message || 'Unknown error'}`, 'error');
      }
      
      setModelCacheStatus('error');
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  const saveProviderConfig = async () => {
    if (!selectedProvider) return;
    
    try {
      // Prepare config to save
      const configToSave = { ...formState };
      
      // Encrypt API key if provided
      if (configToSave.apiKey && configToSave.apiKey.trim()) {
        try {
          // Simple base64 encoding for now (matches original implementation)
          configToSave.apiKey = btoa(configToSave.apiKey.trim());
        } catch (e) {
          console.error('API key encryption failed:', e);
          showStatusMessage('API key encryption failed', 'error');
          return;
        }
      }
      
      // Set configured status based on whether we have both API key and base URL
      configToSave.configured = !!(formState.apiKey && formState.apiKey.trim() && formState.baseURL && formState.baseURL.trim());
      
      // Add provider name and default base URL if not present
      if (!configToSave.name) {
        configToSave.name = PROVIDER_CONFIG[selectedProvider]?.name || selectedProvider;
      }
      if (!configToSave.baseURL && PROVIDER_CONFIG[selectedProvider]?.baseURL) {
        configToSave.baseURL = PROVIDER_CONFIG[selectedProvider].baseURL;
      }
      
      const updatedProviders = {
        ...providers,
        [selectedProvider]: configToSave
      };
      
      await chrome.storage.local.set({ 
        providers: updatedProviders,
        selectedProvider: selectedProvider // Also save selected provider
      });
      
      setProviders(updatedProviders);
      setShowProviderForm(false);
      
      showStatusMessage('Provider configuration saved successfully', 'success');
      
      console.log('Saved provider config:', selectedProvider, configToSave); // Debug log
    } catch (error) {
      console.error('Failed to save provider config:', error);
      showStatusMessage('Failed to save provider configuration', 'error');
    }
  };

  const handleGlobalSettingsChange = (field: string, value: string) => {
    setGlobalSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveGlobalSettings = async () => {
    try {
      await chrome.storage.local.set(globalSettings);
      showStatusMessage('Global settings saved', 'success');
    } catch (error) {
      console.error('Failed to save global settings:', error);
      showStatusMessage('Failed to save global settings', 'error');
    }
  };

  const handleAdvancedSettingChange = (field: string, value: any) => {
    const newSettings = { ...advancedSettings, [field]: value };
    setAdvancedSettings(newSettings);
    
    // Auto-save advanced settings
    chrome.storage.local.set({ [field]: value }).then(() => {
      showStatusMessage('Advanced settings saved', 'success');
    }).catch(error => {
      console.error('Failed to save advanced setting:', error);
      showStatusMessage('Failed to save advanced settings', 'error');
    });
  };

  const clearCache = async () => {
    try {
      // Clear relevant cache data
      await chrome.storage.local.remove(['modelCache', 'providerCache']);
      showStatusMessage('Cache cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      showStatusMessage('Failed to clear cache', 'error');
    }
  };

  const resetSettings = async () => {
    if (confirm('Are you sure you want to reset all settings? This action cannot be undone.')) {
      try {
        await chrome.storage.local.clear();
        await loadAllSettings();
        showStatusMessage('Settings reset successfully', 'success');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        showStatusMessage('Failed to reset settings', 'error');
      }
    }
  };

  const showStatusMessage = (message: string, type: string) => {
    // Create a simple status display
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status-message ${type}`;
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status-message';
      }, 3000);
    }
  };

  const updateUITranslations = () => {
    // Update all elements with data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n');
      if (typeof (window as any).getMessage === 'function') {
        const message = (window as any).getMessage(messageKey);
        if (message && message !== messageKey) {
          (element as HTMLElement).textContent = message;
        }
      }
    });
  };

  const getCurrentProviderStatus = () => {
    if (!selectedProvider) return null;
    
    const config = providers[selectedProvider];
    const isConfigured = config && config.apiKey && config.baseURL;
    
    return {
      apiKeyStatus: config?.apiKey ? '已配置' : '未配置',
      baseURLStatus: config?.baseURL || '--',
      selectedModelStatus: config?.selectedModel || '未选择',
      isConfigured
    };
  };

  const renderGeneralPage = () => (
    <div className="content-page active" id="page-general">
      <div className="page-header">
        <h3 data-i18n="nav_general">常规设置</h3>
        <p data-i18n="general_description">配置基本的AI服务设置和偏好</p>
      </div>
      
      <div className="settings-section">
        <div className="form-group">
          <label htmlFor="languageSelect" data-i18n="language_setting">界面语言</label>
          <select 
            id="languageSelect" 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="auto" data-i18n="language_auto">自动检测</option>
            <option value="zh_CN" data-i18n="language_zh_cn">简体中文</option>
            <option value="en" data-i18n="language_en">English</option>
          </select>
          <small className="form-description" data-i18n="language_setting_description">更改语言后需要重新加载扩展</small>
        </div>
      </div>
    </div>
  );

  const renderProvidersPage = () => {
    const providerStatus = getCurrentProviderStatus();
    
    return (
      <div className="content-page active" id="page-providers">
        <div className="page-header">
          <h3 data-i18n="nav_providers">模型供应商</h3>
          <p data-i18n="providers_description">管理AI模型供应商和相关配置</p>
        </div>

        <div className="provider-tabs">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'current' ? 'active' : ''}`} 
              onClick={() => setActiveTab('current')}
              data-i18n="tab_current_provider"
            >
              当前配置
            </button>
            <button 
              className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`} 
              onClick={() => setActiveTab('manage')}
              data-i18n="tab_manage_providers"
            >
              管理供应商
            </button>
          </div>

          {activeTab === 'current' && (
            <div className="tab-content active" id="tab-current">
              <div className="settings-section">
                <div className="form-group">
                  <label htmlFor="providerSelect" data-i18n="provider_select">选择供应商</label>
                  <select 
                    id="providerSelect" 
                    value={selectedProvider} 
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    <option value="">请选择供应商</option>
                    {Object.keys(PROVIDER_CONFIG).map(key => (
                      <option key={key} value={key}>
                        {PROVIDER_CONFIG[key].name}
                      </option>
                    ))}
                  </select>
                  <small className="form-description" data-i18n="provider_select_description">选择您要使用的AI服务供应商</small>
                </div>
                
                {/* Provider configuration status */}
                {selectedProvider && providerStatus && !showProviderForm && (
                  <div id="providerConfigStatus" className="provider-config-status">
                    <div className="config-status-item">
                      <span className="config-label" data-i18n="api_key_status">API密钥状态</span>
                      <span id="apiKeyStatus" className="config-value">{providerStatus.apiKeyStatus}</span>
                    </div>
                    <div className="config-status-item">
                      <span className="config-label" data-i18n="base_url_status">基础URL</span>
                      <span id="baseURLStatus" className="config-value">{providerStatus.baseURLStatus}</span>
                    </div>
                    <div className="config-status-item">
                      <span className="config-label" data-i18n="selected_model_status">选择的模型</span>
                      <span id="selectedModelStatus" className="config-value">{providerStatus.selectedModelStatus}</span>
                    </div>
                    <button 
                      type="button" 
                      id="configureProviderBtn" 
                      className="btn btn-primary btn-small" 
                      onClick={() => setShowProviderForm(true)}
                      data-i18n="configure_provider"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      <span>配置此供应商</span>
                    </button>
                  </div>
                )}
                
                {/* Provider configuration form */}
                {selectedProvider && showProviderForm && (
                  <div id="providerConfigForm" className="provider-config-form">
                    <h4 data-i18n="provider_configuration">供应商配置</h4>
                    
                    <FormField
                      label="API基础URL"
                      htmlFor="baseURL"
                      description="API服务的基础地址"
                      required
                    >
                      <input 
                        type="text" 
                        id="baseURL"
                        value={formState.baseURL || ''} 
                        onChange={(e) => handleProviderConfigChange('baseURL', e.target.value)}
                        placeholder="Enter API Base URL"
                        required
                      />
                    </FormField>

                    <FormField
                      label="API密钥"
                      htmlFor="apiKey"
                      description="您的API访问密钥，将安全存储"
                      required
                    >
                      <PasswordInput
                        id="apiKey"
                        value={formState.apiKey || ''}
                        onChange={(value) => handleProviderConfigChange('apiKey', value)}
                        placeholder="Enter API Key"
                        required
                      />
                    </FormField>

                    <FormField
                      label="选择模型"
                      htmlFor="modelSelect"
                      description="选择要使用的AI模型"
                    >
                      <ModelSelect
                        id="modelSelect"
                        value={formState.selectedModel || ''}
                        onChange={(value) => handleProviderConfigChange('selectedModel', value)}
                        models={availableModels}
                        onRefresh={refreshModels}
                        loading={loadingModels}
                        disabled={!formState.apiKey}
                      />
                    </FormField>

                    <div className="form-actions">
                      <button type="button" className="btn btn-primary" onClick={saveProviderConfig}>
                        <span data-i18n="save">保存</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setShowProviderForm(false)}
                      >
                        <span data-i18n="cancel">取消</span>
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="settings-section">
                  <h4 data-i18n="global_settings">全局设置</h4>
                  <div className="form-group">
                    <label htmlFor="groupingStrategy" data-i18n="grouping_strategy">分组策略</label>
                    <input 
                      type="text" 
                      id="groupingStrategy"
                      value={globalSettings.groupingStrategy || ''} 
                      onChange={(e) => handleGlobalSettingsChange('groupingStrategy', e.target.value)}
                      placeholder="Enter grouping strategy"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-primary" onClick={saveGlobalSettings}>
                                              <span data-i18n="save">保存</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="tab-content active" id="tab-manage">
              <div className="providers-management">
                <div className="providers-header">
                  <h4 data-i18n="configured_providers">已配置供应商</h4>
                  <button 
                    type="button" 
                    className="btn btn-primary btn-small" 
                    onClick={openAddProviderModal}
                    data-i18n="add_custom_provider"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>添加自定义供应商</span>
                  </button>
                </div>
                
                <div className="providers-items">
                  {renderProvidersList()}
                </div>


              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdvancedPage = () => (
    <div className="content-page active" id="page-advanced">
      <div className="page-header">
        <h3 data-i18n="nav_advanced">高级设置</h3>
        <p data-i18n="advanced_description">高级功能和性能优化设置</p>
      </div>
      <div className="settings-section">
        <div className="advanced-settings-container">
          <div className="form-group">
            <label htmlFor="maxTabs" data-i18n="max_tabs">最大标签页数量</label>
            <input 
              type="number" 
              id="maxTabs" 
              min="1" 
              max="100" 
              value={advancedSettings.maxTabs}
              onChange={(e) => handleAdvancedSettingChange('maxTabs', parseInt(e.target.value))}
            />
            <small className="form-description" data-i18n="max_tabs_description">同时处理的最大标签页数量</small>
          </div>
          <div className="form-group checkbox-group">
            <label htmlFor="autoSave" data-i18n="auto_save">自动保存</label>
            <input 
              type="checkbox" 
              id="autoSave" 
              checked={advancedSettings.autoSave}
              onChange={(e) => handleAdvancedSettingChange('autoSave', e.target.checked)}
            />
            <small className="form-description" data-i18n="auto_save_description">自动保存配置更改</small>
          </div>
          <div className="form-group">
            <label htmlFor="cacheTimeout" data-i18n="cache_timeout">缓存超时时间（分钟）</label>
            <input 
              type="number" 
              id="cacheTimeout" 
              min="1" 
              max="1440" 
              value={advancedSettings.cacheTimeout}
              onChange={(e) => handleAdvancedSettingChange('cacheTimeout', parseInt(e.target.value))}
            />
            <small className="form-description" data-i18n="cache_timeout_description">模型列表缓存的有效时间</small>
          </div>
        </div>
        <div className="form-actions">
          <button onClick={clearCache} className="btn btn-secondary" data-i18n="clear_cache">清除缓存</button>
          <button onClick={resetSettings} className="btn btn-secondary" data-i18n="reset_settings">重置设置</button>
        </div>
      </div>
    </div>
  );

  const renderAboutPage = () => (
    <div className="content-page active" id="page-about">
      <div className="page-header">
        <h3 data-i18n="nav_about">关于 AI Tabs</h3>
        <p data-i18n="about_description">扩展信息和帮助文档</p>
      </div>
      <div className="settings-section">
        <div className="about-content">
          <div className="about-item">
            <h4 data-i18n="version">版本</h4>
            <p>v1.0.0</p>
          </div>
          <div className="about-item">
            <h4 data-i18n="description">描述</h4>
            <p data-i18n="app_description">智能AI标签页管理扩展，支持多种AI服务供应商</p>
          </div>
          <div className="about-item">
            <h4>GitHub</h4>
            <p><a href="https://github.com/ai-tabs/ai-tabs" target="_blank" rel="noopener noreferrer">https://github.com/ai-tabs/ai-tabs</a></p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case 'general':
        return renderGeneralPage();
      case 'providers':
        return renderProvidersPage();
      case 'advanced':
        return renderAdvancedPage();
      case 'about':
        return renderAboutPage();
      default:
        return renderGeneralPage();
    }
  };

  const renderProvidersList = () => {
    // Get all custom providers (those starting with 'custom-')
    const customProviderKeys = Object.keys(providers).filter(key => key.startsWith('custom-'));
    // Get all built-in providers from PROVIDER_CONFIG
    const builtInProviderKeys = Object.keys(PROVIDER_CONFIG).filter(key => key !== 'custom');

    const renderProviderItem = (providerKey: string, isCustom: boolean) => {
      const config = providers[providerKey];
      const baseConfig = PROVIDER_CONFIG[providerKey];
      
      // Determine if configured
      const isConfigured = config && config.configured === true;
      
      // Get provider details
      const providerName = isCustom 
        ? (config?.name || providerKey) 
        : (baseConfig?.name || providerKey);
      
      const providerBaseURL = isCustom 
        ? (config?.baseURL || 'Not set') 
        : (config?.baseURL || baseConfig?.baseURL || 'Default');
      
      const providerEndpoint = isCustom 
        ? (config?.endpoint || '/chat/completions') 
        : '/chat/completions';

      return (
        <div key={providerKey} className="provider-item">
          <div className="provider-info">
            <div className="provider-name">{providerName}</div>
            <div className="provider-type">{isCustom ? '自定义' : '内置'}</div>
            <div className="provider-details">
              <div className="provider-url-info">
                <span className="provider-base-url">基础URL: {providerBaseURL}</span>
                {isCustom && (
                  <span className="provider-endpoint">端点: {providerEndpoint}</span>
                )}
              </div>
              <span className={`status-badge ${isConfigured ? 'configured' : 'not-configured'}`}>
                {isConfigured ? '已配置' : '未配置'}
              </span>
            </div>
          </div>
          <div className="provider-actions">
            {isCustom ? (
              <>
                <button 
                  type="button" 
                  className="btn btn-primary btn-small" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Editing custom provider:', providerKey);
                    setIsEditingProvider(true);
                    setEditingProviderKey(providerKey);
                    setFormState(config || {});
                    setShowProviderForm(true);
                  }}
                  title="编辑供应商"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>编辑</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger btn-small" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`确定要删除自定义供应商 "${providerName}" 吗？`)) {
                      console.log('Deleting custom provider:', providerKey);
                      deleteCustomProvider(providerKey);
                    }
                  }}
                  title="删除供应商"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path>
                  </svg>
                  <span>删除</span>
                </button>
              </>
            ) : (
              <button 
                type="button" 
                className="btn btn-primary btn-small" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openConfigProviderModal(providerKey);
                }}
                title="配置供应商"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span>配置</span>
              </button>
            )}
          </div>
        </div>
      );
    };

    const customProviderItems = customProviderKeys.length > 0 ? customProviderKeys.map(key => renderProviderItem(key, true)) : [];
    const builtInProviderItems = builtInProviderKeys.map(key => renderProviderItem(key, false));

    return (
      <div className="providers-list-container">
        {customProviderItems.length > 0 && (
          <div className="providers-section">
            <h4>自定义供应商</h4>
            {customProviderItems}
          </div>
        )}
        <div className="providers-section">
          <h4>内置供应商</h4>
          {builtInProviderItems}
        </div>
        {customProviderItems.length === 0 && builtInProviderItems.length === 0 && (
          <div className="providers-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
            <div>暂无配置的供应商</div>
            <div>请先添加自定义供应商或在"当前配置"中配置内置供应商</div>
          </div>
        )}
      </div>
    );
  };

  const handleCustomProviderChange = (field: string, value: string) => {
    setFormState((prev: any) => ({ ...prev, [field]: value }));
  };

  const saveCustomProvider = async () => {
    if (!formState.name || !formState.baseURL) {
      showStatusMessage('Provider name and base URL are required', 'error');
      return;
    }

    try {
      const providerKey = isEditingProvider && editingProviderKey 
        ? editingProviderKey 
        : `custom-${Date.now()}`; // Generate a unique key for new providers
      
      const newProviderConfig = {
        name: formState.name,
        baseURL: formState.baseURL,
        endpoint: formState.endpoint || '/chat/completions',
        models: formState.models ? formState.models.split('\n').filter((m: string) => m.trim()) : [],
        apiKey: '', // API key will be set separately in current config
        configured: false // Will be set to true when API key is configured
      };

      const updatedProviders = {
        ...providers,
        [providerKey]: newProviderConfig
      };
      
      setProviders(updatedProviders);
      await chrome.storage.local.set({ providers: updatedProviders });
      
      const message = isEditingProvider ? 'Custom provider updated successfully' : 'Custom provider added successfully';
      showStatusMessage(message, 'success');
      
      // Reset form state
      setShowProviderForm(false);
      setFormState({});
      setIsEditingProvider(false);
      setEditingProviderKey('');
      
      console.log(`${isEditingProvider ? 'Updated' : 'Added'} custom provider:`, providerKey, newProviderConfig);
    } catch (error) {
      console.error('Failed to save custom provider:', error);
      showStatusMessage('Failed to save custom provider', 'error');
    }
  };

  const deleteCustomProvider = (providerKey: string) => {
    if (confirm(`确定要删除自定义供应商 "${providers[providerKey]?.name || providerKey}" 吗？`)) {
      const newProviders = { ...providers };
      delete newProviders[providerKey];
      setProviders(newProviders);
      chrome.storage.local.set({ providers: newProviders });
      showStatusMessage('Custom provider deleted', 'success');
    }
  };

  // Modal related functions
  const handleModalFormChange = (field: string, value: string) => {
    setModalForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const openAddProviderModal = () => {
    setModalMode('add');
    setModalProviderKey('');
    setModalForm({});
    setModalAvailableModels([]);
    setShowProviderModal(true);
  };

  const openConfigProviderModal = (providerKey: string) => {
    setModalMode('config');
    setModalProviderKey(providerKey);
    
    // Load existing config
    const config = providers[providerKey] || {};
    const decryptedConfig = { ...config };
    
    // Decrypt API key if needed
    if (config.apiKey && typeof config.apiKey === 'string') {
      try {
        if (config.apiKey.length > 20 && !config.apiKey.includes(' ')) {
          decryptedConfig.apiKey = atob(config.apiKey);
        }
      } catch (e) {
        // If decryption fails, use as-is
      }
    }
    
    setModalForm(decryptedConfig);
    setModalAvailableModels(config.models || []);
    setShowProviderModal(true);
  };

  const closeModal = () => {
    setShowProviderModal(false);
    setModalMode('add');
    setModalProviderKey('');
    setModalForm({});
    setModalAvailableModels([]);
    setModalLoadingModels(false);
  };

  const refreshModalModels = async () => {
    if (!modalForm.apiKey || !modalForm.baseURL) {
      showStatusMessage('Please configure API Key and Base URL first', 'error');
      return;
    }

    setModalLoadingModels(true);
    
    try {
      let modelsUrl;
      const baseURL = modalForm.baseURL.trim();
      if (baseURL.endsWith('/v1')) {
        modelsUrl = `${baseURL}/models`;
      } else if (baseURL.endsWith('/')) {
        modelsUrl = `${baseURL}models`;
      } else {
        modelsUrl = `${baseURL}/models`;
      }
      
      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${modalForm.apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        throw new Error(`Failed to get model list: HTTP ${response.status}`);
      }

      const data = await response.json();
      let models: string[] = [];
      
      if (data.data && Array.isArray(data.data)) {
        models = data.data
          .filter((model: any) => model.id)
          .map((model: any) => model.id)
          .sort();
      } else if (data.models && Array.isArray(data.models)) {
        models = data.models
          .filter((model: any) => typeof model === 'string' || model.id)
          .map((model: any) => typeof model === 'string' ? model : model.id)
          .sort();
      }
      
      setModalAvailableModels(models);
      
      // Save models to provider config
      const updatedProviders = {
        ...providers,
        [modalProviderKey]: {
          ...providers[modalProviderKey],
          models
        }
      };
      setProviders(updatedProviders);
      await chrome.storage.local.set({ providers: updatedProviders });
      
      showStatusMessage(`Successfully loaded ${models.length} models`, 'success');
      
    } catch (error: any) {
      console.error('Failed to refresh models:', error);
      showStatusMessage(`Failed to refresh models: ${error.message}`, 'error');
    } finally {
      setModalLoadingModels(false);
    }
  };

  const saveFromModal = async () => {
    if (modalMode === 'add') {
      // Add new custom provider
      if (!modalForm.name || !modalForm.baseURL) {
        showStatusMessage('Provider name and base URL are required', 'error');
        return;
      }

      try {
        const providerKey = `custom-${Date.now()}`;
        const newProviderConfig = {
          name: modalForm.name,
          baseURL: modalForm.baseURL,
          endpoint: modalForm.endpoint || '/chat/completions',
          models: modalForm.models ? modalForm.models.split('\n').filter((m: string) => m.trim()) : modalAvailableModels,
          apiKey: '',
          configured: false
        };

        const updatedProviders = {
          ...providers,
          [providerKey]: newProviderConfig
        };
        
        setProviders(updatedProviders);
        await chrome.storage.local.set({ providers: updatedProviders });
        
        showStatusMessage('Custom provider added successfully', 'success');
        closeModal();
        
      } catch (error) {
        console.error('Failed to save custom provider:', error);
        showStatusMessage('Failed to save custom provider', 'error');
      }
    } else {
      // Config existing provider
      try {
        const configToSave = { ...modalForm };
        
        // Encrypt API key if provided
        if (configToSave.apiKey && configToSave.apiKey.trim()) {
          configToSave.apiKey = btoa(configToSave.apiKey.trim());
        }
        
        configToSave.configured = !!(modalForm.apiKey && modalForm.apiKey.trim() && modalForm.baseURL && modalForm.baseURL.trim());
        configToSave.models = modalAvailableModels.length > 0 ? modalAvailableModels : providers[modalProviderKey]?.models || [];
        
        const updatedProviders = {
          ...providers,
          [modalProviderKey]: configToSave
        };
        
        setProviders(updatedProviders);
        await chrome.storage.local.set({ providers: updatedProviders });
        
        showStatusMessage('Provider configuration saved successfully', 'success');
        closeModal();
        
      } catch (error) {
        console.error('Failed to save provider config:', error);
        showStatusMessage('Failed to save provider configuration', 'error');
      }
    }
  };

  return (
    <div className="options-layout">
      {/* Status message area */}
      <div id="status-message" className="status-message"></div>
      
      {/* 左侧菜单栏 */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 data-i18n="options_title">AI Tabs 设置</h2>
        </div>
        
        <nav className="sidebar-nav">
          <ul className="nav-menu">
            <li className="nav-item">
              <button 
                className={`nav-button ${activePage === 'general' ? 'active' : ''}`} 
                onClick={() => handleNavigation('general')}
                data-i18n="nav_general"
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span data-i18n="nav_general">常规设置</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-button ${activePage === 'providers' ? 'active' : ''}`} 
                onClick={() => handleNavigation('providers')}
                data-i18n="nav_providers"
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 19c-5 0-8-3-8-8s3-8 8-8 8 3 8 8-3 8-8 8z"></path>
                  <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path>
                  <path d="M12 1v6m0 6v6"></path>
                </svg>
                <span data-i18n="nav_providers">模型供应商</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-button ${activePage === 'advanced' ? 'active' : ''}`} 
                onClick={() => handleNavigation('advanced')}
                data-i18n="nav_advanced"
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9 8.91 8.26 12 2"></polygon>
                </svg>
                <span data-i18n="nav_advanced">高级设置</span>
              </button>
            </li>
            
            <li className="nav-item">
              <button 
                className={`nav-button ${activePage === 'about' ? 'active' : ''}`} 
                onClick={() => handleNavigation('about')}
                data-i18n="nav_about"
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span data-i18n="nav_about">关于</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* 右侧内容区域 */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* 统一的供应商modal */}
      <FormModal
        show={showProviderModal}
        title={modalMode === 'add' 
          ? '添加自定义供应商' 
          : `配置供应商 - ${PROVIDER_CONFIG[modalProviderKey]?.name || modalProviderKey}`
        }
        primaryButtonText="保存"
        onSave={saveFromModal}
        onCancel={closeModal}
      >
        {modalMode === 'add' && (
          <FormField
            label="供应商名称"
            htmlFor="modalProviderName"
            description="为您的AI供应商起一个容易识别的名称"
            required
          >
            <input 
              type="text" 
              id="modalProviderName"
              value={modalForm.name || ''} 
              onChange={(e) => handleModalFormChange('name', e.target.value)}
              placeholder="为您的AI供应商起一个容易识别的名称"
              required
            />
          </FormField>
        )}
        
        {modalMode === 'config' && (
          <FormField
            label="API Key"
            htmlFor="modalApiKey"
            description="您的API访问密钥，将安全存储"
            required
          >
            <PasswordInput
              id="modalApiKey"
              value={modalForm.apiKey || ''}
              onChange={(value) => handleModalFormChange('apiKey', value)}
              placeholder="请输入您的API Key"
              required
            />
          </FormField>
        )}
        
        <FormField
          label="API基础URL"
          htmlFor="modalBaseURL"
          required
        >
          <input 
            type="url" 
            id="modalBaseURL"
            value={modalForm.baseURL || ''} 
            onChange={(e) => handleModalFormChange('baseURL', e.target.value)}
            placeholder="https://api.example.com/v1"
            required
          />
        </FormField>
        
        {modalMode === 'add' && (
          <FormField
            label="聊天端点"
            htmlFor="modalProviderEndpoint"
          >
            <input 
              type="text" 
              id="modalProviderEndpoint"
              value={modalForm.endpoint || ''} 
              onChange={(e) => handleModalFormChange('endpoint', e.target.value)}
              placeholder="/chat/completions"
            />
          </FormField>
        )}
        
        {modalMode === 'config' && (
          <FormField
            label="选择模型"
            htmlFor="modalSelectedModel"
            description="选择要使用的AI模型"
          >
            <ModelSelect
              id="modalSelectedModel"
              value={modalForm.selectedModel || ''}
              onChange={(value) => handleModalFormChange('selectedModel', value)}
              models={modalAvailableModels}
              onRefresh={refreshModalModels}
              loading={modalLoadingModels}
              disabled={!modalForm.apiKey || !modalForm.baseURL}
            />
          </FormField>
        )}
        
        {modalMode === 'add' && (
          <FormField
            label="默认模型"
            htmlFor="modalProviderModels"
            description="每行输入一个模型名称，留空将自动从API获取"
          >
            <textarea 
              id="modalProviderModels" 
              rows={3}
              value={modalForm.models || ''} 
              onChange={(e) => handleModalFormChange('models', e.target.value)}
              placeholder="每行输入一个模型名称，留空将自动从API获取"
            />
          </FormField>
        )}
      </FormModal>
    </div>
  );
};

export default Options;
