import React from 'react';

const About = () => {
  return (
    <div className="content-page active" id="page-about">
      <div className="page-header">
        <h3 data-i18n="nav_about">关于 AI Tabs</h3>
        <p data-i18n="about_description">扩展信息和帮助文档</p>
      </div>
      <div className="settings-section">
        <div className="about-content">
          <div className="about-item">
            <h4 data-i18n="version">版本</h4>
            <p>v1.0.0</p>
          </div>
          <div className="about-item">
            <h4 data-i18n="description">描述</h4>
            <p data-i18n="app_description">智能AI标签页管理扩展，支持多种AI服务供应商</p>
          </div>
          <div className="about-item">
            <h4 data-i18n="features">主要功能</h4>
            <ul>
              <li data-i18n="feature_1">多AI供应商支持</li>
              <li data-i18n="feature_2">智能模型缓存</li>
              <li data-i18n="feature_3">安全密钥存储</li>
              <li data-i18n="feature_4">自定义供应商管理</li>
              <li data-i18n="feature_5">多语言界面</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
