import React, { useState } from 'react';
import { ButtonPlain } from '../components/Button';
import { Tooltip } from '../components/Tooltip';
import { LinkedInConnection } from '../components/PlatformConnection';
import linkedinLogo from '@assets/logos/linkedin.png';
import hubspotLogo from '@assets/logos/hubspot.png';
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

const Platforms = () => {
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const platforms = [
    { 
      name: 'LinkedIn', 
      logo: linkedinLogo,
      comingSoon: false,
    },
    { 
      name: 'HubSpot', 
      logo: hubspotLogo,
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

  const handleLinkedInSuccess = (data) => {
    setConnectedPlatforms((prev) => [...prev, data]);
  };

  const isPlatformConnected = (platformName) => {
    return connectedPlatforms.some((p) => p.platform === platformName.toLowerCase());
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
                  onClick={() => {
                    if (platform.name === 'LinkedIn' && !platform.comingSoon) {
                      setLinkedinModalOpen(true);
                    }
                  }}
                >
                  {isPlatformConnected(platform.name) ? 'Connected' : 'Connect'}
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
    </div>
  );
};

export default Platforms;
