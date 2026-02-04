import { useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook for showing toast notifications
 * Provides a centralized way to show success, error, loading, and info toasts
 */
const useToast = () => {
  const showSuccess = useCallback((message, options = {}) => {
    return toast.success(message, {
      duration: options.duration || 4000,
      ...options,
    });
  }, []);

  const showError = useCallback((message, options = {}) => {
    return toast.error(message, {
      duration: options.duration || 4000,
      ...options,
    });
  }, []);

  const showInfo = useCallback((message, options = {}) => {
    return toast(message, {
      duration: options.duration || 4000,
      icon: 'ℹ️',
      ...options,
    });
  }, []);

  const showLoading = useCallback((message, options = {}) => {
    return toast.loading(message, {
      ...options,
    });
  }, []);

  const dismiss = useCallback((toastId) => {
    toast.dismiss(toastId);
  }, []);

  const dismissAll = useCallback(() => {
    toast.dismiss();
  }, []);

  return {
    showSuccess,
    showError,
    showInfo,
    showLoading,
    dismiss,
    dismissAll,
  };
};

export default useToast;

