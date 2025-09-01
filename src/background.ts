// Import ES modules for security and i18n
import { secureStorage, extensionStorage } from './modules/security';
import { customI18n } from './modules/i18n';
// Simple error handling without complex logger infrastructure

async function getLocalizedMessage(key: string, substitutions?: string | string[]): Promise<string> {
  try {
    // Ensure i18n is initialized with correct language
    if (!customI18n.initialized) {
      await customI18n.init();
    }
    
    // Check if we need to reinitialize with user's language preference
    await ensureCorrectLanguage(customI18n);
    
    const message = customI18n.getMessage(key, substitutions);
    
    return message || key;
  } catch (error) {
    console.error('Failed to get localized message:', error);
    return key;
  }
}

async function ensureCorrectLanguage(i18nInstance: typeof customI18n): Promise<void> {
  try {
    // Get user's language preference from settings
    const result = await chrome.storage.local.get(['userLanguage', 'language']);
    
    // Priority: userLanguage > language > default to auto-detect
    let userLanguage = result.userLanguage || result.language;
    
    let targetLanguage = 'en';
    if (!userLanguage || userLanguage === 'auto') {
      // Only use auto-detect if no explicit language is set
      try {
        const browserLanguage = chrome.i18n.getUILanguage() || 'en';
        targetLanguage = browserLanguage.startsWith('zh') ? 'zh_CN' : 'en';
      } catch (e) {
        targetLanguage = 'en';
      }
    } else {
      // Use the explicitly configured language
      targetLanguage = userLanguage;
    }
    
    // If current language doesn't match target, reinitialize
    if (i18nInstance.currentLanguage !== targetLanguage) {
      i18nInstance.currentLanguage = targetLanguage;
      await i18nInstance.loadMessages();
    }
  } catch (error) {
    console.error('Failed to ensure correct language:', error);
  }
}

async function buildSystemPrompt(reuseExistingGroups: boolean = false, existingGroups: chrome.tabGroups.TabGroup[] = []): Promise<string> {
  try {
    const intro = await getLocalizedMessage('system_prompt_intro');
    const formatInstructions = await getLocalizedMessage('system_prompt_format_instructions');
    const forbiddenRules = await getLocalizedMessage('system_prompt_forbidden_rules');
    
    // Check if we got the actual translations or just the keys back
    if (intro === 'system_prompt_intro' || formatInstructions === 'system_prompt_format_instructions') {
      console.warn('i18n system did not return translations, falling back to hardcoded prompt');
      throw new Error('i18n messages not loaded properly');
    }
    
    // Build existing groups instruction if reusing
    let existingGroupsInstruction = '';
    if (reuseExistingGroups && existingGroups.length > 0) {
      const groupNames = existingGroups.map(g => `"${g.title}"`).join(', ');
      existingGroupsInstruction = await getLocalizedMessage('system_prompt_existing_groups', groupNames);
    }
    
    // Combine all parts to create the complete system prompt
    const systemPrompt = `${intro}

${existingGroupsInstruction ? existingGroupsInstruction + '\n\n' : ''}${formatInstructions}

${forbiddenRules}`;
    
    return systemPrompt;
  } catch (error) {
    console.error('Failed to build localized system prompt:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to build system prompt: ${errorMessage}`);
  }
}


// Service worker initialization

// Handle service worker lifecycle
self.addEventListener('install', (event: any) => {

  (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {

  event.waitUntil((self as any).clients.claim());
  // Schedule periodic auto-group scan using alarms (event-driven, low overhead)
  try {
    chrome.alarms.clear('auto_group_scan');
    // Run every 1 minute to catch cases without tab events
    chrome.alarms.create('auto_group_scan', { periodInMinutes: 1 });
  } catch (e) {
    // Ignore if alarms are unavailable
  }
});

// Periodic check via alarms to improve reliability without keep-alive
try {
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'auto_group_scan') return;
    try {
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      for (const w of windows) {
        if (w.id != null) {
          await checkAndTriggerAutoGroup(w.id);
        }
      }
    } catch (err) {
      // swallow to avoid noisy logs
    }
  });
} catch (e) {
  // alarms not available
}

// Track last auto-group time for rate limiting
let lastAutoGroupTime = 0;
const AUTO_GROUP_RATE_LIMIT = 3000; // 3 seconds between auto-groups

// Strict LLM request throttling to prevent burst calls
const LLM_REQUEST_COOLDOWN_MS = 10000; // 10s cooldown per window
const groupingInProgressWindows = new Set<number>();
const lastGroupingRequestTimeByWindow = new Map<number, number>();

function isWithinLLMCooldown(windowId: number): boolean {
  const last = lastGroupingRequestTimeByWindow.get(windowId) || 0;
  return Date.now() - last < LLM_REQUEST_COOLDOWN_MS;
}

async function triggerGroupingWithRateLimit(tabsToGroup: chrome.tabs.Tab[] | null, windowId: number): Promise<void> {
  if (groupingInProgressWindows.has(windowId)) {
    return;
  }
  if (isWithinLLMCooldown(windowId)) {
    return;
  }
  groupingInProgressWindows.add(windowId);
  try {
    await initiateAndGroupTabs(tabsToGroup, windowId);
  } finally {
    groupingInProgressWindows.delete(windowId);
    lastGroupingRequestTimeByWindow.set(windowId, Date.now());
  }
}

// Auto-group functionality: monitor tab count and trigger grouping
async function checkAndTriggerAutoGroup(windowId: number) {
  try {
    // Get auto-group settings
    const settings = await chrome.storage.local.get(['enableAutoGroup', 'autoGroupThreshold']);
    const enableAutoGroup = settings.enableAutoGroup || false;
    const autoGroupThreshold = settings.autoGroupThreshold || 5;
    
  
    
    if (!enableAutoGroup) {
      return;
    }
    
    // Rate limiting
    const now = Date.now();
    if (now - lastAutoGroupTime < AUTO_GROUP_RATE_LIMIT) {
      return;
    }
    
    // Get window info
    const window = await chrome.windows.get(windowId);
    if (window.type !== 'normal') {
      return;
    }
    
    // Get all tabs and count ungrouped ones
    const allTabs = await chrome.tabs.query({ windowId });
    const ungroupedTabs = allTabs.filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
    
    if (ungroupedTabs.length >= autoGroupThreshold) {
      lastAutoGroupTime = now;
      
      // Check if AI settings are configured before triggering
      const providerSettings = await getCurrentProviderConfig();
      if (!providerSettings || !providerSettings.apiKey || !providerSettings.baseURL || !providerSettings.selectedModel) {
        return;
      }
      
      // Trigger auto-grouping with LLM request rate limiting
      await triggerGroupingWithRateLimit(null, windowId);
    }
  } catch (error) {
    console.error('Auto-group check failed:', error);
  }
}

// Monitor tab creation and removal for auto-grouping
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.windowId && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://')) {
    // Small delay to ensure tab is fully loaded
    setTimeout(() => {
      checkAndTriggerAutoGroup(tab.windowId!);
    }, 500);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (removeInfo.windowId && !removeInfo.isWindowClosing) {
    // Small delay to allow tab removal to complete
    setTimeout(() => {
      checkAndTriggerAutoGroup(removeInfo.windowId);
    }, 100);
  }
});

// Monitor tab attachment (when tabs are moved between windows)
chrome.tabs.onAttached.addListener((tabId, attachInfo) => {
  setTimeout(() => {
    checkAndTriggerAutoGroup(attachInfo.newWindowId);
  }, 300);
});

// Monitor tab updates (URL changes) for existing tabs
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only trigger on complete page load with URL
  if (changeInfo.status === 'complete' && tab.windowId && tab.url && 
      !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://')) {
    setTimeout(() => {
      checkAndTriggerAutoGroup(tab.windowId!);
    }, 300);
  }
});

// Listen for popup requests for tab information
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.type === 'START_GROUPING') {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
      if (chrome.runtime.lastError || !window) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'No active normal window' });
        return;
      }
      try {
        await triggerGroupingWithRateLimit(null, window.id as number);
        sendResponse({ success: true, message: 'Grouping process completed' });
      } catch (e: any) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }
  if (request.type === 'UNGROUP_TABS') {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
      if (chrome.runtime.lastError || !window) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'No active normal window' });
        return;
      }
      try {
        await ungroupAllTabs(window.id as number);
        sendResponse({ success: true });
      } catch (e: any) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }
  if (request.type === 'GET_I18N_MESSAGE') {

    (async () => {
      try {
        const message = await getLocalizedMessage(request.key, request.substitutions);

        sendResponse({ success: true, message: message });
      } catch (error) {
        console.error('Failed to get localized message:', error);
        sendResponse({ success: false, message: request.key });
      }
    })();
    return true;
  }
  return false;
});

// Helper function to retry tab group operations
async function retryTabGroupOperation<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry, with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry operation failed unexpectedly');
}

async function ungroupAllTabs(windowId: number) {
  const tabs = await chrome.tabs.query({ windowId });
  const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id as number);
  if (tabIds.length > 0) {
    await chrome.tabs.ungroup(tabIds);
  }
}

async function groupTabs(groups: any[], windowId: number, reuseExistingGroups: boolean = false) {
  // Verify the window type before proceeding
  const window = await chrome.windows.get(windowId);
  
  if (window.type !== 'normal') {
    throw new Error(`Cannot create tab groups in ${window.type} window. Tab grouping only works in normal browser windows.`);
  }
  
  // Get all current tabs and existing groups
  const allTabs = await chrome.tabs.query({ windowId });
  const existingGroups = await chrome.tabGroups.query({ windowId });
  
  // Create a map of existing group names to their IDs
  const existingGroupMap = new Map<string, number>();
  existingGroups.forEach(group => {
    if (group.title) {
      existingGroupMap.set(group.title, group.id);
    }
  });
  
  for (const group of groups) {
    // Find actual tab IDs by matching URLs
    const tabIds: number[] = [];
    
    for (const groupTab of group.tabs) {
      const matchingTab = allTabs.find(tab => tab.url === groupTab.url);
      if (matchingTab && matchingTab.id !== undefined) {
        // Verify the tab is in the target normal window
        if (matchingTab.windowId === windowId) {
          // Avoid duplicate tab IDs
          if (!tabIds.includes(matchingTab.id)) {
            tabIds.push(matchingTab.id);
          } else {
            console.warn(`Duplicate tab ID ${matchingTab.id} for "${groupTab.title}", skipping duplicate`);
          }
        } else {
          console.warn(`Tab "${groupTab.title}" is in a different window (${matchingTab.windowId} vs ${windowId}), skipping`);
        }
      }
    }
    
    // Only process group if we have at least 2 tabs (or 1 tab when reusing existing groups)
    const minTabs = reuseExistingGroups && existingGroupMap.has(group.name) ? 1 : 2;
    
    if (tabIds.length >= minTabs) {
      try {
        
        // Verify all tabs exist and get their current window IDs
        const validTabIds: number[] = [];
        for (const tabId of tabIds) {
          try {
            const tab = await chrome.tabs.get(tabId);
            if (tab.windowId !== windowId) {
              continue;
            }
            // Check if tab is in a valid state for grouping
            if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://')) {
              validTabIds.push(tabId);
            }
          } catch (tabError) {
            // Skip invalid tabs instead of failing the entire operation
            continue;
          }
        }
        
        // Update tabIds to only include valid tabs
        tabIds.length = 0;
        tabIds.push(...validTabIds);
        
        // Re-check minimum tabs after filtering
        if (tabIds.length < minTabs) {
          continue;
        }

        // Check if we should reuse existing group
        if (reuseExistingGroups && existingGroupMap.has(group.name)) {
          const existingGroupId = existingGroupMap.get(group.name)!;
          
          // Add tabs to existing group with retry
          await retryTabGroupOperation(() => 
            chrome.tabs.group({ tabIds, groupId: existingGroupId })
          );
        } else {
          // Create new group with retry
          const newGroupId = await retryTabGroupOperation(() => 
            chrome.tabs.group({ tabIds })
          );
          
          await chrome.tabGroups.update(newGroupId, { title: group.name });
        }
      } catch (error) {
        // Silently skip failed groups to avoid console spam
      }
    }
  }
}

async function initiateAndGroupTabs(tabsToGroup: chrome.tabs.Tab[] | null, windowId: number) {
  try {
    // Verify the window is a normal window before proceeding
    const window = await chrome.windows.get(windowId);
    
    if (window.type !== 'normal') {
      throw new Error(`Cannot create tab groups in ${window.type} window. Please try again in a normal browser window.`);
    }
    
    const settings = await getCurrentProviderConfig();
    if (!settings || !settings.apiKey || !settings.baseURL || !settings.selectedModel) {
      throw new Error('AI settings not configured');
    }
    
    // Validate settings types
    if (typeof settings.baseURL !== 'string') {
      console.error('Invalid settings.baseURL:', settings.baseURL);
      throw new Error('Provider baseURL must be a string');
    }
    if (typeof settings.apiKey !== 'string') {
      console.error('Invalid settings.apiKey type:', typeof settings.apiKey);
      throw new Error('Provider API key must be a string');
    }

    // Get grouping settings
    const groupingSettings = await chrome.storage.local.get(['reuseExistingGroups', 'minTabsInGroup']);
    const reuseExistingGroups = groupingSettings.reuseExistingGroups !== false; // default true
    const minTabsInGroup = groupingSettings.minTabsInGroup || 2;

    if (!tabsToGroup) {
      tabsToGroup = await chrome.tabs.query({ windowId });
    }

    // Handle different grouping strategies
    if (!reuseExistingGroups) {
      // Full regrouping: ungroup all tabs first
      await ungroupAllTabs(windowId);
      // Refresh tabs list after ungrouping
      tabsToGroup = await chrome.tabs.query({ windowId });
    } else {
      // Reuse existing groups: only process ungrouped tabs
      tabsToGroup = tabsToGroup.filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
      
      if (tabsToGroup.length === 0) {
        // Notify UI if available; ignore when no receiver exists
        void chrome.runtime
          .sendMessage({ type: 'GROUPING_FINISHED', success: true, message: 'No ungrouped tabs to process' })
          .catch(() => {});
        return;
      }
    }

    const tabsData = tabsToGroup.map(t => ({
      url: t.url || '',
      title: (t.title || '').trim().substring(0, 200)
    }));

    // Get existing groups if reusing
    let existingGroups: chrome.tabGroups.TabGroup[] = [];
    if (reuseExistingGroups) {
      existingGroups = await chrome.tabGroups.query({ windowId });
    }

    // Build localized system prompt
    const systemPrompt = await buildSystemPrompt(reuseExistingGroups, existingGroups);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(tabsData) }
    ];

    // Build complete API URL  
    const apiUrl = buildApiUrl(settings.baseURL, settings.endpoint);
    
    // Validate request parameters
    if (typeof settings.apiKey !== 'string') {
      throw new Error(`API key must be a string, got ${typeof settings.apiKey}`);
    }
    if (typeof settings.selectedModel !== 'string') {
      throw new Error(`Model must be a string, got ${typeof settings.selectedModel}`);
    }
    
    const requestBody = JSON.stringify({
      model: settings.selectedModel,
      messages: messages,
      response_format: { type: 'json_object' }
    });
    
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: requestBody
    });


    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API request failed with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);

    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }
    
    // Check different possible response formats
    let groupResult = null;
    if (parsedResponse.groups && Array.isArray(parsedResponse.groups)) {
      groupResult = parsedResponse.groups;
    } else if (parsedResponse.data && parsedResponse.data.groups && Array.isArray(parsedResponse.data.groups)) {
      groupResult = parsedResponse.data.groups;
    } else {
      console.error('Unexpected AI response format:', parsedResponse);

      throw new Error('AI response does not contain valid groups array. Please check AI provider settings and try again.');
    }

    if (Array.isArray(groupResult) && groupResult.length > 0) {
      await groupTabs(groupResult, windowId, reuseExistingGroups);
      // Notify UI if available; ignore when no receiver exists
      void chrome.runtime
        .sendMessage({ type: 'GROUPING_FINISHED', success: true })
        .catch(() => {});
    } else {
      throw new Error('No valid groups found in AI response');
    }
  } catch (e: any) {
    console.error('Failed to initiate and group tabs:', e);
    const errorMessage = e instanceof Error ? e.message : 'Auto-grouping failed';
    // Notify UI if available; ignore when no receiver exists
    void chrome.runtime
      .sendMessage({ type: 'GROUPING_FINISHED', success: false, error: errorMessage })
      .catch(() => {});
    throw new Error(errorMessage);
  }
}

function buildApiUrl(baseURL: string, endpoint?: string): string {
  if (!baseURL) {
    throw new Error('Base URL is required');
  }
  
  if (typeof baseURL !== 'string') {
    console.error('Invalid baseURL passed to buildApiUrl:', baseURL);
    throw new Error(`Base URL must be a string, got ${typeof baseURL}`);
  }
  
  const cleanBaseURL = baseURL.replace(/\/$/, '');
  
  // If baseURL already includes the endpoint, return as is
  if (baseURL.includes('/chat/completions') || baseURL.includes('/messages')) {
    return baseURL;
  }
  
  // Use provided endpoint or default to /chat/completions
  const apiEndpoint = endpoint || '/chat/completions';
  
  return cleanBaseURL + apiEndpoint;
}

async function getCurrentProviderConfig(): Promise<any> {
  try {
    const result = await chrome.storage.local.get(['selectedProvider', 'providers']);
    const selectedProvider = result.selectedProvider;
    const providers = result.providers || {};
    
    if (!selectedProvider || !providers[selectedProvider]) {
      return null;
    }
    
    const providerConfig = { ...providers[selectedProvider] };
    
    // Decrypt API key using secure extension storage
    if (providerConfig.apiKey) {
      const decryptedKey = await extensionStorage.getApiKey(selectedProvider);
      if (decryptedKey) {
        providerConfig.apiKey = decryptedKey;
      } else {
        // Fallback: API key might still be stored in plain text (migration)
        console.log('Using fallback API key (migration)');
      }
    }
    
    return providerConfig;
  } catch (e) {
    console.error('Failed to get provider config:', e);
    return null;
  }
}