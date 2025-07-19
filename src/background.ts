// Chrome extension service worker for AI Tab Manager

// Security module implementation
class SimpleEncryption {
  private deviceFingerprint: string;

  constructor() {
    this.deviceFingerprint = this.getDeviceFingerprint();
  }

  encrypt(data: string): string {
    if (!data) return '';
    
    let result = '';
    const key = this.deviceFingerprint;
    
    for (let i = 0; i < data.length; i++) {
      const textChar = data.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      result += String.fromCharCode(textChar ^ keyChar);
    }
    
    return btoa(result);
  }

  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';
    
    try {
      const encrypted = atob(encryptedData);
      let result = '';
      const key = this.deviceFingerprint;
      
      for (let i = 0; i < encrypted.length; i++) {
        const encryptedChar = encrypted.charCodeAt(i);
        const keyChar = key.charCodeAt(i % key.length);
        result += String.fromCharCode(encryptedChar ^ keyChar);
      }
      
      return result;
    } catch (e) {
      return '';
    }
  }

  private getDeviceFingerprint(): string {
    const userAgent = navigator.userAgent || '';
    const language = navigator.language || 'en';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    
    return btoa(userAgent + language + timezone).substring(0, 16);
  }
}

class SecureStorage {
  private encryption: SimpleEncryption;

  constructor() {
    this.encryption = new SimpleEncryption();
  }

  async setApiKey(apiKey: string): Promise<void> {
    if (!apiKey) {
      await chrome.storage.local.remove(['encryptedApiKey']);
      return;
    }

    const encrypted = this.encryption.encrypt(apiKey);
    await chrome.storage.local.set({ encryptedApiKey: encrypted });
  }

  async getApiKey(): Promise<string> {
    const result = await chrome.storage.local.get(['encryptedApiKey']);
    if (!result.encryptedApiKey) {
      return '';
    }

    return this.encryption.decrypt(result.encryptedApiKey);
  }

  async isApiKeyValid(): Promise<boolean> {
    const apiKey = await this.getApiKey();
    return Boolean(apiKey && apiKey.length > 0);
  }
}

// Global secure storage instance
const secureStorage = new SecureStorage();

// Custom i18n manager
class I18nManager {
  private messages: { [key: string]: { message: string } } = {};
  private currentLanguage: string | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = this._doInit();
    await this.initPromise;
  }

  private async _doInit(): Promise<void> {
    this.currentLanguage = await this.getUserLanguage();
    await this.loadMessages();
    this.initialized = true;
  }

  private async getUserLanguage(): Promise<string> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userLanguage'], (result) => {
        const userLanguage = result.userLanguage || 'auto';
        if (userLanguage === 'auto') {
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

  private async loadMessages(): Promise<void> {
    try {
      const url = chrome.runtime.getURL(`_locales/${this.currentLanguage}/messages.json`);
      const response = await fetch(url);
      const data = await response.json();
      this.messages = data;
    } catch (error) {
      console.warn('Failed to load messages, using defaults:', error);
      this.messages = {
        ext_name: { message: 'AI Tab Manager' },
        ext_description: { message: 'Intelligent tab grouping with AI' }
      };
    }
  }

  getMessage(key: string, substitutions: (string | number)[] | null = null): string {
    let message = this.messages[key]?.message || key;
    
    if (substitutions && substitutions.length > 0) {
      substitutions.forEach((substitution, index) => {
        message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), String(substitution));
      });
    }

    return message;
  }
}

const i18nManager = new I18nManager();

// Helper function to get localized messages
async function getLocalizedMessage(key: string, substitutions: (string | number)[] | null = null): Promise<string> {
  await i18nManager.init();
  return i18nManager.getMessage(key, substitutions);
}

// AI Provider configurations
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4'
  },
  deepseek: {
    name: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultModel: 'deepseek-chat'
  }
};

// Get current provider configuration
async function getCurrentProviderConfig(): Promise<any> {
  const result = await chrome.storage.local.get(['selectedProvider', 'providers']);
  const selectedProvider = result.selectedProvider;
  
  if (!selectedProvider || !result.providers || !result.providers[selectedProvider]) {
    return null;
  }
  
  return result.providers[selectedProvider];
}

// Secure settings retrieval
async function getSecureSettings(keys: string[]): Promise<any> {
  const providerConfig = await getCurrentProviderConfig();
    
  if (!providerConfig) {
    throw new Error(await getLocalizedMessage('error_ai_settings_not_configured'));
  }
  
  const result: { [key: string]: any } = {};
  
  keys.forEach(key => {
    switch (key) {
      case 'apiKey':
        result[key] = providerConfig.apiKey;
        break;
      case 'baseURL':
        result[key] = providerConfig.baseURL;
        break;
      case 'model':
      case 'selectedModel':
        result[key] = providerConfig.selectedModel;
        break;
      case 'selectedProvider':
      case 'currentProvider':
        result[key] = providerConfig.selectedProvider;
        break;
      default:
        break;
    }
  });
  
  const otherKeys = keys.filter(key => !['apiKey', 'baseURL', 'model', 'selectedModel', 'selectedProvider', 'currentProvider'].includes(key));
  if (otherKeys.length > 0) {
    const otherSettings = await new Promise(resolve => {
      chrome.storage.local.get(otherKeys, resolve);
    });
    Object.assign(result, otherSettings);
  }
  return result;
}

// Tab grouping logic
async function classifyTabsWithAI(tabs: chrome.tabs.Tab[]): Promise<any[]> {
  try {
    const settings = await getSecureSettings(['apiKey', 'baseURL', 'selectedModel', 'selectedProvider']);
    
    if (!settings.apiKey || !settings.baseURL) {
      throw new Error('AI provider not configured');
    }

    const tabsInfo = tabs.map(tab => ({
      id: tab.id,
      title: tab.title || '',
      url: tab.url || ''
    }));

    const prompt = `Please analyze these browser tabs and group them by category. Return a JSON array where each element has:
- "groupName": category name (in English, meaningful, not "Others" or "Miscellaneous")
- "tabIds": array of tab IDs belonging to this category
- "color": suggested color for the group

Tabs to analyze:
${JSON.stringify(tabsInfo, null, 2)}

Only create groups with 2+ tabs. Return JSON only.`;

    const response = await fetch(`${settings.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.selectedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('AI classification error:', error);
    throw error;
  }
}

// Group tabs based on AI classification
async function groupTabsIntelligently(): Promise<void> {
  const settings = await getSecureSettings(['minTabsInGroup', 'reuseExistingGroups']);
  const minTabsInGroup = settings.minTabsInGroup || 2;

  const tabs = await chrome.tabs.query({ currentWindow: true });
  const ungroupedTabs = tabs.filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);

  if (ungroupedTabs.length < minTabsInGroup) {
    throw new Error('Not enough tabs to group');
  }

  const groups = await classifyTabsWithAI(ungroupedTabs);

  for (const group of groups) {
    if (group.tabIds && group.tabIds.length >= minTabsInGroup) {
      const validTabIds = group.tabIds.filter((id: number) => 
        ungroupedTabs.some(tab => tab.id === id)
      );

      if (validTabIds.length >= minTabsInGroup) {
        const groupId = await chrome.tabs.group({ tabIds: validTabIds });
        await chrome.tabGroups.update(groupId, {
          title: group.groupName,
          color: group.color || 'blue'
        });
      }
    }
  }
}

// Ungroup all tabs
async function ungroupAllTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const groupedTabs = tabs.filter(tab => tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE);
  
  if (groupedTabs.length > 0) {
    const tabIds = groupedTabs.map(tab => tab.id!);
    await chrome.tabs.ungroup(tabIds);
  }
}

// Rate limiting for auto-grouping
const AUTO_GROUP_RATE_LIMIT = 30000; // 30 seconds
let lastAutoGroupTime = 0;
const ongoingGroupingRequests = new Set<number>();

// Auto-grouping logic
async function checkAndTriggerAutoGroup(windowId: number): Promise<void> {
  if (ongoingGroupingRequests.has(windowId)) {
    return;
  }
  
  const now = Date.now();
  const timeSinceLastAutoGroup = now - lastAutoGroupTime;
  if (timeSinceLastAutoGroup < AUTO_GROUP_RATE_LIMIT) {
    return;
  }

  try {
    const allTabsInWindow = await chrome.tabs.query({ windowId, windowType: 'normal' });
    const realWebTabs = allTabsInWindow.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome-extension://') && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('edge://') && 
      !tab.url.startsWith('about:') &&
      !tab.url.startsWith('moz-extension://') &&
      tab.url !== 'chrome://newtab/' &&
      tab.url !== 'edge://newtab/'
    );
    
    if (realWebTabs.length === 0) {
      return;
    }
    
  } catch (error) {
    return;
  }
  
  const settings = await getSecureSettings(['autoGroupThreshold', 'apiKey', 'baseURL', 'model', 'currentProvider', 'selectedProvider', 'selectedModel']);
  
  const currentProvider = settings.selectedProvider || settings.currentProvider;
  let baseURL = settings.baseURL;
  
  if (!baseURL && currentProvider && AI_PROVIDERS[currentProvider as keyof typeof AI_PROVIDERS]) {
    baseURL = AI_PROVIDERS[currentProvider as keyof typeof AI_PROVIDERS].baseURL;
  }
  
  if (!settings.apiKey || !baseURL) {
    return;
  }

  try {
    const currentWindow = await chrome.windows.getCurrent();
    const tabs = await chrome.tabs.query({ windowId: currentWindow.id });
    const ungroupedTabs = tabs.filter(tab => 
      tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE &&
      tab.url && 
      !tab.url.startsWith('chrome-extension://') && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('edge://') && 
      !tab.url.startsWith('about:') &&
      tab.url !== 'chrome://newtab/' &&
      tab.url !== 'edge://newtab/'
    );

    const autoGroupThreshold = settings.autoGroupThreshold || 5;
    
    if (ungroupedTabs.length >= autoGroupThreshold) {
      ongoingGroupingRequests.add(windowId);
      lastAutoGroupTime = now;
      
      await groupTabsIntelligently();
      
      ongoingGroupingRequests.delete(windowId);
    }
  } catch (error) {
    console.error('Auto-grouping failed:', error);
    ongoingGroupingRequests.delete(windowId);
  }
}

// Handle tab changes for auto-grouping
async function handleTabChange(changeType: string, windowId: number): Promise<void> {
  const settings = await getSecureSettings(['enableAutoGroup']);
  
  if (!settings.enableAutoGroup) {
    return;
  }

  setTimeout(() => {
    checkAndTriggerAutoGroup(windowId);
  }, 2000);
}

// Message listener
chrome.runtime.onMessage.addListener((request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  
  if (request.type === 'KEEP_ALIVE') {
    sendResponse({ success: true });
    return false;
  }

  if (request.type === 'GET_TABS') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs });
    });
    return true;
  }

  if (request.type === 'GET_SETTINGS') {
    getSecureSettings(['baseURL', 'apiKey', 'model', 'selectedProvider', 'selectedModel']).then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse({ error: error.message });
    });
    return true;
  }

  if (request.type === 'START_GROUPING') {
    groupTabsIntelligently().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (request.type === 'UNGROUP_TABS') {
    ungroupAllTabs().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  return false;
});

// Tab event listeners for auto-grouping
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.url && (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
    return;
  }
  if (tab.url && tab.url !== 'about:blank' && tab.url !== 'chrome://newtab/' && tab.url !== 'edge://newtab/') {
    handleTabChange('onCreated', tab.windowId);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      !tab.url.startsWith('chrome-extension://') && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('edge://') && 
      !tab.url.startsWith('about:') &&
      tab.url !== 'chrome://newtab/' &&
      tab.url !== 'edge://newtab/') {
    handleTabChange('onUpdated', tab.windowId);
  }
});

// Keep service worker alive
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }).catch(() => {
    // Ignore errors
  });
}, 25000); 