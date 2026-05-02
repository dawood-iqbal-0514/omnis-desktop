/**
 * One-time migration: add a `stepLabel` field to every action in
 * `pipeline/data/action-catalog.json`.
 *
 * `stepLabel` is the short, user-facing string the chatbot displays in the
 * Execution Plan card. It's distinct from `description` (which is keyword-
 * dense for TF-IDF retrieval) and `keywords` (the explicit synonym list).
 *
 * Rules — derived from `actionId`:
 *   list_X         → "List Xs"
 *   get_X          → "Get X"
 *   create_X       → "Create X"
 *   update_X       → "Update X"
 *   delete_X       → "Delete X"
 *   search_X       → "Search Xs"
 *   send_X         → "Send X"
 *   add_X          → "Add X"
 *   remove_X       → "Remove X"
 *   merge_X        → "Merge X"
 *   batch_X        → "Batch X"
 *   any other      → snake_case → Title Case Sentence
 *
 * Hand-tuned overrides live in HAND_OVERRIDES below for cases the heuristic
 * wouldn't get right (e.g. `me` should be "Get my profile", not "Me").
 */

const fs = require('fs');
const path = require('path');

const CATALOG = path.resolve(__dirname, '../src/main/services/pipeline/data/action-catalog.json');

// ─── Hand overrides — short strings the heuristic doesn't produce well ────────
const HAND_OVERRIDES = {
  // LinkedIn — chatbot-facing labels, kept short and human
  'linkedin:me':                    'Get my LinkedIn profile',
  'linkedin:whoami':                'Get my LinkedIn profile',
  'linkedin:get_profile':           'Get LinkedIn profile',
  'linkedin:get_connection_status': 'Check connection status',
  'linkedin:list_connections':      'List my connections',
  'linkedin:get_user_posts':        'Get user posts',
  'linkedin:get_feed':              'Get my LinkedIn feed',
  'linkedin:like_post':             'Like post',
  'linkedin:unlike_post':           'Unlike post',
  'linkedin:change_reaction':       'Change reaction',
  'linkedin:get_post_reactions':    'Get post reactions',
  'linkedin:get_post_comments':     'Get post comments',
  'linkedin:comment_on_post':       'Comment on post',
  'linkedin:reply_to_comment':      'Reply to comment',
  'linkedin:repost':                'Repost',
  'linkedin:undo_repost':           'Undo repost',
  'linkedin:save_post':             'Save post',
  'linkedin:unsave_post':           'Unsave post',
  'linkedin:follow':                'Follow',
  'linkedin:unfollow':              'Unfollow',
  'linkedin:send_invite':           'Send connection request',
  'linkedin:withdraw_invite':       'Withdraw invitation',
  'linkedin:accept_invite':         'Accept invitation',
  'linkedin:ignore_invite':         'Ignore invitation',
  'linkedin:list_invitations':      'List invitations',
  'linkedin:send_message':          'Send message',
  'linkedin:list_conversations':    'List conversations',
  'linkedin:get_conversation':      'Get conversation',
  'linkedin:search_people':         'Search people',
  'linkedin:create_post':           'Create post',
};

// ─── Verb → user-facing prefix mapping ────────────────────────────────────────
const VERB_PREFIX = {
  list:       'List',
  get:        'Get',
  fetch:      'Get',
  read:       'Get',
  show:       'Get',
  view:       'View',
  search:     'Search',
  find:       'Find',
  create:     'Create',
  add:        'Add',
  new:        'Create',
  insert:     'Add',
  update:     'Update',
  edit:       'Edit',
  patch:      'Update',
  modify:     'Update',
  set:        'Set',
  delete:     'Delete',
  remove:     'Remove',
  archive:    'Archive',
  send:       'Send',
  post:       'Post',
  upload:     'Upload',
  merge:      'Merge',
  batch:      'Batch',
  bulk:       'Bulk',
  import:     'Import',
  export:     'Export',
  validate:   'Validate',
  invite:     'Invite',
  associate:  'Associate',
  disassociate: 'Disassociate',
  enroll:     'Enroll',
  unenroll:   'Unenroll',
  approve:    'Approve',
  reject:     'Reject',
  share:      'Share',
  resolve:    'Resolve',
  reopen:     'Reopen',
  follow:     'Follow',
  unfollow:   'Unfollow',
};

// Words to keep as-is (acronyms or proper nouns we don't want title-cased to "Crm")
const KEEP_AS = new Set(['url', 'urn', 'id', 'api', 'csv', 'crm', 'oauth', 'utm', 'dm', 'ai', 'ip', 'ui', 'ux', 'sms']);

function titleCase(token) {
  if (!token) return '';
  const lower = token.toLowerCase();
  if (KEEP_AS.has(lower)) return lower.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function autoStepLabel(actionId) {
  if (!actionId) return '';
  const parts = actionId.split('_').filter(Boolean);
  if (parts.length === 0) return '';

  const first = parts[0].toLowerCase();
  const rest  = parts.slice(1);
  const restWords = rest.map((w) => {
    const lc = w.toLowerCase();
    if (KEEP_AS.has(lc)) return lc.toUpperCase();
    return lc;
  }).join(' ');

  // Verb-driven prefix
  if (VERB_PREFIX[first]) {
    return `${VERB_PREFIX[first]}${restWords ? ' ' + restWords : ''}`.trim();
  }

  // Unknown verb — sentence-case (capitalize only the first word, keep the
  // rest lowercase except known acronyms). Avoids "Upsert Contact" / "Append
  // Block Children" when "Upsert contact" / "Append block children" reads
  // more naturally.
  return [titleCase(parts[0]), ...parts.slice(1).map((w) => {
    const lc = w.toLowerCase();
    return KEEP_AS.has(lc) ? lc.toUpperCase() : lc;
  })].join(' ');
}

function migrate() {
  const force = process.argv.includes('--force');
  const raw = fs.readFileSync(CATALOG, 'utf-8');
  const catalog = JSON.parse(raw);
  let updated = 0, alreadyHad = 0;

  for (const [platformKey, platform] of Object.entries(catalog)) {
    if (platformKey === '_meta') continue;
    if (!Array.isArray(platform.actions)) continue;

    for (const action of platform.actions) {
      if (!force && action.stepLabel && typeof action.stepLabel === 'string' && action.stepLabel.trim()) {
        alreadyHad++;
        continue;
      }
      const lookupKey = `${platformKey}:${action.actionId}`;
      const override  = HAND_OVERRIDES[lookupKey];
      action.stepLabel = override || autoStepLabel(action.actionId);
      updated++;
    }
  }

  fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2));
  console.log(`✓ Added stepLabel to ${updated} actions (${alreadyHad} already had one)`);

  // Print a sampling so we can eyeball quality
  console.log('\nSamples:');
  for (const [platformKey, platform] of Object.entries(catalog)) {
    if (platformKey === '_meta' || !Array.isArray(platform.actions)) continue;
    console.log(`\n[${platformKey}] (${platform.actions.length} actions)`);
    for (const a of platform.actions.slice(0, 6)) {
      console.log(`  ${a.actionId.padEnd(35)} → ${a.stepLabel}`);
    }
    if (platform.actions.length > 6) console.log('  …');
  }
}

migrate();
