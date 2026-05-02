import React, { useState, useEffect } from 'react';
import { Tooltip } from '../components/Tooltip';
import { LoaderLarge } from '../components/Loader';
import { HubspotConnectionModal, GhlConnectionModal, SlackConnectionModal, NotionConnectionModal, SmartleadConnectionModal, LinkedInConnection } from '../components/PlatformConnection';
import usePlatformStore from '../store/platformStore';
import useAuthStore from '../store/authStore';
import { getAllPlatforms, isPlatformEnabled } from '../config/platforms.config';
import { crmAPI } from '../services/api/crm';

const Dashboard = ({ setActivePage }) => {
  const setSelectedPlatform = usePlatformStore((state) => state.setSelectedPlatform);
  const { fetchUserPlatforms, isPlatformConnected, getPlatformConnection, loading } = usePlatformStore();
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatformState] = useState(null);
  // Pending LinkedIn verification challenge URL — when set, the LinkedIn
  // card's button becomes "Verify on LinkedIn" (one click → opens the
  // embedded verification window) instead of "Re-Login" (password modal).
  const [linkedinChallengeUrl, setLinkedinChallengeUrl] = useState(null);
  const [resolvingChallenge, setResolvingChallenge] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Fetch user platforms + LinkedIn challenge state on mount
  useEffect(() => {
    fetchUserPlatforms();
    crmAPI.getLinkedinPendingChallenge().then(setLinkedinChallengeUrl).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Get first name from user's name
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Get all platforms and mark them as comingSoon if not enabled in config
  const platforms = getAllPlatforms().map((platform) => ({
    ...platform,
    comingSoon: !isPlatformEnabled(platform.id),
  }));

  const needsReLogin = (platformId) => {
    const conn = getPlatformConnection(platformId);
    return conn?.isConnected && !conn?.isLoggedIn;
  };

  // LinkedIn-specific: a pending challenge URL means "needs verification",
  // which is different from "needs re-login with new password".
  const needsVerification = (platformId) =>
    platformId === 'linkedin' && !!linkedinChallengeUrl;

  /**
   * Open the embedded LinkedIn verification window directly. After the user
   * completes the challenge, LinkedIn issues fresh cookies, we save them to
   * the backend, and refresh dashboard state. No password modal required.
   */
  const resolveLinkedinChallenge = async () => {
    if (!linkedinChallengeUrl || resolvingChallenge) return;
    if (typeof window.automationAPI?.resolveLinkedinChallenge !== 'function') return;
    setResolvingChallenge(true);
    try {
      let currentCookies = {};
      try { currentCookies = await crmAPI.getLinkedinCookies(); } catch {}
      const result = await window.automationAPI.resolveLinkedinChallenge({
        challengeUrl: linkedinChallengeUrl,
        currentCookies,
      });
      if (result?.success && result?.cookies) {
        await crmAPI.updateLinkedinCookies(result.cookies);
        setLinkedinChallengeUrl(null);
        await fetchUserPlatforms();
      }
    } finally {
      setResolvingChallenge(false);
    }
  };

  const handleCardClick = (platform) => {
    if (platform.comingSoon) return;
    // LinkedIn with pending challenge → skip the password modal and go
    // straight to the verification window.
    if (needsVerification(platform.id)) {
      resolveLinkedinChallenge();
      return;
    }
    setSelectedPlatformState(platform);
    setConnectionModalOpen(true);
  };

  const handleButtonClick = (platform, e) => {
    e.stopPropagation();
    if (platform.comingSoon) return;

    if (needsVerification(platform.id)) {
      // Pending LinkedIn challenge → open verification window directly.
      resolveLinkedinChallenge();
      return;
    }
    if (needsReLogin(platform.id)) {
      // Session expired — open connection modal to re-login
      setSelectedPlatformState(platform);
      setConnectionModalOpen(true);
    } else if (isPlatformConnected(platform.id)) {
      // If connected, navigate to chat
      setSelectedPlatform(platform);
      setActivePage('chat');
    } else {
      // If not connected, open connection modal
      setSelectedPlatformState(platform);
      setConnectionModalOpen(true);
    }
  };

  const handleModalClose = (hasChanges = false) => {
    setConnectionModalOpen(false);
    setSelectedPlatformState(null);
    // Only refresh dashboard if changes were made in the modal
    if (hasChanges) {
      fetchUserPlatforms();
    }
  };

  // Show large spinner while loading
  if (loading) {
    return <LoaderLarge />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Welcome {firstName}! 👋 Your automation hub</p>
      </div>

      <div className="mb-8">
        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h3 className="text-text-secondary text-sm mb-2">Connected Platforms</h3>
          <p className="text-3xl font-bold text-primary-accent">
            {platforms.filter((p) => isPlatformConnected(p.id)).length}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Platforms</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            onClick={() => handleCardClick(platform)}
            className={`bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted transition-colors ${
              platform.comingSoon
                ? 'cursor-not-allowed opacity-75'
                : 'hover:border-primary-accent cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <img
                src={platform.logo}
                alt={`${platform.name} logo`}
                className="w-12 h-12 object-contain"
              />
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-text-primary">{platform.name}</h3>
                {needsVerification(platform.id) ? (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Verification Required
                  </span>
                ) : needsReLogin(platform.id) ? (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Re-Login Required
                  </span>
                ) : null}
              </div>
            </div>
            <p className="text-text-secondary text-sm mb-4">
              Connect {platform.name} to start automating your workflows
            </p>
            <Tooltip
              content={platform.comingSoon ? 'Coming Soon..' : null}
              position="top"
              disabled={!platform.comingSoon}
              className="w-full"
            >
              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    platform.comingSoon
                      ? 'bg-gray-500 text-white cursor-not-allowed'
                      : (needsVerification(platform.id) || needsReLogin(platform.id))
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'bg-primary-accent text-white hover:bg-primary-accent/90'
                  }`}
                  disabled={platform.comingSoon || (needsVerification(platform.id) && resolvingChallenge)}
                  onClick={(e) => handleButtonClick(platform, e)}
                >
                  {platform.comingSoon
                    ? 'Coming Soon'
                    : needsVerification(platform.id)
                    ? (resolvingChallenge ? 'Verifying…' : 'Verify on LinkedIn')
                    : needsReLogin(platform.id)
                    ? 'Re-Login'
                    : isPlatformConnected(platform.id)
                    ? 'Work'
                    : 'Connect'}
                </button>
              </div>
            </Tooltip>
          </div>
        ))}
      </div>

      {selectedPlatform && selectedPlatform.id === 'linkedin' && (
        <LinkedInConnection
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}

      {selectedPlatform && selectedPlatform.id === 'hubspot' && (
        <HubspotConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}

      {selectedPlatform && selectedPlatform.id === 'ghl' && (
        <GhlConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}

      {selectedPlatform && selectedPlatform.id === 'slack' && (
        <SlackConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}

      {selectedPlatform && selectedPlatform.id === 'notion' && (
        <NotionConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}

      {selectedPlatform && selectedPlatform.id === 'smartlead' && (
        <SmartleadConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Dashboard;

