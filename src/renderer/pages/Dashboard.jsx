import React, { useState } from 'react';
import { Tooltip } from '../components/Tooltip';
import usePlatformStore from '../store/platformStore';
import useAuthStore from '../store/authStore';
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

const Dashboard = ({ setActivePage }) => {
  const setSelectedPlatform = usePlatformStore((state) => state.setSelectedPlatform);
  const [connectedPlatforms] = useState([]);
  const user = useAuthStore((state) => state.user);
  
  // Get first name from user's name
  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  const platforms = [
    {
      name: 'HubSpot',
      logo: hubspotLogo,
      comingSoon: false,
    },
    {
      name: 'LinkedIn',
      logo: linkedinLogo,
      comingSoon: true,
    },
    {
      name: 'GHL (GoHighLevel)',
      logo: ghlLogo,
      comingSoon: true,
    },
    {
      name: 'Apollo',
      logo: apolloLogo,
      comingSoon: true,
    },
    {
      name: 'Clay',
      logo: clayLogo,
      comingSoon: true,
    },
    {
      name: 'Upwork',
      logo: upworkLogo,
      comingSoon: true,
    },
    {
      name: 'ActiveCampaign',
      logo: activecampaignLogo,
      comingSoon: true,
    },
    {
      name: 'n8n',
      logo: n8nLogo,
      comingSoon: true,
    },
    {
      name: 'Make.com',
      logo: makeLogo,
      comingSoon: true,
    },
    {
      name: 'Notion',
      logo: notionLogo,
      comingSoon: true,
    },
    {
      name: 'Smartlead',
      logo: smartleadLogo,
      comingSoon: true,
    },
    {
      name: 'Slack',
      logo: slackLogo,
      comingSoon: true,
    },
    {
      name: 'Instantly',
      logo: instantlyLogo,
      comingSoon: true,
    },
  ];

  const handlePlatformClick = (platform) => {
    if (!platform.comingSoon) {
      setSelectedPlatform(platform);
      setActivePage('chat');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Welcome {firstName}! 👋 Your automation hub</p>
      </div>

      <div className="mb-8">
        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h3 className="text-text-secondary text-sm mb-2">Connected Platforms</h3>
          <p className="text-3xl font-bold text-primary-accent">{connectedPlatforms.length}</p>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Platforms</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            onClick={() => handlePlatformClick(platform)}
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
                <button
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    platform.comingSoon
                      ? 'bg-gray-500 text-white cursor-not-allowed'
                      : 'bg-primary-accent text-white hover:bg-primary-accent/90'
                  }`}
                  disabled={platform.comingSoon}
                >
                  {platform.comingSoon ? 'Coming Soon' : 'Select Platform'}
                </button>
              </div>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

