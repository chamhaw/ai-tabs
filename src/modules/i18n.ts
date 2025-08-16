/**
 * Universal i18n module for Chrome Extension
 * ES Module version with TypeScript support
 * Works in both Service Worker and DOM contexts
 */

import { createComponentLogger } from '../utils/logger';

interface I18nMessages {
  [key: string]: {
    message: string;
    placeholders?: {
      [key: string]: {
        content: string;
      };
    };
  };
}

interface CustomI18n {
  currentLanguage: string;
  messages: I18nMessages;
  initialized: boolean;
  init(): Promise<void>;
  loadMessages(): Promise<void>;
  getMessage(key: string, substitutions?: string | string[]): string;
}

const log = createComponentLogger('I18n');

class I18nImplementation implements CustomI18n {
  currentLanguage: string = 'en';
  messages: I18nMessages = {};
  initialized: boolean = false;

  async init(): Promise<void> {
    try {
      // Determine language preference
      let targetLanguage = 'en';
      
      // Try to get user preference from storage first
      if (typeof chrome !== 'undefined' && chrome.storage) {
        try {
          const result = await chrome.storage.local.get(['userLanguage', 'language']);
          const userLanguage = result.userLanguage || result.language;
          
          if (!userLanguage || userLanguage === 'auto') {
            // Auto-detect from browser
            if (chrome.i18n && chrome.i18n.getUILanguage) {
              const browserLanguage = chrome.i18n.getUILanguage();
              targetLanguage = browserLanguage.startsWith('zh') ? 'zh_CN' : 'en';
            }
          } else {
            targetLanguage = userLanguage;
          }
        } catch (e) {
          // Storage not available, use auto-detect
          if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
            const browserLanguage = chrome.i18n.getUILanguage();
            targetLanguage = browserLanguage.startsWith('zh') ? 'zh_CN' : 'en';
          }
        }
      }
      
      this.currentLanguage = targetLanguage;
      await this.loadMessages();
      this.initialized = true;
    } catch (error) {
      console.error('I18n initialization failed:', error);
      this.currentLanguage = 'en';
      this.messages = {};
      this.initialized = true;
    }
  }

  async loadMessages(): Promise<void> {
    try {
      const messagesUrl = `_locales/${this.currentLanguage}/messages.json`;
      
      // Try different methods to load messages based on context
      let messagesData: I18nMessages;
      
      if (typeof fetch !== 'undefined') {
        // DOM/Service Worker context
        const response = await fetch(chrome.runtime.getURL(messagesUrl));
        if (!response.ok) {
          throw new Error(`Failed to load messages: ${response.status}`);
        }
        messagesData = await response.json();
      } else {
        // Fallback for environments without fetch
        throw new Error('No method available to load messages');
      }
      
      this.messages = messagesData;
    } catch (error) {
      console.error(`Failed to load messages for ${this.currentLanguage}:`, error);
      
      // Fallback to English if current language fails
      if (this.currentLanguage !== 'en') {
        this.currentLanguage = 'en';
        try {
          const response = await fetch(chrome.runtime.getURL('_locales/en/messages.json'));
          if (response.ok) {
            this.messages = await response.json();
          }
        } catch (fallbackError) {
          console.error('Failed to load fallback messages:', fallbackError);
          this.messages = {};
        }
      } else {
        this.messages = {};
      }
    }
  }

  getMessage(key: string, substitutions?: string | string[]): string {
    if (!this.initialized) {
      log.warn('I18n not initialized, returning key', { key });
      return key;
    }

    const messageObj = this.messages[key];
    if (!messageObj) {
      log.warn('Missing i18n key', { key });
      return key;
    }

    let message = messageObj.message;

    // Handle substitutions
    if (substitutions && messageObj.placeholders) {
      const substitutionArray = Array.isArray(substitutions) ? substitutions : [substitutions];
      
      Object.keys(messageObj.placeholders).forEach((placeholder, index) => {
        if (index < substitutionArray.length) {
          const placeholderPattern = new RegExp(`\\$${placeholder.toUpperCase()}\\$`, 'g');
          message = message.replace(placeholderPattern, substitutionArray[index]);
        }
      });
    }

    // Handle simple $1, $2, etc. substitutions
    if (substitutions) {
      const substitutionArray = Array.isArray(substitutions) ? substitutions : [substitutions];
      substitutionArray.forEach((substitution, index) => {
        const pattern = new RegExp(`\\$${index + 1}`, 'g');
        message = message.replace(pattern, substitution);
      });
    }

    return message;
  }
}

// Create global instance
const customI18n = new I18nImplementation();

// Initialize i18n function for DOM context
export async function initI18n(): Promise<void> {
  await customI18n.init();
  
  // Update DOM elements with data-i18n attributes (DOM context only)
  if (typeof document !== 'undefined') {
    const elementsToTranslate = document.querySelectorAll('[data-i18n]');
    elementsToTranslate.forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const message = customI18n.getMessage(key);
        if (message !== key) {
          element.textContent = message;
        }
      }
    });
    
    // Update placeholder attributes
    const elementsWithI18nPlaceholder = document.querySelectorAll('[data-i18n-placeholder]');
    elementsWithI18nPlaceholder.forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key && element instanceof HTMLInputElement) {
        const message = customI18n.getMessage(key);
        if (message !== key) {
          element.placeholder = message;
        }
      }
    });
  }
}

// getMessage function for direct use
export function getMessage(key: string, substitutions?: string | string[]): string {
  return customI18n.getMessage(key, substitutions);
}

// Export the i18n instance
export { customI18n };

// For backward compatibility
if (typeof globalThis !== 'undefined') {
  (globalThis as any).customI18n = customI18n;
  (globalThis as any).initI18n = initI18n;
  (globalThis as any).getMessage = getMessage;
}

// For window context compatibility  
if (typeof window !== 'undefined') {
  (window as any).customI18n = customI18n;
  (window as any).initI18n = initI18n;
  (window as any).getMessage = getMessage;
}


