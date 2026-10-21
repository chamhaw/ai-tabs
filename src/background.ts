// Import ES modules for security and i18n
import { secureStorage, extensionStorage } from './modules/security';
import { customI18n } from './modules/i18n';
import { generateJson } from './modules/model-client';
// Simple error handling without complex logger infrastructure

async function getLocalizedMessage(key: string, substitutions?: string | string[]): Promise<string> {
  try {
    // Ensure i18n is initialized with correct language
    if (!customI18n.initialized) {
      await customI18n.init();
    } else {
      await ensureCorrectLanguage(customI18n);
    }
    
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

async function buildSystemPrompt(minTabsInGroup: number, reuseExistingGroups: boolean = false, existingGroups: chrome.tabGroups.TabGroup[] = []): Promise<string> {
  try {
    const intro = await getLocalizedMessage('system_prompt_intro');
    // Resolve the language once per prompt instead of one storage round trip per message.
    const formatInstructions = customI18n.getMessage('system_prompt_format_instructions');
    const forbiddenRules = customI18n.getMessage('system_prompt_forbidden_rules');
    const minimumGroupSize = customI18n.getMessage('system_prompt_min_tabs', String(minTabsInGroup));
    
    // Check if we got the actual translations or just the keys back
    if (intro === 'system_prompt_intro' || formatInstructions === 'system_prompt_format_instructions') {
      console.warn('i18n system did not return translations, falling back to hardcoded prompt');
      throw new Error('i18n messages not loaded properly');
    }
    
    // Build existing groups instruction if reusing
    let existingGroupsInstruction = '';
    if (reuseExistingGroups && existingGroups.length > 0) {
      const groupNames = existingGroups.map(g => `"${g.title}"`).join(', ');
      existingGroupsInstruction = customI18n.getMessage('system_prompt_existing_groups', groupNames);
    }
    
    // Combine all parts to create the complete system prompt
    const systemPrompt = `${intro}

${existingGroupsInstruction ? existingGroupsInstruction + '\n\n' : ''}${formatInstructions}

${forbiddenRules}

${minimumGroupSize}`;
    
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
    const focusStartedAt = performance.now();
    chrome.windows.getLastFocused({ windowTypes: ['normal'] }, async (window) => {
      console.info('[AI Tabs] Window lookup completed', {
        windowLookupMs: Math.round(performance.now() - focusStartedAt)
      });
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

function normalizeGroupName(name: unknown): string {
  return String(name || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

interface GroupSuggestion {
  name: string;
  tabIds: number[];
}

function isGroupableTab(tab: chrome.tabs.Tab, windowId: number): boolean {
  return tab.id !== undefined && tab.windowId === windowId && !!tab.url &&
    !tab.url.startsWith('chrome://') && !tab.url.startsWith('moz-extension://');
}

function getGroupName(group: GroupSuggestion): string {
  const name = typeof group?.name === 'string' ? group.name.trim() : '';
  return name || 'AI Group';
}

function mergeGroupsByName(groups: GroupSuggestion[]): Array<GroupSuggestion & { key: string }> {
  const mergedGroups = new Map<string, GroupSuggestion & { key: string }>();

  for (const group of groups) {
    const name = getGroupName(group);
    const key = normalizeGroupName(name);
    const existingGroup = mergedGroups.get(key);

    if (existingGroup) {
      existingGroup.tabIds.push(...group.tabIds);
    } else {
      mergedGroups.set(key, { name, key, tabIds: [...group.tabIds] });
    }
  }

  return Array.from(mergedGroups.values());
}

async function groupTabs(groups: GroupSuggestion[], windowId: number, reuseExistingGroups: boolean, requestedTabIds: Set<number>): Promise<number> {
  // Refresh once after the network wait; this also drops tabs closed or moved meanwhile.
  const [window, allTabs, existingGroups, groupingSettings] = await Promise.all([
    chrome.windows.get(windowId),
    chrome.tabs.query({ windowId }),
    chrome.tabGroups.query({ windowId }),
    chrome.storage.local.get(['minTabsInGroup'])
  ]);
  
  if (window.type !== 'normal') {
    throw new Error(`Cannot create tab groups in ${window.type} window. Tab grouping only works in normal browser windows.`);
  }
  
  const configuredMinTabs = Number(groupingSettings.minTabsInGroup);
  const minTabsInGroup = Number.isFinite(configuredMinTabs) && configuredMinTabs >= 1 ? configuredMinTabs : 2;
  // IDs from the model are restricted to the exact request and current window.
  const availableTabIds = new Set(allTabs
    .filter(tab => isGroupableTab(tab, windowId) && requestedTabIds.has(tab.id!) &&
      (!reuseExistingGroups || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE))
    .map(tab => tab.id!));
  
  // Create a map of existing group names to their IDs
  const existingGroupMap = new Map<string, number>();
  existingGroups.forEach(group => {
    const key = normalizeGroupName(group.title);
    if (key && !existingGroupMap.has(key)) {
      existingGroupMap.set(key, group.id);
    }
  });

  let processedGroups = 0;
  let groupingError: Error | undefined;
  
  for (const group of mergeGroupsByName(groups)) {
    let tabIds = [...new Set(group.tabIds)].filter(id => availableTabIds.has(id));
    
    const existingGroupId = existingGroupMap.get(group.key);
    const existingGroupTabCount = existingGroupId === undefined
      ? 0
      : allTabs.filter(tab => tab.groupId === existingGroupId).length;
    const minTabs = existingGroupId === undefined
      ? minTabsInGroup
      : Math.max(1, minTabsInGroup - existingGroupTabCount);
    
    if (tabIds.length >= minTabs) {
      try {
        // Recheck each batch just before applying it: Chrome can move tabs across windows.
        const currentTabs = await chrome.tabs.query({ windowId });
        const currentIds = new Set(currentTabs
          .filter(tab => isGroupableTab(tab, windowId) &&
            (!reuseExistingGroups || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE))
          .map(tab => tab.id!));
        tabIds = tabIds.filter(id => currentIds.has(id));
        if (tabIds.length < minTabs) continue;
        tabIds.forEach(id => availableTabIds.delete(id));
        // Check if we should reuse existing group
        if (reuseExistingGroups && existingGroupId !== undefined) {
          
          // Add tabs to existing group with retry
          await retryTabGroupOperation(() => 
            chrome.tabs.group({ tabIds, groupId: existingGroupId })
          );
        } else {
          // Create new group with retry
          const newGroupId = await retryTabGroupOperation(() => 
            chrome.tabs.group({ tabIds, createProperties: { windowId } })
          );
          
          await chrome.tabGroups.update(newGroupId, { title: group.name });
          existingGroupMap.set(group.key, newGroupId);
        }
        processedGroups += 1;
      } catch (error) {
        // Keep trying other groups, but do not report an operation failure as no matches.
        groupingError = error instanceof Error ? error : new Error(String(error));
      }
    }
  }

  if (processedGroups === 0 && groupingError) {
    throw groupingError;
  }
  return processedGroups;
}

async function initiateAndGroupTabs(tabsToGroup: chrome.tabs.Tab[] | null, windowId: number) {
  const startedAt = performance.now();
  try {
    const [window, settings, groupingSettings] = await Promise.all([
      chrome.windows.get(windowId),
      getCurrentProviderConfig(),
      chrome.storage.local.get(['reuseExistingGroups', 'minTabsInGroup', 'maxTabs'])
    ]);
    
    if (window.type !== 'normal') {
      throw new Error(`Cannot create tab groups in ${window.type} window. Please try again in a normal browser window.`);
    }
    
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
    const reuseExistingGroups = groupingSettings.reuseExistingGroups !== false; // default true
    const configuredMinTabs = Number(groupingSettings.minTabsInGroup);
    const minTabsInGroup = Number.isFinite(configuredMinTabs) && configuredMinTabs >= 1 ? configuredMinTabs : 2;

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
    }

    const maxTabs = Number(groupingSettings.maxTabs) || 20;
    const tabsData = tabsToGroup.filter(tab => isGroupableTab(tab, windowId)).slice(0, Math.max(1, maxTabs)).map(t => ({
      id: t.id!,
      url: t.url || '',
      title: (t.title || '').trim().substring(0, 200)
    }));
    if (tabsData.length === 0) {
      void chrome.runtime
        .sendMessage({ type: 'GROUPING_FINISHED', success: true, messageKey: 'grouping_no_matches' })
        .catch(() => {});
      return;
    }

    // Get existing groups if reusing
    let existingGroups: chrome.tabGroups.TabGroup[] = [];
    if (reuseExistingGroups) {
      existingGroups = await chrome.tabGroups.query({ windowId });
    }

    // Build localized system prompt
    const systemPrompt = await buildSystemPrompt(minTabsInGroup, reuseExistingGroups, existingGroups);
    const tabsPrompt = JSON.stringify(tabsData);
    const requestStartedAt = performance.now();
    console.info('[AI Tabs] API request starting', {
      preparationMs: Math.round(requestStartedAt - startedAt),
      tabCount: tabsData.length,
      inputChars: systemPrompt.length + tabsPrompt.length
    });
    
    const aiResponse = await generateJson(settings, systemPrompt, tabsPrompt);
    const responseReceivedAt = performance.now();
    
    
    
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

    if (groupResult.some((group: any) => !group || !Array.isArray(group.tabIds))) {
      throw new Error('AI response groups must contain a tabIds array');
    }
    // A valid response may have no groups that meet the user's minimum size.
    const processedGroups = groupResult.length > 0
      ? await groupTabs(groupResult, windowId, reuseExistingGroups, new Set(tabsData.map(tab => tab.id)))
      : 0;
    console.info('[AI Tabs] Grouping completed', {
      apiMs: Math.round(responseReceivedAt - requestStartedAt),
      groupingMs: Math.round(performance.now() - responseReceivedAt),
      totalMs: Math.round(performance.now() - startedAt)
    });
    // Notify UI if available; ignore when no receiver exists.
    void chrome.runtime
      .sendMessage({
        type: 'GROUPING_FINISHED', success: true,
        ...(processedGroups === 0 ? { messageKey: 'grouping_no_matches' } : {})
      })
      .catch(() => {});
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

async function getCurrentProviderConfig(): Promise<any> {
  try {
    const result = await chrome.storage.local.get(['selectedProvider', 'providers']);
    const selectedProvider = result.selectedProvider;
    const providers = result.providers || {};
    
    if (!selectedProvider || !providers[selectedProvider]) {
      return null;
    }
    
    const providerConfig = { ...providers[selectedProvider], providerId: selectedProvider };
    
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
