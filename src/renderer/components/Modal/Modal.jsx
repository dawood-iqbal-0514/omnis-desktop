import React, { useEffect } from 'react';
import useThemeStore from '../../store/themeStore';

const Modal = ({ isOpen, onClose, children, title, size = 'md' }) => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {}
      <div
        className={`relative w-full ${sizeClasses[size]} bg-[var(--color-base-background-light)] rounded-lg shadow-xl border border-border-muted transform transition-all ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {}
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-border-muted">
            <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--color-base-background)] rounded-lg transition-colors text-text-secondary hover:text-text-primary"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

