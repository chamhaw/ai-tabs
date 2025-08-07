import React from 'react';

interface FormFieldProps {
  label: string;
  labelI18nKey?: string;
  htmlFor: string;
  description?: string;
  descriptionI18nKey?: string;
  required?: boolean;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  labelI18nKey,
  htmlFor,
  description,
  descriptionI18nKey,
  required = false,
  children
}) => {
  // Get localized label text
  const getLabelText = () => {
    if (labelI18nKey && typeof (window as any).getMessage === 'function') {
      const localizedLabel = (window as any).getMessage(labelI18nKey);
      if (localizedLabel && localizedLabel !== labelI18nKey) {
        return localizedLabel;
      }
    }
    return label;
  };

  // Get localized description text
  const getDescriptionText = () => {
    if (descriptionI18nKey && typeof (window as any).getMessage === 'function') {
      const localizedDescription = (window as any).getMessage(descriptionI18nKey);
      if (localizedDescription && localizedDescription !== descriptionI18nKey) {
        return localizedDescription;
      }
    }
    return description || '';
  };

  return (
    <div className="form-group">
      <label htmlFor={htmlFor} className={required ? 'required' : ''} data-i18n={labelI18nKey}>
        {getLabelText()}
      </label>
      <div className="form-input-wrapper">
        {children}
        {(description || descriptionI18nKey) && (
          <small className="form-description" data-i18n={descriptionI18nKey}>
            {getDescriptionText()}
          </small>
        )}
      </div>
    </div>
  );
};

export default FormField;