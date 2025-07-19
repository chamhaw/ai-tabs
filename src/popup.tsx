import React, { useState, useEffect } from 'react';
import MenuItem from './components/MenuItem';
import SettingsGroup from './components/SettingsGroup';
import CheckboxSetting from './components/CheckboxSetting';
import NumberSetting from './components/NumberSetting';

const Popup = () => {
  const [minTabsInGroup, setMinTabsInGroup] = useState(2);
  const [autoGroupThreshold, setAutoGroupThreshold] = useState(5);
  const [enableAutoGroup, setEnableAutoGroup] = useState(false);
  const [reuseExistingGroups, setReuseExistingGroups] = useState(true);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load settings from chrome.storage.local
    chrome.storage.local.get([
      'minTabsInGroup',
      'autoGroupThreshold',
      'enableAutoGroup',
      'reuseExistingGroups'
    ], (result) => {
      setMinTabsInGroup(result.minTabsInGroup || 2);
      setAutoGroupThreshold(result.autoGroupThreshold || 5);
      setEnableAutoGroup(result.enableAutoGroup || false);
      setReuseExistingGroups(result.reuseExistingGroups !== false);
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request) => {
      if (request.type === 'GROUPING_FINISHED') {
        setLoading(false);
        if (request.success) {
          setStatus('Grouping successful!');
        } else {
          setStatus(`Grouping failed: ${request.error}`);
        }
      }
    });
  }, []);

  const saveSettings = (settings: any) => {
    chrome.storage.local.set(settings);
  };

  const handleSmartGroup = () => {
    setLoading(true);
    setStatus('');
    chrome.runtime.sendMessage({ type: 'START_GROUPING' });
  };

  const handleUngroup = () => {
    setLoading(true);
    setStatus('');
    chrome.runtime.sendMessage({ type: 'UNGROUP_TABS' });
  };

  const handleOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="popup-container">
      <div className="menu-list">
        <MenuItem
          id="smart-group-button"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"></path></svg>}
          text="智能分组标签页"
          onClick={handleSmartGroup}
        />
        <MenuItem
          id="ungroup-button"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>}
          text="取消所有分组"
          onClick={handleUngroup}
        />
      </div>

      <div className="settings-container">
        <SettingsGroup
          title="自动分组配置"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>}
        >
          <CheckboxSetting
            id="auto-group-checkbox"
            label="启用自动分组"
            checked={enableAutoGroup}
            onChange={(checked) => {
              setEnableAutoGroup(checked);
              saveSettings({ enableAutoGroup: checked });
            }}
          />
          <NumberSetting
            id="auto-threshold-input"
            label="自动分组阈值"
            value={autoGroupThreshold}
            min={3}
            max={50}
            description="触发自动分组的标签页数量阈值"
            onChange={(value) => {
              setAutoGroupThreshold(value);
              saveSettings({ autoGroupThreshold: value });
            }}
          />
        </SettingsGroup>

        <SettingsGroup
          title="分组规则配置"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>}
        >
          <NumberSetting
            id="min-tabs-input"
            label="最小分组标签数"
            value={minTabsInGroup}
            min={2}
            max={10}
            description="每个分组的最少标签页数量"
            onChange={(value) => {
              setMinTabsInGroup(value);
              saveSettings({ minTabsInGroup: value });
            }}
          />
          <CheckboxSetting
            id="reuse-groups-checkbox"
            label="复用现有分组"
            checked={reuseExistingGroups}
            onChange={(checked) => {
              setReuseExistingGroups(checked);
              saveSettings({ reuseExistingGroups: checked });
            }}
          />
        </SettingsGroup>
      </div>

      {loading && <div className="spinner" id="spinner"></div>}
      {status && <div id="status">{status}</div>}
      
      <div className="footer-link">
        <a href="#" onClick={handleOptions}>完整配置</a>
      </div>
    </div>
  );
};

export default Popup;
