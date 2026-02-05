import React from 'react';
import { useField } from 'formik';

/**
 * Reusable Form Checkbox Component
 */
const FormCheckbox = ({ 
  name, 
  label, 
  required = false,
  className = '',
  ...props 
}) => {
  const [field, meta] = useField({ name, type: 'checkbox' });
  const hasError = meta.touched && meta.error;

  return (
    <div>
      <label className={`flex items-center ${className}`}>
        <input
          {...field}
          {...props}
          type="checkbox"
          className={`
            w-4 h-4 text-primary-accent bg-base-background border-border-muted 
            rounded focus:ring-primary-accent
            ${hasError ? 'border-error' : ''}
          `}
        />
        <span className="ml-2 text-sm text-text-secondary">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      {hasError && (
        <p className="mt-1 text-sm text-error">{meta.error}</p>
      )}
    </div>
  );
};

export default FormCheckbox;

