// Import security module and worker-compatible i18n
try {
  importScripts('scripts/security.js');
  importScripts('scripts/i18n.js');
  console.log('Scripts imported successfully');
} catch (error) {
  console.error('Failed to import scripts:', error);
}

// Define types for imported scripts
declare const secureStorage: any;

async function getLocalizedMessage(key: string, substitutions?: any): Promise<string> {
  try {
    // Access global customI18n from imported script
    const globalI18n = (globalThis as any).customI18n;
    
    if (!globalI18n) {
      console.error('customI18n not available, falling back to key');
      return key;
    }
    
    // Ensure i18n is initialized with correct language
    if (!globalI18n.initialized) {
      console.log('Initializing i18n system...');
      await globalI18n.init();
    }
    
    // Check if we need to reinitialize with user's language preference
    await ensureCorrectLanguage(globalI18n);
    
    const message = globalI18n.getMessage(key, substitutions);
    console.log(`i18n getMessage: key="${key}", currentLanguage="${globalI18n.currentLanguage}", result="${message?.substring(0, 100)}..."`);
    
    return message || key;
  } catch (error) {
    console.error('Failed to get i18n message:', error);
    return key;
  }
}

async function ensureCorrectLanguage(i18nInstance: any): Promise<void> {
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
    
    console.log('User language settings:', { userLanguage: result.userLanguage, language: result.language });
    console.log('Target language for system prompt:', targetLanguage);
    console.log('Current i18n language:', i18nInstance.currentLanguage);
    
    // If current language doesn't match target, reinitialize
    if (i18nInstance.currentLanguage !== targetLanguage) {
      console.log(`Language mismatch: current=${i18nInstance.currentLanguage}, target=${targetLanguage}. Reinitializing...`);
      i18nInstance.currentLanguage = targetLanguage;
      await i18nInstance.loadMessages();
      console.log(`After reinitializing, current language is now: ${i18nInstance.currentLanguage}`);
    } else {
      console.log('Language already matches target, no reinitializing needed');
    }
  } catch (error) {
    console.error('Failed to ensure correct language:', error);
  }
}

async function buildSystemPrompt(reuseExistingGroups: boolean = false, existingGroups: chrome.tabGroups.TabGroup[] = []): Promise<string> {
  try {
    console.log('Building system prompt with i18n...');
    const intro = await getLocalizedMessage('system_prompt_intro');
    const formatInstructions = await getLocalizedMessage('system_prompt_format_instructions');
    const forbiddenRules = await getLocalizedMessage('system_prompt_forbidden_rules');
    
    console.log('i18n messages loaded:', { intro: intro.substring(0, 50), formatInstructions: formatInstructions.substring(0, 50) });
    
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
      console.log('Adding existing groups instruction:', existingGroupsInstruction.substring(0, 100));
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


// Service worker initialization and keep-alive
console.log('Service worker starting...');

// More robust keep-alive mechanism for Manifest V3
const keepAlive = () => {
  chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }).catch(() => {
    // Ignore errors - this is normal when no listeners are available
  });
};

// Keep service worker alive
setInterval(keepAlive, 25000);

// Also send initial keep-alive
keepAlive();

// Handle service worker lifecycle
self.addEventListener('install', (event: any) => {
  console.log('Service worker installed');
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  console.log('Service worker activated');
  event.waitUntil((self as any).clients.claim());
});

// Listen for popup requests for tab information
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request.type);
  if (request.type === 'START_GROUPING') {
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
      if (chrome.runtime.lastError || !window) {
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'No active normal window' });
        return;
      }
      try {
        await initiateAndGroupTabs(null, window.id as number);
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
    console.log('Received GET_I18N_MESSAGE request for key:', request.key);
    (async () => {
      try {
        const message = await getLocalizedMessage(request.key, request.substitutions);
        console.log(`Returning message for key "${request.key}":`, message);
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

async function ungroupAllTabs(windowId: number) {
  console.log('ungroupAllTabs called');
  const tabs = await chrome.tabs.query({ windowId });
  const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id as number);
  if (tabIds.length > 0) {
    await chrome.tabs.ungroup(tabIds);
  }
}

async function groupTabs(groups: any[], windowId: number, reuseExistingGroups: boolean = false) {
  console.log('groupTabs called with reuse setting:', reuseExistingGroups);
  console.log('Target window ID:', windowId);
  
  // Verify the window type before proceeding
  const window = await chrome.windows.get(windowId);
  console.log('Window details:', { id: window.id, type: window.type, state: window.state, focused: window.focused });
  
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
        console.log(`Processing ${tabIds.length} tabs for group "${group.name}"`);
        console.log('Tab IDs:', tabIds);
        
        // Verify all tabs exist and get their current window IDs
        for (const tabId of tabIds) {
          try {
            const tab = await chrome.tabs.get(tabId);
            console.log(`Tab ${tabId}: windowId=${tab.windowId}, url=${tab.url?.substring(0, 50)}...`);
            if (tab.windowId !== windowId) {
              throw new Error(`Tab ${tabId} is in window ${tab.windowId}, expected ${windowId}`);
            }
          } catch (tabError) {
            console.error(`Failed to verify tab ${tabId}:`, tabError);
            throw tabError;
          }
        }
        
        // Check if we should reuse existing group
        if (reuseExistingGroups && existingGroupMap.has(group.name)) {
          const existingGroupId = existingGroupMap.get(group.name)!;
          console.log(`Adding ${tabIds.length} tabs to existing group "${group.name}" (ID: ${existingGroupId})`);
          
          // Add tabs to existing group
          await chrome.tabs.group({ tabIds, groupId: existingGroupId });
        } else {
          // Create new group
          console.log(`Creating new group "${group.name}" with ${tabIds.length} tabs`);
          console.log('Calling chrome.tabs.group with options:', { tabIds });
          
          const newGroupId = await chrome.tabs.group({ tabIds });
          console.log(`Created group with ID: ${newGroupId}`);
          
          await chrome.tabGroups.update(newGroupId, { title: group.name });
          console.log(`Updated group ${newGroupId} title to: ${group.name}`);
        }
      } catch (error) {
        console.error(`Failed to process group "${group.name}":`, error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    } else {
      console.log(`Skipping group "${group.name}" - insufficient tabs (${tabIds.length}, min: ${minTabs})`);
    }
  }
}

async function initiateAndGroupTabs(tabsToGroup: chrome.tabs.Tab[] | null, windowId: number) {
  console.log('initiateAndGroupTabs called');
  try {
    // Verify the window is a normal window before proceeding
    const window = await chrome.windows.get(windowId);
    console.log('Target window type:', window.type, 'ID:', windowId);
    
    if (window.type !== 'normal') {
      throw new Error(`Cannot create tab groups in ${window.type} window. Please try again in a normal browser window.`);
    }
    
    const settings = await getCurrentProviderConfig();
    console.log('Settings retrieved:', settings);
    if (!settings || !settings.apiKey || !settings.baseURL || !settings.selectedModel) {
      throw new Error('AI settings not configured');
    }

    // Get grouping settings
    const groupingSettings = await chrome.storage.local.get(['reuseExistingGroups', 'minTabsInGroup']);
    const reuseExistingGroups = groupingSettings.reuseExistingGroups !== false; // default true
    const minTabsInGroup = groupingSettings.minTabsInGroup || 2;
    
    console.log('Grouping settings:', { reuseExistingGroups, minTabsInGroup });

    if (!tabsToGroup) {
      tabsToGroup = await chrome.tabs.query({ windowId });
    }

    // Handle different grouping strategies
    if (!reuseExistingGroups) {
      // Full regrouping: ungroup all tabs first
      console.log('Full regrouping mode: ungrouping all tabs first');
      await ungroupAllTabs(windowId);
      // Refresh tabs list after ungrouping
      tabsToGroup = await chrome.tabs.query({ windowId });
    } else {
      // Reuse existing groups: only process ungrouped tabs
      console.log('Reuse existing groups mode: processing only ungrouped tabs');
      tabsToGroup = tabsToGroup.filter(tab => tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE);
      
      if (tabsToGroup.length === 0) {
        console.log('No ungrouped tabs to process');
        chrome.runtime.sendMessage({ type: 'GROUPING_FINISHED', success: true, message: 'No ungrouped tabs to process' });
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
      console.log('Existing groups found:', existingGroups.map(g => g.title));
    }

    // Build localized system prompt
    const systemPrompt = await buildSystemPrompt(reuseExistingGroups, existingGroups);
    console.log('System prompt being used:', systemPrompt.substring(0, 200) + '...');
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(tabsData) }
    ];

    // Build complete API URL
    const apiUrl = buildApiUrl(settings.baseURL, settings.endpoint);
    console.log('Making fetch request to:', apiUrl);
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.selectedModel,
        messages: messages,
        response_format: { type: 'json_object' }
      })
    });
    console.log('Fetch request completed');

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API request failed with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    console.log('Raw AI response:', aiResponse);
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
      console.log('Parsed AI response:', parsedResponse);
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
      console.log('Expected format: {"groups": [...]} but got different structure');
      throw new Error('AI response does not contain valid groups array. Please check AI provider settings and try again.');
    }

    if (Array.isArray(groupResult) && groupResult.length > 0) {
      await groupTabs(groupResult, windowId, reuseExistingGroups);
      chrome.runtime.sendMessage({ type: 'GROUPING_FINISHED', success: true });
    } else {
      throw new Error('No valid groups found in AI response');
    }
  } catch (e: any) {
    console.error('Error in initiateAndGroupTabs:', e);
    chrome.runtime.sendMessage({ type: 'GROUPING_FINISHED', success: false, error: e.message });
    throw e;
  }
}

function buildApiUrl(baseURL: string, endpoint?: string): string {
  if (!baseURL) {
    throw new Error('Base URL is required');
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
  console.log('getCurrentProviderConfig called');
  return new Promise(resolve => {
    chrome.storage.local.get(['selectedProvider', 'providers'], (result) => {
      const selectedProvider = result.selectedProvider;
      const providers = result.providers || {};
      
      if (!selectedProvider || !providers[selectedProvider]) {
        resolve(null);
        return;
      }
      
      const providerConfig = providers[selectedProvider];
      
      // Decrypt API key if exists
      if (providerConfig.apiKey) {
        try {
          // Use the same decryption method as the new system
          providerConfig.apiKey = atob(providerConfig.apiKey);
        } catch (e) {
          console.error('Failed to decrypt API key:', e);
          resolve(null);
          return;
        }
      }
      
      resolve(providerConfig);
    });
  });
}