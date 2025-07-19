import React from 'react';
import ProviderTabs from './providers/ProviderTabs';

const ProvidersSettings = () => {
  return (
    <div className="content-page active" id="page-providers">
      <div className="page-header">
        <h3 data-i18n="nav_providers">模型供应商</h3>
        <p data-i18n="providers_description">管理AI模型供应商和相关配置</p>
      </div>
      <ProviderTabs />
    </div>
  );
};

export default ProvidersSettings;