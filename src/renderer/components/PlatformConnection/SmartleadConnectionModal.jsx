import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../Modal';
import { ButtonPlain } from '../Button';
import { InputSpinner, LoaderMedium } from '../Loader';
import usePlatformStore from '../../store/platformStore';
import useToast from '../../hooks/useToast';
import smartleadLogo from '@assets/logos/smartlead.png';

const SmartleadConnectionModal = ({ isOpen, onClose }) => {
  const { showSuccess, showError } = useToast();
  const { saveConnection, updateConnectionStatus, disconnectPlatform, fetchUserPlatforms } = usePlatformStore((s) => ({
    saveConnection: s.saveConnection, updateConnectionStatus: s.updateConnectionStatus,
    disconnectPlatform: s.disconnectPlatform, fetchUserPlatforms: s.fetchUserPlatforms,
  }));
  const connection = usePlatformStore((s) => s.connections.find((c) => c.platform === 'smartlead'));
  const platformId = 'smartlead';

  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [formData, setFormData] = useState({});
  const formDataRef = useRef({});
  const debounceTimerRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    if (isOpen) { setIsLoadingConnection(true); fetchUserPlatforms(platformId).finally(() => setIsLoadingConnection(false)); }
    else setIsLoadingConnection(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) { setHasChanges(false); return; }
    const init = { apiKey: '' };
    setFormData(init); formDataRef.current = init; setHasChanges(false);
  }, [isOpen, connection]);

  const debouncedSave = useCallback(async (platform, credentials, fieldName) => {
    setIsSaving(true); setSavingField(fieldName);
    try {
      const response = await saveConnection(platform, credentials);
      if (response.success) {
        showSuccess('API Key saved successfully'); setHasChanges(true);
        const conns = usePlatformStore.getState().connections;
        const idx = conns.findIndex((c) => c.platform === platform);
        if (idx >= 0) { const n = [...conns]; n[idx] = { ...n[idx], ...response.data }; usePlatformStore.setState({ connections: n }); }
      } else showError(response.error || 'Failed to save');
    } catch (e) { showError(e.message || 'Failed to save'); }
    finally { setIsSaving(false); setSavingField(null); }
  }, [saveConnection, showSuccess, showError]);

  const handleInputChange = (fieldName, value) => {
    setFormData((p) => { const u = { ...p, [fieldName]: value }; formDataRef.current = u; return u; });
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const v = formDataRef.current[fieldName]?.trim();
      if (v) debouncedSave(platformId, { [fieldName]: v }, fieldName);
      else { setIsSaving(false); setSavingField(null); }
    }, 1500);
  };

  useEffect(() => () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); }, []);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current); debounceTimerRef.current = null; }
      const localKey = formDataRef.current.apiKey?.trim();
      if (localKey) await saveConnection(platformId, { apiKey: localKey });
      if (!localKey && !connection?.hasCredentials) { showError('API Key is required.'); setIsLoading(false); return; }
      const response = await updateConnectionStatus(platformId, true, true);
      if (response.success) {
        setHasChanges(true); showSuccess('Smartlead connected successfully!');
        const conns = usePlatformStore.getState().connections;
        const idx = conns.findIndex((c) => c.platform === platformId);
        if (idx >= 0) { const n = [...conns]; n[idx] = { ...n[idx], ...response.data }; usePlatformStore.setState({ connections: n }); }
      } else showError(response.error || 'Failed to connect');
    } catch (e) { showError(e.message || 'Failed to connect'); }
    finally { setIsLoading(false); }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const response = await disconnectPlatform(platformId);
      if (response.success) {
        setHasChanges(true); showSuccess('Smartlead disconnected.');
        setFormData({ apiKey: '' }); formDataRef.current = { apiKey: '' };
        const conns = usePlatformStore.getState().connections;
        const idx = conns.findIndex((c) => c.platform === platformId);
        if (idx >= 0) { const n = [...conns]; n[idx] = { ...n[idx], ...response.data }; usePlatformStore.setState({ connections: n }); }
      } else showError(response.error || 'Failed to disconnect');
    } catch (e) { showError(e.message || 'Failed to disconnect'); }
    finally { setIsLoading(false); }
  };

  const isConnected = connection?.isConnected || false;
  const isFullyConnected = connection?.isConnected && connection?.isLoggedIn;
  const hasToken = () => !!(connection?.hasCredentials || formData.apiKey?.trim());
  const showPassword = showPasswords['apiKey'] || false;

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(hasChanges)} title="Connect Smartlead" size="md" closeOnOutsideClick={false} closeOnEscape={false} showCloseButton={!isLoading}>
      {isLoadingConnection ? (
        <div className="py-12"><LoaderMedium /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border-muted">
            <img src={smartleadLogo} alt="Smartlead logo" className="w-10 h-10 object-contain" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">Smartlead</h3>
              <p className="text-sm text-text-secondary">
                {isFullyConnected ? 'Smartlead is connected' : 'Paste your API key to connect'}
              </p>
            </div>
          </div>

          {isFullyConnected && (
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm text-success font-medium">✓ Smartlead is connected and ready to use</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-text-secondary text-sm font-medium" htmlFor="apiKey">
                API Key <span className="text-error ml-1">*</span>
              </label>
              {connection?.hasCredentials && !savingField && (
                <span className="text-xs text-success font-medium">Configured</span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="apiKey"
                value={formData.apiKey || ''}
                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                placeholder="Enter your Smartlead API key"
                disabled={isSaving || isLoading || isFullyConnected}
                className="w-full rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed px-4 pr-12 py-2"
              />
              <button type="button" onClick={() => setShowPasswords((p) => ({ ...p, apiKey: !showPassword }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none" tabIndex={-1}>
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
              {savingField === 'apiKey' && <div className="absolute top-1/2 transform -translate-y-1/2 right-12"><InputSpinner /></div>}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Get your key from{' '}
              <span className="text-primary-accent cursor-pointer hover:underline" onClick={() => window.systemAPI?.openExternal('https://app.smartlead.ai/app/settings/api')}>
                Smartlead Dashboard
              </span>
              {' → Settings → API Keys (requires Pro plan or higher)'}
            </p>
          </div>

          <div className="pt-4 border-t border-border-muted">
            {isConnected ? (
              <>
                <ButtonPlain variant="outline" className="w-full border-error text-error hover:bg-error/10" onClick={handleDisconnect} isLoading={isLoading} disabled={isSaving}>Disconnect</ButtonPlain>
                <p className="mt-2 text-xs text-text-secondary text-center">Disconnect to remove saved key and connection status</p>
              </>
            ) : (
              <>
                <ButtonPlain variant="primary" className="w-full" onClick={handleConnect} isLoading={isLoading} disabled={isSaving || !hasToken()}>Connect</ButtonPlain>
                <p className="mt-2 text-xs text-text-secondary text-center">No login required — just paste your API key and connect</p>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border-muted">
            <ButtonPlain variant="outline" className="flex-1" onClick={() => onClose(hasChanges)} disabled={isLoading || isSaving}>
              {isFullyConnected ? 'Close' : 'Cancel'}
            </ButtonPlain>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default SmartleadConnectionModal;
