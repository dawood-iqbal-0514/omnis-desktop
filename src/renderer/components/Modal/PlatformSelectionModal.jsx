import React, { useState } from 'react';
import { ButtonPlain } from '../Button';
import Modal from './Modal';
import { Dropdown } from '../Dropdown';
import hubspotLogo from '@assets/logos/hubspot.png';
import linkedinLogo from '@assets/logos/linkedin.png';
import ghlLogo from '@assets/logos/ghl.svg';
import apolloLogo from '@assets/logos/apollo.png';
import clayLogo from '@assets/logos/clay.png';
import upworkLogo from '@assets/logos/upwork.png';
import activecampaignLogo from '@assets/logos/AC.png';
import n8nLogo from '@assets/logos/n8n.png';
import makeLogo from '@assets/logos/make.png';
import notionLogo from '@assets/logos/notion.png';
import smartleadLogo from '@assets/logos/smartlead.png';
import slackLogo from '@assets/logos/slack.png';
import instantlyLogo from '@assets/logos/instantly.png';

const PlatformSelectionModal = ({ isOpen, onClose, onSelect }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const platforms = [
    {
      name: 'HubSpot',
      logo: hubspotLogo,
      comingSoon: false,
      value: 'hubspot',
    },
    {
      name: 'LinkedIn',
      logo: linkedinLogo,
      comingSoon: true,
      value: 'linkedin',
    },
    {
      name: 'GHL (GoHighLevel)',
      logo: ghlLogo,
      comingSoon: true,
      value: 'ghl',
    },
    {
      name: 'Apollo',
      logo: apolloLogo,
      comingSoon: true,
      value: 'apollo',
    },
    {
      name: 'Clay',
      logo: clayLogo,
      comingSoon: true,
      value: 'clay',
    },
    {
      name: 'Upwork',
      logo: upworkLogo,
      comingSoon: true,
      value: 'upwork',
    },
    {
      name: 'ActiveCampaign',
      logo: activecampaignLogo,
      comingSoon: true,
      value: 'activecampaign',
    },
    {
      name: 'n8n',
      logo: n8nLogo,
      comingSoon: true,
      value: 'n8n',
    },
    {
      name: 'Make.com',
      logo: makeLogo,
      comingSoon: true,
      value: 'make',
    },
    {
      name: 'Notion',
      logo: notionLogo,
      comingSoon: true,
      value: 'notion',
    },
    {
      name: 'Smartlead',
      logo: smartleadLogo,
      comingSoon: true,
      value: 'smartlead',
    },
    {
      name: 'Slack',
      logo: slackLogo,
      comingSoon: true,
      value: 'slack',
    },
    {
      name: 'Instantly',
      logo: instantlyLogo,
      comingSoon: true,
      value: 'instantly',
    },
  ];

  // Separate enabled and disabled platforms
  const enabledPlatforms = platforms.filter(p => !p.comingSoon);
  const disabledPlatforms = platforms.filter(p => p.comingSoon);
  
  // Combine with enabled first
  const sortedPlatforms = [...enabledPlatforms, ...disabledPlatforms];

  const dropdownOptions = sortedPlatforms.map(platform => ({
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Platform"
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-text-secondary text-sm font-medium mb-2">
            Choose a platform to automate
          </label>
          <Dropdown
            options={dropdownOptions}
            value={selectedPlatform}
            onChange={setSelectedPlatform}
            placeholder="Select a platform..."
            isSearchable={true}
          />
        </div>

        {selectedPlatform && (
          <div className="flex items-center gap-3 p-3 bg-[var(--color-base-background)] rounded-lg border border-border-muted">
            {sortedPlatforms.find(p => p.value === selectedPlatform.value) && (
              <>
                <img
                  src={sortedPlatforms.find(p => p.value === selectedPlatform.value).logo}
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
            onClick={onClose}
          >
            Cancel
          </ButtonPlain>
          <ButtonPlain
            type="button"
            variant="primary"
            className="flex-1"
            onClick={handleSelect}
            disabled={!selectedPlatform || selectedPlatform.isDisabled}
          >
            Continue
          </ButtonPlain>
        </div>
      </div>
    </Modal>
  );
};

export default PlatformSelectionModal;

