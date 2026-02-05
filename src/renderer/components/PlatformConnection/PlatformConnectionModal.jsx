import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../Modal';
import { ButtonPlain } from '../Button';
import { InputSpinner, LoaderMedium } from '../Loader';
import usePlatformStore from '../../store/platformStore';
import useToast from '../../hooks/useToast';
import { getPlatformConfig } from '../../config/platforms.config';
import { platformAPI } from '../../services/api';

const PlatformConnectionModal = ({ isOpen, onClose, platformName }) => {
  const { showSuccess, showError } = useToast();
  const {
    getPlatformConnection,
    saveConnection,
    updateConnectionStatus,
    disconnectPlatform,
  } = usePlatformStore();

  // Memoize platform config and ID to prevent unnecessary re-renders
  const platformConfig = useMemo(() => getPlatformConfig(platformName), [platformName]);
  const platformId = useMemo(() => {
    return platformConfig?.id || platformName?.toLowerCase().replace(/\s+/g, '');
  }, [platformConfig, platformName]);
  
  const connection = platformConfig ? getPlatformConnection(platformId) : null;
  
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  
  // Fetch platform connection status when modal opens
  useEffect(() => {
    if (isOpen && platformId) {
      setIsLoadingConnection(true);
      platformAPI.getUserPlatforms(platformId)
        .then((response) => {
          if (response.success) {
            // Update the connection in store
            const currentConnections = usePlatformStore.getState().connections;
            const index = currentConnections.findIndex((c) => c.platform === platformId);
            const newConnections = [...currentConnections];
            if (index >= 0) {
              newConnections[index] = response.data;
            } else {
              newConnections.push(response.data);
            }
            usePlatformStore.setState({ connections: newConnections });
          }
        })
        .finally(() => {
          setIsLoadingConnection(false);
        });
    } else if (!isOpen) {
      setIsLoadingConnection(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, platformId]);

  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [savingField, setSavingField] = useState(null); // Track which field is being saved
  const [hasChanges, setHasChanges] = useState(false); // Track if any changes were made

  // Initialize form data from connection or config
  useEffect(() => {
    if (!isOpen) {
      // Reset hasChanges when modal closes
      setHasChanges(false);
      return;
    }
    
    if (platformConfig) {
      const initialData = {};
      platformConfig.fields.forEach((field) => {
        initialData[field.name] = '';
      });
      setFormData(initialData);
      setHasChanges(false); // Reset when modal opens
    }
  }, [platformConfig, isOpen]);

  // Debounced save function
  const debouncedSave = useCallback(
    async (platform, credentials, fieldName) => {
      setIsSaving(true);
      setSavingField(fieldName);
      try {
        const response = await saveConnection(platform, credentials);
        if (response.success) {
          showSuccess('API key saved successfully');
          setHasChanges(true); // Mark that changes were made
          // Update connection in store - no need to call getConnection
          const currentConnections = usePlatformStore.getState().connections;
          const index = currentConnections.findIndex((c) => c.platform === platform);
          if (index >= 0) {
            const newConnections = [...currentConnections];
            newConnections[index] = { ...newConnections[index], ...response.data };
            usePlatformStore.setState({ connections: newConnections });
          }
        } else {
          showError(response.error || 'Failed to save API key');
        }
      } catch (error) {
        showError(error.message || 'Failed to save API key');
      } finally {
        setIsSaving(false);
        setSavingField(null);
      }
    },
    [saveConnection, showSuccess, showError]
  );

  // Handle input change with debouncing
  const handleInputChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debouncing (500ms delay)
    const timer = setTimeout(() => {
      if (platformConfig && value.trim()) {
        const credentials = { [fieldName]: value.trim() };
        debouncedSave(platformId, credentials, fieldName);
      } else {
        setIsSaving(false);
        setSavingField(null);
      }
    }, 500);

    setDebounceTimer(timer);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await updateConnectionStatus(
        platformId,
        true,
        true 
      );
      if (response.success) {
        setHasChanges(true);
        showSuccess('Login completed successfully.');
        const currentConnections = usePlatformStore.getState().connections;
        const index = currentConnections.findIndex((c) => c.platform === platformId);
        if (index >= 0) {
          const newConnections = [...currentConnections];
          newConnections[index] = { ...newConnections[index], ...response.data };
          usePlatformStore.setState({ connections: newConnections });
        }
      } else {
        showError(response.error || 'Failed to complete login');
      }
    } catch (error) {
      showError(error.message || 'Failed to complete login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const response = await disconnectPlatform(platformId);
      if (response.success) {
        setHasChanges(true);
        showSuccess('Platform disconnected successfully.');
        const currentConnections = usePlatformStore.getState().connections;
        const index = currentConnections.findIndex((c) => c.platform === platformId);
        if (index >= 0) {
          const newConnections = [...currentConnections];
          newConnections[index] = { ...newConnections[index], ...response.data };
          usePlatformStore.setState({ connections: newConnections });
        }
      } else {
        showError(response.error || 'Failed to disconnect platform');
      }
    } catch (error) {
      showError(error.message || 'Failed to disconnect platform');
    } finally {
      setIsLoading(false);
    }
  };

  const hasApiKeySaved = () => {
    if (!platformConfig?.fields.length) return false;
    return !!connection?.hasCredentials;
  };

  // Check if platform is fully connected
  const isFullyConnected = connection?.isConnected && !connection?.isFirstTimeLogin;
  
  // Check if platform is connected (for showing disconnect button)
  const isConnected = connection?.isConnected || false;

  // Wrapper function to handle modal close with hasChanges flag
  const handleModalClose = () => {
    onClose(hasChanges);
  };

  if (!platformConfig) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title={`Connect ${platformConfig.name}`}
      size="md"
      closeOnOutsideClick={false}
      closeOnEscape={false}
    >
      {isLoadingConnection ? (
        <div className="py-12">
          <LoaderMedium />
        </div>
      ) : (
      <div className="space-y-6">
        {/* Platform Info */}
        <div className="flex items-center gap-3 pb-4 border-b border-border-muted">
          <img
            src={platformConfig.logo}
            alt={`${platformConfig.name} logo`}
            className="w-10 h-10 object-contain"
          />
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {platformConfig.name}
            </h3>
            <p className="text-sm text-text-secondary">
              {isFullyConnected
                ? 'Platform is connected'
                : 'Complete the setup to connect this platform'}
            </p>
          </div>
        </div>

        {/* Connection Status */}
        {isFullyConnected && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm text-success font-medium">
              ✓ {platformConfig.name} is connected and ready to use
            </p>
          </div>
        )}

        {/* Form Fields */}
        {platformConfig.fields.length > 0 && (
          <div className="space-y-4">
            {platformConfig.fields.map((field) => {
              // Only show "Configured" if credentials are saved in DB, not while typing
              const isConfigured = connection?.hasCredentials && !savingField;
              return (
                <div key={field.name}>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="block text-text-secondary text-sm font-medium"
                      htmlFor={field.name}
                    >
                      {field.label}
                      {field.required && <span className="text-error ml-1">*</span>}
                    </label>
                    {isConfigured && (
                      <span className="text-xs text-success font-medium">Configured</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={field.type || 'text'}
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isFullyConnected || isSaving || isLoading}
                      className={`w-full px-4 py-2 pr-10 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        savingField === field.name ? 'pr-10' : ''
                      }`}
                    />
                    {savingField === field.name && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <InputSpinner />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Login/Disconnect Button (for platforms requiring automation) */}
        {platformConfig.setupType === 'hybrid' && (
          <div className="pt-4 border-t border-border-muted">
            {isConnected ? (
              <>
                <ButtonPlain
                  variant="outline"
                  className="w-full border-error text-error hover:bg-error/10"
                  onClick={handleDisconnect}
                  isLoading={isLoading}
                  disabled={isSaving}
                >
                  Disconnect
                </ButtonPlain>
                <p className="mt-2 text-xs text-text-secondary text-center">
                  Disconnect this platform to remove saved credentials and connection status
                </p>
              </>
            ) : (
              <>
                <ButtonPlain
                  variant="primary"
                  className="w-full"
                  onClick={handleLogin}
                  isLoading={isLoading}
                  disabled={isSaving || !hasApiKeySaved()}
                >
                  Login
                </ButtonPlain>
                <p className="mt-2 text-xs text-text-secondary text-center">
                  One time login is required for performing hubspot tasks
                </p>
              </>
            )}
          </div>
        )}

        {/* Status Messages - Only show error if connection exists but has no credentials and user hasn't typed anything */}
        {connection && connection.id && !connection.hasCredentials && !formData[platformConfig.fields[0]?.name]?.trim() && platformConfig.fields.length > 0 && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-sm text-error">
              Please enter your {platformConfig.fields[0]?.label || 'credentials'} to continue
            </p>
          </div>
        )}

        {/* Status Messages */}
        {!isConnected && !connection?.isFirstTimeLogin && hasApiKeySaved() && (
          <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
            <p className="text-sm text-text-secondary">
              API key saved. Please click Login to complete the setup.
            </p>
          </div>
        )}

        {/* Close Button */}
        <div className="flex gap-3 pt-4 border-t border-border-muted">
          <ButtonPlain
            variant="outline"
            className="flex-1"
            onClick={() => onClose(hasChanges)}
            disabled={isLoading || isSaving}
          >
            {isFullyConnected ? 'Close' : 'Cancel'}
          </ButtonPlain>
        </div>
      </div>
      )}
    </Modal>
  );
};

export default PlatformConnectionModal;