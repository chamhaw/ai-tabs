// Global variables and configuration (sorted alphabetically)
const PROVIDER_URLS = {
  '01ai': 'https://api.lingyiwanwu.com/v1',
  alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  anthropic: 'https://api.anthropic.com/v1',
  azure: 'https://your-resource.openai.azure.com',
  baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
  bedrock: 'https://bedrock-runtime.us-east-1.amazonaws.com',
  cohere: 'https://api.cohere.ai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  huggingface: 'https://api-inference.huggingface.co/v1',
  localai: 'http://localhost:8080/v1',
  minimax: 'https://api.minimax.chat/v1',
  moonshot: 'https://api.moonshot.cn/v1',
  ollama: 'http://localhost:11434/v1',
  openai: 'https://api.openai.com/v1',
  sensetime: 'https://api.sensenova.cn/v1',
  stepfun: 'https://api.stepfun.com/v1',
  tencent: 'https://hunyuan.tencentcloudapi.com',
  xunfei: 'https://spark-api-open.xf-yun.com/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4'
};

// Provider configuration (sorted alphabetically)
const PROVIDER_CONFIG = {
  '01ai': {
    name: '零一万物',
    baseURL: PROVIDER_URLS['01ai'],
    chatEndpoint: '/chat/completions'
  },
  alibaba: {
    name: '阿里云通义千问',
    baseURL: PROVIDER_URLS.alibaba,
    chatEndpoint: '/chat/completions'
  },
  anthropic: {
    name: 'Anthropic',
    baseURL: PROVIDER_URLS.anthropic,
    chatEndpoint: '/messages'
  },
  azure: {
    name: 'Azure OpenAI',
    baseURL: null, // User needs to customize
    baseURLLabel: 'Azure Endpoint',
    chatEndpoint: '/openai/deployments/{model}/chat/completions?api-version=2023-12-01-preview'
  },
  baidu: {
    name: '百度文心一言',
    baseURL: PROVIDER_URLS.baidu,
    chatEndpoint: '/chat/completions'
  },
  bedrock: {
    name: 'AWS Bedrock',
    baseURL: PROVIDER_URLS.bedrock,
    baseURLLabel: 'Bedrock Runtime Endpoint',
    chatEndpoint: '/model/{model}/converse'
  },
  cohere: {
    name: 'Cohere',
    baseURL: PROVIDER_URLS.cohere,
    chatEndpoint: '/chat'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: PROVIDER_URLS.deepseek,
    chatEndpoint: '/chat/completions'
  },
  doubao: {
    name: '豆包',
    baseURL: PROVIDER_URLS.doubao,
    chatEndpoint: '/chat/completions'
  },
  google: {
    name: 'Google AI',
    baseURL: PROVIDER_URLS.google,
    chatEndpoint: '/models/{model}:generateContent'
  },
  huggingface: {
    name: 'Hugging Face',
    baseURL: PROVIDER_URLS.huggingface,
    chatEndpoint: '/chat/completions'
  },
  localai: {
    name: 'LocalAI',
    baseURL: PROVIDER_URLS.localai,
    chatEndpoint: '/chat/completions'
  },
  minimax: {
    name: 'MiniMax',
    baseURL: PROVIDER_URLS.minimax,
    chatEndpoint: '/chat/completions'
  },
  moonshot: {
    name: 'Moonshot AI',
    baseURL: PROVIDER_URLS.moonshot,
    chatEndpoint: '/chat/completions'
  },
  ollama: {
    name: 'Ollama',
    baseURL: PROVIDER_URLS.ollama,
    chatEndpoint: '/chat/completions'
  },
  openai: {
    name: 'OpenAI',
    baseURL: PROVIDER_URLS.openai,
    chatEndpoint: '/chat/completions'
  },
  sensetime: {
    name: '商汤科技',
    baseURL: PROVIDER_URLS.sensetime,
    chatEndpoint: '/chat/completions'
  },
  stepfun: {
    name: '阶跃星辰',
    baseURL: PROVIDER_URLS.stepfun,
    chatEndpoint: '/chat/completions'
  },
  tencent: {
    name: '腾讯混元',
    baseURL: PROVIDER_URLS.tencent,
    chatEndpoint: '/chat/completions'
  },
  xunfei: {
    name: '讯飞星火',
    baseURL: PROVIDER_URLS.xunfei,
    chatEndpoint: '/chat/completions'
  },
  zhipu: {
    name: '智谱AI',
    baseURL: PROVIDER_URLS.zhipu,
    chatEndpoint: '/chat/completions'
  }
};

// Page navigation management
class PageNavigation {
  constructor() {
    this.currentPage = 'general';
    this.init();
  }

  init() {
    const navButtons = document.querySelectorAll('.nav-button');
    
    // Bind navigation button events
    navButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const page = e.currentTarget.dataset.page;
        this.switchPage(page);
      });
    });

    // Listen for browser forward/back events
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });

    // Get initial page from URL hash
    this.initFromHash();
  }

  // Initialize page from URL hash
  initFromHash() {
    const hash = window.location.hash.slice(1); // Remove # symbol
    const validPages = ['general', 'providers', 'advanced', 'about'];
    
    if (hash && validPages.includes(hash)) {
      this.currentPage = hash;
    }
    
    this.switchPage(this.currentPage);
  }

  // Handle hash changes
  handleHashChange() {
    const hash = window.location.hash.slice(1);
    const validPages = ['general', 'providers', 'advanced', 'about'];
    
    if (hash && validPages.includes(hash) && hash !== this.currentPage) {
      this.switchPage(hash, false); // Don't update URL to avoid loop
    }
  }

  switchPage(pageId, updateUrl = true) {
    // Update navigation button state
    document.querySelectorAll('.nav-button').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Update page content
    document.querySelectorAll('.content-page').forEach(page => {
      page.classList.remove('active');
    });
    const activePage = document.getElementById(`page-${pageId}`);
    if (activePage) {
      activePage.classList.add('active');
    }

    this.currentPage = pageId;

    // Update URL hash
    if (updateUrl) {
      // Use replaceState instead of setting hash directly to avoid triggering hashchange event
      const newUrl = `${window.location.pathname}${window.location.search}#${pageId}`;
      window.history.replaceState(null, null, newUrl);
    }

    // Initialize after page switch
    this.onPageSwitch(pageId);
  }

  onPageSwitch(pageId) {
    switch (pageId) {
      case 'general':
        GeneralSettings.init();
        break;
      case 'providers':
        ProvidersPage.init();
        break;
      case 'advanced':
        AdvancedSettings.init();
        break;
      case 'about':
        AboutPage.init();
        break;
    }
  }
}

// Tab management
class TabManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.init();
  }

  init() {
    if (!this.container) return;

    // Bind tab button events
    this.container.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    // Update tab button state
    this.container.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = this.container.querySelector(`[data-tab="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Update tab content
    this.container.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    const activeContent = this.container.querySelector(`#tab-${tabId}`);
    if (activeContent) {
      activeContent.classList.add('active');
    }

    // Callback after tab switch
    this.onTabSwitch(tabId);
  }

  onTabSwitch(tabId) {
    if (tabId === 'current') {
      CurrentProviderConfig.init();
    } else if (tabId === 'manage') {
      ProvidersManagement.init();
    }
  }
}

// General settings page
class GeneralSettings {
  static init() {
    this.loadLanguageSettings();
    this.bindEvents();
  }

  static loadLanguageSettings() {
    chrome.storage.local.get(['language'], (result) => {
      const languageSelect = document.getElementById('languageSelect');
      if (languageSelect && result.language) {
        languageSelect.value = result.language;
      }
    });
  }

  static bindEvents() {
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.addEventListener('change', async (e) => {
        const selectedLanguage = e.target.value;
        
        // Save language settings to storage
        chrome.storage.local.set({ 
          language: selectedLanguage,
          userLanguage: selectedLanguage 
        }, async () => {
          StatusManager.show(getMessage('switching_language') || 'Switching language...', 'info', 1000);
          
          // Re-initialize internationalization
          if (typeof customI18n !== 'undefined') {
            try {
              await customI18n.init();
              await this.updateUI();
              StatusManager.show(getMessage('language_switched') || 'Language switched', 'success');
            } catch (error) {
              console.error('Language switching failed:', error);
              StatusManager.show(getMessage('language_switch_failed') || 'Language switch failed, please refresh page', 'error');
            }
          } else {
            StatusManager.show(getMessage('language_settings_saved') || 'Language settings saved, please refresh page', 'success');
          }
        });
      });
    }
  }

  static async updateUI() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n');
      if (typeof getMessage === 'function') {
        const message = getMessage(messageKey);
        if (message && message !== messageKey) {
          element.textContent = message;
        }
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      if (typeof getMessage === 'function') {
        const message = getMessage(messageKey);
        if (message && message !== messageKey) {
          element.placeholder = message;
        }
      }
    });

    // Update page title
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
      const messageKey = titleElement.getAttribute('data-i18n');
      if (typeof getMessage === 'function') {
        const message = getMessage(messageKey);
        if (message && message !== messageKey) {
          document.title = message;
        }
      }
    }

    // Update provider options
    if (typeof updateProviderOptions === 'function') {
      updateProviderOptions();
    }
    
    // Update provider selector (for internationalization)
    if (typeof CurrentProviderConfig !== 'undefined' && CurrentProviderConfig.updateProviderSelect) {
      // Get current selected provider to maintain selection state
      const providerSelect = document.getElementById('providerSelect');
      const currentSelection = providerSelect ? providerSelect.value : null;
      await CurrentProviderConfig.updateProviderSelect(currentSelection);
    }
    
    // Update provider management list (for internationalization)
    if (typeof ProvidersManagement !== 'undefined' && ProvidersManagement.loadProvidersList) {
      await ProvidersManagement.loadProvidersList();
    }
  }
}

// Provider page management
class ProvidersPage {
  static async init() {
    this.tabManager = new TabManager('.provider-tabs');
    // Show current configuration tab by default
    this.tabManager.switchTab('current');
    // Initialize current provider configuration
    await CurrentProviderConfig.init();
    // Initialize provider management
    ProvidersManagement.init();
  }
}

// Current provider configuration
class CurrentProviderConfig {
  // Lock to prevent duplicate calls to updateProviderSelect
  static _updateProviderSelectLock = false;
  
  static async init() {
    await this.loadSettings();
    this.bindEvents();
  }

  static async loadSettings() {
    // First get saved provider selection
    const result = await chrome.storage.local.get([
      'selectedProvider'
    ]);
    
    // Update provider selection list (pass saved selection to maintain)
    await this.updateProviderSelect(result.selectedProvider);
    
    const providerSelect = document.getElementById('providerSelect');

    let providerStatusShown = false;

    // Set selected provider
    if (result.selectedProvider && providerSelect) {
      // Check if the provider still exists in the selection list
      const targetOption = providerSelect.querySelector(`option[value="${result.selectedProvider}"]`);
      if (targetOption) {
        providerSelect.value = result.selectedProvider;
        await this.onProviderChange();
        providerStatusShown = true;
      } else {
        // If saved provider no longer exists, clear saved selection
        chrome.storage.local.remove(['selectedProvider']);
      }
    }
    
    // If no provider is set or saved provider doesn't exist, select first configured provider
    if (!providerStatusShown && providerSelect && providerSelect.options.length > 0) {
      const allProviders = await MultiProviderConfig.getAllProviders();
      const configuredProviderKey = Object.keys(PROVIDER_CONFIG).find(key => {
        const providerConfig = allProviders[key];
        return providerConfig && providerConfig.configured && providerConfig.apiKey;
      });
      
      if (configuredProviderKey) {
        const targetOption = providerSelect.querySelector(`option[value="${configuredProviderKey}"]`);
        if (targetOption) {
          providerSelect.value = configuredProviderKey;
          await this.onProviderChange();
          providerStatusShown = true;
        }
      }
    }

    // If still no provider status shown, show default state (select first provider or show unconfigured state)
    if (!providerStatusShown && providerSelect && providerSelect.options.length > 0) {
      // Select first available provider and show its status
      providerSelect.value = providerSelect.options[0].value;
      await this.onProviderChange();
    }
    
    // Load global settings
    await this.loadGlobalSettings();
  }

  static bindEvents() {
    // Provider selection
    const providerSelect = document.getElementById('providerSelect');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => {
        this.onProviderChange();
      });
    }

    // Configure provider button
    const configureBtn = document.getElementById('configureProviderBtn');
    if (configureBtn) {
      configureBtn.addEventListener('click', () => {
        this.showProviderConfigForm();
      });
    }

    // Cancel config button (this ID doesn't exist, remove duplicate reference)

    // Save button in form
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', () => {
        this.saveSettings();
      });
    }

    // Cancel button in form
    const cancelConfigFormBtn = document.getElementById('cancelConfigFormBtn');
    if (cancelConfigFormBtn) {
      cancelConfigFormBtn.addEventListener('click', () => {
        this.hideProviderConfigForm();
      });
    }

    // Refresh models button
    const refreshBtn = document.getElementById('refreshModelsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshModels();
      });
    }



    // API key show/hide toggle now dynamically bound in showProviderConfigForm
    // API key changes trigger auto-refresh models now dynamically bound in showProviderConfigForm

    // Global settings save button
    const saveGlobalSettingsBtn = document.getElementById('saveGlobalSettingsBtn');
    if (saveGlobalSettingsBtn) {
      saveGlobalSettingsBtn.addEventListener('click', () => {
        this.saveGlobalSettings();
      });
    }
  }

  static async onProviderChange() {
    const providerSelect = document.getElementById('providerSelect');
    if (!providerSelect) return;
    
    const provider = providerSelect.value;
    
    // Immediately save provider selection
    try {
      await this.saveProviderSelection(provider);
    } catch (error) {
              console.error('Failed to save provider selection:', error);
        StatusManager.show('Failed to save provider selection: ' + error.message, 'error');
      return; // Don't continue if save failed
    }
    
    // Show provider configuration status
    await this.showProviderStatus(provider);
    
    // Hide configuration form
    this.hideProviderConfigForm();
  }

  // Save provider selection
  static async saveProviderSelection(selectedProvider) {
    return new Promise((resolve, reject) => {
      const globalSettings = {
        selectedProvider: selectedProvider || ''
      };

      chrome.storage.local.set(globalSettings, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to save provider selection:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          // Verify if save was successful
          chrome.storage.local.get(['selectedProvider'], (verifyResult) => {
            const savedProvider = verifyResult.selectedProvider;
            
            if (savedProvider === selectedProvider) {
              // Show success message
              StatusManager.show(getMessage('provider_selection_saved') || 'Provider selection saved', 'success', 2000);
              resolve(); // Only resolve after successful verification
            } else {
              console.error('Verification failed: saved provider does not match expected', {
                expected: selectedProvider,
                actual: savedProvider
              });
              StatusManager.show('Failed to save provider selection, please try again', 'error');
              reject(new Error('Save verification failed'));
            }
          });
        }
      });
    });
  }

  static async showProviderStatus(providerKey) {
    const statusDiv = document.getElementById('providerConfigStatus');
    const configFormDiv = document.getElementById('providerConfigForm');
    
    if (!statusDiv || !configFormDiv) return;

    // Always show status block, even if no provider selected
    statusDiv.style.display = 'block';
    configFormDiv.style.display = 'none';

    if (!providerKey) {
      // Show status when no provider is selected
      const apiKeyStatus = document.getElementById('apiKeyStatus');
      const baseURLStatus = document.getElementById('baseURLStatus');
      const selectedModelStatus = document.getElementById('selectedModelStatus');

      if (apiKeyStatus) {
        apiKeyStatus.textContent = 'Please select provider first';
        apiKeyStatus.className = 'config-value';
      }

      if (baseURLStatus) {
        baseURLStatus.textContent = '--';
        baseURLStatus.className = 'config-value';
      }

      if (selectedModelStatus) {
        selectedModelStatus.textContent = 'Not selected';
        selectedModelStatus.className = 'config-value';
      }
      return;
    }

    const providerConfig = await MultiProviderConfig.getProvider(providerKey);
    const baseConfig = PROVIDER_CONFIG[providerKey];

    // Update status display
    const apiKeyStatus = document.getElementById('apiKeyStatus');
    const baseURLStatus = document.getElementById('baseURLStatus');
    const selectedModelStatus = document.getElementById('selectedModelStatus');

    if (apiKeyStatus) {
      if (providerConfig?.apiKey) {
        apiKeyStatus.textContent = getMessage('status_configured') || 'Configured';
        apiKeyStatus.className = 'config-value configured';
      } else {
        apiKeyStatus.textContent = getMessage('status_not_configured') || 'Not configured';
        apiKeyStatus.className = 'config-value error';
      }
    }

    if (baseURLStatus) {
      const baseURL = providerConfig?.baseURL || baseConfig?.baseURL || '';
      baseURLStatus.textContent = baseURL || '--';
      baseURLStatus.className = 'config-value';
    }

    if (selectedModelStatus) {
      const selectedModel = providerConfig?.selectedModel || '';
      selectedModelStatus.textContent = selectedModel || getMessage('model_not_selected') || 'Not selected';
      selectedModelStatus.className = selectedModel ? 'config-value configured' : 'config-value';
    }

    // Model selection is now in config form, no need to update here
  }

  static async showProviderConfigForm() {
    const providerSelect = document.getElementById('providerSelect');
    const statusDiv = document.getElementById('providerConfigStatus');
    const configFormDiv = document.getElementById('providerConfigForm');
    const cancelBtn = document.getElementById('cancelConfigFormBtn');
    
    if (!providerSelect || !statusDiv || !configFormDiv) return;

    const providerKey = providerSelect.value;
    if (!providerKey) return;

    const providerConfig = await MultiProviderConfig.getProvider(providerKey);
    const baseConfig = PROVIDER_CONFIG[providerKey];

    // Show special configuration notes for AWS Bedrock
    let configNote = configFormDiv.querySelector('.bedrock-config-note');
    if (providerKey === 'bedrock') {
      if (!configNote) {
        configNote = document.createElement('div');
        configNote.className = 'bedrock-config-note';
        configNote.style.cssText = 'background: #e3f2fd; border: 1px solid #2196f3; border-radius: 4px; padding: 12px; margin-bottom: 16px; font-size: 14px; line-height: 1.5;';
        configNote.innerHTML = `
          <strong>AWS Bedrock Configuration:</strong><br>
          • <strong>API Key Format:</strong> AWS_ACCESS_KEY_ID:AWS_SECRET_ACCESS_KEY<br>
          • <strong>Region Setting:</strong> Base URL must contain correct AWS region<br>
          • <strong>Example:</strong> https://bedrock-runtime.us-west-2.amazonaws.com<br>
          • <strong>Permissions:</strong> Ensure AWS account has enabled required Bedrock model access permissions
        `;
        configFormDiv.insertBefore(configNote, configFormDiv.firstChild);
      }
      configNote.style.display = 'block';
    } else {
      if (configNote) {
        configNote.style.display = 'none';
      }
    }

    // Fill form
    const baseURLInput = document.getElementById('baseURL');
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('modelSelect');

    if (baseURLInput) {
      baseURLInput.value = providerConfig?.baseURL || baseConfig?.baseURL || '';
    }

    if (apiKeyInput) {
      apiKeyInput.value = providerConfig?.apiKey || '';
    }

    // Fill model selection
    if (modelSelect) {
      if (providerConfig?.models && providerConfig.models.length > 0) {
        // Have cached model list, show directly
        modelSelect.innerHTML = '';
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = getMessage('select_model_prompt') || 'Please select model...';
        modelSelect.appendChild(emptyOption);
        
        // Add model options
        providerConfig.models.forEach(model => {
          const option = document.createElement('option');
          option.value = model.id || model;
          option.textContent = model.name || model;
          if (providerConfig.selectedModel === (model.id || model)) {
            option.selected = true;
          }
          modelSelect.appendChild(option);
        });
      } else {
        // No model list, prompt user to refresh
        const refreshPrompt = getMessage('refresh_models_prompt') || 'Please click refresh button to get model list';
        modelSelect.innerHTML = `<option value="">${refreshPrompt}</option>`;
      }
    }

    // Show form, hide status
    statusDiv.style.display = 'none';
    configFormDiv.style.display = 'block';
    if (cancelBtn) {
      cancelBtn.style.display = 'inline-block';
    }
    
    // Re-bind toggle button events (because form is dynamically shown)
    this.bindToggleApiKeyEvent();
    
    // Bind API input auto-refresh events
    this.bindApiKeyInputEvent();
  }

  static hideProviderConfigForm() {
    const providerSelect = document.getElementById('providerSelect');
    const statusDiv = document.getElementById('providerConfigStatus');
    const configFormDiv = document.getElementById('providerConfigForm');
    const cancelBtn = document.getElementById('cancelConfigFormBtn');
    
    if (!providerSelect || !statusDiv || !configFormDiv) return;

    const providerKey = providerSelect.value;
    
    // Hide form, show status
    configFormDiv.style.display = 'none';
    if (cancelBtn) {
      cancelBtn.style.display = 'none';
    }
    
    if (providerKey) {
      this.showProviderStatus(providerKey);
    }
  }



  static async refreshModels() {
    const refreshBtn = document.getElementById('refreshModelsBtn');
    const modelSelect = document.getElementById('modelSelect');
    const providerSelect = document.getElementById('providerSelect');
    const apiKeyInput = document.getElementById('apiKey');
    const baseURLInput = document.getElementById('baseURL');

    if (!providerSelect) return;

    const providerKey = providerSelect.value;
    if (!providerKey) {
      StatusManager.show(getMessage('please_select_provider') || 'Please select provider first', 'warning');
      return;
    }

    // Get API key (from current form or saved configuration)
    let apiKey = apiKeyInput?.value.trim() || '';
    let baseURL = baseURLInput?.value.trim() || '';

    if (!apiKey) {
      const providerConfig = await MultiProviderConfig.getProvider(providerKey);
      apiKey = providerConfig?.apiKey || '';
      baseURL = providerConfig?.baseURL || PROVIDER_CONFIG[providerKey]?.baseURL || '';
    }

    if (!baseURL) {
      baseURL = PROVIDER_CONFIG[providerKey]?.baseURL || '';
    }


    if (!apiKey) {
      StatusManager.show(getMessage('please_configure_api_key') || 'Please configure API key first', 'warning');
      return;
    }

    // Set loading state
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
      refreshBtn.disabled = true;
    }

    // Show loading state
    if (modelSelect) {
      const loadingText = getMessage('loading_models') || 'Loading model list...';
      modelSelect.innerHTML = `<option value="">${loadingText}</option>`;
    }

    try {
      StatusManager.show(getMessage('fetching_models') || 'Fetching model list...', 'info');
      
      const models = await ModelLoader.loadModels(providerKey, apiKey, baseURL);

      
      // Save model list to provider config (only save when actually getting new models)
      if (models && models.length > 0) {
        await MultiProviderConfig.saveProvider(providerKey, { models });
      }
      
      // Update model selection box
      if (modelSelect) {
        const currentSelection = modelSelect.value;
        modelSelect.innerHTML = '';
        
        if (models.length === 0) {
          const noModelsText = getMessage('no_models_found') || 'No available models found';
          modelSelect.innerHTML = `<option value="">${noModelsText}</option>`;
          StatusManager.show(getMessage('no_models_check_config') || 'No available models found, please check API configuration', 'warning');
        } else {
          // Add empty option
          const emptyOption = document.createElement('option');
          emptyOption.value = '';
          emptyOption.textContent = getMessage('select_model_prompt') || 'Please select model...';
          modelSelect.appendChild(emptyOption);
          
          // Add model options
          models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id || model;
            option.textContent = model.name || model;
            modelSelect.appendChild(option);
          });
          
          // Try to restore previous selection
          if (currentSelection && modelSelect.querySelector(`option[value="${currentSelection}"]`)) {
            modelSelect.value = currentSelection;
          }
          
          const successTemplate = getMessage('models_loaded_success') || 'Successfully loaded {count} models';
          const successMessage = successTemplate.replace('{count}', models.length);
          StatusManager.show(successMessage, 'success');
        }
      }

      // Show cache indicator
      const cacheIndicator = document.getElementById('cacheIndicator');
      if (cacheIndicator) {
        cacheIndicator.classList.add('visible');
        setTimeout(() => cacheIndicator.classList.remove('visible'), 3000);
      }

    } catch (error) {
      console.error('Failed to refresh model list:', error);
      
      // Show error state
      if (modelSelect) {
        const retryText = getMessage('refresh_failed_retry') || 'Refresh failed, click to retry';
        modelSelect.innerHTML = `<option value="">${retryText}</option>`;
      }
      
              StatusManager.show(getMessageWithParams('refresh_models_failed', { error: error.message }) || `Failed to refresh model list: ${error.message}`, 'error');
    } finally {
      // Remove loading state
      if (refreshBtn) {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
      }
    }
  }

  // Bind toggle password display button events
  static bindToggleApiKeyEvent() {
    const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
    if (toggleApiKeyBtn) {
      // Remove previous event listener (if any)
      const oldHandler = toggleApiKeyBtn._toggleHandler;
      if (oldHandler) {
        toggleApiKeyBtn.removeEventListener('click', oldHandler);
      }
      // Create new event handler
      const newHandler = () => {
        this.toggleApiKeyVisibility();
      };
      toggleApiKeyBtn._toggleHandler = newHandler;
      // Add new event listener
      toggleApiKeyBtn.addEventListener('click', newHandler);
    }
  }

  // Bind API input auto-refresh events
  static bindApiKeyInputEvent() {
    const apiKeyInput = document.getElementById('apiKey');
    if (apiKeyInput) {
      // Remove previous event listener (if any)
      const oldHandler = apiKeyInput._inputHandler;
      if (oldHandler) {
        apiKeyInput.removeEventListener('input', oldHandler);
      }
      // Create new event handler
      const newHandler = debounce(() => {
        if (apiKeyInput.value.trim()) {
          this.refreshModels();
        }
      }, 1000);
      apiKeyInput._inputHandler = newHandler;
      // Add new event listener
      apiKeyInput.addEventListener('input', newHandler);
    }
  }

  static toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.getElementById('toggleApiKeyBtn');
    
    if (!apiKeyInput || !toggleBtn) return;
    
    const eyeIcon = toggleBtn.querySelector('.eye-icon');
    const eyeOffIcon = toggleBtn.querySelector('.eye-off-icon');
    
    if (!eyeIcon || !eyeOffIcon) return;
    
    const isPassword = apiKeyInput.type === 'password';
    
    if (isPassword) {
      // Show password
      apiKeyInput.type = 'text';
      eyeIcon.style.display = 'none';
      eyeOffIcon.style.display = 'block';
    } else {
      // Hide password
      apiKeyInput.type = 'password';
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
    }
  }

  static async saveSettings() {
    const providerSelect = document.getElementById('providerSelect');
    const apiKeyInput = document.getElementById('apiKey');
    const baseURLInput = document.getElementById('baseURL');
    const modelSelect = document.getElementById('modelSelect');

    const selectedProvider = providerSelect?.value || '';
    
    try {
      // Save provider-specific configuration
      if (selectedProvider) {
        const providerConfig = {
          baseURL: baseURLInput?.value.trim() || '',
          apiKey: apiKeyInput?.value.trim() || '',
          selectedModel: modelSelect?.value || ''
        };

        await MultiProviderConfig.saveProvider(selectedProvider, providerConfig);
      }

      // Note: selectedProvider already saved in onProviderChange, no need to save again here

      StatusManager.show(getMessage('provider_config_saved') || 'Provider configuration saved', 'success');
      
      // Delay refreshing provider selection box to show latest config status, avoid race conditions
      setTimeout(async () => {
        await this.updateProviderSelect(selectedProvider);
        
        // updateProviderSelect now automatically maintains selection state
        // Verify if selection is correctly set
        if (selectedProvider && providerSelect.value !== selectedProvider) {
          const targetOption = providerSelect.querySelector(`option[value="${selectedProvider}"]`);
          if (targetOption) {
            providerSelect.value = selectedProvider;
          }
        }
      }, 50);
      
      // Hide configuration form and refresh status display
      this.hideProviderConfigForm();
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      StatusManager.show(getMessageWithParams('save_settings_failed', { error: error.message }) || 'Failed to save settings: ' + error.message, 'error');
    }
  }

  static async saveGlobalSettings() {
    const groupingStrategyInput = document.getElementById('groupingStrategy');
    
    try {
      const globalSettings = {
        groupingStrategy: groupingStrategyInput?.value.trim() || ''
      };

      await new Promise((resolve) => {
        chrome.storage.local.set(globalSettings, resolve);
      });

      StatusManager.show(getMessage('global_settings_saved') || 'Global settings saved', 'success');
      
    } catch (error) {
              console.error('Failed to save global settings:', error);
        StatusManager.show(getMessageWithParams('save_global_settings_failed', { error: error.message }) || 'Failed to save global settings: ' + error.message, 'error');
    }
  }

  static async loadGlobalSettings() {
    const groupingStrategyInput = document.getElementById('groupingStrategy');
    
    if (groupingStrategyInput) {
      try {
        const result = await new Promise((resolve) => {
          chrome.storage.local.get(['groupingStrategy'], resolve);
        });
        groupingStrategyInput.value = result.groupingStrategy || '';
      } catch (error) {
        console.error('Failed to load global settings:', error);
      }
    }
  }

  static async updateProviderSelect(preserveSelection = null) {
    const providerSelect = document.getElementById('providerSelect');
    if (!providerSelect) return;

    // Prevent duplicate calls - add protection mechanism
    if (this._updateProviderSelectLock) {
      return;
    }
    this._updateProviderSelectLock = true;

    try {
      // Determine selection to preserve: prioritize passed parameter, then current selected value
      const currentSelectedProvider = preserveSelection || providerSelect.value;
      
      // Clear existing options
      providerSelect.innerHTML = '';

      // Get configured providers
      const allProviders = await MultiProviderConfig.getAllProviders();
    
    // Prepare built-in provider list
    const builtInProviders = [];
    Object.keys(PROVIDER_CONFIG).forEach(key => {
      const config = PROVIDER_CONFIG[key];
      const providerConfig = allProviders[key];
      
      // Check configuration status: prioritize configured field, otherwise check apiKey
      let isConfigured = false;
      if (providerConfig) {
        if (typeof providerConfig.configured === 'boolean') {
          isConfigured = providerConfig.configured;
        } else {
          // If no configured field, judge based on apiKey
          isConfigured = !!(providerConfig.apiKey && providerConfig.apiKey.trim());
        }
        

      }
      
      builtInProviders.push({
        key,
        name: config.name,
        isConfigured,
        isCustom: false
      });
    });

    // Prepare custom provider list
    const customProviders = [];
    try {
      const customProvidersData = await CustomProviders.getAll();
      Object.keys(customProvidersData).forEach(key => {
        const provider = customProvidersData[key];
        const providerConfig = allProviders[key];
        
        // Check configuration status: prioritize configured field, otherwise check apiKey
        let isConfigured = false;
        if (providerConfig) {
          if (typeof providerConfig.configured === 'boolean') {
            isConfigured = providerConfig.configured;
          } else {
            // If no configured field, judge based on apiKey
            isConfigured = !!(providerConfig.apiKey && providerConfig.apiKey.trim());
          }
        }
        
        customProviders.push({
          key,
          name: provider.name,
          isConfigured,
          isCustom: true
        });
      });
    } catch (error) {
      console.error('Failed to load custom providers:', error);
    }

    // Merge all providers
    const allProvidersList = [...builtInProviders, ...customProviders];

    // Sort: configured first, then by name
    allProvidersList.sort((a, b) => {
      // First sort by configuration status (configured first)
      if (a.isConfigured !== b.isConfigured) {
        return b.isConfigured - a.isConfigured;
      }
      // Then sort by name
      return a.name.localeCompare(b.name, 'zh-CN');
    });

          // Add provider options
      allProvidersList.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.key;
        
        let displayName = provider.name;
        
        // Use internationalized name (if built-in provider)
        if (!provider.isCustom) {
          const i18nKey = `provider_${provider.key}`;
          if (typeof getMessage === 'function') {
            const localizedName = getMessage(i18nKey);
            if (localizedName && localizedName !== i18nKey) {
              displayName = localizedName;
            }
          }
        }
        
        // Directly use provider name, no status icon added
        // API key status is already clearly shown in configuration status below
        
        if (provider.isCustom) {
          const customSuffix = getMessage('custom_suffix') || 'Custom';
          displayName = `${displayName} (${customSuffix})`;
        }
        
        option.textContent = displayName;
        providerSelect.appendChild(option);
      });
      
      // Restore previously selected provider (if provider still exists)
      if (currentSelectedProvider) {
        const targetOption = providerSelect.querySelector(`option[value="${currentSelectedProvider}"]`);
        if (targetOption) {
          providerSelect.value = currentSelectedProvider;
        }
      }
      
    } finally {
      // Release lock
      this._updateProviderSelectLock = false;
    }
  }
}

// Model loader
class ModelLoader {
  static async loadModels(provider, apiKey, baseURL) {
    const config = PROVIDER_CONFIG[provider];
    if (!config) {
      throw new Error('Unknown provider');
    }
    
    // Build correct model endpoint URL
    let modelsUrl;
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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
              timeout: 15000 // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Failed to get model list: HTTP ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      const models = data.data
        .filter(model => model.id) // Ensure has ID
        .map(model => ({
          id: model.id,
          name: model.id
        }));
      
      if (models.length > 0) {
        return models;
      }
    }

    // If API returned data format doesn't match expectations
    throw new Error('API returned data format does not match expectations, please check API configuration');
  }
}

// Multi-provider configuration management
class MultiProviderConfig {
  // Get all provider configurations
  static async getAllProviders() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['providers'], (result) => {
        const providers = result.providers || {};
        
        // Fix missing configured field
        Object.keys(providers).forEach(key => {
          const provider = providers[key];
          if (typeof provider.configured !== 'boolean') {
            // Judge configuration status based on whether encrypted API key exists and can be correctly decrypted
            let isConfigured = false;
            if (provider.apiKey && provider.apiKey.trim()) {
              try {
                // Try to decrypt to verify API key validity
                const decrypted = secureStorage.encryption.decrypt(provider.apiKey);
                isConfigured = !!(decrypted && decrypted.trim());
              } catch (e) {
                // Decryption failed, means API key is invalid
                isConfigured = false;
              }
            }
            provider.configured = isConfigured;
          }
        });
        
        resolve(providers);
      });
    });
  }

  // Get specific provider configuration
  static async getProvider(providerKey) {
    const providers = await this.getAllProviders();
    const provider = providers[providerKey] || null;
    
    // Decrypt API key
    if (provider && provider.apiKey) {
      try {
        // Create decrypted copy
        const decryptedProvider = { ...provider };
        decryptedProvider.apiKey = secureStorage.encryption.decrypt(provider.apiKey);
        return decryptedProvider;
      } catch (e) {

        // Decryption failed, return empty API key, force user to reconfigure
        const invalidProvider = { ...provider };
        invalidProvider.apiKey = '';
        invalidProvider.configured = false;
        return invalidProvider;
      }
    }
    
    return provider;
  }

  // Save provider configuration
  static async saveProvider(providerKey, config) {
    const providers = await this.getAllProviders();
    
    if (!providers[providerKey]) {
      providers[providerKey] = {
        name: PROVIDER_CONFIG[providerKey]?.name || providerKey,
        baseURL: PROVIDER_CONFIG[providerKey]?.baseURL || '',
        apiKey: '',
        selectedModel: '',
        models: [],
        configured: false
      };
    }

    // Update configuration (encrypt API key)
    const configToSave = { ...config };
    
    // If has API key, encrypt it
    if (configToSave.apiKey && configToSave.apiKey.trim()) {
      try {
        configToSave.apiKey = secureStorage.encryption.encrypt(configToSave.apiKey.trim());
      } catch (e) {
        console.error('API key encryption failed:', e);
        throw new Error('API key encryption failed, please retry');
      }
    }
    
    Object.assign(providers[providerKey], configToSave);
    
    // Re-judge configuration status: based on original API key state (unencrypted)
    const originalApiKey = config.apiKey;
    providers[providerKey].configured = !!(originalApiKey && originalApiKey.trim());

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ providers }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // Delete provider configuration
  static async deleteProvider(providerKey) {
    const providers = await this.getAllProviders();
    delete providers[providerKey];

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ providers }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // Get current active provider configuration
  static async getCurrentProvider() {
    const settings = await this.getSettings();
    const selectedProvider = settings.selectedProvider;
    
    if (!selectedProvider) return null;
    
    const providerConfig = await this.getProvider(selectedProvider);
    return providerConfig;
  }



  // Get basic settings
  static async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['selectedProvider', 'groupingStrategy'], (result) => {
        resolve(result);
      });
    });
  }
}

// Custom provider management (maintain backward compatibility)
class CustomProviders {
  static async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customProviders'], (result) => {
        resolve(result.customProviders || {});
      });
    });
  }

  static async save(key, provider) {
    const providers = await this.getAll();
    
    // Allow overwrite when editing, no duplication for new additions (identifier is auto-generated unique value)
    if (providers[key] && !this.isEditing) {
      throw new Error('Internal error: generated identifier is not unique, please retry');
    }

    providers[key] = provider;
    
    // Add to global configuration
    PROVIDER_CONFIG[key] = {
      name: provider.name,
      baseURL: provider.baseURL,
      chatEndpoint: provider.endpoint || '/chat/completions'
    };

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ customProviders: providers }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  static async delete(key) {
    const providers = await this.getAll();
    delete providers[key];
    delete PROVIDER_CONFIG[key];

    // Also delete multi-provider configuration
    await MultiProviderConfig.deleteProvider(key);

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ customProviders: providers }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  static async exists(key) {
    const providers = await this.getAll();
    return key in providers;
  }
}

// Providers management
class ProvidersManagement {
  static init() {
    this.loadProvidersList();
    this.bindEvents();
  }

  // Generate unique identifier based on provider name
  static async generateUniqueKey(name) {
    if (!name || !name.trim()) return '';
    
    // 1. Convert to lowercase
    // 2. Replace spaces and special characters with underscores
    // 3. Remove consecutive underscores
    // 4. Remove leading and trailing underscores
    let baseKey = name.trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '_')  // Allow Chinese characters
      .replace(/_{2,}/g, '_')
      .replace(/^_+|_+$/g, '');
    
    // If processed result is empty or too short, use default prefix
    if (!baseKey || baseKey.length < 2) {
      baseKey = 'custom_provider';
    }
    
    // Check for conflicts with existing identifiers
    const existingProviders = await CustomProviders.getAll();
    const builtInKeys = Object.keys(PROVIDER_CONFIG);
    const allKeys = [...builtInKeys, ...Object.keys(existingProviders)];
    
    let uniqueKey = baseKey;
    let counter = 1;
    
    while (allKeys.includes(uniqueKey)) {
      uniqueKey = `${baseKey}_${counter}`;
      counter++;
    }
    
    return uniqueKey;
  }

  static bindEvents() {
    // Add provider button
    const addBtn = document.getElementById('addProviderBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.showProviderForm();
      });
    }

    // Save provider button
    const saveBtn = document.getElementById('saveProviderBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveProvider();
      });
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelProviderBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideProviderForm();
      });
    }

    // Use event delegation to handle button clicks in provider list
    const providersList = document.getElementById('providersList');
    if (providersList) {
      providersList.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const providerKey = target.getAttribute('data-provider-key');
        if (!providerKey) return;

        try {
          if (target.classList.contains('edit-provider-btn')) {
            await ProvidersManagement.editProvider(providerKey);
          } else if (target.classList.contains('delete-provider-btn')) {
            await ProvidersManagement.deleteProvider(providerKey);
          } else if (target.classList.contains('configure-provider-btn')) {
            await ProvidersManagement.configureProvider(providerKey);
          }
        } catch (error) {
          console.error('Error handling button click:', error);
          StatusManager.show(getMessageWithParams('operation_failed', { error: error.message }) || 'Operation failed: ' + error.message, 'error');
        }
      });
    }
  }

  static async loadProvidersList() {
    const providersList = document.getElementById('providersList');
    if (!providersList) return;

    const allProviders = await MultiProviderConfig.getAllProviders();
    const customProviders = await CustomProviders.getAll();

    providersList.innerHTML = '';

    // Prepare built-in provider list
    const builtInProviders = [];
    Object.keys(PROVIDER_CONFIG).forEach(key => {
      if (key === 'custom') return; // Skip custom option
      
      const baseConfig = PROVIDER_CONFIG[key];
      const providerConfig = allProviders[key];
      
      // Check configuration status: getAllProviders() now correctly sets configured field
      let isConfigured = false;
      if (providerConfig) {
        isConfigured = !!providerConfig.configured;
      }
      
      builtInProviders.push({
        key,
        name: baseConfig.name,
        baseURL: providerConfig?.baseURL || baseConfig.baseURL || '',
        configured: isConfigured,
        isCustom: false
      });
    });

    // Prepare custom provider list
    const customProvidersList = [];
    Object.keys(customProviders).forEach(key => {
      const customProvider = customProviders[key];
      const providerConfig = allProviders[key];
      
      // Check configuration status: getAllProviders() now correctly sets configured field
      let isConfigured = false;
      if (providerConfig) {
        isConfigured = !!providerConfig.configured;
      }
      
      customProvidersList.push({
        key,
        name: customProvider.name,
        baseURL: customProvider.baseURL || '',
        configured: isConfigured,
        isCustom: true
      });
    });

    // Merge all providers
    const allProvidersList = [...builtInProviders, ...customProvidersList];

    // Sort: configured first, then by provider name
    allProvidersList.sort((a, b) => {
      // First sort by configuration status (configured first)
      if (a.configured !== b.configured) {
        return b.configured - a.configured;
      }
      // Then sort by name
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    // Add sorted provider items
    allProvidersList.forEach(provider => {
      const providerItem = this.createProviderItem(provider.key, provider);
      providersList.appendChild(providerItem);
    });

    // If no configured providers, show hint
    const configuredCount = allProvidersList.filter(provider => provider.configured).length;
    if (configuredCount === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'providers-empty';
      emptyHint.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
        <div>No providers configured yet</div>
        <div>Select provider in "General Settings" and configure API key</div>
      `;
      providersList.appendChild(emptyHint);
    }
  }

  static createProviderItem(key, provider) {
    const div = document.createElement('div');
    div.className = 'provider-item';
    
    const configuredText = getMessage('status_configured') || 'Configured';
    const notConfiguredText = getMessage('status_not_configured') || 'Not configured';
    const customText = getMessage('type_custom') || 'Custom';
    const builtinText = getMessage('type_builtin') || 'Built-in';
    const typeLabel = getMessage('type_label') || 'Type';
    
    const statusBadge = provider.configured 
      ? `<span class="status-badge configured">${configuredText}</span>`
      : `<span class="status-badge not-configured">${notConfiguredText}</span>`;
    
    const typeInfo = provider.isCustom 
      ? `<span style="color: #1a73e8; font-weight: 500;">${customText}</span>`
      : `<span style="color: #666;">${builtinText}</span>`;

    // Use internationalized name (if built-in provider)
    let displayName = provider.name;
    if (!provider.isCustom) {
      const i18nKey = `provider_${key}`;
      if (typeof getMessage === 'function') {
        const localizedName = getMessage(i18nKey);
        if (localizedName && localizedName !== i18nKey) {
          displayName = localizedName;
        }
      }
    }

    // Only custom providers show edit and delete buttons
    const actions = provider.isCustom ? `
      <button type="button" class="btn btn-secondary btn-icon edit-provider-btn" data-provider-key="${key}" title="Edit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
      <button type="button" class="btn btn-secondary btn-icon delete-provider-btn" data-provider-key="${key}" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
        </svg>
      </button>
    ` : `
      <button type="button" class="btn btn-primary btn-icon configure-provider-btn" data-provider-key="${key}" title="Configure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      </button>
    `;

    div.innerHTML = `
      <div class="provider-info">
        <div class="provider-name">${displayName}</div>
        <div class="provider-details">
          <span>URL: ${provider.baseURL || '--'}</span>
          <span>${typeLabel}: ${typeInfo}</span>
        </div>
        <div class="provider-status">
          ${statusBadge}
        </div>
      </div>
      <div class="provider-actions">
        ${actions}
      </div>
    `;
    return div;
  }

  // Configure provider (called when clicking configure button in management page)
  static async configureProvider(providerKey) {
    try {
      // Switch to "Current Configuration" tab
      const currentTab = document.querySelector('[data-tab="current"]');
      if (currentTab) {
        currentTab.click();
      }
      
      // Wait for tab switch and DOM update completion
      setTimeout(async () => {
        try {
          const providerSelect = document.getElementById('providerSelect');
          if (!providerSelect) {
            StatusManager.show(getMessage('config_ui_not_found') || 'Configuration UI elements not found, please manually switch to "Current Configuration" tab', 'error');
            return;
          }
          
          providerSelect.value = providerKey;
          
          // Trigger change event to ensure event handlers are called
          const changeEvent = new Event('change', { bubbles: true });
          providerSelect.dispatchEvent(changeEvent);
          
          // Wait for onProviderChange completion before showing config form
          setTimeout(async () => {
            try {
              await CurrentProviderConfig.showProviderConfigForm();
              StatusManager.show(getMessageWithParams('configuring_provider', { provider: providerKey }) || `Configuring ${providerKey} provider`, 'info');
            } catch (error) {
              console.error('Failed to show configuration form:', error);
              StatusManager.show(getMessageWithParams('show_config_form_failed', { error: error.message }) || 'Failed to show configuration form: ' + error.message, 'error');
            }
          }, 300);
          
        } catch (error) {
          console.error('Error occurred during provider configuration:', error);
          StatusManager.show(getMessageWithParams('configure_provider_failed', { error: error.message }) || 'Provider configuration failed: ' + error.message, 'error');
        }
      }, 200);
      
    } catch (error) {
      console.error('Provider configuration failed:', error);
      StatusManager.show(getMessageWithParams('configure_provider_failed', { error: error.message }) || 'Provider configuration failed: ' + error.message, 'error');
    }
  }

  static showProviderForm(provider = null) {
    const form = document.getElementById('providerForm');
    const formTitle = document.getElementById('formTitle');
    
    if (!form || !formTitle) {
      StatusManager.show(getMessage('form_elements_not_found_refresh') || '表单元素未找到，请刷新页面重试', 'error');
      return;
    }
    
    // 获取所有表单元素
    const nameInput = document.getElementById('providerName');
    const keyInput = document.getElementById('providerKey');
    const baseURLInput = document.getElementById('providerBaseURL');
    const endpointInput = document.getElementById('providerEndpoint');
    const modelsInput = document.getElementById('providerModels');

    // 检查必需的表单元素是否存在
    if (!nameInput || !keyInput || !baseURLInput || !endpointInput || !modelsInput) {
      StatusManager.show(getMessage('form_init_failed') || '表单初始化失败，请刷新页面重试', 'error');
      return;
    }
    
    if (provider) {
      formTitle.textContent = 'Edit Provider';
      nameInput.value = provider.name || '';
      keyInput.value = provider.key || '';
      baseURLInput.value = provider.baseURL || '';
      endpointInput.value = provider.endpoint || '/chat/completions';
      modelsInput.value = provider.models ? provider.models.join('\n') : '';
      CustomProviders.isEditing = true;
      
      // 编辑模式下不需要监听名称变化
      nameInput.removeEventListener('input', this.handleNameInput);
    } else {
      formTitle.textContent = 'Add Provider';
      nameInput.value = '';
      keyInput.value = '';
      baseURLInput.value = '';
      endpointInput.value = '/chat/completions';
      modelsInput.value = '';
      CustomProviders.isEditing = false;
      
      // 新增模式下监听名称输入，自动生成标识符
      nameInput.removeEventListener('input', this.handleNameInput); // 先移除可能存在的监听器
      nameInput.addEventListener('input', this.handleNameInput.bind(this));
    }

    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  // 处理名称输入事件，自动生成标识符
  static async handleNameInput(event) {
    const nameInput = event.target;
    const keyInput = document.getElementById('providerKey');
    
    if (!keyInput || CustomProviders.isEditing) return;
    
    const name = nameInput.value.trim();
    if (name) {
      const generatedKey = await this.generateUniqueKey(name);
      keyInput.value = generatedKey;
    } else {
      keyInput.value = '';
    }
  }

  static hideProviderForm() {
    const form = document.getElementById('providerForm');
    if (form) {
      form.style.display = 'none';
    }
    CustomProviders.isEditing = false;
  }

  static async saveProvider() {
    const nameInput = document.getElementById('providerName');
    const keyInput = document.getElementById('providerKey');
    const baseURLInput = document.getElementById('providerBaseURL');
    const endpointInput = document.getElementById('providerEndpoint');
    const modelsInput = document.getElementById('providerModels');

    if (!nameInput || !keyInput || !baseURLInput || !endpointInput || !modelsInput) {
      StatusManager.show(getMessage('form_elements_not_found') || '表单元素未找到', 'error');
      return;
    }

    const name = nameInput.value.trim();
    let key = keyInput.value.trim();
    const baseURL = baseURLInput.value.trim();
    const endpoint = endpointInput.value.trim();
    const modelsText = modelsInput.value.trim();

    // 验证必填字段
    if (!name || !baseURL) {
      StatusManager.show(getMessage('fill_required_fields') || '请填写供应商名称和API基础URL', 'error');
      return;
    }

    // 如果是新增模式且标识符为空，自动生成
    if (!CustomProviders.isEditing && !key) {
      key = await this.generateUniqueKey(name);
      keyInput.value = key;
    }

    if (!key) {
      StatusManager.show(getMessage('cannot_generate_provider_key') || '无法生成供应商标识符，请检查供应商名称', 'error');
      return;
    }

    // 验证URL格式
    try {
      new URL(baseURL);
    } catch {
      StatusManager.show(getMessage('invalid_url_format') || '请输入有效的URL格式', 'error');
      return;
    }

    const provider = {
      name,
      baseURL,
      endpoint: endpoint || '/chat/completions',
      models: modelsText ? modelsText.split('\n').map(m => m.trim()).filter(m => m) : []
    };

    try {
      await CustomProviders.save(key, provider);
      StatusManager.show(getMessage('provider_saved') || '供应商保存成功', 'success');
      this.hideProviderForm();
      this.loadProvidersList();
      // 延迟调用updateProviderSelect避免竞态条件
      setTimeout(() => {
        // Get current selected provider to maintain selection state
        const providerSelect = document.getElementById('providerSelect');
        const currentSelection = providerSelect ? providerSelect.value : null;
        CurrentProviderConfig.updateProviderSelect(currentSelection);
      }, 100);
    } catch (error) {
      StatusManager.show(getMessageWithParams('save_failed', { error: error.message }) || `保存失败: ${error.message}`, 'error');
    }
  }

  static async editProvider(key) {
    try {
      const providers = await CustomProviders.getAll();
      const provider = providers[key];
      
      if (!provider) {
        StatusManager.show(getMessage('provider_not_exist') || '供应商不存在，请刷新页面重试', 'error');
        return;
      }
      
      this.showProviderForm({ ...provider, key });
    } catch (error) {
      console.error('编辑供应商失败:', error);
      StatusManager.show(getMessageWithParams('edit_provider_failed', { error: error.message }) || '编辑供应商失败: ' + error.message, 'error');
    }
  }

  static async deleteProvider(key) {
    if (confirm('确定要删除这个供应商吗？')) {
      try {
        await CustomProviders.delete(key);
        StatusManager.show(getMessage('provider_deleted') || '供应商删除成功', 'success');
        this.loadProvidersList();
        // 延迟调用updateProviderSelect避免竞态条件
        setTimeout(() => {
          // Get current selected provider to maintain selection state
          const providerSelect = document.getElementById('providerSelect');
          const currentSelection = providerSelect ? providerSelect.value : null;
          CurrentProviderConfig.updateProviderSelect(currentSelection);
        }, 100);
      } catch (error) {
        StatusManager.show(getMessageWithParams('delete_failed', { error: error.message }) || `删除失败: ${error.message}`, 'error');
      }
    }
  }
}

// 高级设置页面
class AdvancedSettings {
  // 默认值常量
  static DEFAULT_VALUES = {
    maxTabs: 20,
    autoSave: false,
    cacheTimeout: 30
  };

  static init() {
    this.loadSettings();
    this.bindEvents();
  }

  static loadSettings() {
    chrome.storage.local.get([
      'maxTabs', 'autoSave', 'cacheTimeout'
    ], (result) => {
      const maxTabsInput = document.getElementById('maxTabs');
      const autoSaveInput = document.getElementById('autoSave');
      const cacheTimeoutInput = document.getElementById('cacheTimeout');

      if (maxTabsInput) {
        maxTabsInput.value = result.maxTabs !== undefined ? result.maxTabs : this.DEFAULT_VALUES.maxTabs;
      }
      if (autoSaveInput) {
        autoSaveInput.checked = result.autoSave !== undefined ? result.autoSave : this.DEFAULT_VALUES.autoSave;
      }
      if (cacheTimeoutInput) {
        cacheTimeoutInput.value = result.cacheTimeout !== undefined ? result.cacheTimeout : this.DEFAULT_VALUES.cacheTimeout;
      }
    });
  }

  static bindEvents() {
    // 自动保存设置变化
    ['maxTabs', 'autoSave', 'cacheTimeout'].forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => {
          this.saveSettings();
        });
      }
    });

    // 清除缓存按钮
    const clearCacheBtn = document.getElementById('clearCacheBtn');
    if (clearCacheBtn) {
      clearCacheBtn.addEventListener('click', () => {
        this.clearCache();
      });
    }

    // 重置设置按钮
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => {
        this.resetSettings();
      });
    }
  }

  static saveSettings() {
    const maxTabsInput = document.getElementById('maxTabs');
    const autoSaveInput = document.getElementById('autoSave');
    const cacheTimeoutInput = document.getElementById('cacheTimeout');

    const settings = {
      maxTabs: parseInt(maxTabsInput?.value) || this.DEFAULT_VALUES.maxTabs,
      autoSave: autoSaveInput?.checked || this.DEFAULT_VALUES.autoSave,
      cacheTimeout: parseInt(cacheTimeoutInput?.value) || this.DEFAULT_VALUES.cacheTimeout
    };

    chrome.storage.local.set(settings, () => {
      StatusManager.show(getMessage('advanced_settings_saved') || '高级设置已保存', 'success');
    });
  }

  static clearCache() {
    chrome.storage.local.remove(['modelCache'], () => {
      StatusManager.show(getMessage('cache_cleared') || '缓存已清除', 'success');
    });
  }

  static resetSettings() {
    if (confirm('确定要重置所有设置吗？此操作无法撤销。')) {
      chrome.storage.local.clear(() => {
        StatusManager.show(getMessage('all_settings_reset') || '所有设置已重置', 'success');
        setTimeout(() => {
          location.reload();
        }, 1000);
      });
    }
  }
}

// 关于页面
class AboutPage {
  static init() {
    // 关于页面的初始化逻辑
  }
}

// 获取带参数的国际化消息
function getMessageWithParams(key, params = {}) {
  let message = getMessage(key);
  if (message && typeof params === 'object') {
    Object.keys(params).forEach(param => {
      message = message.replace(`{${param}}`, params[param]);
    });
  }
  return message;
}

// 状态管理器
class StatusManager {
  static show(message, type = 'info', duration = 3000) {
    const status = document.getElementById('status');
    if (!status) return;

    status.textContent = message;
    status.className = type;
    status.style.display = 'block';

    setTimeout(() => {
      status.style.display = 'none';
    }, duration);
  }
}

// 工具函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 暴露全局函数，供HTML onclick调用
window.ProvidersManagement = ProvidersManagement;

// 应用初始化
async function initializeApp() {
  try {
    // 初始化国际化
    await customI18n.init();

    // 初始化各个页面
    new PageNavigation();
    GeneralSettings.init();
    await ProvidersPage.init();
    AdvancedSettings.init();
    AboutPage.init();
  } catch (error) {
    console.error('AI Tabs Options: 应用初始化失败:', error);
  }
}

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', initializeApp); 