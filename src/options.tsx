import React, { useState } from 'react';
import GeneralSettings from './components/options/GeneralSettings';
import ProvidersSettings from './components/options/ProvidersSettings';
import AdvancedSettings from './components/options/AdvancedSettings';
import About from './components/options/About';

const Options = () => {
  const [activePage, setActivePage] = useState('general');

  const renderPage = () => {
    switch (activePage) {
      case 'general':
        return <GeneralSettings />;
      case 'providers':
        return <ProvidersSettings />;
      case 'advanced':
        return <AdvancedSettings />;
      case 'about':
        return <About />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="options-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2 data-i18n="options_title">AI Tabs 设置</h2>
        </div>
        <nav className="sidebar-nav">
          <ul className="nav-menu">
            <li className="nav-item">
              <button className={`nav-button ${activePage === 'general' ? 'active' : ''}`} onClick={() => setActivePage('general')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span data-i18n="nav_general">常规设置</span>
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-button ${activePage === 'providers' ? 'active' : ''}`} onClick={() => setActivePage('providers')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 0-8-3-8-8s3-8 8-8 8 3 8 8-3 8-8 8z"></path><path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path><path d="M12 1v6m0 6v6"></path></svg>
                <span data-i18n="nav_providers">模型供应商</span>
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-button ${activePage === 'advanced' ? 'active' : ''}`} onClick={() => setActivePage('advanced')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9 8.91 8.26 12 2"></polygon></svg>
                <span data-i18n="nav_advanced">高级设置</span>
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-button ${activePage === 'about' ? 'active' : ''}`} onClick={() => setActivePage('about')}>
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <span data-i18n="nav_about">关于</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
};

export default Options;
