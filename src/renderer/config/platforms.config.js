import hubspotLogo       from '@assets/logos/hubspot.png';
import linkedinLogo      from '@assets/logos/linkedin.png';
import ghlLogo           from '@assets/logos/ghl.svg';
import apolloLogo        from '@assets/logos/apollo.png';
import clayLogo          from '@assets/logos/clay.png';
import upworkLogo        from '@assets/logos/upwork.png';
import activecampaignLogo from '@assets/logos/AC.png';
import n8nLogo           from '@assets/logos/n8n.png';
import makeLogo          from '@assets/logos/make.png';
import notionLogo        from '@assets/logos/notion.png';
import smartleadLogo     from '@assets/logos/smartlead.png';
import slackLogo         from '@assets/logos/slack.png';
import instantlyLogo     from '@assets/logos/instantly.png';

// ─── Local logo map (logos stay in frontend — can't come from backend) ────────
const LOGOS = {
  hubspot:        hubspotLogo,
  linkedin:       linkedinLogo,
  ghl:            ghlLogo,
  apollo:         apolloLogo,
  clay:           clayLogo,
  upwork:         upworkLogo,
  activecampaign: activecampaignLogo,
  n8n:            n8nLogo,
  make:           makeLogo,
  notion:         notionLogo,
  smartlead:      smartleadLogo,
  slack:          slackLogo,
  instantly:      instantlyLogo,
};

// ─── Cached config from backend ───────────────────────────────────────────────
let _cachedConfig = null;

/**
 * Fetches platform config from backend and merges with local logos.
 * Called once on app load — result is cached for the session.
 * Adding a new platform = update backend only. No app rebuild needed.
 */
export const fetchPlatformConfig = async () => {
  if (_cachedConfig) return _cachedConfig;

  try {
    const { platformAPI } = await import('../services/api/platformConnections');
    const response = await platformAPI.getPlatformConfig();

    if (response?.success && response?.data) {
      // Merge backend config with local logos
      _cachedConfig = Object.entries(response.data).reduce((acc, [id, config]) => {
        acc[id] = { ...config, logo: LOGOS[id] || null };
        return acc;
      }, {});
      return _cachedConfig;
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch platform config from backend, using fallback:', error.message);
  }

  // ─── Fallback: local config if backend is unreachable ─────────────────────
  _cachedConfig = getFallbackConfig();
  return _cachedConfig;
};

/**
 * Sync getter — returns cached config or fallback.
 * Use fetchPlatformConfig() on app load, then this anywhere in the app.
 */
export const getPlatformConfig = (platformId) => {
  const config = _cachedConfig || getFallbackConfig();
  const key = platformId?.toLowerCase().replace(/\s+/g, '');
  return config[key] ? { ...config[key], id: key } : null;
};

export const getAllPlatforms = () => {
  const config = _cachedConfig || getFallbackConfig();
  return Object.entries(config).map(([id, data]) => ({ id, ...data }));
};

export const isPlatformEnabled = (platformId) => {
  const config = _cachedConfig || getFallbackConfig();
  return config[platformId?.toLowerCase()]?.enabled || false;
};

// ─── Fallback config (used if backend unreachable) ────────────────────────────
const getFallbackConfig = () => ({
  linkedin: {
    name: 'LinkedIn', logo: linkedinLogo, setupType: 'credentials', enabled: true,
    fields: [
      { name: 'email',    label: 'Email Address', type: 'email',    placeholder: 'your@example.com',           required: true },
      { name: 'password', label: 'Password',      type: 'password', placeholder: 'Enter your LinkedIn password', required: true },
    ],
  },
  hubspot: {
    name: 'HubSpot', logo: hubspotLogo, setupType: 'hybrid', enabled: true,
    fields: [
      { name: 'apiKey',   label: 'API Key',       type: 'text',     placeholder: 'Enter your HubSpot API key',  required: true },
      { name: 'email',    label: 'Email Address', type: 'email',    placeholder: 'your@example.com',            required: true },
      { name: 'password', label: 'Password',      type: 'password', placeholder: 'Enter your HubSpot password', required: true },
    ],
  },
  smartlead: {
    name: 'Smartlead', logo: smartleadLogo, setupType: 'apiKey', enabled: true,
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter your Smartlead API key', required: true },
    ],
  },
  ghl: {
    name: 'GHL (GoHighLevel)', logo: ghlLogo, setupType: 'hybrid', enabled: true,
    fields: [
      { name: 'apiKey',     label: 'API Key',       type: 'text',     placeholder: 'Enter your GHL API key',      required: true },
      { name: 'email',      label: 'Email Address',  type: 'email',    placeholder: 'your@example.com',            required: true },
      { name: 'password',   label: 'Password',       type: 'password', placeholder: 'Enter your GHL password',     required: true },
      { name: 'locationId', label: 'Location ID',    type: 'text',     placeholder: 'Enter your GHL Location ID', required: true },
    ],
  },
  activecampaign: {
    name: 'ActiveCampaign', logo: activecampaignLogo, setupType: 'apiKey', enabled: true,
    fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter your ActiveCampaign API key', required: true }],
  },
  slack: {
    name: 'Slack', logo: slackLogo, setupType: 'apiKey', enabled: true,
    fields: [
      { name: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-your-bot-token', required: true },
    ],
  },
  notion: {
    name: 'Notion', logo: notionLogo, setupType: 'apiKey', enabled: true,
    fields: [
      { name: 'integrationToken', label: 'Integration Token', type: 'password', placeholder: 'secret_your-integration-token', required: true },
    ],
  },
  apollo: {
    name: 'Apollo', logo: apolloLogo, setupType: 'apiKey', enabled: false,
    fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter your Apollo API key', required: true }],
  },
  clay: {
    name: 'Clay', logo: clayLogo, setupType: 'apiKey', enabled: false,
    fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter your Clay API key', required: true }],
  },
  upwork: {
    name: 'Upwork', logo: upworkLogo, setupType: 'automation', enabled: false,
    fields: [],
  },
  n8n: {
    name: 'n8n', logo: n8nLogo, setupType: 'apiKey', enabled: false,
    fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter your n8n API key', required: true }],
  },
  make: {
    name: 'Make.com', logo: makeLogo, setupType: 'apiKey', enabled: false,
    fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter your Make.com API key', required: true }],
  },
  instantly: {
    name: 'Instantly', logo: instantlyLogo, setupType: 'apiKey', enabled: false,
    fields: [{ name: 'apiKey', label: 'API Key', type: 'text', placeholder: 'Enter your Instantly API key', required: true }],
  },
});
