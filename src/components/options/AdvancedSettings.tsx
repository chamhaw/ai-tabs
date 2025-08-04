import React from 'react';

const AdvancedSettings = () => {
  return (
    <div className="content-page active" id="page-advanced">
      <div className="page-header">
        <h3 data-i18n="nav_advanced">高级设置</h3>
        <p data-i18n="advanced_description">高级功能和性能优化设置</p>
      </div>
      <div className="settings-section">
        <div className="advanced-settings-container">
          <div className="form-group">
            <label htmlFor="maxTabs" data-i18n="max_tabs">最大标签页数量</label>
            <input type="number" id="maxTabs" min="1" max="100" />
            <small className="form-description" data-i18n="max_tabs_description">同时处理的最大标签页数量</small>
          </div>
          <div className="form-group checkbox-group">
            <label htmlFor="autoSave" data-i18n="auto_save">自动保存</label>
            <input type="checkbox" id="autoSave" />
            <small className="form-description" data-i18n="auto_save_description">自动保存配置更改</small>
          </div>
          <div className="form-group">
            <label htmlFor="cacheTimeout" data-i18n="cache_timeout">缓存超时时间（分钟）</label>
            <input type="number" id="cacheTimeout" min="1" max="1440" />
            <small className="form-description" data-i18n="cache_timeout_description">模型列表缓存的有效时间</small>
          </div>
        </div>
        <div className="form-actions">
          <button id="clearCacheBtn" className="btn btn-secondary" data-i18n="clear_cache">清除缓存</button>
          <button id="resetSettingsBtn" className="btn btn-secondary" data-i18n="reset_settings">重置设置</button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
