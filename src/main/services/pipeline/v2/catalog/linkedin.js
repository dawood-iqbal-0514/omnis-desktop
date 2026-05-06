/**
 * LinkedIn — typed action catalog (v2).
 *
 * Each action declares:
 *   • consumes   — typed input slots, marked userInput when the user supplies them
 *   • produces   — typed outputs (URNs, entity records, lists)
 *   • sideEffect — read | write | destructive (drives approval gating)
 *   • verbs      — natural-language verbs the user might use (compiler hint, not exhaustive)
 *   • category   — used by the pre-router for fast pattern-matching
 *
 * The compiler walks consumes/produces backward from a user goal to compose
 * a valid call chain. No prose to interpret, no AI in the composition.
 */

const ACTIONS = [
  // ─── Self / profile reads ──────────────────────────────────────────────
  {
    id:          'me',
    label:       'Get my LinkedIn profile',
    description: 'Returns the viewer\'s own profile (name, headline, location, industry, experience, education, picture, connection count).',
    sideEffect:  'read',
    verbs:       ['get my profile', 'fetch my profile', 'show my profile', 'who am i', 'whoami'],
    consumes:    {},
    produces:    { person: 'Person' },
    // `me` is the viewer's own profile — never a generic producer of "some
    // person." Exclude it from compiler chains unless explicitly the goal.
    excludeFromComposition: true,
  },

  {
    id:          'get_profile',
    label:       'Get LinkedIn profile',
    description: 'Look up another person\'s profile by URN, vanity slug, or public identifier.',
    sideEffect:  'read',
    verbs:       ['get profile', 'view profile', 'fetch profile', 'look up'],
    consumes:    {
      person: { type: 'LinkedInPersonUrn' },
    },
    produces:    { person: 'Person' },
  },

  {
    id:          'get_connection_status',
    label:       'Check connection status',
    description: 'Return CONNECTED / OUTGOING_PENDING / INCOMING_PENDING / NOT_CONNECTED / SELF / UNKNOWN for a target person.',
    sideEffect:  'read',
    verbs:       ['check connection status', 'am i connected to', 'did they accept', 'is my invite pending', 'connection status'],
    consumes:    {
      person: { type: 'LinkedInPersonUrn' },
    },
    produces:    { status: 'LinkedInConnectionStatus' },
  },

  {
    id:          'list_connections',
    label:       'List my connections',
    description: 'Return the viewer\'s 1st-degree connections sorted by recency.',
    sideEffect:  'read',
    verbs:       ['list my connections', 'show my connections', 'list contacts', 'show network'],
    consumes:    {
      start: { type: 'number', userInput: true, optional: true, default: 0 },
      count: { type: 'number', userInput: true, optional: true, default: 20 },
    },
    produces:    { connections: 'List<Person>' },
  },

  // ─── Search ────────────────────────────────────────────────────────────
  {
    id:          'search_people',
    label:       'Search people',
    description: 'Search the global LinkedIn graph for people matching keywords + optional filters (company, location, school, network).',
    sideEffect:  'read',
    verbs:       ['search people', 'find people', 'find prospects', 'search linkedin'],
    consumes:    {
      keywords: { type: 'string', userInput: true },
      filters:  { type: 'object', userInput: true, optional: true },
      start:    { type: 'number', userInput: true, optional: true, default: 0 },
      count:    { type: 'number', userInput: true, optional: true, default: 5 },
    },
    produces:    {
      candidates: 'List<Person>',
      // Each candidate carries linkedInUrn, so chaining into actions that
      // consume LinkedInPersonUrn just works once the user picks one.
    },
    pickable:    true,    // Output is a list — the executor surfaces a ChoiceCard.
  },

  // ─── Posts (read) ──────────────────────────────────────────────────────
  {
    id:          'get_user_posts',
    label:       'Get user posts',
    description: 'Fetch the latest posts authored by a person — text + reactions/comments/reposts counts + URNs for follow-up actions.',
    sideEffect:  'read',
    verbs:       ['fetch posts', 'get posts', 'show posts', 'list posts', 'recent posts', 'latest posts'],
    consumes:    {
      person: { type: 'LinkedInPersonUrn' },
      count:  { type: 'number', userInput: true, optional: true, default: 5 },
    },
    produces:    { posts: 'List<LinkedInPostUrn>' },
    pickable:    true,
  },

  {
    id:          'get_feed',
    label:       'Get my LinkedIn feed',
    description: 'Fetch the viewer\'s home feed timeline.',
    sideEffect:  'read',
    verbs:       ['get feed', 'show feed', 'home feed', 'my feed'],
    consumes:    {
      count: { type: 'number', userInput: true, optional: true, default: 10 },
      start: { type: 'number', userInput: true, optional: true, default: 0 },
    },
    produces:    { posts: 'List<LinkedInPostUrn>' },
  },

  {
    id:          'list_my_posts',
    label:       'List my LinkedIn posts',
    description: 'Fetch the viewer\'s own recent posts (text + reactions/comments/reposts).',
    sideEffect:  'read',
    verbs:       ['list my posts', 'show my posts', 'my recent posts', 'my activity'],
    consumes:    {
      count: { type: 'number', userInput: true, optional: true, default: 10 },
    },
    produces:    { posts: 'List<LinkedInPostUrn>' },
    pickable:    true,
  },

  // ─── Engagement (post-targeted) ────────────────────────────────────────
  {
    id:          'like_post',
    label:       'Like post',
    description: 'React to a post (LIKE by default; can specify reaction type).',
    sideEffect:  'destructive',
    verbs:       ['like', 'react', 'praise', 'celebrate', 'love'],
    consumes:    {
      post:         { type: 'LinkedInPostUrn' },
      reactionType: { type: 'LinkedInReactionType', userInput: true, optional: true, default: 'LIKE' },
    },
    produces:    {},
  },

  {
    id:          'unlike_post',
    label:       'Unlike post',
    description: 'Remove the viewer\'s reaction from a post.',
    sideEffect:  'destructive',
    verbs:       ['unlike', 'unreact', 'remove reaction'],
    consumes:    { post: { type: 'LinkedInPostUrn' } },
    produces:    {},
  },

  {
    id:          'change_reaction',
    label:       'Change reaction',
    description: 'Change the reaction type on a post the viewer already reacted to.',
    sideEffect:  'destructive',
    verbs:       ['change reaction', 'switch reaction', 'update reaction'],
    consumes:    {
      post:         { type: 'LinkedInPostUrn' },
      reactionType: { type: 'LinkedInReactionType', userInput: true },
    },
    produces:    {},
  },

  {
    id:          'get_post_reactions',
    label:       'Get post reactions',
    description: 'List who reacted to a post and how.',
    sideEffect:  'read',
    verbs:       ['who reacted', 'who liked', 'list reactions'],
    consumes:    {
      post:  { type: 'LinkedInPostUrn' },
      count: { type: 'number', userInput: true, optional: true, default: 10 },
    },
    produces:    { reactors: 'List<Person>' },
  },

  {
    id:          'get_post_comments',
    label:       'Get post comments',
    description: 'List comments under a post.',
    sideEffect:  'read',
    verbs:       ['get comments', 'show comments', 'list comments'],
    consumes:    {
      post:      { type: 'LinkedInPostUrn' },
      count:     { type: 'number', userInput: true, optional: true, default: 10 },
      sortOrder: { type: 'string', userInput: true, optional: true, default: 'RELEVANCE' },
    },
    produces:    { comments: 'List<LinkedInCommentUrn>' },
    pickable:    true,
  },

  {
    id:          'comment_on_post',
    label:       'Comment on post',
    description: 'Post a comment under another user\'s post.',
    sideEffect:  'destructive',
    verbs:       ['comment', 'reply', 'leave a comment'],
    consumes:    {
      post: { type: 'LinkedInPostUrn' },
      body: { type: 'string', userInput: true },
    },
    produces:    { comment: 'LinkedInCommentUrn' },
  },

  {
    id:          'reply_to_comment',
    label:       'Reply to comment',
    description: 'Reply under an existing comment.',
    sideEffect:  'destructive',
    verbs:       ['reply', 'respond to comment'],
    consumes:    {
      post:          { type: 'LinkedInPostUrn' },
      parentComment: { type: 'LinkedInCommentUrn' },
      body:          { type: 'string', userInput: true },
    },
    produces:    { comment: 'LinkedInCommentUrn' },
  },

  {
    id:          'create_post',
    label:       'Create post',
    description: 'Publish a new text post on the viewer\'s timeline.',
    sideEffect:  'destructive',
    verbs:       ['create post', 'publish post', 'share', 'post update', 'compose post'],
    consumes:    {
      body:       { type: 'string', userInput: true },
      visibility: { type: 'string', userInput: true, optional: true, default: 'PUBLIC' },
    },
    produces:    { post: 'LinkedInPostUrn' },
  },

  {
    id:          'repost',
    label:       'Repost',
    description: 'Repost (share) another user\'s post, optionally with commentary.',
    sideEffect:  'destructive',
    verbs:       ['repost', 'share', 'amplify'],
    consumes:    {
      post:       { type: 'LinkedInPostUrn' },
      commentary: { type: 'string', userInput: true, optional: true },
    },
    produces:    { repost: 'LinkedInPostUrn' },
  },

  {
    id:          'undo_repost',
    label:       'Undo repost',
    description: 'Delete a repost.',
    sideEffect:  'destructive',
    verbs:       ['undo repost', 'unshare', 'delete repost'],
    consumes:    { repost: { type: 'LinkedInPostUrn' } },
    produces:    {},
  },

  {
    id:          'save_post',
    label:       'Save post',
    description: 'Save a post for later.',
    sideEffect:  'write',
    verbs:       ['save', 'bookmark'],
    consumes:    { post: { type: 'LinkedInPostUrn' } },
    produces:    {},
  },

  {
    id:          'unsave_post',
    label:       'Unsave post',
    description: 'Remove a post from saved items.',
    sideEffect:  'write',
    verbs:       ['unsave', 'remove bookmark'],
    consumes:    { post: { type: 'LinkedInPostUrn' } },
    produces:    {},
  },

  // ─── Network (follow / unfollow) ───────────────────────────────────────
  {
    id:          'follow',
    label:       'Follow',
    description: 'Follow a person, company, hashtag, or newsletter.',
    sideEffect:  'destructive',
    verbs:       ['follow', 'subscribe to'],
    consumes:    { person: { type: 'LinkedInPersonUrn' } },
    produces:    {},
  },

  {
    id:          'unfollow',
    label:       'Unfollow',
    description: 'Unfollow a person, company, hashtag, or newsletter.',
    sideEffect:  'destructive',
    verbs:       ['unfollow', 'unsubscribe from', 'stop following'],
    consumes:    { person: { type: 'LinkedInPersonUrn' } },
    produces:    {},
  },

  // ─── Connections (invitations) ─────────────────────────────────────────
  {
    id:          'send_invite',
    label:       'Send connection request',
    description: 'Send a connection request to a person, optionally with a personal note.',
    sideEffect:  'destructive',
    verbs:       ['send invite', 'send connection request', 'connect with', 'add to network'],
    consumes:    {
      person:  { type: 'LinkedInPersonUrn' },
      message: { type: 'string', userInput: true, optional: true },
    },
    produces:    { invite: 'LinkedInInviteUrn' },
  },

  {
    id:          'withdraw_invite',
    label:       'Withdraw invitation',
    description: 'Cancel a sent connection request.',
    sideEffect:  'destructive',
    verbs:       ['withdraw invite', 'cancel invite', 'cancel connection request'],
    consumes:    { invite: { type: 'LinkedInInviteUrn' } },
    produces:    {},
  },

  {
    id:          'accept_invite',
    label:       'Accept invitation',
    description: 'Accept an incoming connection request.',
    sideEffect:  'destructive',
    verbs:       ['accept invite', 'approve invite', 'accept connection request'],
    consumes:    { invite: { type: 'LinkedInInviteUrn' } },
    produces:    {},
  },

  {
    id:          'ignore_invite',
    label:       'Ignore invitation',
    description: 'Ignore (decline) an incoming connection request.',
    sideEffect:  'destructive',
    verbs:       ['ignore invite', 'decline invite', 'reject invite'],
    consumes:    { invite: { type: 'LinkedInInviteUrn' } },
    produces:    {},
  },

  {
    id:          'list_invitations',
    label:       'List invitations',
    description: 'List pending connection invitations (received or sent).',
    sideEffect:  'read',
    verbs:       ['list invites', 'show invites', 'pending invites', 'show pending requests'],
    consumes:    {
      direction: { type: 'string', userInput: true, optional: true, default: 'received' },
      start:     { type: 'number', userInput: true, optional: true, default: 0 },
      count:     { type: 'number', userInput: true, optional: true, default: 20 },
    },
    produces:    { invitations: 'List<LinkedInInviteUrn>' },
  },

  // ─── Messaging ─────────────────────────────────────────────────────────
  {
    id:          'send_message',
    label:       'Send message',
    description: 'Send a direct message in an existing conversation.',
    sideEffect:  'destructive',
    verbs:       ['send message', 'send dm', 'message', 'reply'],
    consumes:    {
      conversation: { type: 'LinkedInConversationUrn' },
      body:         { type: 'string', userInput: true },
    },
    produces:    {},
  },

  {
    id:          'list_conversations',
    label:       'List conversations',
    description: 'List the viewer\'s messaging threads.',
    sideEffect:  'read',
    verbs:       ['list conversations', 'show messages', 'list dms', 'inbox'],
    consumes:    {
      start: { type: 'number', userInput: true, optional: true, default: 0 },
      count: { type: 'number', userInput: true, optional: true, default: 20 },
    },
    produces:    { conversations: 'List<LinkedInConversationUrn>' },
    pickable:    true,
  },

  {
    id:          'get_conversation',
    label:       'Get conversation',
    description: 'Get the full message history of a single conversation.',
    sideEffect:  'read',
    verbs:       ['get conversation', 'show conversation', 'show thread', 'read messages'],
    consumes:    {
      conversation: { type: 'LinkedInConversationUrn' },
      count:        { type: 'number', userInput: true, optional: true, default: 20 },
    },
    produces:    { messages: 'List<TextNote>' },
  },
];

/**
 * The dispatcher in linkedin.service.js maps the v2 action id + a flat
 * parameter dict back to the legacy backend params. Different action IDs
 * use different parameter names for what's logically the same slot
 * (e.g. `profileUrn` vs `urn` vs `publicIdentifier`), so we provide an
 * explicit mapping from typed slot names → backend param names. Anything
 * not listed here passes through unchanged.
 */
const PARAM_MAP = {
  // For every action, map our typed slot name → the backend parameter name.
  // Slots not in the map pass through (e.g. body → body, message → message).
  get_profile:           { person: 'profileUrn' },
  get_connection_status: { person: 'profileUrn' },
  get_user_posts:        { person: 'profileUrn' },
  get_post_reactions:    { post: 'threadUrn' },
  get_post_comments:     { post: 'socialDetailUrn' },
  like_post:             { post: 'threadUrn' },
  unlike_post:            { post: 'threadUrn' },
  change_reaction:        { post: 'threadUrn' },
  comment_on_post:        { post: 'threadUrn' },
  reply_to_comment:       { post: 'threadUrn', parentComment: 'parentCommentUrn' },
  repost:                 { post: 'activityUrn' },
  undo_repost:            { repost: 'repostUrn' },
  save_post:              { post: 'activityUrn' },
  unsave_post:            { post: 'activityUrn' },
  follow:                 { person: 'urn' },
  unfollow:               { person: 'urn' },
  send_invite:            { person: 'profileUrn' },
  withdraw_invite:        { invite: 'inviteUrn' },
  accept_invite:          { invite: 'inviteUrn' },
  ignore_invite:          { invite: 'inviteUrn' },
  send_message:           { conversation: 'conversationUrn' },
  get_conversation:       { conversation: 'conversationUrn' },
};

module.exports = {
  platform: 'linkedin',
  actions:  ACTIONS,
  paramMap: PARAM_MAP,
};
