import React from 'react';

interface ModelSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  models: string[];
  onRefresh: () => void;
  loading?: boolean;
  disabled?: boolean;
}

const ModelSelect: React.FC<ModelSelectProps> = ({
  id,
  value,
  onChange,
  models,
  onRefresh,
  loading = false,
  disabled = false
}) => {
  return (
    <div className="model-select-wrapper">
      <select 
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="model-select"
      >
        <option value="">
          {models.length > 0 ? "请选择模型" : "请先配置API密钥"}
        </option>
        {models.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      <button 
        type="button" 
        className="model-refresh-btn" 
        onClick={onRefresh}
        disabled={loading || disabled}
        title="刷新模型列表"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <polyline points="1 20 1 14 7 14"></polyline>
          <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
        </svg>
      </button>
    </div>
  );
};

export default ModelSelect;