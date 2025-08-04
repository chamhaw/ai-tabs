// i18n.js - Service Worker compatible internationalization helper

// Custom i18n manager for service worker (no DOM operations)
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

// Create global instance for service worker
if (typeof globalThis !== 'undefined') {
  globalThis.customI18n = new CustomI18n();
}

// Export for use in service worker
const customI18n = globalThis.customI18n;