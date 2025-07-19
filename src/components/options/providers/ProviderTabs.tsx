import React, { useState } from 'react';
import CurrentProviderConfig from './CurrentProviderConfig';
import ProvidersManagement from './ProvidersManagement';

const ProviderTabs = () => {
  const [activeTab, setActiveTab] = useState('current');

  return (
    <div className="provider-tabs">
      <div className="tab-buttons">
        <button className={`tab-button ${activeTab === 'current' ? 'active' : ''}`} onClick={() => setActiveTab('current')}>当前配置</button>
        <button className={`tab-button ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>管理供应商</button>
      </div>
      <div className="tab-content">
        {activeTab === 'current' && <CurrentProviderConfig />}
        {activeTab === 'manage' && <ProvidersManagement />}
      </div>
    </div>
  );
};

export default ProviderTabs;