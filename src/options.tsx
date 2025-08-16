import { useState, useEffect } from 'react';
import FormField from './components/FormField';
import PasswordInput from './components/PasswordInput';
import ModelSelect from './components/ModelSelect';
import FormModal from './components/FormModal';
import { requestProviderPermissions, hasProviderPermissions } from './utils/permissions';

import { PROVIDERS, getProvider, createProviderConfig } from './config/providers';

// Type definitions for component state
interface FormState {
  baseURL: string;
  apiKey: string;
  selectedModel: string;
  models: string[];
  name?: string;
  endpoint?: string;
  configured?: boolean;
}

interface GlobalSettings {
  groupingStrategy?: string;
}

interface AdvancedSettings {
  maxTabs: number;
  autoSave: boolean;
  cacheTimeout: number;
}

interface ModalForm {
  name: string;
  baseURL: string;
  apiKey: string;
  selectedModel: string;
}

const Options = () => {
  // Initialize activePage from URL hash or default to 'general'
  const [activePage, setActivePage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const validPages = ['general', 'providers', 'advanced', 'about'];
    return validPages.includes(hash) ? hash : 'general';
  });
  const [activeTab, setActiveTab] = useState('current');
  const [language, setLanguage] = useState('auto');
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render when language changes
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

      if (basicResult.userLanguage || basicResult.language) {
        setLanguage(basicResult.userLanguage || basicResult.language);
      }
      
      // Load all providers data first
      if (basicResult.providers) {
        setProviders(basicResult.providers);
      }
      
      // Load custom providers
      if (basicResult.customProviders) {
        setCustomProviders(basicResult.customProviders);
      }
      
      if (basicResult.selectedProvider) {
        setSelectedProvider(basicResult.selectedProvider);
        
        // Load provider specific config if exists
        if (basicResult.providers && basicResult.providers[basicResult.selectedProvider]) {
          const providerConfig = basicResult.providers[basicResult.selectedProvider];
          
          // Decrypt API key if needed (handle encrypted data)
          let decryptedConfig = { ...providerConfig };
          if (providerConfig.apiKey && typeof providerConfig.apiKey === 'string') {
            try {
              if (typeof (window as any).secureStorage !== 'undefined' && (window as any).secureStorage.encryption && typeof (window as any).secureStorage.encryption.decrypt === 'function') {
                decryptedConfig.apiKey = (window as any).secureStorage.encryption.decrypt(providerConfig.apiKey);
              } else {
                console.error('secureStorage not available in options page');
                decryptedConfig.apiKey = '';
              }
            } catch (e) {
              console.error('API key decryption failed');
              decryptedConfig.apiKey = '';
            }
          }
          
          setFormState(decryptedConfig);
          
          if (providerConfig.models && Array.isArray(providerConfig.models)) {
            setAvailableModels(providerConfig.models);
          }
        } else {
          // If selected provider exists but no config, set default config
          const provider = getProvider(basicResult.selectedProvider);
          if (provider) {
            const defaultConfig = createProviderConfig(basicResult.selectedProvider);
            setFormState(defaultConfig);
          } else {
            setFormState({
              baseURL: '',
              apiKey: '',
              selectedModel: '',
              models: []
            });
          }
        }
      }
      
      if (basicResult.groupingStrategy) {
        setGlobalSettings((prev: GlobalSettings) => ({ ...prev, groupingStrategy: basicResult.groupingStrategy }));
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
      
      // Re-initialize i18n if available
      if (typeof (window as any).initI18n === 'function') {
        await (window as any).initI18n();
        updateUITranslations();
      }
      
      // Force re-render to update all dynamic content
      setRefreshKey(prev => prev + 1);
      
      // Force FormField components to re-render by updating their key
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 100);
      
      // Show success message using the correct language
      const messageKey = 'language_settings_saved';
      const message = typeof (window as any).getMessage === 'function' 
        ? (window as any).getMessage(messageKey) 
        : 'Language settings saved, please refresh page';
      showStatusMessage(message, 'success');
    } catch (error) {
      console.error('Failed to save language:', error);
      const errorMessage = typeof (window as any).getMessage === 'function' 
        ? (window as any).getMessage('language_switch_failed') 
        : 'Failed to save language settings';
      showStatusMessage(errorMessage, 'error');
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
        try {
          const defaultConfig = createProviderConfig(provider);
          setFormState(defaultConfig);
        } catch (error) {
          setFormState({
            baseURL: '',
            apiKey: '',
            selectedModel: '',
            models: []
          });
        }
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
    setFormState((prev: FormState) => ({ ...prev, [field]: value }));
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
      // Check and request permissions before saving
      const customBaseURL = selectedProvider === 'custom' ? formState.baseURL : undefined;
      const hasPermissions = await hasProviderPermissions(selectedProvider, customBaseURL);
      
      if (!hasPermissions) {
        const granted = await requestProviderPermissions(selectedProvider, customBaseURL);
        if (!granted) {
          showStatusMessage('Network permissions required for this provider', 'error');
          return;
        }
      }

      // Prepare config to save
      const configToSave = { ...formState };
      
      // Encrypt API key if provided
      if (configToSave.apiKey && configToSave.apiKey.trim()) {
        try {
          if (typeof (window as any).secureStorage !== 'undefined' && (window as any).secureStorage.encryption && typeof (window as any).secureStorage.encryption.encrypt === 'function') {
            configToSave.apiKey = (window as any).secureStorage.encryption.encrypt(configToSave.apiKey.trim());
          } else {
            throw new Error('secureStorage not available');
          }
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
        configToSave.name = getProviderDisplayName(selectedProvider);
      }
      const provider = getProvider(selectedProvider);
      if (!configToSave.baseURL && provider?.baseURL) {
        configToSave.baseURL = provider.baseURL;
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
    setGlobalSettings((prev: GlobalSettings) => ({ ...prev, [field]: value }));
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

  const getProviderDisplayName = (providerKey: string) => {
    const getLocalizedMessage = (key: string, fallback: string) => {
      return typeof (window as any).getMessage === 'function' 
        ? (window as any).getMessage(key) 
        : fallback;
    };

    // Use i18n keys for provider names
    const provider = getProvider(providerKey);
    return getLocalizedMessage(`provider_${providerKey}`, provider?.name || providerKey);
  };

  const getModalTitle = () => {
    const getLocalizedMessage = (key: string, fallback: string) => {
      return typeof (window as any).getMessage === 'function' 
        ? (window as any).getMessage(key) 
        : fallback;
    };

    if (modalMode === 'add') {
      return getLocalizedMessage('add_custom_provider_modal_title', 'Add custom provider');
    } else {
      const baseTitle = getLocalizedMessage('configure_provider_modal_title', 'Configure provider');
      const providerName = getProviderDisplayName(modalProviderKey);
      return `${baseTitle} - ${providerName}`;
    }
  };

  const getCurrentProviderStatus = () => {
    if (!selectedProvider) return null;
    
    const config = providers[selectedProvider];
    const isConfigured = config && config.apiKey && config.baseURL;
    
    // Get localized status messages
    const getStatusMessage = (key: string, fallback: string) => {
      return typeof (window as any).getMessage === 'function' 
        ? (window as any).getMessage(key) 
        : fallback;
    };
    
    return {
      apiKeyStatus: config?.apiKey 
        ? getStatusMessage('status_configured', 'Configured')
        : getStatusMessage('status_not_configured', 'Not Configured'),
      baseURLStatus: config?.baseURL || '--',
      selectedModelStatus: config?.selectedModel 
        ? config.selectedModel
        : getStatusMessage('model_not_selected', 'Not Selected'),
      isConfigured
    };
  };

  const renderGeneralPage = () => (
    <div className="content-page active" id="page-general">
      <div className="page-header">
        <h3 data-i18n="nav_general">General</h3>
        <p data-i18n="general_description">Configure basic AI service settings and preferences</p>
      </div>
      
      <div className="settings-section">
        <div className="form-group">
          <label htmlFor="languageSelect" data-i18n="language_setting">Language</label>
          <select 
            id="languageSelect" 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="auto" data-i18n="language_auto">Auto</option>
            <option value="zh_CN" data-i18n="language_zh_cn">简体中文</option>
            <option value="en" data-i18n="language_en">English</option>
          </select>
          <small className="form-description" data-i18n="language_setting_description">Reload extension after changing language</small>
        </div>
      </div>
    </div>
  );

  const renderProvidersPage = () => {
    const providerStatus = getCurrentProviderStatus();
    
    return (
      <div className="content-page active" id="page-providers">
        <div className="page-header">
          <h3 data-i18n="nav_providers">Providers</h3>
          <p data-i18n="providers_description">Manage AI model providers and configuration</p>
        </div>

        <div className="provider-tabs">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${activeTab === 'current' ? 'active' : ''}`} 
              onClick={() => setActiveTab('current')}
              data-i18n="tab_current_provider"
            >
              Current
            </button>
            <button 
              className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`} 
              onClick={() => setActiveTab('manage')}
              data-i18n="tab_manage_providers"
            >
              Manage
            </button>
          </div>

          {activeTab === 'current' && (
            <div className="tab-content active" id="tab-current">
              <div className="settings-section">
                <div className="form-group">
                  <label htmlFor="providerSelect" data-i18n="provider_select">
                    {typeof (window as any).getMessage === 'function'
                      ? (window as any).getMessage('provider_select')
                      : 'Select provider'}
                  </label>
                  <select 
                    id="providerSelect" 
                    value={selectedProvider} 
                    onChange={(e) => handleProviderChange(e.target.value)}
                  >
                    <option value="">Please select</option>
                    {Object.keys(PROVIDERS).map(key => (
                      <option key={key} value={key}>
                        {getProviderDisplayName(key)}
                      </option>
                    ))}
                  </select>
                  <small className="form-description" data-i18n="provider_select_description">
                    {typeof (window as any).getMessage === 'function'
                      ? (window as any).getMessage('provider_select_description')
                      : 'Choose the AI provider to use'}
                  </small>
                </div>
                
                {/* Provider configuration status */}
                {selectedProvider && providerStatus && !showProviderForm && (
                  <div id="providerConfigStatus" className="provider-config-status">
                    <div className="config-status-item">
                      <span className="config-label" data-i18n="api_key_status">
                        {typeof (window as any).getMessage === 'function'
                          ? (window as any).getMessage('api_key_status')
                          : 'API Key Status'}
                      </span>
                      <span id="apiKeyStatus" className="config-value">{providerStatus.apiKeyStatus}</span>
                    </div>
                    <div className="config-status-item">
                      <span className="config-label" data-i18n="base_url_status">
                        {typeof (window as any).getMessage === 'function'
                          ? (window as any).getMessage('base_url_status')
                          : 'Base URL'}
                      </span>
                      <span id="baseURLStatus" className="config-value">{providerStatus.baseURLStatus}</span>
                    </div>
                    <div className="config-status-item">
                      <span className="config-label" data-i18n="selected_model_status">
                        {typeof (window as any).getMessage === 'function'
                          ? (window as any).getMessage('selected_model_status')
                          : 'Selected Model'}
                      </span>
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
                      <span data-i18n="configure_provider">
                        {typeof (window as any).getMessage === 'function'
                          ? (window as any).getMessage('configure_provider')
                          : 'Configure'}
                      </span>
                    </button>
                  </div>
                )}
                
                {/* Provider configuration form */}
                {selectedProvider && showProviderForm && (
                  <div id="providerConfigForm" className="provider-config-form">
                    <h4 data-i18n="provider_configuration">
                      {typeof (window as any).getMessage === 'function'
                        ? (window as any).getMessage('provider_configuration')
                        : 'Provider configuration'}
                    </h4>
                    
                    <FormField
                      key={`baseURL-${refreshKey}`}
                      label="API Base URL"
                      labelI18nKey="base_url"
                      htmlFor="baseURL"
                      descriptionI18nKey="base_url_description"
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
                      key={`apiKey-${refreshKey}`}
                      label="API Key"
                      labelI18nKey="api_key"
                      htmlFor="apiKey"
                      descriptionI18nKey="api_key_description"
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
                      key={`modelSelect-${refreshKey}`}
                      label="Model"
                      labelI18nKey="model_select"
                      htmlFor="modelSelect"
                      descriptionI18nKey="model_select_description"
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
                        <span data-i18n="save">Save</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => setShowProviderForm(false)}
                      >
                        <span data-i18n="cancel">Cancel</span>
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="settings-section">
                  <h4 data-i18n="global_settings">
                    {typeof (window as any).getMessage === 'function'
                      ? (window as any).getMessage('global_settings')
                      : 'Global settings'}
                  </h4>
                  <div className="form-group">
                    <label htmlFor="groupingStrategy" data-i18n="grouping_strategy">
                      {typeof (window as any).getMessage === 'function'
                        ? (window as any).getMessage('grouping_strategy')
                        : 'Grouping strategy'}
                    </label>
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
                                              <span data-i18n="save">Save</span>
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
                  <h4 data-i18n="configured_providers">
                    {typeof (window as any).getMessage === 'function'
                      ? (window as any).getMessage('configured_providers')
                      : 'Configured providers'}
                  </h4>
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
                    <span data-i18n="add_custom_provider">
                      {typeof (window as any).getMessage === 'function'
                        ? (window as any).getMessage('add_custom_provider')
                        : 'Add custom provider'}
                    </span>
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
        <h3 data-i18n="nav_advanced">Advanced</h3>
        <p data-i18n="advanced_description">Advanced features and performance settings</p>
      </div>
      <div className="settings-section">
        <div className="advanced-settings-container">
          <div className="form-group">
            <label htmlFor="maxTabs" data-i18n="max_tabs">Max tabs</label>
            <input 
              type="number" 
              id="maxTabs" 
              min="1" 
              max="100" 
              value={advancedSettings.maxTabs}
              onChange={(e) => handleAdvancedSettingChange('maxTabs', parseInt(e.target.value))}
            />
            <small className="form-description" data-i18n="max_tabs_description">Maximum number of tabs to process</small>
          </div>
          <div className="form-group checkbox-group">
            <label htmlFor="autoSave" data-i18n="auto_save">Auto save</label>
            <input 
              type="checkbox" 
              id="autoSave" 
              checked={advancedSettings.autoSave}
              onChange={(e) => handleAdvancedSettingChange('autoSave', e.target.checked)}
            />
            <small className="form-description" data-i18n="auto_save_description">Automatically save configuration changes</small>
          </div>
          <div className="form-group">
            <label htmlFor="cacheTimeout" data-i18n="cache_timeout">Cache timeout (minutes)</label>
            <input 
              type="number" 
              id="cacheTimeout" 
              min="1" 
              max="1440" 
              value={advancedSettings.cacheTimeout}
              onChange={(e) => handleAdvancedSettingChange('cacheTimeout', parseInt(e.target.value))}
            />
            <small className="form-description" data-i18n="cache_timeout_description">Validity period for model list cache</small>
          </div>
        </div>
        <div className="form-actions">
          <button onClick={clearCache} className="btn btn-secondary" data-i18n="clear_cache">Clear cache</button>
          <button onClick={resetSettings} className="btn btn-secondary" data-i18n="reset_settings">Reset settings</button>
        </div>
      </div>
    </div>
  );

  const renderAboutPage = () => (
    <div className="content-page active" id="page-about">
      <div className="page-header">
        <h3 data-i18n="nav_about">About AI Tabs</h3>
        <p data-i18n="about_description">Extension info and docs</p>
      </div>
      <div className="settings-section">
        <div className="about-content">
          <div className="about-item">
            <h4 data-i18n="version">Version</h4>
            <p>v1.0.0</p>
          </div>
          <div className="about-item">
            <h4 data-i18n="description">Description</h4>
            <p data-i18n="app_description">Intelligent AI tab manager with multi-provider support</p>
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
    // Get all built-in providers from PROVIDERS
    const builtInProviderKeys = Object.keys(PROVIDERS).filter(key => key !== 'custom');

    const renderProviderItem = (providerKey: string, isCustom: boolean) => {
      const config = providers[providerKey];
      const baseConfig = getProvider(providerKey);
      
      // Determine if configured
      const isConfigured = config && config.configured === true;
      
      // Get provider details
      const providerName = isCustom 
        ? (config?.name || providerKey) 
        : getProviderDisplayName(providerKey);
      
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
            <div className="provider-type" data-i18n={isCustom ? 'type_custom' : 'type_builtin'}>
              {typeof (window as any).getMessage === 'function'
                ? (window as any).getMessage(isCustom ? 'type_custom' : 'type_builtin')
                : (isCustom ? 'Custom' : 'Built-in')}
            </div>
            <div className="provider-details">
              <div className="provider-url-info">
                <span className="provider-base-url">Base URL: {providerBaseURL}</span>
                {isCustom && (
                  <span className="provider-endpoint">Endpoint: {providerEndpoint}</span>
                )}
              </div>
              <span className={`status-badge ${isConfigured ? 'configured' : 'not-configured'}`}>
{typeof (window as any).getMessage === 'function'
                  ? (isConfigured 
                    ? (window as any).getMessage('status_configured') 
                    : (window as any).getMessage('status_not_configured'))
                  : (isConfigured ? 'Configured' : 'Not Configured')}
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
                  title="Edit provider"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger btn-small" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Delete custom provider "${providerName}"?`)) {
                      console.log('Deleting custom provider:', providerKey);
                      deleteCustomProvider(providerKey);
                    }
                  }}
                  title="Delete provider"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16"></path>
                  </svg>
                  <span>Delete</span>
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
                title="Configure provider"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <span data-i18n="configure_provider">
                  {typeof (window as any).getMessage === 'function'
                    ? (window as any).getMessage('configure_provider')
                    : 'Configure'}
                </span>
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
            <h4 data-i18n="custom_providers">
              {typeof (window as any).getMessage === 'function'
                ? (window as any).getMessage('custom_providers')
                : 'Custom providers'}
            </h4>
            {customProviderItems}
          </div>
        )}
        <div className="providers-section">
          <h4 data-i18n="builtin_providers">
            {typeof (window as any).getMessage === 'function'
              ? (window as any).getMessage('builtin_providers')
              : 'Built-in providers'}
          </h4>
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
            <div data-i18n="no_configured_providers">No configured providers</div>
            <div data-i18n="no_providers_message">Add a custom provider or configure a built-in provider</div>
          </div>
        )}
      </div>
    );
  };

  const handleCustomProviderChange = (field: string, value: string) => {
    setFormState((prev: FormState) => ({ ...prev, [field]: value }));
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
    const providerName = providers[providerKey]?.name || getProviderDisplayName(providerKey);
    if (confirm(`Delete custom provider "${providerName}"?`)) {
      const newProviders = { ...providers };
      delete newProviders[providerKey];
      setProviders(newProviders);
      chrome.storage.local.set({ providers: newProviders });
      showStatusMessage('Custom provider deleted', 'success');
    }
  };

  // Modal related functions
  const handleModalFormChange = (field: string, value: string) => {
    setModalForm((prev: ModalForm) => ({ ...prev, [field]: value }));
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
    
    // Decrypt API key if needed using secureStorage
    if (config.apiKey && typeof config.apiKey === 'string') {
      try {
        const ss = (window as any).secureStorage;
        if (ss && ss.encryption && typeof ss.encryption.decrypt === 'function') {
          decryptedConfig.apiKey = ss.encryption.decrypt(config.apiKey);
        } else {
          decryptedConfig.apiKey = '';
        }
      } catch (e) {
        decryptedConfig.apiKey = '';
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
        // Request permissions for custom provider
        const granted = await requestProviderPermissions('custom', modalForm.baseURL);
        if (!granted) {
          showStatusMessage('Network permissions required for this provider', 'error');
          return;
        }

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
        // Check and request permissions before saving
        const customBaseURL = modalProviderKey === 'custom' || modalProviderKey.startsWith('custom-') ? modalForm.baseURL : undefined;
        const hasPermissions = await hasProviderPermissions(modalProviderKey, customBaseURL);
        
        if (!hasPermissions) {
          const granted = await requestProviderPermissions(modalProviderKey, customBaseURL);
          if (!granted) {
            showStatusMessage('Network permissions required for this provider', 'error');
            return;
          }
        }

        const configToSave = { ...modalForm };
        
        // Encrypt API key if provided
        if (configToSave.apiKey && configToSave.apiKey.trim()) {
          const ss = (window as any).secureStorage;
          if (ss && ss.encryption && typeof ss.encryption.encrypt === 'function') {
            configToSave.apiKey = ss.encryption.encrypt(configToSave.apiKey.trim());
          }
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
      
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 data-i18n="options_title">AI Tabs Settings</h2>
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
                <span data-i18n="nav_general">General</span>
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
                <span data-i18n="nav_providers">Providers</span>
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
                <span data-i18n="nav_advanced">Advanced</span>
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
                <span data-i18n="nav_about">About</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {renderPage()}
      </main>

      {/* Unified provider modal */}
      <FormModal
        show={showProviderModal}
        title={getModalTitle()}
        primaryButtonText={typeof (window as any).getMessage === 'function' 
          ? (window as any).getMessage('save', 'Save') 
          : 'Save'}
        onSave={saveFromModal}
        onCancel={closeModal}
      >
        {modalMode === 'add' && (
          <FormField
            key={`modalProviderName-${refreshKey}`}
            label="Provider name"
            labelI18nKey="provider_name"
            htmlFor="modalProviderName"
            descriptionI18nKey="provider_name_description"
            required
          >
            <input 
              type="text" 
              id="modalProviderName"
              value={modalForm.name || ''} 
              onChange={(e) => handleModalFormChange('name', e.target.value)}
              data-i18n-placeholder="provider_name_description"
              required
            />
          </FormField>
        )}
        
        {modalMode === 'config' && (
          <FormField
            key={`modalApiKey-${refreshKey}`}
            label="API Key"
            labelI18nKey="api_key"
            htmlFor="modalApiKey"
            descriptionI18nKey="api_key_description"
            required
          >
            <PasswordInput
              id="modalApiKey"
              value={modalForm.apiKey || ''}
              onChange={(value) => handleModalFormChange('apiKey', value)}
              placeholder="Enter your API Key"
              required
            />
          </FormField>
        )}
        
        <FormField
          key={`modalBaseURL-${refreshKey}`}
            label="API Base URL"
          labelI18nKey="base_url"
          htmlFor="modalBaseURL"
          descriptionI18nKey="base_url_description"
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
            label="Chat endpoint"
            labelI18nKey="provider_endpoint"
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
            label="Model"
            labelI18nKey="model_select"
            htmlFor="modalSelectedModel"
            descriptionI18nKey="model_select_description"
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
            label="Default models"
            labelI18nKey="provider_default_models"
            htmlFor="modalProviderModels"
            descriptionI18nKey="provider_models_description"
          >
            <textarea 
              id="modalProviderModels" 
              rows={3}
              value={modalForm.models || ''} 
              onChange={(e) => handleModalFormChange('models', e.target.value)}
              data-i18n-placeholder="provider_models_placeholder"
            />
          </FormField>
        )}
      </FormModal>
    </div>
  );
};

export default Options;
