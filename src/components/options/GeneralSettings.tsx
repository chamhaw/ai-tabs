import React from 'react';

const GeneralSettings = () => {
  return (
    <div className="content-page active" id="page-general">
      <div className="page-header">
        <h3 data-i18n="nav_general">常规设置</h3>
        <p data-i18n="general_description">配置基本的AI服务设置和偏好</p>
      </div>
      <div className="settings-section">
        <div className="form-group">
          <label htmlFor="languageSelect" data-i18n="language_setting">界面语言</label>
          <select id="languageSelect">
            <option value="auto" data-i18n="language_auto">自动检测</option>
            <option value="zh_CN" data-i18n="language_zh_cn">简体中文</option>
            <option value="en" data-i18n="language_en">English</option>
          </select>
          <small className="form-description" data-i18n="language_setting_description">更改语言后需要重新加载扩展</small>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
