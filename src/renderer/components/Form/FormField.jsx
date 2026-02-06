import React, { useState } from 'react';
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
  const isPassword = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword && showPassword ? 'text' : type;

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
      <div className="relative">
        <input
          {...field}
          {...props}
          type={inputType}
          id={name}
          placeholder={placeholder}
          className={`
            w-full bg-base-background border rounded-lg py-3
            text-text-primary placeholder-text-muted 
            focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent 
            transition-all
            ${hasError 
              ? 'border-error focus:ring-error' 
              : 'border-border-muted'
            }
            ${isPassword ? 'px-4 pr-12' : 'px-4'}
            ${className}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        )}
      </div>
      {hasError && (
        <p className="mt-1 text-sm text-error">{meta.error}</p>
      )}
    </div>
  );
};

export default FormField;

