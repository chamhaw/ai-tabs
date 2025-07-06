const smartGroupBtn = document.getElementById('smart-group-button');
const ungroupBtn = document.getElementById('ungroup-button');
const optionsBtn = document.getElementById('options-button');
const spinner = document.getElementById('spinner');
const statusDiv = document.getElementById('status');

// Form elements
const minTabsInput = document.getElementById('min-tabs-input');
const autoThresholdInput = document.getElementById('auto-threshold-input');
const autoGroupCheckbox = document.getElementById('auto-group-checkbox');
const reuseGroupsCheckbox = document.getElementById('reuse-groups-checkbox');

// Display status message
function showStatus(message, type = 'info') {
  if (spinner) spinner.classList.remove('visible');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
  }
}

// Show loading animation
function showSpinner() {
  if (smartGroupBtn) smartGroupBtn.disabled = true;
  if (ungroupBtn) ungroupBtn.disabled = true;
  if (optionsBtn) optionsBtn.disabled = true;
  if (statusDiv) statusDiv.style.display = 'none';
  if (spinner) {
    spinner.classList.add('visible');
    spinner.style.display = 'block';
  }
}

// Hide loading animation
function hideSpinner() {
  if (smartGroupBtn) smartGroupBtn.disabled = false;
  if (ungroupBtn) ungroupBtn.disabled = false;
  if (optionsBtn) optionsBtn.disabled = false;
  if (spinner) {
    spinner.classList.remove('visible');
    spinner.style.display = 'none';
  }
}

// Save settings
async function saveSettings() {
  try {
    const settings = {
      minTabsInGroup: parseInt(minTabsInput?.value || '2'),
      autoGroupThreshold: parseInt(autoThresholdInput?.value || '5'),
      enableAutoGroup: autoGroupCheckbox?.checked || false,
      reuseExistingGroups: reuseGroupsCheckbox?.checked || false
    };
    
    await chrome.storage.local.set(settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// Load user settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      'minTabsInGroup',
      'autoGroupThreshold',
      'enableAutoGroup',
      'reuseExistingGroups'
    ]);
    
    if (minTabsInput && result.minTabsInGroup) {
      minTabsInput.value = result.minTabsInGroup;
    }
    
    if (autoThresholdInput && result.autoGroupThreshold) {
      autoThresholdInput.value = result.autoGroupThreshold;
    }
    
    if (autoGroupCheckbox) {
      autoGroupCheckbox.checked = result.enableAutoGroup || false;
    }
    
    if (reuseGroupsCheckbox) {
      reuseGroupsCheckbox.checked = result.reuseExistingGroups !== false; // Default to true
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Event listeners
if (smartGroupBtn) {
  smartGroupBtn.addEventListener('click', function() {
    showSpinner();
    
    setTimeout(() => showStatus('Grouping in progress...'), 0);

    chrome.runtime.sendMessage({ type: 'START_GROUPING' }, (response) => {
      
      if (chrome.runtime.lastError) {
        setTimeout(() => showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error'), 0);
        hideSpinner();
        return;
      }
      if (response && !response.success) {
        setTimeout(() => showStatus(`Error: ${response.error}`, 'error'), 0);
        hideSpinner();
      } else {
      }
    });
  });
}

if (ungroupBtn) {
  ungroupBtn.addEventListener('click', function() {
    showSpinner();
    chrome.runtime.sendMessage({ type: 'UNGROUP_TABS' }, (resp) => {
      hideSpinner();
      if (chrome.runtime.lastError) {
        setTimeout(() => showStatus(`Error: ${chrome.runtime.lastError.message}`, 'error'), 0);
      } else if (resp && resp.success) {
        setTimeout(() => showStatus('Ungroup successful!', 'success'), 0);
      } else {
        setTimeout(() => showStatus(`Failed: ${resp ? resp.error : 'No response'}`, 'error'), 0);
      }
    });
  });
}

if (optionsBtn) {
  optionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
}

// Save settings when form elements change
if (minTabsInput) {
  minTabsInput.addEventListener('change', saveSettings);
}
if (autoThresholdInput) {
  autoThresholdInput.addEventListener('change', saveSettings);
}
if (autoGroupCheckbox) {
  autoGroupCheckbox.addEventListener('change', saveSettings);
}
if (reuseGroupsCheckbox) {
  reuseGroupsCheckbox.addEventListener('change', saveSettings);
}

// Get internationalized message with parameters
function getMessageWithParams(key, params = {}) {
  let message = getMessage(key);
  if (message && typeof params === 'object') {
    Object.keys(params).forEach(param => {
      message = message.replace(`{${param}}`, params[param]);
    });
  }
  return message;
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GROUPING_FINISHED') {
    hideSpinner();
    if (request.success) {
      let message = 'Grouping successful!';
      
      // If there's detailed grouping result info, build more detailed message
      if (request.result) {
        const { validTabsCount, skippedTabsCount, groupsCreated } = request.result;
        
        if (skippedTabsCount > 0) {
          message = getMessageWithParams('grouping_completed_with_skipped', {
            validCount: validTabsCount,
            skippedCount: skippedTabsCount,
            groupCount: groupsCreated
          }) || `Grouping completed: processed ${validTabsCount} tabs, skipped ${skippedTabsCount} system pages, created ${groupsCreated} groups`;
        } else {
          message = getMessageWithParams('grouping_completed_simple', {
            validCount: validTabsCount,
            groupCount: groupsCreated
                      }) || `Grouping completed: processed ${validTabsCount} tabs, created ${groupsCreated} groups`;
        }
      }
      
      setTimeout(() => showStatus(message, 'success'), 0);
      setTimeout(() => window.close(), 2000); // Extended display time for user to see details
    } else {
      setTimeout(() => showStatus(`Grouping failed: ${request.error}`, 'error'), 0);
    }
  }
});

// Update popup UI internationalization
async function updatePopupUI() {
  try {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n');
      if (typeof getMessage === 'function') {
        const message = getMessage(messageKey);
        if (message && message !== messageKey) {
          element.textContent = message;
        }
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const messageKey = element.getAttribute('data-i18n-placeholder');
      if (typeof getMessage === 'function') {
        const message = getMessage(messageKey);
        if (message && message !== messageKey) {
          element.placeholder = message;
        }
      }
    });

    // Update page title
    const titleElement = document.querySelector('title[data-i18n]');
    if (titleElement) {
      const messageKey = titleElement.getAttribute('data-i18n');
      if (typeof getMessage === 'function') {
        const message = getMessage(messageKey);
        if (message && message !== messageKey) {
          document.title = message;
        }
      }
    }
  } catch (error) {
    console.error('Failed to update popup UI:', error);
  }
}

// Listen for storage changes to respond to language switching
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.language || changes.userLanguage)) {
    // Re-initialize i18n and update UI when language settings change
    setTimeout(async () => {
      try {
        if (typeof customI18n !== 'undefined') {
          await customI18n.init();
          await updatePopupUI();
        }
      } catch (error) {
        console.error('Failed to update language in popup:', error);
      }
    }, 100);
  }
});

// Initialize after page loading is complete
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize internationalization
    if (typeof initI18n === 'function') {
      await initI18n();
    }
    
    // Load settings
    await loadSettings();
    
    // Update UI
    await updatePopupUI();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showStatus('Fatal: Popup failed to load.', 'error');
  }
}); 