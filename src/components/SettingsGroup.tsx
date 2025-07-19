import React from 'react';

interface SettingsGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ title, icon, children }) => {
  return (
    <div className="settings-group">
      <div className="settings-group-header">
        <div className="settings-group-icon">{icon}</div>
        <span className="settings-group-title">{title}</span>
      </div>
      <div className="settings-group-content">{children}</div>
    </div>
  );
};

export default SettingsGroup;
