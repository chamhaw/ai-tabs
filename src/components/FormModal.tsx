import React from 'react';

interface FormModalProps {
  show: boolean;
  title: string;
  primaryButtonText: string;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
}

const FormModal: React.FC<FormModalProps> = ({
  show,
  title,
  primaryButtonText,
  onSave,
  onCancel,
  children
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onSave}>
            {primaryButtonText}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormModal;