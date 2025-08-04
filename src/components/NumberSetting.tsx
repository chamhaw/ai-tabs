import React from 'react';

interface NumberSettingProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  description: string;
  onChange: (value: number) => void;
}

const NumberSetting: React.FC<NumberSettingProps> = ({ id, label, value, min, max, description, onChange }) => {
  return (
    <div className="form-group has-description">
      <div className="form-main">
        <label htmlFor={id}>{label}</label>
        <input type="number" id={id} value={value} min={min} max={max} onChange={(e) => onChange(parseInt(e.target.value))} />
      </div>
      <span className="form-description">{description}</span>
    </div>
  );
};

export default NumberSetting;
