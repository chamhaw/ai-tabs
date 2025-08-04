// Import security module
importScripts('scripts/security.js');

// Define types for imported scripts
declare const secureStorage: any;

// Keep service worker alive
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'KEEP_ALIVE' }).catch(() => {});
}, 25000);

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

async function groupTabs(groups: any[], windowId: number) {
  console.log('groupTabs called');
  for (const group of groups) {
    const tabIds = group.tabs.map((t: any) => t.id);
    const newGroupId = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(newGroupId, { title: group.name });
  }
}

async function initiateAndGroupTabs(tabsToGroup: chrome.tabs.Tab[] | null, windowId: number) {
  console.log('initiateAndGroupTabs called');
  try {
    const settings = await getSecureSettings(['apiKey', 'baseURL', 'model']);
    console.log('Settings retrieved:', settings);
    if (!settings.apiKey || !settings.baseURL || !settings.model) {
      throw new Error('AI settings not configured');
    }

    if (!tabsToGroup) {
      tabsToGroup = await chrome.tabs.query({ windowId });
    }

    const tabsData = tabsToGroup.map(t => ({
      url: t.url || '',
      title: (t.title || '').trim().substring(0, 200)
    }));

    const systemPrompt = 'You are an intelligent tab grouping assistant...';
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify(tabsData) }
    ];

    console.log('Making fetch request to:', settings.baseURL);
    const res = await fetch(settings.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.model,
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
    const groupResult = aiResponse ? JSON.parse(aiResponse).groups : null;

    if (Array.isArray(groupResult)) {
      await groupTabs(groupResult, windowId);
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

async function getSecureSettings(keys: string[]): Promise<any> {
  console.log('getSecureSettings called');
  return new Promise(resolve => {
    chrome.storage.local.get(keys, (result) => {
      if (result.apiKey) {
        result.apiKey = secureStorage.encryption.decrypt(result.apiKey);
      }
      resolve(result);
    });
  });
}