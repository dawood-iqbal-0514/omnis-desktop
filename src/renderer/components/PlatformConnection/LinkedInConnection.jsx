import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { ButtonPlain } from '../Button';
import { LoaderMedium } from '../Loader';
import usePlatformStore from '../../store/platformStore';
import useToast from '../../hooks/useToast';
import { crmAPI } from '../../services/api';
import linkedinLogo from '@assets/logos/linkedin.png';

/**
 * LinkedIn connection modal.
 *
 * LinkedIn is browserless — login goes straight to the Express backend
 * (POST /api/crm/execute  →  linkedin.service.connect → /uas/authenticate).
 * No Python, no Chrome instance, no IPC bridge. Cookies are saved encrypted
 * inside platform_connections.credentials in PostgreSQL alongside email/password.
 */
const LinkedInConnection = ({ isOpen, onClose, onSuccess }) => {
  const platformId = 'linkedin';
  const { showSuccess, showError } = useToast();

  const { fetchUserPlatforms, disconnectPlatform } = usePlatformStore((state) => ({
    fetchUserPlatforms: state.fetchUserPlatforms,
    disconnectPlatform: state.disconnectPlatform,
  }));

  const connection = usePlatformStore((state) =>
    state.connections.find((c) => c.platform === platformId)
  );

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]       = useState('');
  const [challenge, setChallenge] = useState(null);  // { url, message }
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConnection, setIsLoadingConnection] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Pull latest connection state when the modal opens.
  useEffect(() => {
    if (isOpen) {
      setIsLoadingConnection(true);
      fetchUserPlatforms(platformId).finally(() => setIsLoadingConnection(false));
    }
  }, [isOpen]);

  // Pre-fill email from saved credentials when available, but never the password.
  useEffect(() => {
    if (!isOpen) {
      setEmail(''); setPassword(''); setError(''); setChallenge(null); setHasChanges(false);
      return;
    }
    setEmail(connection?.credentials?.email || '');
  }, [isOpen, connection?.credentials?.email]);

  const isFullyConnected = !!(connection?.isConnected && connection?.isLoggedIn);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    setError(''); setChallenge(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await crmAPI.executeAction(platformId, 'connect', {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const data = response?.data;

      if (data?.requiresChallenge) {
        // Auto-resolve via the embedded BrowserWindow rather than asking the
        // user to open the URL in their normal browser. Smoother UX — they
        // verify once inline and the modal closes when cookies arrive.
        if (typeof window.automationAPI?.resolveLinkedinChallenge === 'function') {
          let currentCookies = {};
          try { currentCookies = await crmAPI.getLinkedinCookies(); } catch {}
          const result = await window.automationAPI.resolveLinkedinChallenge({
            challengeUrl: data.challengeUrl,
            currentCookies,
          });
          if (result?.success && result?.cookies) {
            try { await crmAPI.updateLinkedinCookies(result.cookies); } catch {}
            await fetchUserPlatforms(platformId);
            setHasChanges(true);
            showSuccess('LinkedIn verified — you\'re connected.');
            setPassword('');
            setIsLoading(false);
            onClose?.(true);
            return;
          }
          // User closed the verification window without finishing — fall back
          // to the inline-link UX so they have a way to retry.
        }
        setChallenge({
          url:     data.challengeUrl,
          message: data.message || 'LinkedIn requires verification. Open the link below in your browser, complete the check, then click Connect again.',
        });
        setIsLoading(false);
        return;
      }

      if (data?.success === false) {
        setError(data.message || 'Login failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Success path — refresh the global connection state and close.
      await fetchUserPlatforms(platformId);
      setHasChanges(true);

      const profile = data?.profile;
      const niceName = profile && (profile.firstName || profile.lastName)
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        : 'LinkedIn';
      showSuccess(`Connected to LinkedIn as ${niceName}.`);

      if (onSuccess) {
        onSuccess({
          platform: platformId,
          email: trimmedEmail,
          profile,
          connectedAt: new Date().toISOString(),
        });
      }
      setPassword('');
      setIsLoading(false);
      onClose?.(true);
    } catch (err) {
      const msg = err?.message || 'Failed to connect to LinkedIn.';
      setError(msg);
      setIsLoading(false);
    }
  };

  // ── Disconnect handler ────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      // 1) Backend: clear cookies via the linkedin service.
      try { await crmAPI.executeAction(platformId, 'disconnect', {}); } catch { /* ignore */ }
      // 2) Platform store: wipe credentials & flip flags (mirrors HubSpot pattern).
      const response = await disconnectPlatform(platformId);
      if (response.success) {
        setHasChanges(true);
        setEmail(''); setPassword(''); setChallenge(null); setError('');
        showSuccess('LinkedIn disconnected.');
      } else {
        showError(response.error || 'Failed to disconnect LinkedIn.');
      }
    } catch (err) {
      showError(err?.message || 'Failed to disconnect LinkedIn.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    if (isLoading) return;
    onClose?.(hasChanges);
  };

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Connect LinkedIn"
      size="md"
      closeOnOutsideClick={!isLoading}
      closeOnEscape={!isLoading}
      showCloseButton={!isLoading}
    >
      {isLoadingConnection ? (
        <div className="py-12">
          <LoaderMedium />
        </div>
      ) : (
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border-muted">
            <img src={linkedinLogo} alt="LinkedIn logo" className="w-10 h-10 object-contain" />
            <div>
              <h3 className="text-lg font-semibold text-text-primary">LinkedIn</h3>
              <p className="text-sm text-text-secondary">
                {isFullyConnected
                  ? 'Platform is connected'
                  : 'Sign in once to enable LinkedIn automation'}
              </p>
            </div>
          </div>

          {/* Connected state */}
          {isFullyConnected ? (
            <>
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg space-y-1">
                <p className="text-sm text-success font-medium">
                  ✓ LinkedIn is connected and ready to use
                </p>
                {connection?.credentials?.email && (
                  <p className="text-xs text-text-secondary">
                    Signed in as <span className="text-text-primary">{connection.credentials.email}</span>
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border-muted">
                <ButtonPlain
                  variant="outline"
                  className="w-full border-error text-error hover:bg-error/10"
                  onClick={handleDisconnect}
                  isLoading={isLoading}
                >
                  Disconnect
                </ButtonPlain>
                <p className="mt-2 text-xs text-text-secondary text-center">
                  Disconnect to clear saved credentials and the LinkedIn session.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Login form */}
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label
                    htmlFor="linkedin-email"
                    className="block text-text-secondary text-sm font-medium mb-2"
                  >
                    Email Address <span className="text-error">*</span>
                  </label>
                  <input
                    id="linkedin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="your@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>

                <div>
                  <label
                    htmlFor="linkedin-password"
                    className="block text-text-secondary text-sm font-medium mb-2"
                  >
                    Password <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="linkedin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your LinkedIn password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full px-4 pr-12 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Challenge message */}
                {challenge && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                    <p className="text-sm text-amber-400 font-medium">
                      Verification required
                    </p>
                    <p className="text-xs text-text-secondary">{challenge.message}</p>
                    {challenge.url && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.systemAPI?.openExternal) {
                            window.systemAPI.openExternal(challenge.url);
                          } else {
                            navigator.clipboard?.writeText(challenge.url);
                          }
                        }}
                        title={challenge.url}
                        className="inline-block text-xs text-primary-accent underline break-all bg-transparent border-0 p-0 cursor-pointer text-left"
                      >
                        {challenge.url}
                      </button>
                    )}
                    <p className="text-xs text-text-secondary">
                      After completing the verification in your browser, click Connect again below.
                    </p>
                  </div>
                )}

                {/* Error message */}
                {error && !challenge && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <ButtonPlain
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={handleModalClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </ButtonPlain>
                  <ButtonPlain
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    isLoading={isLoading}
                  >
                    Connect
                  </ButtonPlain>
                </div>

                <p className="pt-2 text-xs text-text-secondary text-center">
                  Login is browserless — your credentials are saved encrypted, no Chrome window opens.
                </p>
              </form>
            </>
          )}
        </div>
      )}
    </Modal>
  );
};

export default LinkedInConnection;
