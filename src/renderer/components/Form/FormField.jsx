import React from 'react';
import { useField } from 'formik';

/**
 * Reusable Form Field Component
 * Wraps input with Formik field and error handling
 */
const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  placeholder, 
  required = false,
  className = '',
  ...props 
}) => {
  const [field, meta] = useField(name);
  const hasError = meta.touched && meta.error;

  return (
    <div>
      {label && (
        <label 
          htmlFor={name} 
          className="block text-text-secondary text-sm font-medium mb-2"
        >
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <input
        {...field}
        {...props}
        type={type}
        id={name}
        placeholder={placeholder}
        className={`
          w-full bg-base-background border rounded-lg px-4 py-3 
          text-text-primary placeholder-text-muted 
          focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent 
          transition-all
          ${hasError 
            ? 'border-error focus:ring-error' 
            : 'border-border-muted'
          }
          ${className}
        `}
      />
      {hasError && (
        <p className="mt-1 text-sm text-error">{meta.error}</p>
      )}
    </div>
  );
};

export default FormField;

