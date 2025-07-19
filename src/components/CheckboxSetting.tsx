import React from 'react';

interface CheckboxSettingProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxSetting: React.FC<CheckboxSettingProps> = ({ id, label, checked, onChange }) => {
  return (
    <div className="form-group checkbox-group">
      <label htmlFor={id}>{label}</label>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
};

export default CheckboxSetting;
