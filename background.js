// Import security module
importScripts('scripts/security.js');

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
    
    // Handle numeric placeholder replacement (e.g. $1 -> actual value)
    if (substitutions && Array.isArray(substitutions)) {
      substitutions.forEach((sub, index) => {
        const placeholder = `$${index + 1}`;
        // Chrome extensions use $1 format, not $1$
        message = message.replace(new RegExp(`\\$${index + 1}(?!\\$)`, 'g'), sub);
      });
    }

    return message;
  }
}

// Create global i18n instance
const customI18n = new CustomI18n();

// Compatibility wrapper function (optimized version)
async function getMessage(key, substitutions = null) {
  try {
    if (!customI18n.initialized) {
      await customI18n.init();
    }
    const message = customI18n.getMessage(key, substitutions);
    // If the key itself is returned, it means no corresponding translation was found
    if (message === key) {
      console.warn(`Missing internationalization message: ${key}`);
    }
    return message;
  } catch (error) {
    console.error(`Failed to get internationalization message: ${key}`, error);
    return key; // Return key as fallback
  }
}

// Environment detection function
function isServiceWorker() {
  return typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
}

// Message retrieval function with parameters
async function getMessageWithParams(key, params = {}) {
  let message = await getMessage(key);
  if (message && typeof message === 'string' && typeof params === 'object') {
    Object.keys(params).forEach(param => {
      const placeholder = `{${param}}`;
      if (message.includes(placeholder)) {
        message = message.replace(placeholder, params[param]);
      }
    });
  }
  return message;
}



// Get current provider configuration
async function getCurrentProviderConfig() {
  return new Promise(async (resolve) => {
    // Get basic settings
    chrome.storage.local.get(['selectedProvider', 'providers'], async (storageData) => {
      const selectedProvider = storageData.selectedProvider;
      const providers = storageData.providers || {};
      
      if (!selectedProvider || !providers[selectedProvider]) {
        resolve(null);
        return;
      }
      
      const providerConfig = providers[selectedProvider];
      // Provider URL mapping (sorted alphabetically)
      const baseURLMap = {
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
      
      // Decrypt API key
      let decryptedApiKey = '';
      if (providerConfig.apiKey) {
        try {
          decryptedApiKey = secureStorage.encryption.decrypt(providerConfig.apiKey);
          
          // Validate decrypted API key format
          if (decryptedApiKey && (
            decryptedApiKey.includes('\u0000') ||  // null characters
            decryptedApiKey.includes('\u001F') ||  // control characters
            decryptedApiKey.length < 10 ||         // too short
            decryptedApiKey.length > 200 ||        // too long
            /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(decryptedApiKey) // control characters
          )) {
            console.warn('Decrypted API key contains invalid characters, clearing...');
            decryptedApiKey = '';
            // Clear the corrupted key from storage
            const updatedProviders = { ...storageData.providers };
            delete updatedProviders[selectedProvider].apiKey;
            updatedProviders[selectedProvider].configured = false;
            chrome.storage.local.set({ providers: updatedProviders });
          }
        } catch (e) {
          console.warn(await getMessage('log_api_key_decryption_failed') + ':', e);
          // Decryption failed, key is invalid, needs reconfiguration
          decryptedApiKey = '';
        }
      }

      const configResult = {
        selectedProvider: selectedProvider,
        apiKey: decryptedApiKey,
        baseURL: providerConfig.baseURL || baseURLMap[selectedProvider] || '',
        selectedModel: providerConfig.selectedModel || '',
        models: providerConfig.models || []
      };
    
      // If original config has key but decrypted result is empty, it means decryption failed
      if (providerConfig.apiKey && !decryptedApiKey) {
        console.warn(await getMessage('log_api_key_decryption_failed_empty_config'));
      }
    
      resolve(configResult);
    });
  });
}

// Secure settings retrieval function (supports multi-provider configuration)
async function getSecureSettings(keys) {
  // Get new multi-provider configuration
  const providerConfig = await getCurrentProviderConfig();
    
  if (!providerConfig) {
    throw new Error(await getMessage('error_ai_settings_not_configured'));
  }
  
  const result = {};
  
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
        // For other settings, get from storage
        break;
    }
  });
  
  // Get other settings
  const otherKeys = keys.filter(key => !['apiKey', 'baseURL', 'model', 'selectedModel', 'selectedProvider', 'currentProvider'].includes(key));
  if (otherKeys.length > 0) {
    const otherSettings = await new Promise(resolve => {
      chrome.storage.local.get(otherKeys, resolve);
    });
    Object.assign(result, otherSettings);
  }
  return result;
}

// Listen for popup requests for tab information
// Simplified message listener - test basic functionality
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.type === 'KEEP_ALIVE') {
    // This is just to keep the service worker alive.
    // The response is not important, but we should send one to avoid errors.
    sendResponse({ success: true });
    return false; // No async operation
  }

  if (request.type === 'GET_TABS') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs });
    });
    return true; // Async response
  }
  if (request.type === 'GET_SETTINGS') {
    getSecureSettings(['baseURL', 'apiKey', 'model', 'selectedProvider', 'selectedModel']).then((result) => {
      sendResponse(result);
    });
    return true;
  }
  if (request.type === 'SET_SETTINGS') {
    // Fix: consistently use chrome.storage.local
    chrome.storage.local.set({ baseURL: request.baseURL, apiKey: request.apiKey, model: request.model }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  if (request.type === 'START_GROUPING') {
    
    // For manual triggers, we act on the last focused, normal window.
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
      
      if (chrome.runtime.lastError || !window) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || await getMessage('error_no_active_normal_window') });
        return;
      }
      
      // Additional window type validation
      if (window.type !== 'normal') {
        sendResponse({ success: false, error: await getMessage('error_non_normal_window') || 'Can only perform grouping operations on normal browser windows' });
        return;
      }
      
      // Check if there's already an ongoing request for this window
      if (ongoingGroupingRequests.has(window.id)) {
        sendResponse({ success: false, error: await getMessage('error_grouping_in_progress') });
        return;
      }      
      // Mark this window as having an ongoing request
      ongoingGroupingRequests.add(window.id);
      
      try {
        await initiateAndGroupTabs(null, window.id);
        sendResponse({ success: true, message: await getMessage('message_grouping_process_completed') });
      } catch (e) {
        // Check if it's a window type related error
        let errorMsg = e.message;
        if (e.message.includes('normal windows')) {
          errorMsg = await getMessage('error_non_normal_window') || 'Can only perform grouping operations on normal browser windows';
        }
        sendResponse({ success: false, error: errorMsg });
      } finally {
        // Always remove the window from ongoing requests
        ongoingGroupingRequests.delete(window.id);
      }
    });
    return true; // Keep message channel open for async response
  }
  if (request.type === 'UNGROUP_TABS') {
    // We need to know which window to ungroup, and it must be a normal window.
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
       if (chrome.runtime.lastError || !window) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || await getMessage('error_no_active_normal_window') });
        return;
      }
      
      // Additional window type validation
      if (window.type !== 'normal') {
        sendResponse({ success: false, error: await getMessage('error_non_normal_window') || 'Can only perform operations on normal browser windows' });
        return;
      }
      
      ungroupAllTabs(window.id)
        .then(() => sendResponse({ success: true }))
        .catch(async (e) => {
          console.error("Ungrouping failed:", e);
          // Check if it's a window type related error
          let errorMsg = e.message;
          if (e.message.includes('normal windows')) {
            errorMsg = await getMessage('error_non_normal_window') || 'Can only perform operations on normal browser windows';
          }
          sendResponse({ success: false, error: errorMsg || await getMessage('error_unknown_error') });
        });
    });
    return true;
  }
});

async function ungroupAllTabs(windowId) {
  try {
    // Validate window type
    const window = await chrome.windows.get(windowId);
    if (window.type !== 'normal') {
      throw new Error(await getMessage('error_only_normal_window_operation'));
    }
    
    const tabs = await chrome.tabs.query({ windowId, windowType: 'normal' });
    const tabIds = tabs.map(tab => tab.id);
    
    if (tabIds.length > 0) {
      await chrome.tabs.ungroup(tabIds);
    }
  } catch (error) {
    console.error(await getMessage('error_ungroup_all_failed') + ':', error);
    // Check if it's a window type error
    if (error.message.includes('normal windows')) {
      throw new Error(await getMessage('error_only_normal_window_operation'));
    }
    throw error;
  }
}

async function groupTabs(groups, windowId) {
  if (!windowId) {
    console.error(await getMessage('error_grouptabs_no_windowid'));
    const lastFocused = await chrome.windows.getLastFocused();
    windowId = lastFocused.id;
  }

  // Verify this is a normal window before proceeding
  try {
    const window = await chrome.windows.get(windowId);
    if (window.type !== 'normal') {
      const errorMsg = await getMessage('error_non_normal_window') || `Cannot perform grouping operations in ${window.type} window. Only normal browser windows are supported.`;
      throw new Error(errorMsg);
    }
  } catch (error) {
    // If the window doesn't exist or there's another issue, try to get the current active window
    try {
      const lastFocused = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
      if (lastFocused && lastFocused.type === 'normal') {
        windowId = lastFocused.id;
      } else {
        const errorMsg = await getMessage('error_no_normal_window') || 'No usable normal browser window found for grouping operations.';
        throw new Error(errorMsg);
      }
    } catch (fallbackError) {
      const errorMsg = await getMessage('error_window_validation_failed') || `Window validation failed: ${error.message}`;
      throw new Error(errorMsg);
    }
  }

  const allWindowTabs = await chrome.tabs.query({ windowId, windowType: 'normal' });
  const allWindowTabGroups = await chrome.tabGroups.query({ windowId });

  // Create a map of URL -> array of tab objects to handle duplicate URLs
  const urlToTabsMap = new Map();
  for (const tab of allWindowTabs) {
    if (!tab.url) continue; // Skip tabs without URLs
    if (!urlToTabsMap.has(tab.url)) {
      urlToTabsMap.set(tab.url, []);
    }
    urlToTabsMap.get(tab.url).push(tab);
  }

  const groupIdToTitle = new Map(allWindowTabGroups.map(g => [g.id, g.title]));
  
  const tabsToMove = new Set();
  const groupPlan = new Map(); // Map<groupName, tabId[]>

  // First pass: collect all tabs for each group name, merging same-named groups
  for (const group of groups) {
    const groupName = group.name || 'AI Group';
    
    // Initialize the group if it doesn't exist
    if (!groupPlan.has(groupName)) {
      groupPlan.set(groupName, []);
    }
    
    const tabIdsForThisGroup = groupPlan.get(groupName);
    
    // Collect all unique URLs in this group, avoiding duplicate processing
    const processedUrls = new Set();

    for (const tabInfo of group.tabs) {
      if (!tabInfo.url) continue;
      
      // If this URL has already been processed, skip
      if (processedUrls.has(tabInfo.url)) continue;
      
      const availableTabs = urlToTabsMap.get(tabInfo.url);
      
      if (availableTabs && availableTabs.length > 0) {
        // Process all matching tab pages for this URL
        const tabsToProcess = [...availableTabs]; // Copy array to avoid modifying original
        
        for (const tab of tabsToProcess) {
          tabIdsForThisGroup.push(tab.id);
          const currentGroupName = groupIdToTitle.get(tab.groupId);
          
          // If the tab is not in the correct group, it needs to be moved.
          if (currentGroupName !== groupName) {
            tabsToMove.add(tab.id);
          }
        }
        
        // Clear this URL's tab list to avoid duplicate processing
        availableTabs.length = 0;
        // Mark this URL as processed
        processedUrls.add(tabInfo.url);
      }
    }
  }

  // First, ungroup all tabs that need to be moved.
  if (tabsToMove.size > 0) {
    try {
      await chrome.tabs.ungroup([...tabsToMove]);
      // Allow a brief moment for the ungrouping to settle in Chrome's state
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (ungroupError) {
      console.error(await getMessage('error_ungroup_failed') + ':', ungroupError);
      // Check if it's a window type error
      if (ungroupError.message.includes('normal windows')) {
        throw new Error(await getMessage('error_only_normal_window_grouping'));
      }
      throw new Error(await getMessageWithParams('error_ungroup_failed', {}) + `: ${ungroupError.message}`);
    }
  }
  
  // Now that tabs are free, group them according to the plan.
  const { reuseExistingGroups } = await chrome.storage.local.get('reuseExistingGroups');
  
  // Always check for existing groups to merge into, regardless of the setting
  // Re-query for groups as some might have been dismantled by the ungrouping.
  const freshGroups = await chrome.tabGroups.query({ windowId });
  let existingGroups = {};
  freshGroups.forEach(g => {
    if (g.title) {
      existingGroups[g.title] = g.id;
    }
  });

  for (const [groupName, tabIdsInPlan] of groupPlan.entries()) {
    // Only attempt to group tabs that were actually designated to be moved.
    const finalTabIds = tabIdsInPlan.filter(id => tabsToMove.has(id));

    if (finalTabIds.length === 0) continue;

    const existingGroupId = existingGroups[groupName];
    
    if (existingGroupId) {
      // Merge into existing group with exact name match
      try {
        await chrome.tabs.group({ groupId: existingGroupId, tabIds: finalTabIds });
      } catch (groupError) {
        console.error(await getMessage('error_merge_to_existing_group_failed') + ':', groupError);
        // Check if it's a window type error
        if (groupError.message.includes('normal windows')) {
          throw new Error(await getMessage('error_only_normal_window_grouping'));
        }
        throw new Error(await getMessage('error_merge_to_existing_group_failed') + `: ${groupError.message}`);
      }
    } else {
      // Create new group
      try {
        const newGroupId = await chrome.tabs.group({ tabIds: finalTabIds });
        await chrome.tabGroups.update(newGroupId, { title: groupName });
        // Add the new group to our map for potential reuse within this run
        existingGroups[groupName] = newGroupId;
      } catch (groupError) {
        console.error(await getMessage('error_create_new_group_failed') + ':', groupError);
        // Check if it's a window type error
        if (groupError.message.includes('normal windows')) {
          throw new Error(await getMessage('error_only_normal_window_grouping'));
        }
        throw new Error(await getMessage('error_create_new_group_failed') + `: ${groupError.message}`);
      }
    }
  }

  // After grouping is complete, move ungrouped tabs to the right
  await moveUngroupedTabsToRight(windowId);
}

// New function: Move ungrouped tabs to the right
async function moveUngroupedTabsToRight(windowId) {
  try {
    // Get all tabs in the specified window
    const allTabs = await chrome.tabs.query({ windowId, windowType: 'normal' });
    
    // Handle the case where TAB_GROUP_ID_NONE might be undefined
    const ungroupedId = chrome.tabs.TAB_GROUP_ID_NONE !== undefined ? chrome.tabs.TAB_GROUP_ID_NONE : -1;
    
    // Filter out ungrouped tabs
    const ungroupedTabs = allTabs.filter(tab => tab.groupId === ungroupedId);
    
    if (ungroupedTabs.length === 0) return;
    
    // Get IDs of ungrouped tabs
    const ungroupedTabIds = ungroupedTabs.map(tab => tab.id);
    
    // Move ungrouped tabs to the rightmost position in the window (index: -1 means move to the end)
    await chrome.tabs.move(ungroupedTabIds, { index: -1 });
  } catch (error) {
    console.error(`Error moving ungrouped tabs to right:`, error);
    // Don't throw error, as this is an optional beautification feature
  }
}

// --- Auto-grouping Logic ---

// Generic API URL building function
function buildApiUrl(baseURL, provider = null) {
  if (!baseURL) {
    console.error('buildApiUrl: baseURL is empty');
    return null;
  }
  
  // Validate baseURL format
  try {
    new URL(baseURL);
  } catch (error) {
    console.error('buildApiUrl: baseURL format is invalid:', baseURL, error);
    return null;
  }
  
  // Ensure baseURL ends with / is correctly handled
  const cleanBaseURL = baseURL.replace(/\/$/, '');
  
  // If URL already contains specific endpoint, directly use
  if (baseURL.includes('/chat/completions') || 
      baseURL.includes('/messages') || 
      baseURL.includes('/generate') ||
      baseURL.includes('/text/chatcompletion')) {
    return baseURL;
  }
  
  let finalUrl = null;
  
  // Automatically detect supplier based on baseURL characteristics and build correct endpoint
  if (baseURL.includes('api.openai.com') || 
      baseURL.includes('api.deepseek.com') ||
      baseURL.includes('api.moonshot.cn') ||
      baseURL.includes('api.lingyiwanwu.com') ||
      baseURL.includes('open.bigmodel.cn') ||
      baseURL.includes('api.stepfun.com') ||
      baseURL.includes('api.sensenova.cn') ||
      baseURL.includes('spark-api-open.xf-yun.com') ||
      baseURL.includes('ark.cn-beijing.volces.com')) {
    finalUrl = cleanBaseURL + '/chat/completions';
  } else if (baseURL.includes('api.anthropic.com')) {
    finalUrl = cleanBaseURL + '/messages';
  } else if (baseURL.includes('generativelanguage.googleapis.com')) {
    // Google Gemini needs model name, here return baseURL and handle in call
    finalUrl = cleanBaseURL;
  } else if (baseURL.includes('dashscope.aliyuncs.com')) {
    finalUrl = cleanBaseURL + '/chat/completions';
  } else if (baseURL.includes('aip.baidubce.com')) {
    // Baidu needs model name, here return baseURL and handle in call
    finalUrl = cleanBaseURL;
  } else if (baseURL.includes('api.minimax.chat')) {
    finalUrl = cleanBaseURL + '/text/chatcompletion_v2';
  } else if (baseURL.includes('hunyuan.tencentcloudapi.com')) {
    // Tencent Hun Yuan uses different API structure
    finalUrl = baseURL; // Temporary return, needs special handling
  } else {
    // Default use OpenAI compatible chat/completions endpoint
    finalUrl = cleanBaseURL + '/chat/completions';
  }
  
  return finalUrl;
}

// A simple debounce mechanism to prevent rapid firing
let debounceTimers = {};
const DEBOUNCE_DELAY = 1500; // 1.5 seconds - increased to prevent duplicate triggers from multiple events

// Rate limiting for auto-grouping to prevent excessive API calls
let lastAutoGroupTime = 0;
const AUTO_GROUP_RATE_LIMIT = 3000; // 3 seconds minimum between auto-grouping attempts - increased for better rate limiting

// Track ongoing grouping requests per window to prevent concurrent requests
let ongoingGroupingRequests = new Set();

const handleTabChange = (source, windowId) => {
  
  if (!windowId || windowId === chrome.windows.WINDOW_ID_NONE) {
    return; // Ignore invalid window IDs
  }

  // Check if this is a normal window before proceeding
  chrome.windows.get(windowId, (window) => {
    if (chrome.runtime.lastError) {
      // Window may have been closed, ignore this event
      return;
    }

    
    if (window.type !== 'normal') {
      // Do not process non-normal windows
      return;
    }

    // Only set the timer if this is a normal window
    clearTimeout(debounceTimers[windowId]);
    debounceTimers[windowId] = setTimeout(() => {
      checkAndTriggerAutoGroup(windowId);
    }, DEBOUNCE_DELAY);
  });
};

chrome.tabs.onCreated.addListener((tab) => {
  // Ignore extension pages and special pages
  if (tab.url && (tab.url.startsWith('chrome-extension://') || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
    return;
  }
  // Only trigger when new tab has actual content, avoid blank page triggers
  if (tab.url && tab.url !== 'about:blank' && tab.url !== 'chrome://newtab/' && tab.url !== 'edge://newtab/') {
    handleTabChange('onCreated', tab.windowId);
  }
});
chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
  handleTabChange('onDetached', detachInfo.oldWindowId);
});
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  handleTabChange('onAttached', attachInfo.newWindowId);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only trigger when page is fully loaded and has actual URL, avoid repeated triggers from intermediate states
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

async function checkAndTriggerAutoGroup(windowId) {
  // Check if there's already an ongoing request for this window
  if (ongoingGroupingRequests.has(windowId)) {
    return;
  }
  
  // Check rate limiting
  const now = Date.now();
  const timeSinceLastAutoGroup = now - lastAutoGroupTime;
  if (timeSinceLastAutoGroup < AUTO_GROUP_RATE_LIMIT) {
    return;
  }
  
  // Additional check: Ensure window has actual web tab pages
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
  
  // Fix: Determine correct baseURL based on selected provider
  const currentProvider = settings.selectedProvider || settings.currentProvider;
  let baseURL = settings.baseURL;
  
  // If user selected provider, always use default URL of that provider
  if (currentProvider) {
    // Provider URL mapping (sorted alphabetically)
    const PROVIDER_URLS = {
      '01ai': 'https://api.lingyiwanwu.com/v1',
      alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      anthropic: 'https://api.anthropic.com/v1',
      baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
      deepseek: 'https://api.deepseek.com/v1',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3',
      google: 'https://generativelanguage.googleapis.com/v1beta',
      minimax: 'https://api.minimax.chat/v1',
      moonshot: 'https://api.moonshot.cn/v1',
      openai: 'https://api.openai.com/v1',
      sensetime: 'https://api.sensenova.cn/v1',
      stepfun: 'https://api.stepfun.com/v1',
      tencent: 'https://hunyuan.tencentcloudapi.com',
      xunfei: 'https://spark-api-open.xf-yun.com/v1',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4'
    };
    
    // Always use provider's default URL unless user explicitly customized baseURL
    const defaultURL = PROVIDER_URLS[currentProvider];
    if (!baseURL && defaultURL) {
      baseURL = defaultURL;
    }
  }
  
  const model = settings.selectedModel || settings.model;
  if (!settings.autoGroupThreshold || !settings.apiKey || !baseURL || !model) {
    // Silently return if not configured, to avoid spamming logs.
    return;
  }
  
  const threshold = parseInt(settings.autoGroupThreshold, 10);
  
  const allTabsInWindow = await chrome.tabs.query({ windowId, windowType: 'normal' });
  
  // Handle the case where TAB_GROUP_ID_NONE might be undefined
  const ungroupedId = chrome.tabs.TAB_GROUP_ID_NONE !== undefined ? chrome.tabs.TAB_GROUP_ID_NONE : -1;
  
  const tabs = allTabsInWindow.filter(tab => tab.groupId === ungroupedId);
  
  if (tabs.length >= threshold) {
    // Mark this window as having an ongoing request
    ongoingGroupingRequests.add(windowId);
    
    // Update the last auto-group time to enforce rate limiting
    lastAutoGroupTime = Date.now();
    
    try {
      await initiateAndGroupTabs(tabs, windowId);
    } finally {
      // Always remove the window from ongoing requests, whether success or failure
      ongoingGroupingRequests.delete(windowId);
    }
  }
}



// Generate system prompt based on language
async function generateSystemPrompt(existingGroupTitles, groupingStrategy) {
  let fallbackPrompt = '';
  
  try {
    // First get fallback prompt in case things go wrong later
    fallbackPrompt = await getMessage('fallback_system_prompt');
    
    // Build base prompt
    let systemPrompt = await getMessage('system_prompt_intro');
    
    // If i18n message retrieval fails, use empty string (will be handled in catch)
    if (!systemPrompt || systemPrompt === 'system_prompt_intro') {
      systemPrompt = '';
    }
    
    // Add existing group information
    if (existingGroupTitles && Array.isArray(existingGroupTitles) && existingGroupTitles.length > 0) {
      const groupsText = existingGroupTitles.join(', ');
      const existingGroupsMsg = await getMessageWithParams('system_prompt_existing_groups', {groups: groupsText});
      if (existingGroupsMsg && existingGroupsMsg !== 'system_prompt_existing_groups') {
        systemPrompt += '\n\n' + existingGroupsMsg;
      }
    }
    
    // Add forbidden rules
    const forbiddenRules = await getMessage('system_prompt_forbidden_rules');
    if (forbiddenRules && forbiddenRules !== 'system_prompt_forbidden_rules') {
      systemPrompt += '\n\n' + forbiddenRules;
    }
    
    // Add grouping strategy
    const strategyText = groupingStrategy || await getMessage('default_grouping_strategy') || '';
    const strategyPrefix = await getMessage('system_prompt_strategy_prefix');
    if (strategyPrefix && strategyPrefix !== 'system_prompt_strategy_prefix') {
      systemPrompt += '\n\n' + strategyPrefix + '\n' + strategyText;
    }
    
    // Add format instructions
    const formatInstructions = await getMessage('system_prompt_format_instructions');
    if (formatInstructions && formatInstructions !== 'system_prompt_format_instructions') {
      systemPrompt += '\n\n' + formatInstructions;
    }
    
    // If final prompt is empty or too short, use fallback prompt
    if (!systemPrompt || systemPrompt.trim().length < 10) {
      return fallbackPrompt || 'You are an intelligent tab grouping assistant. Please group tabs intelligently based on their URLs and titles.';
    }
    
    return systemPrompt;
  } catch (error) {
    console.error('Error generating system prompt:', error);
    // Return fallback system prompt if even fallback prompt retrieval fails
    return fallbackPrompt || 'You are an intelligent tab grouping assistant. Please group tabs intelligently based on their URLs and titles, and return the results in the following JSON format:\n\n{\n  "groups": [\n    {\n      "name": "Group name",\n      "tabs": [\n        {\n          "url": "Tab URL",\n          "title": "Tab title"\n        }\n      ]\n    }\n  ]\n}';
  }
}

async function initiateAndGroupTabs(tabsToGroup, windowId) {
  let settings;
  try {
    settings = await getSecureSettings(['apiKey', 'baseURL', 'model', 'groupingStrategy', 'minTabsInGroup', 'currentProvider', 'selectedProvider', 'selectedModel']);
  } catch (error) {
    console.error(await getMessage('error_get_secure_settings_failed') + ':', error);
    throw error;
  }

  // Fix: Determine correct baseURL based on selected provider
  const currentProvider = settings.selectedProvider || settings.currentProvider;
  let baseURL = settings.baseURL;
  
  // If user selected provider, always use default URL of that provider
  if (currentProvider) {
    // Provider URL mapping (sorted alphabetically)
    const PROVIDER_URLS = {
      '01ai': 'https://api.lingyiwanwu.com/v1',
      alibaba: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      anthropic: 'https://api.anthropic.com/v1',
      baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
      deepseek: 'https://api.deepseek.com/v1',
      doubao: 'https://ark.cn-beijing.volces.com/api/v3',
      google: 'https://generativelanguage.googleapis.com/v1beta',
      minimax: 'https://api.minimax.chat/v1',
      moonshot: 'https://api.moonshot.cn/v1',
      openai: 'https://api.openai.com/v1',
      sensetime: 'https://api.sensenova.cn/v1',
      stepfun: 'https://api.stepfun.com/v1',
      tencent: 'https://hunyuan.tencentcloudapi.com',
      xunfei: 'https://spark-api-open.xf-yun.com/v1',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4'
    };
    
    // Always use provider's default URL unless user explicitly customized baseURL
    const defaultURL = PROVIDER_URLS[currentProvider];
    if (!baseURL && defaultURL) {
      baseURL = defaultURL;
    }
  }

  let model = settings.selectedModel || settings.model;
  
  if (!settings.apiKey || !baseURL || !model) {
    throw new Error(await getMessage('error_ai_settings_not_configured'));
  }

  // Update settings object to include derived baseURL
  settings.baseURL = baseURL;

  // If specific tabs for auto-grouping aren't provided, this is a manual trigger.
  // For manual triggers, we should process ALL tabs in the window.
  // For auto-grouping, tabsToGroup (the ungrouped ones) is already provided.
  if (!tabsToGroup) {
    if (!windowId) {
      const lastFocused = await chrome.windows.getLastFocused();
      windowId = lastFocused.id;
    }
    tabsToGroup = await chrome.tabs.query({ windowId, windowType: 'normal' });
  }

  const tabs = tabsToGroup;
  if (tabs.length === 0) {
    return;
  }

  try {
    // Validate window type
    let targetWindow;
    try {
      targetWindow = await chrome.windows.get(windowId);
    } catch (windowError) {
      console.error(await getMessage('error_get_window_info_failed') + ':', windowError);
      throw new Error(await getMessage('error_get_target_window_info_failed'));
    }

    if (!targetWindow || targetWindow.type !== 'normal') {
      console.error(await getMessage('error_target_window_not_normal_window') + ':', targetWindow);
      throw new Error(await getMessage('error_only_normal_window_grouping'));
    }

    // Filter and validate tabs
    const validTabs = tabs.filter(tab => {
      // Ensure tab belongs to normal window and has valid URL
      return tab.windowId === windowId && 
             tab.url && 
             !tab.url.startsWith('chrome://') && 
             !tab.url.startsWith('chrome-extension://') &&
             !tab.url.startsWith('edge://') &&
             !tab.url.startsWith('about:') &&
             !tab.url.startsWith('moz-extension://');
    });

    const skippedTabs = tabs.length - validTabs.length;
    
    if (validTabs.length === 0) {
      return; // Direct return, no error thrown
    }

    const tabGroups = await chrome.tabGroups.query({ windowId });
    const existingGroupTitles = tabGroups.map(g => g.title).filter(t => t);

    // Generate system prompt (now using i18n for language auto-adaptation)
    const systemPrompt = await generateSystemPrompt(existingGroupTitles, settings.groupingStrategy);

    // Validate system prompt
    if (!systemPrompt || typeof systemPrompt !== 'string') {
      console.error(await getMessage('error_system_prompt_generation_failed') + ':', systemPrompt);
      throw new Error(await getMessage('error_system_prompt_generation_failed_text'));
    }

    const tabsData = validTabs.map(t => ({ 
      url: t.url || '', 
      title: (t.title || '').trim().substring(0, 200) // Limit title length, avoid too long
    })).filter(t => t.url); // Filter out tabs without URLs
    
    if (tabsData.length === 0) {
      return; // Direct return, no error thrown
    }

    // Validate tab data serialization
    let tabsDataString;
    try {
      tabsDataString = JSON.stringify(tabsData);
    } catch (tabsJsonError) {
      console.error(await getMessage('error_tab_data_serialization_failed') + ':', tabsJsonError, tabsData);
      throw new Error(await getMessage('error_tab_data_format_failed'));
    }
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: tabsDataString }
    ];

 
  
    // Use generic URL building function
    const apiUrl = buildApiUrl(settings.baseURL);
    
    if (!apiUrl) {
      console.error(await getMessage('error_api_url_build_failed') + ':', {
        baseURL: settings.baseURL,
        provider: currentProvider,
        buildApiUrlResult: apiUrl
      });
      throw new Error(await getMessage('error_invalid_api_url'));
    }

    // Validate critical parameters
    if (!settings.apiKey || !settings.apiKey.trim()) {
      console.error(await getMessage('error_api_key_empty'));
      throw new Error(await getMessage('error_ai_settings_not_configured'));
    }
    
    // Check for corrupted API key (contains invalid characters)
    const apiKeyTrimmed = settings.apiKey.trim();
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(apiKeyTrimmed)) {
      console.error('API key contains invalid characters, possibly corrupted during encryption/decryption');
              throw new Error('API key is corrupted, please reconfigure.');
    }

    if (!model || !model.trim()) {
      console.error(await getMessage('error_model_name_empty'));
      throw new Error(await getMessage('error_ai_settings_not_configured'));
    }

    // Validate URL format
    try {
      new URL(apiUrl);
    } catch (urlError) {
      console.error(await getMessage('error_api_url_invalid') + ':', apiUrl, urlError);
      throw new Error(await getMessageWithParams('error_api_url_format_invalid', {url: apiUrl}));
    }

    // Validate and clean all parameters
    const cleanApiKey = settings.apiKey?.trim();
    const cleanModel = model?.trim();
    
    // Validate API key format
    if (!cleanApiKey || cleanApiKey.includes('\n') || cleanApiKey.includes('\r')) {
      console.error(await getMessage('error_api_key_format_invalid') + ':', { hasKey: !!cleanApiKey, keyStart: cleanApiKey?.substring(0, 10) });
      throw new Error(await getMessage('error_api_key_invalid_reconfigure'));
    }

    // Validate model name format  
    if (!cleanModel || cleanModel.includes('\n') || cleanModel.includes('\r')) {
      console.error(await getMessage('error_model_name_format_invalid') + ':', { model: cleanModel });
      throw new Error(await getMessage('error_model_name_invalid_reselect'));
    }

    // Clean and validate message content
    const cleanMessages = messages.map(msg => ({
      role: msg.role,
      content: String(msg.content).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
    }));

    // Build request body
    const requestBody = {
      model: cleanModel,
      messages: cleanMessages,
      response_format: { type: 'json_object' }
    };

    let requestBodyString;
    try {
      requestBodyString = JSON.stringify(requestBody);
      
      // Validate generated JSON string
      if (!requestBodyString || requestBodyString === 'null' || requestBodyString === 'undefined') {
        throw new Error(await getMessage('error_json_serialization_invalid'));
      }
      
      // Validate JSON string length is reasonable
      if (requestBodyString.length > 1024 * 1024) { // 1MB limit
        console.warn(await getMessage('warning_request_body_too_large') + ':', requestBodyString.length);
      }
      
      // Validate JSON string doesn't contain control characters
      if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(requestBodyString)) {
        console.warn('Request body contains control characters, cleaning...');
        requestBodyString = requestBodyString.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
      }
      
    } catch (jsonError) {
      console.error(await getMessage('error_json_serialization_failed') + ':', jsonError, requestBody);
      throw new Error(await getMessage('error_request_data_format_failed'));
    }

    // Build request headers
    const requestHeaders = {
      'Content-Type': 'application/json'
    };
    
    // Add Authorization header
    if (cleanApiKey) {
      requestHeaders['Authorization'] = `Bearer ${cleanApiKey}`;
    }


    // Final validation before fetch
    if (!requestHeaders['Authorization']) {
      throw new Error(await getMessage('error_api_key_invalid_reconfigure'));
    }
    
    let res;
    try {
      // Validate fetch parameters
      const fetchOptions = {
        method: 'POST',
        headers: requestHeaders,
        body: requestBodyString
      };
      
      // Log request details for debugging (without sensitive data)
      console.log('Making API request to:', apiUrl);
      console.log('Request headers:', { 
        'Content-Type': requestHeaders['Content-Type'],
        'Authorization': requestHeaders['Authorization'] ? 'Bearer ***' : 'Missing'
      });
      
      res = await fetch(apiUrl, fetchOptions);
    } catch (fetchError) {
      console.error(await getMessage('error_fetch_api_call_failed') + ':', fetchError);
      console.error(await getMessage('error_detailed_call_parameters') + ':', {
        url: apiUrl,
        urlType: typeof apiUrl,
        urlLength: apiUrl?.length,
        method: 'POST',
        headers: {
          'Content-Type': requestHeaders['Content-Type'],
          'Authorization': `Bearer ${cleanApiKey?.substring(0, 10)}...`,
          authLength: requestHeaders['Authorization']?.length
        },
        bodyLength: requestBodyString?.length,
        bodyStart: requestBodyString?.substring(0, 100)
      });
      
      // Check if it's an invalid URL error
      if (fetchError.message.includes('Invalid URL') || fetchError.message.includes('Invalid value')) {
        throw new Error(await getMessageWithParams('error_api_call_parameters_invalid', {url: apiUrl, model: cleanModel}));
      }
      
      throw new Error(await getMessageWithParams('error_network_request_failed', {message: fetchError.message}));
    }

    if (!res.ok) {
        const errorText = await res.text();
        console.error(await getMessage('error_api_request_failed') + `: ${res.status} ${res.statusText}`, errorText);
        throw new Error(`API request failed with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    const groupResult = aiResponse ? JSON.parse(aiResponse).groups : null;

    if (Array.isArray(groupResult)) {
      
      // Code-level filtering for meaningless group names
      const meaninglessGroupNames = [
        'Other', 'Other', 'other', 'Miscellaneous', 'Miscellaneous', 'miscellaneous', 
        'Ungrouped', 'Ungrouped', 'ungrouped', 'General', 'General', 'general',
        'Temporary', 'Temporary', 'temporary', 'Default', 'Default', 'Unclassified',
        'Other Class', 'Other Class', 'Miscellaneous', 'Remaining', 'Remaining', 'rest'
      ];
      
      const filteredGroupResult = groupResult.filter(group => {
        const groupNameLower = group.name?.toLowerCase().trim();
        const isMeaningless = meaninglessGroupNames.some(meaningless => 
          groupNameLower === meaningless || 
          groupNameLower.includes(meaningless)
        );
        
        return !isMeaningless;
      });
      
      const minTabs = settings.minTabsInGroup || 1;
      const finalFilteredGroups = filteredGroupResult.filter(group => group.tabs && group.tabs.length >= minTabs);
      
      // Additional window type validation (prevent window change during processing)
      try {
        const currentWindow = await chrome.windows.get(windowId);
        if (currentWindow.type !== 'normal') {
          throw new Error(await getMessage('error_target_window_not_normal'));
        }
      } catch (windowCheckError) {
        console.error(await getMessage('error_pre_grouping_window_validation_failed') + ':', windowCheckError);
        throw new Error(await getMessage('error_pre_grouping_validation_failed_retry'));
      }
      
      await groupTabs(finalFilteredGroups, windowId);
      
      // Build grouping result information
      const groupingResult = {
        totalTabsProcessed: tabs.length,
        validTabsCount: validTabs.length,
        skippedTabsCount: skippedTabs,
        groupsCreated: finalFilteredGroups.length
      };
      
      // Send more detailed success notification
      chrome.runtime.sendMessage({ 
        type: 'GROUPING_FINISHED', 
        success: true,
        result: groupingResult
      }).catch(e => {});

    } else {
      throw new Error(await getMessage('error_no_valid_groups'));
    }
  } catch (e) {
    console.error("Grouping failed during API call:", e);
    // Optionally, notify the user of failure
    chrome.runtime.sendMessage({ type: 'GROUPING_FINISHED', success: false, error: e.message }).catch(e => {});
    throw e; // re-throw to be caught by the initiator
  }
} 