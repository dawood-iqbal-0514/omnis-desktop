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

export const platformsConfig = {
  hubspot: {
    name: 'HubSpot',
    logo: hubspotLogo,
    setupType: 'hybrid',
    steps: [
      { type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' },
      { type: 'automation', required: true, trigger: 'login', label: 'Login' },
    ],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your HubSpot API key',
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
        placeholder: 'Enter your HubSpot password',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      login: { label: 'Login', action: 'triggerAutomation' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  linkedin: {
    name: 'LinkedIn',
    logo: linkedinLogo,
    setupType: 'oauth',
    steps: [{ type: 'oauth', required: true }],
    fields: [],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  ghl: {
    name: 'GHL (GoHighLevel)',
    logo: ghlLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your GHL API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  apollo: {
    name: 'Apollo',
    logo: apolloLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your Apollo API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  clay: {
    name: 'Clay',
    logo: clayLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your Clay API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  upwork: {
    name: 'Upwork',
    logo: upworkLogo,
    setupType: 'automation',
    steps: [{ type: 'automation', required: true, trigger: 'login', label: 'Login' }],
    fields: [],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      login: { label: 'Login', action: 'triggerAutomation' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  activecampaign: {
    name: 'ActiveCampaign',
    logo: activecampaignLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your ActiveCampaign API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  n8n: {
    name: 'n8n',
    logo: n8nLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your n8n API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  make: {
    name: 'Make.com',
    logo: makeLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your Make.com API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  notion: {
    name: 'Notion',
    logo: notionLogo,
    setupType: 'oauth',
    steps: [{ type: 'oauth', required: true }],
    fields: [],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  smartlead: {
    name: 'Smartlead',
    logo: smartleadLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your Smartlead API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  slack: {
    name: 'Slack',
    logo: slackLogo,
    setupType: 'oauth',
    steps: [{ type: 'oauth', required: true }],
    fields: [],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
  instantly: {
    name: 'Instantly',
    logo: instantlyLogo,
    setupType: 'apiKey',
    steps: [{ type: 'apiKey', required: true, field: 'apiKey', label: 'API Key' }],
    fields: [
      {
        name: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Enter your Instantly API key',
        required: true,
      },
    ],
    buttons: {
      connect: { label: 'Connect', action: 'openConnection' },
      connected: { label: 'Connected', action: 'viewDetails' },
    },
  },
};

export const getPlatformConfig = (platformName) => {
  const key = platformName?.toLowerCase().replace(/\s+/g, '');
  return platformsConfig[key] || null;
};

export const getAllPlatforms = () => {
  return Object.entries(platformsConfig).map(([key, config]) => ({
    id: key,
    ...config,
  }));
};

export const platformStatusList = [
  { platform: 'hubspot', status: true },
  { platform: 'linkedin', status: false },
  { platform: 'ghl', status: false },
  { platform: 'apollo', status: false },
  { platform: 'clay', status: false },
  { platform: 'upwork', status: false },
  { platform: 'activecampaign', status: false },
  { platform: 'n8n', status: false },
  { platform: 'make', status: false },
  { platform: 'notion', status: false },
  { platform: 'smartlead', status: false },
  { platform: 'slack', status: false },
  { platform: 'instantly', status: false },
];

// Helper function to check if a platform is enabled
export const isPlatformEnabled = (platformId) => {
  const status = platformStatusList.find((p) => p.platform === platformId?.toLowerCase());
  return status?.status || false;
};

