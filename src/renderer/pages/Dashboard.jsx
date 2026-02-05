import React, { useState, useEffect } from 'react';
import { Tooltip } from '../components/Tooltip';
import { LoaderLarge } from '../components/Loader';
import { PlatformConnectionModal } from '../components/PlatformConnection';
import usePlatformStore from '../store/platformStore';
import useAuthStore from '../store/authStore';
import { getAllPlatforms, isPlatformEnabled } from '../config/platforms.config';

const Dashboard = ({ setActivePage }) => {
  const setSelectedPlatform = usePlatformStore((state) => state.setSelectedPlatform);
  const { fetchUserPlatforms, isPlatformConnected, loading } = usePlatformStore();
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatformState] = useState(null);
  const user = useAuthStore((state) => state.user);
  
  // Fetch user platforms on mount
  useEffect(() => {
    fetchUserPlatforms();
  }, [fetchUserPlatforms]);
  
  // Get first name from user's name
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  // Get all platforms and mark them as comingSoon if not enabled in config
  const platforms = getAllPlatforms().map((platform) => ({
    ...platform,
    comingSoon: !isPlatformEnabled(platform.id),
  }));

  const handleCardClick = (platform) => {
    if (platform.comingSoon) return;
    // Card click always opens modal
    setSelectedPlatformState(platform);
    setConnectionModalOpen(true);
  };

  const handleButtonClick = (platform, e) => {
    e.stopPropagation();
    if (platform.comingSoon) return;
    
    if (isPlatformConnected(platform.id)) {
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
              <h3 className="text-xl font-semibold text-text-primary">{platform.name}</h3>
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
                      : 'bg-primary-accent text-white hover:bg-primary-accent/90'
                  }`}
                  disabled={platform.comingSoon}
                  onClick={(e) => handleButtonClick(platform, e)}
                >
                  {platform.comingSoon
                    ? 'Coming Soon'
                    : isPlatformConnected(platform.id)
                    ? 'Work'
                    : 'Connect'}
                </button>
              </div>
            </Tooltip>
          </div>
        ))}
      </div>

      {selectedPlatform && (
        <PlatformConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
          platformName={selectedPlatform.name}
        />
      )}
    </div>
  );
};

export default Dashboard;

