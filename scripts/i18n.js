// i18n.js - Internationalization helper functions

// Custom i18n manager (optimized version)
class CustomI18n {
  constructor() {
    this.messages = {};
    this.currentLanguage = null;
    this.initialized = false;
    this.initPromise = null;
  }

  async init() {
    // Return directly if already initialized or being initialized
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInit();
    await this.initPromise;
    return this.initPromise;
  }

  async _doInit() {
    this.currentLanguage = await this.getUserLanguage();
    await this.loadMessages();
    this.initialized = true;
  }

  async getUserLanguage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userLanguage'], (result) => {
        const userLanguage = result.userLanguage || 'auto';
        if (userLanguage === 'auto') {
          // Auto-detect browser language
          try {
            const browserLanguage = chrome.i18n.getUILanguage() || 'en';
            resolve(browserLanguage.startsWith('zh') ? 'zh_CN' : 'en');
          } catch (e) {
            resolve('en');
          }
        } else {
          resolve(userLanguage);
        }
      });
    });
  }

  async loadMessages() {
    try {
      const url = chrome.runtime.getURL(`_locales/${this.currentLanguage}/messages.json`);
      const response = await fetch(url);
      const data = await response.json();
      this.messages = data;
    } catch (e) {
      console.warn(`Failed to load messages for ${this.currentLanguage}, falling back to English`);
      try {
        const url = chrome.runtime.getURL('_locales/en/messages.json');
        const response = await fetch(url);
        const data = await response.json();
        this.messages = data;
      } catch (fallbackError) {
        console.error('Failed to load fallback messages:', fallbackError);
        this.messages = {};
      }
    }
  }

  getMessage(key, substitutions = null) {
    const messageObj = this.messages[key];
    if (!messageObj) {
      console.warn(`i18n key not found: ${key}`);
      return key;
    }

    let message = messageObj.message;
    
    // Handle placeholder replacement
    if (substitutions && Array.isArray(substitutions)) {
      substitutions.forEach((sub, index) => {
        const placeholder = `$${index + 1}$`;
        message = message.replace(new RegExp(`\\$${index + 1}\\$`, 'g'), sub);
        // Also handle $ERROR$ format
        if (index === 0) {
          message = message.replace(/\$ERROR\$/g, sub);
        }
      });
    }

    return message;
  }
}

// Create global i18n instance
const customI18n = new CustomI18n();

/**
 * Initialize internationalization for the current page (optimized version)
 */
async function initI18n() {
  try {
    // Initialize custom i18n
    await customI18n.init();

    // Batch update DOM elements, reduce repeated queries
    const elementsToUpdate = [
      { selector: '[data-i18n]', attr: 'data-i18n', property: 'textContent' },
      { selector: '[data-i18n-placeholder]', attr: 'data-i18n-placeholder', property: 'placeholder' },
      { selector: '[data-i18n-title]', attr: 'data-i18n-title', property: 'title' }
    ];

    elementsToUpdate.forEach(({ selector, attr, property }) => {
      document.querySelectorAll(selector).forEach(element => {
        const messageKey = element.getAttribute(attr);
        const message = customI18n.getMessage(messageKey);
        if (message && message !== messageKey) {
          element[property] = message;
        }
      });
    });

    // Update page title if it has data-i18n attribute
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
      const messageKey = titleElement.getAttribute('data-i18n');
      const message = customI18n.getMessage(messageKey);
      if (message && message !== messageKey) {
        document.title = message;
      }
    }

    // Update document language
    document.documentElement.lang = getCurrentLanguage();
    
    console.log('[I18N] Internationalization initialized successfully');
  } catch (error) {
    console.error('[I18N] Failed to initialize internationalization:', error);
  }
}

/**
 * Get current language code
 */
function getCurrentLanguage() {
  return customI18n.currentLanguage || 'en';
}

/**
 * Get localized message with optional substitutions
 */
function getMessage(key, substitutions = null) {
  return customI18n.getMessage(key, substitutions);
}

/**
 * Update provider options with localized names
 */
function updateProviderOptions() {
  const providerSelect = document.getElementById('providerSelect');
  if (!providerSelect) return;

  const options = providerSelect.querySelectorAll('option[data-i18n]');
  options.forEach(option => {
    const messageKey = option.getAttribute('data-i18n');
    const message = customI18n.getMessage(messageKey);
    if (message) {
      option.textContent = message;
    }
  });
}

/**
 * Show localized status message
 */
function showLocalizedStatus(messageKey, substitutions = null, type = 'info', duration = 2000) {
  const message = customI18n.getMessage(messageKey, substitutions);
  const statusDiv = document.getElementById('status');
  if (statusDiv && message) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, duration);
  }
}

// Auto-initialize when DOM is loaded (optimized version)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Delay initialization to avoid blocking page load
    setTimeout(initI18n, 0);
  });
} else {
  // If DOM is already loaded, delay initialization
  setTimeout(initI18n, 0);
} 