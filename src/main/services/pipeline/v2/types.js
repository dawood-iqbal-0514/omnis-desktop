/**
 * Typed Entity Universe — the "nouns" the system knows about.
 *
 * Each entity has a stable id (a URN-ish string format) and may relate to
 * other entities. The plan compiler walks this graph backward to figure out
 * which actions to chain when a user asks for something.
 *
 * Two layers:
 *   - SHARED entities (Person, Email) bridge across platforms — that's what
 *     enables a LinkedIn → HubSpot flow without hand-writing it.
 *   - PLATFORM URN types (LinkedInPersonUrn, HubSpotContactId) are opaque
 *     identifiers that only the action that produces them can fill.
 *
 * When two actions reference the same type name, the compiler treats their
 * outputs as compatible. Type mismatches refuse to chain.
 */

// ── Common cross-platform value types ──────────────────────────────────────
// These are POJOs with well-known shapes. Rich enough that a HubSpot contact
// can be created from a LinkedIn profile without re-fetching anything.
const COMMON_TYPES = {
  Person: {
    description: 'A real person — first name, last name, email, headline, company, location.',
    shape: {
      firstName:        'string?',
      lastName:         'string?',
      fullName:         'string?',
      email:            'Email?',
      headline:         'string?',
      currentCompany:   'string?',
      location:         'string?',
      pictureUrl:       'string?',
      profileUrl:       'string?',
      // Cross-platform IDs filled when known. Useful for linking.
      linkedInUrn:      'LinkedInPersonUrn?',
      hubspotContactId: 'HubSpotContactId?',
    },
  },
  Email:    { description: 'An email address.',     shape: { address: 'string', name: 'string?' } },
  Phone:    { description: 'A phone number.',       shape: { e164: 'string', label: 'string?' } },
  Url:      { description: 'A URL.',                shape: { value: 'string' } },
  TextNote: { description: 'A piece of free text.', shape: { text: 'string' } },
};

// ── LinkedIn entities ──────────────────────────────────────────────────────
const LINKEDIN_TYPES = {
  LinkedInPersonUrn: { format: /^urn:li:fsd_profile:[A-Za-z0-9_\-]+$/, description: 'LinkedIn member URN.' },
  LinkedInPostUrn: {
    description: 'A LinkedIn post — carries threadUrn, activityUrn, socialDetailUrn together.',
    shape: {
      threadUrn:       'string',  // urn:li:ugcPost:... — for likes, comments
      activityUrn:     'string?', // urn:li:activity:... — for reposts, saves
      socialDetailUrn: 'string?', // urn:li:fsd_socialDetail:... — for comments-list
      authorName:      'string?',
      authorUrn:       'LinkedInPersonUrn?',
      text:            'string?',
      reactions:       'number?',
      comments:        'number?',
      reposts:         'number?',
    },
  },
  LinkedInCommentUrn:      { format: /^urn:li:fsd_comment:.+$/, description: 'A comment under a post.' },
  LinkedInInviteUrn:       { format: /^urn:li:fsd_invitation:.+$/, description: 'An outgoing or incoming invite.' },
  LinkedInConversationUrn: { format: /^urn:li:msg_conversation:.+$/, description: 'A messaging thread.' },
  LinkedInReactionType: {
    enum: ['LIKE', 'PRAISE', 'EMPATHY', 'INTEREST', 'APPRECIATION', 'MAYBE', 'ENTERTAINMENT'],
    description: 'Reaction type on a post.',
  },
  // A snapshot of a relationship between viewer and another person.
  LinkedInConnectionStatus: {
    description: 'The current connection state with another LinkedIn user.',
    shape: {
      status:    'string',  // CONNECTED | OUTGOING_PENDING | INCOMING_PENDING | NOT_CONNECTED | SELF | UNKNOWN
      person:    'Person',
      inviteUrn: 'LinkedInInviteUrn?',
    },
  },
};

// ── HubSpot entities (lightly typed for now — refined as flows are added) ─
const HUBSPOT_TYPES = {
  HubSpotContactId: { format: /^\d+$/, description: 'A HubSpot contact id.' },
  HubSpotDealId:    { format: /^\d+$/, description: 'A HubSpot deal id.' },
  HubSpotCompanyId: { format: /^\d+$/, description: 'A HubSpot company id.' },
  HubSpotListId:    { format: /^\d+$/, description: 'A HubSpot list id.' },
};

// ── Slack ─────────────────────────────────────────────────────────────────
const SLACK_TYPES = {
  SlackChannelId:   { format: /^C[A-Z0-9]+$/, description: 'A Slack channel id.' },
  SlackUserId:      { format: /^U[A-Z0-9]+$/, description: 'A Slack user id.' },
  SlackThreadTs:    { description: 'A Slack thread timestamp.', shape: { value: 'string' } },
};

// ── Notion ────────────────────────────────────────────────────────────────
const NOTION_TYPES = {
  NotionPageId:     { format: /^[a-f0-9-]{32,36}$/, description: 'A Notion page id.' },
  NotionDatabaseId: { format: /^[a-f0-9-]{32,36}$/, description: 'A Notion database id.' },
};

// ── GoHighLevel ───────────────────────────────────────────────────────────
const GHL_TYPES = {
  GhlContactId:     { description: 'A GHL contact id.' },
  GhlConversationId:{ description: 'A GHL conversation id.' },
  GhlPipelineId:    { description: 'A GHL pipeline id.' },
};

// ── Smartlead ─────────────────────────────────────────────────────────────
const SMARTLEAD_TYPES = {
  SmartleadCampaignId: { description: 'A Smartlead campaign id.' },
  SmartleadLeadId:     { description: 'A Smartlead lead id.' },
};

// ── Combined registry ─────────────────────────────────────────────────────
const TYPES = {
  ...COMMON_TYPES,
  ...LINKEDIN_TYPES,
  ...HUBSPOT_TYPES,
  ...SLACK_TYPES,
  ...NOTION_TYPES,
  ...GHL_TYPES,
  ...SMARTLEAD_TYPES,
};

/**
 * Test whether a given runtime value looks like a member of the named type.
 * For URN-format types: regex match. For shaped types: required fields exist.
 */
function isOfType(value, typeName) {
  if (value === null || value === undefined) return false;
  const type = TYPES[typeName];
  if (!type) return false;
  if (type.format) return typeof value === 'string' && type.format.test(value);
  if (type.enum)   return type.enum.includes(value);
  if (type.shape) {
    if (typeof value !== 'object') return false;
    for (const [k, t] of Object.entries(type.shape)) {
      const optional = t.endsWith('?');
      if (!optional && (value[k] === undefined || value[k] === null)) return false;
    }
    return true;
  }
  return true;
}

/**
 * Strip the `?` suffix from an optional-field type spec.
 * "string?" → "string"
 */
function unwrapOptional(spec) {
  return spec.endsWith('?') ? spec.slice(0, -1) : spec;
}

module.exports = { TYPES, isOfType, unwrapOptional };
