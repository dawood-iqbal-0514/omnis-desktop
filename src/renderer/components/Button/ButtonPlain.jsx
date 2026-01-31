import React from 'react';
import { LoaderSmall } from '../Loader';

const ButtonPlain = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-base-background disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary: 'bg-primary-accent text-white hover:bg-[var(--color-primary-accent-hover)] focus:ring-primary-accent',
    secondary: 'bg-secondary-muted text-white hover:bg-[var(--color-secondary-muted-hover)] focus:ring-secondary-muted',
    outline: 'border-2 border-primary-accent text-primary-accent hover:bg-primary-accent hover:text-white focus:ring-primary-accent',
    ghost: 'text-primary-accent hover:bg-[var(--color-primary-accent)]/10 focus:ring-primary-accent',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button
      className={combinedClassName}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <LoaderSmall />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default ButtonPlain;

