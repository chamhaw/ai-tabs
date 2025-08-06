import React from 'react';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  description,
  required = false,
  children
}) => {
  return (
    <div className="form-group">
      <label htmlFor={htmlFor} className={required ? 'required' : ''}>
        {label}
      </label>
      <div className="form-input-wrapper">
        {children}
        {description && (
          <small className="form-description">{description}</small>
        )}
      </div>
    </div>
  );
};

export default FormField;