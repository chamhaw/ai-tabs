// i18n.js - Universal internationalization helper for both Service Worker and DOM environments

// Universal i18n manager that works in both Service Worker and DOM environments
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
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      this.messages = await response.json();
    } catch (error) {
      console.error('Failed to load messages:', error);
      this.messages = {};
    }
  }

  getMessage(key, substitutions = null) {
    const messageData = this.messages[key];
    if (!messageData || !messageData.message) {
      return key; // Return the key if no translation found
    }

    let message = messageData.message;

    // Handle substitutions
    if (substitutions) {
      if (typeof substitutions === 'string') {
        message = message.replace('$1', substitutions);
      } else if (Array.isArray(substitutions)) {
        substitutions.forEach((sub, index) => {
          message = message.replace(`$${index + 1}`, sub);
        });
      }
    }

    return message;
  }
}

// Create global instance
let customI18n;
if (typeof globalThis !== 'undefined') {
  globalThis.customI18n = new CustomI18n();
  customI18n = globalThis.customI18n;
} else {
  customI18n = new CustomI18n();
}

// For DOM environment, expose functions to window
if (typeof window !== 'undefined') {
  // Initialize function
  window.initI18n = async function() {
    try {
      await customI18n.init();
      
      // Update DOM elements with i18n attributes
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
      document.documentElement.lang = customI18n.currentLanguage || 'en';
      
      console.log('[I18N] Internationalization initialized successfully');
    } catch (error) {
      console.error('[I18N] Failed to initialize internationalization:', error);
    }
  };
  
  // Expose getMessage function
  window.getMessage = function(key, substitutions = null) {
    return customI18n.getMessage(key, substitutions);
  };
  
  // Expose getCurrentLanguage function
  window.getCurrentLanguage = function() {
    return customI18n.currentLanguage || 'en';
  };
  
  // Auto-initialize when DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(window.initI18n, 0);
    });
  } else {
    setTimeout(window.initI18n, 0);
  }
}