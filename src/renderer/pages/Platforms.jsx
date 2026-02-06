import React, { useState } from 'react';
import { ButtonPlain } from '../components/Button';
import { Tooltip } from '../components/Tooltip';
import { LinkedInConnection, HubspotConnectionModal } from '../components/PlatformConnection';
import usePlatformStore from '../store/platformStore';
import { getAllPlatforms, isPlatformEnabled } from '../config/platforms.config';

const Platforms = () => {
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    isPlatformConnected,
  } = usePlatformStore();

  // Get all platforms and mark them as comingSoon if not enabled in config
  const platforms = getAllPlatforms().map((platform) => ({
    ...platform,
    comingSoon: !isPlatformEnabled(platform.id),
  }));

  const handleLinkedInSuccess = (data) => {
    // LinkedIn handled separately for now
  };

  const handlePlatformClick = (platform) => {
    if (platform.comingSoon) return;
    
    // LinkedIn uses separate modal for now
    if (platform.id === 'linkedin') {
      setLinkedinModalOpen(true);
    } else {
      setSelectedPlatform(platform);
      setConnectionModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setConnectionModalOpen(false);
    setSelectedPlatform(null);
  };

  const filteredPlatforms = platforms.filter((platform) =>
    platform.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Platforms</h1>
      </div>

      {}
      <div className="mb-4">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="w-5 h-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search platforms..."
            className="w-full pl-10 pr-4 py-3 bg-[var(--color-base-background-light)] border border-border-muted rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlatforms.length > 0 ? (
          filteredPlatforms.map((platform) => (
          <div
            key={platform.name}
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
              <div className="w-full">
                <ButtonPlain 
                  variant="primary"
                  className="w-full"
                  disabled={platform.comingSoon}
                  onClick={() => handlePlatformClick(platform)}
                >
                  {isPlatformConnected(platform.id) ? 'Connected' : 'Connect'}
                </ButtonPlain>
              </div>
            </Tooltip>
          </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-text-secondary text-lg">No platforms found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      {}
      <LinkedInConnection
        isOpen={linkedinModalOpen}
        onClose={() => setLinkedinModalOpen(false)}
        onSuccess={handleLinkedInSuccess}
      />
      
      {selectedPlatform && selectedPlatform.id === 'hubspot' && (
        <HubspotConnectionModal
          isOpen={connectionModalOpen}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default Platforms;
