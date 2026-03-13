import React, { useState, useEffect } from 'react';
import { ButtonPlain } from '../Button';
import Modal from './Modal';
import { Dropdown } from '../Dropdown';
import { LoaderMedium } from '../Loader';
import { getPlatformConfig } from '../../config/platforms.config';
import usePlatformStore from '../../store/platformStore';

const PlatformSelectionModal = ({ isOpen, onClose, onSelect, onNavigateToDashboard }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [loading, setLoading] = useState(false);
  const { fetchUserPlatforms, connections } = usePlatformStore();

  // Fetch connected platforms when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchUserPlatforms().finally(() => {
        setLoading(false);
      });
    }
  }, [isOpen, fetchUserPlatforms]);

  // Get only platforms with isConnected: true from API
  const platforms = connections
    .filter((connection) => connection.isConnected === true)
    .map((connection) => {
      const config = getPlatformConfig(connection.platform);
      if (!config) return null;
      return {
        name: config.name,
        logo: config.logo,
        value: connection.platform,
        comingSoon: !config.enabled,
      };
    })
    .filter(Boolean); // Remove any null entries

  const dropdownOptions = platforms.map(platform => ({
    value: platform.value,
    label: platform.name,
    isDisabled: platform.comingSoon,
  }));

  const handleSelect = () => {
    if (selectedPlatform && !selectedPlatform.isDisabled) {
      const platform = platforms.find(p => p.value === selectedPlatform.value);
      onSelect(platform);
      setSelectedPlatform(null);
      onClose();
    }
  };

  const handleClose = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Platform"
      size="md"
      showCloseButton={true}
      closeOnOutsideClick={true}
      closeOnEscape={true}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Choose a platform to automate
          </label>
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoaderMedium />
            </div>
          ) : platforms.length === 0 ? (
            <div className="py-4 text-center text-text-muted text-sm">No connected platforms available. Please connect a platform from the Dashboard first.</div>
          ) : (
            <Dropdown
              options={dropdownOptions}
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              placeholder="Select a platform..."
              isSearchable={true}
            />
          )}
        </div>

        {selectedPlatform && (
          <div className="flex items-center gap-3 p-3 bg-[var(--color-base-background)] rounded-lg border border-border-muted">
            {platforms.find(p => p.value === selectedPlatform.value) && (
              <>
                <img
                  src={platforms.find(p => p.value === selectedPlatform.value).logo}
                  alt={selectedPlatform.label}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <p className="text-text-primary font-medium">{selectedPlatform.label}</p>
                  {selectedPlatform.isDisabled && (
                    <p className="text-text-muted text-xs">Coming Soon</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <ButtonPlain
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </ButtonPlain>
          <ButtonPlain
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleSelect}
            disabled={!selectedPlatform || selectedPlatform.isDisabled || loading || platforms.length === 0}
          >
            Continue
          </ButtonPlain>
        </div>
      </div>
    </Modal>
  );
};

export default PlatformSelectionModal;

