/**
 * Toast notification configuration
 * Centralized configuration for react-hot-toast
 */
export const toasterConfig = {
  position: 'top-right',
  containerStyle: {
    zIndex: 9999,
    top: 20,
    right: 20,
  },
  toastOptions: {
    duration: 4000,
    style: {
      background: 'var(--color-base-background-light)',
      color: 'var(--color-text-primary)',
      border: '1px solid var(--color-border-muted)',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 9999,
    },
    success: {
      iconTheme: {
        primary: 'var(--color-primary-accent)',
        secondary: '#fff',
      },
      style: {
        background: 'var(--color-base-background-light)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-primary-accent)',
      },
    },
    error: {
      iconTheme: {
        primary: '#ef4444',
        secondary: '#fff',
      },
      style: {
        background: 'var(--color-base-background-light)',
        color: 'var(--color-text-primary)',
        border: '1px solid #ef4444',
      },
    },
  },
};

