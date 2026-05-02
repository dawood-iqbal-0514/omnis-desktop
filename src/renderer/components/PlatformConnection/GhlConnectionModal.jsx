import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../Modal';
import { TwoFactorAuthModal } from '../Modal';
import { ButtonPlain } from '../Button';
import { InputSpinner, LoaderMedium } from '../Loader';
import usePlatformStore from '../../store/platformStore';
import useToast from '../../hooks/useToast';
import ghlLogo from '@assets/logos/ghl.svg';

const GhlConnectionModal = ({ isOpen, onClose }) => {
  const { showSuccess, showError } = useToast();

  // Use Zustand selectors to ensure proper reactivity
  const {
    saveConnection,
    updateConnectionStatus,
    disconnectPlatform,
    getConnectionCredentials,
    fetchUserPlatforms,
  } = usePlatformStore((state) => ({
    saveConnection: state.saveConnection,
    updateConnectionStatus: state.updateConnectionStatus,
    disconnectPlatform: state.disconnectPlatform,
    getConnectionCredentials: state.getConnectionCredentials,
    fetchUserPlatforms: state.fetchUserPlatforms,
  }));

  // Use a selector to get the connection object - this makes it reactive
  const connection = usePlatformStore((state) =>
    state.connections.find((c) => c.platform === 'ghl')
  );

  const platformId = 'ghl';

  const [isLoadingConnection, setIsLoadingConnection] = useState(false);

  // Fetch platform connection status when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingConnection(true);
      fetchUserPlatforms(platformId)
        .then((response) => {
          // Store already updates connections array, no need to manually update
        })
        .finally(() => {
          setIsLoadingConnection(false);
        });
    } else if (!isOpen) {
      setIsLoadingConnection(false);
    }
  }, [isOpen]);

  const [formData, setFormData] = useState({});
  const formDataRef = useRef({});
  const debounceTimerRef = useRef(null); // Use ref instead of state to avoid re-renders
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState('');
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);

  // Initialize form data from connection
  useEffect(() => {
    if (!isOpen) {
      setHasChanges(false);
      return;
    }

    const initialData = {
      apiKey: connection?.credentials?.apiKey || '',
      email: connection?.credentials?.email || '',
      password: '',
      locationId: connection?.credentials?.locationId || '',
    };
    setFormData(initialData);
    formDataRef.current = initialData;
    setHasChanges(false);
  }, [isOpen, connection]);

  // Track loading states with refs so the unmount cleanup can read current values
  // without re-running (and accidentally cancelling) on every state change
  const isLoadingRef = useRef(false);
  const isSubmitting2FARef = useRef(false);
  isLoadingRef.current = isLoading;
  isSubmitting2FARef.current = isSubmitting2FA;

  // Cancel login script ONLY when the component unmounts — not on state changes
  useEffect(() => {
    return () => {
      if ((isLoadingRef.current || isSubmitting2FARef.current) && window.automationAPI?.cancelLoginScript) {
        window.automationAPI.cancelLoginScript().catch((error) => {
          console.error('Failed to cancel login script on modal close:', error);
        });
      }
    };
  }, []);

  // Debounced save function
  const debouncedSave = useCallback(
    async (platform, credentials, fieldName) => {
      setIsSaving(true);
      setSavingField(fieldName);
      try {
        // Debug: Log what we're saving (without logging password value)
        console.log(`[GHL Modal] Saving ${fieldName}:`, {
          hasEmail: !!credentials.email,
          hasPassword: !!credentials.password,
          hasApiKey: !!credentials.apiKey,
          hasLocationId: !!credentials.locationId,
          email: credentials.email,
          // Don't log password value
        });

        const response = await saveConnection(platform, credentials);
        if (response.success) {
          const fieldLabels = {
            apiKey: 'API Key',
            email: 'Email Address',
            password: 'Password',
            locationId: 'Location ID',
          };
          showSuccess(`${fieldLabels[fieldName] || 'Credentials'} saved successfully`);
          setHasChanges(true);
          const currentConnections = usePlatformStore.getState().connections;
          const index = currentConnections.findIndex((c) => c.platform === platform);
          if (index >= 0) {
            const newConnections = [...currentConnections];
            newConnections[index] = { ...newConnections[index], ...response.data };
            usePlatformStore.setState({ connections: newConnections });
          }
        } else {
          showError(response.error || 'Failed to save credentials');
        }
      } catch (error) {
        showError(error.message || 'Failed to save credentials');
      } finally {
        setIsSaving(false);
        setSavingField(null);
      }
    },
    [saveConnection, showSuccess, showError]
  );

  // Handle input change with debouncing
  const handleInputChange = (fieldName, value) => {
    // Update form data immediately
    setFormData((prev) => {
      const updated = { ...prev, [fieldName]: value };
      formDataRef.current = updated;
      return updated;
    });

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

      // Set new timer with longer debounce (1500ms = 1.5 seconds)
      debounceTimerRef.current = setTimeout(() => {
        const currentFormData = formDataRef.current;
        const currentValue = currentFormData[fieldName]?.trim();

        if (currentValue) {
          if (fieldName === 'email') {
            // Email field: only save if password is also filled
            const passwordValue = currentFormData.password?.trim();
            if (passwordValue) {
              const credentials = {
                email: currentValue,
                password: passwordValue,
              };
              debouncedSave(platformId, credentials, 'password');
            }
            // Don't save email alone - wait for password
          } else if (fieldName === 'password') {
            // Password field: save both email and password together
            const emailValue = currentFormData.email?.trim();
            if (emailValue) {
              // Use currentValue which is the password field value that was just typed
              // Ensure password is not accidentally the same as apiKey
              const apiKeyValue = currentFormData.apiKey?.trim();
              if (apiKeyValue && currentValue === apiKeyValue) {
                console.warn('[GHL Modal] Password cannot be the same as API Key');
                showError('Password cannot be the same as API Key');
                setIsSaving(false);
                setSavingField(null);
                return;
              }

              const credentials = {
                email: emailValue,
                password: currentValue, // This is the password field value
              };
              debouncedSave(platformId, credentials, 'password');
            } else {
              setIsSaving(false);
              setSavingField(null);
            }
          } else {
            // For apiKey, locationId, and other fields, save individually
            const credentials = { [fieldName]: currentValue };
            debouncedSave(platformId, credentials, fieldName);
          }
        } else {
          setIsSaving(false);
          setSavingField(null);
        }
      }, 1500); // Increased to 1500ms (1.5 seconds) to wait for user to finish typing
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Listen for 2FA requests
  useEffect(() => {
    if (!window.automationAPI || !window.automationAPI.on2FARequest) {
      return;
    }

    const handle2FARequest = (event, data) => {
      if (data && data.platformId === platformId) {
        setTwoFAMessage(data.message || '');
        setShow2FAModal(true);
      }
    };

    window.automationAPI.on2FARequest(handle2FARequest);

    return () => {
      // Remove the listener so it doesn't accumulate across re-mounts
      if (window.automationAPI && window.automationAPI.off2FARequest) {
        window.automationAPI.off2FARequest(handle2FARequest);
      }
    };
  }, [platformId]);

  const handle2FASubmit = async (token) => {
    setIsSubmitting2FA(true);
    try {
      const response = await window.automationAPI.submit2FAToken(token);
      if (response.success) {
        setShow2FAModal(false);
        // The login script will continue automatically
      } else {
        showError(response.error || 'Failed to submit 2FA token');
      }
    } catch (error) {
      showError(error.message || 'Failed to submit 2FA token');
    } finally {
      setIsSubmitting2FA(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[GHL Modal] handleLogin called');

      // Cancel any pending debounce timer so we save immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Get current form data
      const currentFormData = formDataRef.current;
      const localEmail = currentFormData.email?.trim();
      const localPassword = currentFormData.password?.trim();
      const localApiKey = currentFormData.apiKey?.trim();
      const localLocationId = currentFormData.locationId?.trim();

      // Save any unsaved credentials to backend before login
      if (localApiKey) {
        console.log('[GHL Modal] Saving API key before login...');
        await saveConnection(platformId, { apiKey: localApiKey });
      }
      if (localLocationId) {
        console.log('[GHL Modal] Saving Location ID before login...');
        await saveConnection(platformId, { locationId: localLocationId });
      }
      if (localEmail && localPassword) {
        console.log('[GHL Modal] Saving email/password before login...');
        await saveConnection(platformId, { email: localEmail, password: localPassword });
      }

      // Now fetch full credentials from backend
      const credentialsResponse = await getConnectionCredentials(platformId);
      console.log('[GHL Modal] credentialsResponse:', { success: credentialsResponse.success, hasData: !!credentialsResponse.data });

      let email, password;

      if (credentialsResponse.success && credentialsResponse.data) {
        const credentials = credentialsResponse.data;
        email = credentials?.email;
        password = credentials?.password;
      }

      // Fall back to form data if backend credentials are incomplete
      if (!email) email = localEmail;
      if (!password) password = localPassword;

      if (!email || !password) {
        showError('Email and password are required for login. Please save them first.');
        setIsLoading(false);
        return;
      }

      // Execute login script with credentials from database
      const result = await window.automationAPI.executeLoginScript(platformId, {
        email,
        password,
        locationId: localLocationId || credentialsResponse?.data?.locationId,
      });

      if (result.success) {
        // Update connection status after successful login
        const response = await updateConnectionStatus(platformId, true, true);
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
        }
      } else {
        // Show user-friendly error message
        const errorMsg = result.error || 'Failed to complete login';
        showError(errorMsg);
      }
    } catch (error) {
      // Show user-friendly error message
      const errorMsg = error.message || 'Failed to complete login';
      showError(errorMsg);
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
        const initialData = { apiKey: '', email: '', password: '', locationId: '' };
        setFormData(initialData);
        formDataRef.current = initialData;
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
    // Check both the connection object from store AND the local form data
    // This ensures the button enables even if the store hasn't updated yet
    const hasStoreCredentials = !!connection?.hasCredentials;
    const hasLocalCredentials = !!(formData.apiKey?.trim() && formData.email?.trim() && formData.password?.trim() && formData.locationId?.trim());
    console.log('[GHL Modal] hasApiKeySaved check:', { hasStoreCredentials, hasLocalCredentials, connectionHasCredentials: connection?.hasCredentials });
    return hasStoreCredentials || hasLocalCredentials;
  };

  const isFullyConnected = connection?.isConnected && connection?.isLoggedIn;
  const isConnected = connection?.isConnected || false;
  const needsReLogin = isConnected && !connection?.isLoggedIn;

  const handleModalClose = async () => {
    // Cancel login script if it's running
    if (isLoading || isSubmitting2FA) {
      try {
        await window.automationAPI.cancelLoginScript();
      } catch (error) {
        console.error('Failed to cancel login script:', error);
      }
    }
    onClose(hasChanges);
  };

  const fields = [
    {
      name: 'apiKey',
      label: 'API Key',
      type: 'text',
      placeholder: 'Enter your GHL API key',
      required: true,
    },
    {
      name: 'email',
      label: 'Email Address',
      type: 'email',
      placeholder: 'your@example.com',
      required: true,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter your GHL password',
      required: true,
    },
    {
      name: 'locationId',
      label: 'Location ID',
      type: 'text',
      placeholder: 'Enter your GHL Location ID',
      required: true,
    },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="Connect GHL (GoHighLevel)"
        size="md"
        closeOnOutsideClick={false}
        closeOnEscape={false}
        showCloseButton={!isLoading && !isSubmitting2FA}
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
              src={ghlLogo}
              alt="GHL logo"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">GHL (GoHighLevel)</h3>
              <p className="text-sm text-text-secondary">
                {isFullyConnected
                  ? 'Platform is connected'
                  : needsReLogin
                  ? 'Session expired — please re-login'
                  : 'Complete the setup to connect this platform'}
              </p>
            </div>
          </div>

          {/* Connection Status */}
          {isFullyConnected && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-success font-medium">
                ✓ GHL (GoHighLevel) is connected and ready to use
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-4">
            {fields.map((field) => {
              // Check if field is configured: check connection credentials (apiKey, email, locationId are returned from backend)
              const fieldValue = connection?.credentials?.[field.name];
              // For password, the actual value is never returned from backend (security).
              // We detect it's saved via: hasPassword flag (backend) OR email existing
              // in credentials (email & password are always saved together by the debounce logic).
              const isConfigured = field.name === 'password'
                ? (!!connection?.credentials?.hasPassword || !!connection?.credentials?.email) && !savingField
                : !!fieldValue && !savingField;
              const isPassword = field.type === 'password';
              const showPassword = showPasswords[field.name] || false;

              // When fully connected, only allow API key and locationId changes, disable email and password
              const isFieldDisabled = isFullyConnected
                ? (field.name === 'email' || field.name === 'password')
                : false;
              const shouldDisableField = isFieldDisabled || isSaving || isLoading;

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
                      type={isPassword && showPassword ? 'text' : (field.type || 'text')}
                      id={field.name}
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={shouldDisableField}
                      className={`w-full rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isPassword ? 'px-4 pr-12 py-2' : 'px-4 py-2'
                      } ${
                        savingField === field.name && !isPassword ? 'pr-10' : ''
                      }`}
                    />
                    {isPassword && (
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [field.name]: !showPassword }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none z-10"
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
                    {savingField === field.name && (
                      <div className={`absolute top-1/2 transform -translate-y-1/2 ${isPassword ? 'right-12 z-0' : 'right-3'}`}>
                        <InputSpinner />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Session Expired Warning */}
          {needsReLogin && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400 font-medium">
                Session expired. Please re-login to continue using GHL (GoHighLevel).
              </p>
            </div>
          )}

          {/* Login/Re-Login/Disconnect Button */}
          <div className="pt-4 border-t border-border-muted">
            {needsReLogin ? (
              <>
                <ButtonPlain
                  variant="primary"
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={handleLogin}
                  isLoading={isLoading}
                  disabled={isSaving}
                >
                  Re-Login
                </ButtonPlain>
                <p className="mt-2 text-xs text-text-secondary text-center">
                  Your session has expired. Click to re-authenticate.
                </p>
              </>
            ) : isConnected ? (
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
                  One time login is required for performing GHL tasks
                </p>
              </>
            )}
          </div>

          {/* Status Messages */}
          {connection && connection.id && !connection.hasCredentials && !formData.apiKey?.trim() && !isLoading && !isConnected && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
              <p className="text-sm text-error">
                Please enter your API Key to continue
              </p>
            </div>
          )}

          {!isConnected && !connection?.isLoggedIn && hasApiKeySaved() && (
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
              onClick={handleModalClose}
              disabled={isLoading || isSaving || isSubmitting2FA}
            >
              {isFullyConnected ? 'Close' : 'Cancel'}
            </ButtonPlain>
          </div>
        </div>
      )}

      </Modal>

      {/* 2FA Modal */}
      <TwoFactorAuthModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onSubmit={handle2FASubmit}
        isLoading={isSubmitting2FA}
        message={twoFAMessage}
      />
    </>
  );
};

export default GhlConnectionModal;
