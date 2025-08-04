import React, { useState, useEffect } from 'react';

const Popup = () => {
  const [minTabsInGroup, setMinTabsInGroup] = useState(2);
  const [autoGroupThreshold, setAutoGroupThreshold] = useState(5);
  const [enableAutoGroup, setEnableAutoGroup] = useState(false);
  const [reuseExistingGroups, setReuseExistingGroups] = useState(true);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize i18n
    if (typeof window !== 'undefined' && (window as any).initI18n) {
      (window as any).initI18n();
    }

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
    const messageListener = (request: any) => {
      if (request.type === 'GROUPING_FINISHED') {
        setLoading(false);
        if (request.success) {
          setStatus('Grouping successful!');
          setStatusType('success');
        } else {
          setStatus(`Grouping failed: ${request.error}`);
          setStatusType('error');
        }
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const saveSettings = async () => {
    try {
      const settings = {
        minTabsInGroup,
        autoGroupThreshold,
        enableAutoGroup,
        reuseExistingGroups
      };
      await chrome.storage.local.set(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const showStatus = (message: string, type: string = 'info') => {
    setLoading(false);
    setStatus(message);
    setStatusType(type);
  };

  const showSpinner = () => {
    setLoading(true);
    setStatus('');
  };

  const handleSmartGroup = () => {
    showSpinner();
    setTimeout(() => showStatus('Grouping in progress...', 'info'), 0);
    
    chrome.runtime.sendMessage({ type: 'START_GROUPING' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus(`Communication error: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }
      
      if (response && !response.success) {
        showStatus(`Grouping failed: ${response.error}`, 'error');
      }
    });
  };

  const handleUngroup = () => {
    showSpinner();
    
    chrome.runtime.sendMessage({ type: 'UNGROUP_TABS' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus(`Communication error: ${chrome.runtime.lastError.message}`, 'error');
        return;
      }
      
      if (response && response.success) {
        showStatus('Successfully ungrouped all tabs!', 'success');
      } else {
        showStatus(`Ungrouping failed: ${response?.error || 'Unknown error'}`, 'error');
      }
    });
  };

  const handleOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleMinTabsChange = (value: number) => {
    setMinTabsInGroup(value);
    saveSettings();
  };

  const handleAutoThresholdChange = (value: number) => {
    setAutoGroupThreshold(value);
    saveSettings();
  };

  const handleAutoGroupChange = (checked: boolean) => {
    setEnableAutoGroup(checked);
    saveSettings();
  };

  const handleReuseGroupsChange = (checked: boolean) => {
    setReuseExistingGroups(checked);
    saveSettings();
  };

  return (
    <div className="popup-container">
      {/* 主菜单区域 */}
      <div className="menu-list">
        <button 
          className="menu-item" 
          id="smart-group-button"
          onClick={handleSmartGroup}
          disabled={loading}
        >
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"></path>
            </svg>
          </div>
          <span className="menu-item-text" data-i18n="smart_group_tabs">智能分组标签页</span>
        </button>
        
        <button 
          className="menu-item" 
          id="ungroup-button"
          onClick={handleUngroup}
          disabled={loading}
        >
          <div className="menu-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
          </div>
          <span className="menu-item-text" data-i18n="ungroup_all_tabs">取消所有分组</span>
        </button>
      </div>

      {/* 配置设置区域 */}
      <div className="settings-container">
        {/* 自动分组配置 */}
        <div className="settings-group">
          <div className="settings-group-header">
            <div className="settings-group-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="settings-group-title" data-i18n="auto_group_config">自动分组配置</span>
          </div>
          <div className="settings-group-content">
            <div className="form-group checkbox-group">
              <label htmlFor="auto-group-checkbox" data-i18n="enable_auto_group">启用自动分组</label>
              <input 
                type="checkbox" 
                id="auto-group-checkbox"
                checked={enableAutoGroup}
                onChange={(e) => handleAutoGroupChange(e.target.checked)}
              />
            </div>
            <div className="form-group has-description">
              <div className="form-main">
                <label htmlFor="auto-threshold-input" data-i18n="auto_group_threshold">自动分组阈值</label>
                <input 
                  type="number" 
                  id="auto-threshold-input" 
                  min="3" 
                  max="50" 
                  value={autoGroupThreshold}
                  onChange={(e) => handleAutoThresholdChange(parseInt(e.target.value))}
                  data-i18n-placeholder="auto_threshold_placeholder"
                />
              </div>
              <span className="form-description" data-i18n="auto_threshold_description">触发自动分组的标签页数量阈值</span>
            </div>
          </div>
        </div>

        {/* 分组规则配置 */}
        <div className="settings-group">
          <div className="settings-group-header">
            <div className="settings-group-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </div>
            <span className="settings-group-title" data-i18n="grouping_rules_config">分组规则配置</span>
          </div>
          <div className="settings-group-content">
            <div className="form-group has-description">
              <div className="form-main">
                <label htmlFor="min-tabs-input" data-i18n="min_tabs_in_group">最小分组标签数</label>
                <input 
                  type="number" 
                  id="min-tabs-input" 
                  min="2" 
                  max="10" 
                  value={minTabsInGroup}
                  onChange={(e) => handleMinTabsChange(parseInt(e.target.value))}
                  data-i18n-placeholder="min_tabs_placeholder"
                />
              </div>
              <span className="form-description" data-i18n="min_tabs_description">每个分组的最少标签页数量</span>
            </div>
            <div className="form-group checkbox-group">
              <label htmlFor="reuse-groups-checkbox" data-i18n="reuse_existing_groups">复用现有分组</label>
              <input 
                type="checkbox" 
                id="reuse-groups-checkbox"
                checked={reuseExistingGroups}
                onChange={(e) => handleReuseGroupsChange(e.target.checked)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 加载动画 */}
      {loading && (
        <div className="spinner visible" id="spinner"></div>
      )}

      {/* 状态显示 */}
      {status && (
        <div id="status" className={statusType} style={{ display: 'block' }}>
          {status}
        </div>
      )}
      
      {/* 底部链接 */}
      <div className="footer-link">
        <a href="#" id="options-button" onClick={handleOptions} data-i18n="open_options">完整配置</a>
      </div>
    </div>
  );
};

export default Popup;
