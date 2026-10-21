import { useState, useEffect } from 'react';
import ConnectionsSettings from './components/ConnectionsSettings';
import { initI18n } from './modules/i18n';

const Options = () => {
  const [activePage, setActivePage] = useState(window.location.hash.slice(1) || 'general');
  const [language, setLanguage] = useState('auto');
  const [refreshKey, setRefreshKey] = useState(0);
  const [advancedSettings, setAdvancedSettings] = useState({ maxTabs: 20, autoSave: false, cacheTimeout: 30 });

  const loadAllSettings = async () => {
    const result = await chrome.storage.local.get(['userLanguage', 'language', 'maxTabs', 'autoSave', 'cacheTimeout']);
    setLanguage(result.userLanguage || result.language || 'auto');
    setAdvancedSettings({ maxTabs: result.maxTabs || 20, autoSave: result.autoSave || false, cacheTimeout: result.cacheTimeout || 30 });
  };

  useEffect(() => {
    void initI18n().then(loadAllSettings);
    const onHashChange = () => setActivePage(window.location.hash.slice(1) || 'general');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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
      
      // Re-initialize i18n
      await initI18n();
      updateUITranslations();
      
      // Force re-render to update all dynamic content
      setRefreshKey(prev => prev + 1);
      
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
        setRefreshKey(value => value + 1);
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
    
    // Update all elements with data-i18n-placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      if (typeof (window as any).getMessage === 'function') {
        const message = (window as any).getMessage(messageKey);
        if (message && message !== messageKey && element instanceof HTMLInputElement) {
          element.placeholder = message;
        }
      }
    });
  };

  const renderGeneralPage = () => (
    <div className="content-page active" id="page-general">
      <div className="page-header">
        <h3 data-i18n="nav_general">Settings</h3>
        <p data-i18n="general_description">Configure AI service settings and preferences</p>
      </div>
      
      <div className="settings-section">
        <h4 data-i18n="basic_settings">Basic Settings</h4>
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

      <div className="settings-section">
        <h4 data-i18n="performance_settings">Performance Settings</h4>
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
        return <ConnectionsSettings key={refreshKey} />;
      case 'about':
        return renderAboutPage();
      default:
        return renderGeneralPage();
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

    </div>
  );
};

export default Options;
