const { CerebrasService } = require('../cerebrasService');
const actionRegistry = require('./actionRegistry');

const PLAN_SYSTEM_PROMPT = `You generate execution plans. You receive a user request and available actions.

Output ONLY a JSON object, nothing else.

If the user provided all needed info:
{"planReady":true,"message":"what will be done","clarificationNeeded":null,"actions":[{"actionId":"action_id_without_platform_prefix","platform":"platform_name","description":"step description","parameters":{}}]}

If required info is MISSING (user didn't provide a name, email, channel, etc.):
{"planReady":false,"message":"","clarificationNeeded":"Ask the specific missing info naturally","actions":[]}

STRICT RULES:
1. actionId must be ONLY the action name — NO platform prefix. Use "create_contact" NOT "hubspot:create_contact"
2. If a required parameter is not in the user's message, set planReady=false and ASK for it in clarificationNeeded
3. NEVER put placeholder values like "What is the name?" as parameter values — that means info is missing, so ask for it
4. For HubSpot CRM objects: parameters = { "properties": { "email": "value", "firstname": "value" } }
5. For Slack messages: parameters = { "channel": "#channel", "text": "message" }
6. For automation actions (active lists, workflows): parameters = { "name": "list name", "description": "what it filters" }
7. Extract REAL values from the user's message. If they said "john@test.com" use that exact value
8. Output raw JSON only. No markdown. No code blocks. No explanation.

LINKEDIN PERSON-DISAMBIGUATION PATTERN (very important):
If the user's request targets a specific LinkedIn person and the chosen action takes a profileUrn or publicIdentifier, check how the person was named:
  • Given as a LinkedIn URL (https://www.linkedin.com/in/<slug>/) or a recognizable vanity slug → fill the parameter directly. No search step.
  • Given by name only (with optional company / location / school) → emit a TWO-PART plan:
      - First action: "search_people" with the name + any filters as keywords
      - "followUp" object: the action the user actually wanted, with paramSlot "profileUrn"
    The disambiguation UI will collect the user's pick and fire the followUp.

This rule is IDENTITY-shaped, not verb-shaped: it applies to every person-targeted action in the catalog (read or write). If the action's required/optional params include profileUrn or publicIdentifier and the user didn't give a slug, you use the search + followUp plan. Do not enumerate verbs in your head — check the action's params.

Do not ask the user to provide a LinkedIn URL, vanity slug, or handle. The user giving a name is sufficient input — the search step exists to resolve names to profiles. Asking for a slug is treated as a planning failure.

Output shape for the disambiguation case:
{
  "planReady": true,
  "message": "Find someone matching your criteria, then <do the action>",
  "actions": [{
    "actionId": "search_people",
    "platform": "linkedin",
    "description": "Search people",
    "parameters": { "keywords": "<query>", "filters": { "currentCompany": "<co>", "geo": "<location>", "school": "<school>", "network": "F|S|F,S" } }
  }],
  "followUp": {
    "actionId": "<action they actually wanted, e.g. send_invite>",
    "platform": "linkedin",
    "description": "<short label, e.g. Send connection request>",
    "parameters": { "<other-params-they-gave, e.g. message>": "..." },
    "paramSlot": "profileUrn"
  }
}

Notes:
- "keywords" is a free-text query string. It does not need to map to an exact name.
- Only include filters the user explicitly stated. Drop empty filter keys. Default is no filters (global search).
- "network" filter ("F" = 1st-degree, "S" = 2nd-degree) is the SCOPE OF SEARCH, not a relationship description. Apply it only when the user is restricting the search universe to their own network. Possessive pronouns referring to a relationship between the user and the target (status, invite, message) are not a search scope. When uncertain, omit the filter.
- paramSlot for person-targeted actions is always "profileUrn".
- Pronouns referring to a previously-shown candidate are resolved from chat context by the orchestrator, not by the prompt.

POST-TARGETED ACTIONS (any action whose required parameter is a post URN — threadUrn, activityUrn, socialDetailUrn):
The user does not have these URNs. Never ask for them. Resolve via one of the following, depending on what the user gave you:
- A post URL → extract the activity URN from the URL and fill the parameter directly.
- A reference to a post the chat already showed this session → leave the URN parameter empty in the plan; the orchestrator binds it from chat context.
- A reference to a person plus a qualifier about their post, with no URL and no prior post listing in context → plan the resolve chain: search_people followed by get_user_posts. The plan message should explain that the posts will be surfaced and the user picks on the next turn.

The general rule: if a required parameter is an identifier the user has no way of knowing (URN, internal ID), the plan must produce that identifier — by URL parse, by chat-context lookup, or by chaining a fetch that surfaces it. Asking the user for the URN directly is a planning failure.
`;

class PlanGenerator {
  /**
   * Generate an execution plan from user message and retrieved actions via Cerebras AI.
   *
   * @param {string} userMessage - The user's natural language request
   * @param {{ action: object, score: number }[]} retrievedActions - Actions from ActionRetriever
   * @param {object[]} chatHistory - Previous chat messages (optional)
   * @returns {Promise<object>} Parsed plan object
   */
  async generate(userMessage, retrievedActions, chatHistory = []) {
    const actionsContext = this._buildPrompt(retrievedActions);
    const fullPrompt = PLAN_SYSTEM_PROMPT + '\n\n' + actionsContext;

    // Format chat history for Cerebras (expects { type, content } objects)
    const formattedHistory = chatHistory.map(msg => ({
      type: msg.type || msg.role || 'user',
      content: msg.content || msg.text || ''
    }));

    try {
      const response = await CerebrasService.sendMessage(
        userMessage,
        formattedHistory,
        null,
        fullPrompt
      );

      const responseText = response.message || response;
      return this._parsePlan(responseText);
    } catch (error) {
      console.error('[PlanGenerator] Plan generation failed:', error.message);
      return {
        planReady: false,
        message: 'Failed to generate execution plan.',
        clarificationNeeded: 'Something went wrong while planning. Could you try rephrasing your request?',
        actions: []
      };
    }
  }

  /**
   * Format retrieved actions into a structured context block for the AI prompt.
   */
  _buildPrompt(retrievedActions) {
    if (!retrievedActions || retrievedActions.length === 0) {
      return 'AVAILABLE ACTIONS:\n\nNo matching actions found.';
    }

    const lines = ['AVAILABLE ACTIONS:\n'];

    retrievedActions.forEach(({ action }, index) => {
      const prefix = `${index + 1}. ${action.platform}:${action.actionId} (${action.type || 'api'})`;
      const desc = `   Description: ${action.description || 'No description'}`;

      const requiredStr = action.requiredParams && action.requiredParams.length > 0
        ? `   Required: ${action.requiredParams.join(', ')}`
        : null;

      const optionalStr = action.optionalParams && action.optionalParams.length > 0
        ? `   Optional: ${action.optionalParams.join(', ')}`
        : null;

      lines.push(prefix);
      lines.push(desc);
      if (requiredStr) lines.push(requiredStr);
      if (optionalStr) lines.push(optionalStr);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Build execution JSON directly from the action catalog.
   * Determines type (api/automation/hybrid) from the catalog — no RegistryLoader needed.
   *
   * @param {object} approvedPlan - The AI-generated plan (after user approval)
   * @param {string} platform - The target platform ID
   * @returns {object} Execution plan ready for crm.js executeplan()
   */
  generateExecutionJSON(approvedPlan, platform) {
    const steps = [];
    let order = 1;

    for (const action of (approvedPlan.actions || [])) {
      // Strip platform prefix if AI included it (e.g., "hubspot:create_contact" → "create_contact")
      let actionId = action.actionId || '';
      let actionPlatform = action.platform || platform;
      if (actionId.includes(':')) {
        const parts = actionId.split(':');
        actionPlatform = parts[0];
        actionId = parts[1];
      }
      const catalogEntry = actionRegistry.getAction(actionPlatform, actionId);

      // Determine type from catalog, default to "api"
      const type = catalogEntry?.type || 'api';

      // Description priority: catalog stepLabel (clean, user-facing) → AI's
      // generated description → action id as last resort. The AI tends to
      // copy the catalog's verbose `description` field verbatim into its
      // plan, which then leaks keyword-rich text into the Execution Plan
      // card UI. Preferring the catalog's `stepLabel` keeps step titles
      // short and human ("Get my LinkedIn profile" vs "get my linkedin
      // profile, headline, location, industry, experience, education,
      // profile picture and connection count").
      const description =
        catalogEntry?.stepLabel
        || action.description
        || actionId;

      const step = {
        order: order++,
        type: type,
        action: actionId,
        description,
        parameters: action.parameters || {},
      };

      if (type === 'api' || type === 'hybrid') {
        step.apiConfig = {
          endpoint: `/api/${actionPlatform}/${action.actionId}`,
          method: 'POST',
        };
      }

      if (type === 'automation' || type === 'hybrid') {
        step.automationConfig = {
          script: catalogEntry?.automationScript || `${action.actionId}.py`,
        };
      }

      steps.push(step);
    }

    // Determine primary platform from first step
    const primaryPlatform = approvedPlan.actions?.[0]?.platform || platform;

    const out = {
      platform: primaryPlatform,
      steps: steps,
    };

    // Carry the disambiguation followUp through to the renderer's executor —
    // it'll show a ChoiceCard once the search step returns multiple
    // candidates, then fire this followUp with the picked profileUrn.
    if (approvedPlan.followUp) {
      out.followUp = {
        actionId:    approvedPlan.followUp.actionId,
        platform:    approvedPlan.followUp.platform,
        description: approvedPlan.followUp.description,
        parameters:  approvedPlan.followUp.parameters || {},
        paramSlot:   approvedPlan.followUp.paramSlot || 'profileUrn',
      };
    }

    return out;
  }

  /**
   * Parse plan JSON from the AI response.
   * Handles markdown code blocks, raw JSON, and malformed responses.
   */
  _parsePlan(response) {
    if (!response || typeof response !== 'string') {
      return this._fallbackPlan();
    }

    let jsonStr = response.trim();

    // Strip markdown code blocks if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to extract JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return this._validatePlan(parsed);
    } catch (parseError) {
      console.error('[PlanGenerator] JSON parse failed:', parseError.message);
      return this._fallbackPlan();
    }
  }

  /**
   * Validate and normalize the parsed plan, filling in defaults for missing fields.
   *
   * Crucially: the AI sometimes echoes the user's spelling of a platform
   * back into the plan ("LinkedIn", "linked in", "LinkedIn.com"). The
   * backend's `validateExecute` middleware does an exact lowercase match
   * against an allowlist, so any echo variant produces a 400 "Validation
   * failed" error at execute-time. We normalize here once so every
   * downstream consumer (orchestrator, executor, request body) sees a
   * canonical platform id.
   */
  _validatePlan(parsed) {
    const out = {
      planReady: typeof parsed.planReady === 'boolean' ? parsed.planReady : false,
      message: typeof parsed.message === 'string' ? parsed.message : 'Plan generated.',
      clarificationNeeded: parsed.clarificationNeeded || null,
      actions: Array.isArray(parsed.actions) ? parsed.actions.map((a) => this._normalizeAction(a)) : [],
    };
    // Preserve the disambiguation followUp action if the AI emitted one.
    if (parsed.followUp && typeof parsed.followUp === 'object') {
      const fu = this._normalizeAction(parsed.followUp);
      fu.paramSlot = parsed.followUp.paramSlot || 'profileUrn';
      out.followUp = fu;
    }
    // ── Defensive auto-conversion ───────────────────────────────────────────
    // The AI sometimes ignores the disambiguation instruction and emits the
    // person-targeted action as a regular step 2 alongside `search_people`.
    // We detect that pattern and auto-promote step 2 → followUp so the
    // ChoiceCard fires correctly. Without this, step 2 would execute with
    // a missing/empty `profileUrn` and fail at the service layer.
    out.actions = this._extractFollowUp(out);
    return out;
  }

  /**
   * Defensive recovery for the AI's most common plan-shape mistakes.
   *
   * Two patterns this handles:
   *
   * (1) Person-targeted action emitted as step 2 of [search_people, X] with
   *     missing profileUrn. Promote X to followUp, drop it from the actions
   *     list. The ChoiceCard will fire after the search and resolve the URN.
   *
   * (2) Post-targeted action (comment, like, repost, etc.) emitted with no
   *     possible way to know its post URN. The user said "comment on satya's
   *     latest post" — the AI tried to plan comment_on_post directly, which
   *     fails because no step in the plan produces a threadUrn. We can't
   *     execute this in one shot with current infrastructure (3-stage chains
   *     are not yet supported — see LINKEDIN-TODOS item #3). So we replace
   *     the impossible step with `get_user_posts` and let the user pick a
   *     post on the next turn ("comment on the first one"). The original
   *     intent is preserved as a description hint in the followUp.
   */
  _extractFollowUp(plan) {
    let actions = plan.actions || [];
    if (actions.length === 0) return actions;

    // Person-targeted actions all use `profileUrn` as their primary slot.
    const PERSON_TARGETED = new Set([
      'send_invite', 'send_message', 'follow', 'unfollow',
      'get_user_posts', 'get_profile', 'get_connection_status',
    ]);
    // Post-targeted actions and the parameter key each one needs filled.
    const POST_TARGETED_URN_KEYS = {
      comment_on_post:    'threadUrn',
      reply_to_comment:   'threadUrn',
      like_post:          'threadUrn',
      unlike_post:        'threadUrn',
      change_reaction:    'threadUrn',
      get_post_reactions: 'threadUrn',
      get_post_comments:  'socialDetailUrn',
      repost:             'activityUrn',
      save_post:          'activityUrn',
      unsave_post:        'activityUrn',
    };

    // A "real" URN matches `urn:li:<resource>:<id>` where <id> is non-empty
    // and not wrapped in <angle> placeholders. Hallucinated URNs from the AI
    // commonly look like `urn:li:ugcPost:<id>` or just `urn:li:ugcPost:` —
    // both fail this regex.
    const REAL_URN_RE = /^urn:li:[a-zA-Z_]+:[A-Za-z0-9_\-:()=,]+$/;
    const isRealUrn = (v) => typeof v === 'string' && REAL_URN_RE.test(v) && !/[<>]/.test(v);

    const stripBadUrn = (action, key) => {
      if (!isRealUrn(action.parameters?.[key])) {
        const params = { ...(action.parameters || {}) };
        delete params[key];
        return { ...action, parameters: params };
      }
      return action;
    };

    const last = actions[actions.length - 1];

    // ── Case A: single post-targeted action with no URN ─────────────────────
    // E.g. AI emitted `[comment_on_post]` directly. We need a search + posts
    // chain to even reach a valid threadUrn.
    if (actions.length === 1 && POST_TARGETED_URN_KEYS[last.actionId]) {
      const urnKey = POST_TARGETED_URN_KEYS[last.actionId];
      if (!isRealUrn(last.parameters?.[urnKey])) {
        const intentLabel = last.description || last.actionId;
        console.log(`[PlanGenerator] Promoting single post-targeted action "${last.actionId}" → search+posts chain (urn missing)`);
        plan.followUp = {
          actionId:    'get_user_posts',
          platform:    'linkedin',
          description: 'Show recent posts',
          parameters:  { count: 5 },
          paramSlot:   'profileUrn',
        };
        plan.message =
          `Find the right person, then show their recent posts. ` +
          `Once they appear, tell me which one to ${intentLabel.toLowerCase()}.`;
        // Replace the broken single action with search_people.
        return [{
          actionId:    'search_people',
          platform:    'linkedin',
          description: 'Search people',
          parameters:  {},
        }];
      }
    }

    if (actions.length < 2) return actions;

    const hasSearchPeople = actions.slice(0, -1).some((a) => a.actionId === 'search_people');

    // ── Case B: [search_people, X] where X is person-targeted, no profileUrn
    if (hasSearchPeople && PERSON_TARGETED.has(last.actionId) && !plan.followUp) {
      if (!isRealUrn(last.parameters?.profileUrn)) {
        const cleaned = stripBadUrn(last, 'profileUrn');
        console.log(`[PlanGenerator] Promoting "${last.actionId}" → followUp (profileUrn missing)`);
        plan.followUp = { ...cleaned, paramSlot: 'profileUrn' };
        return actions.slice(0, -1);
      }
    }

    // ── Case C: [search_people, ..., X] where X is post-targeted, no URN ───
    // Drop X, replace with get_user_posts followUp. Preserve the user's
    // original intent in the plan message so they know what to type next.
    if (hasSearchPeople && POST_TARGETED_URN_KEYS[last.actionId]) {
      const urnKey = POST_TARGETED_URN_KEYS[last.actionId];
      if (!isRealUrn(last.parameters?.[urnKey])) {
        const intentLabel = last.description || last.actionId;
        console.log(`[PlanGenerator] Replacing "${last.actionId}" with get_user_posts (${urnKey} missing)`);
        plan.followUp = {
          actionId:    'get_user_posts',
          platform:    'linkedin',
          description: 'Show recent posts',
          parameters:  { count: 5 },
          paramSlot:   'profileUrn',
        };
        plan.message =
          `Find the right person, then show their recent posts. ` +
          `Once they appear, tell me which one to ${intentLabel.toLowerCase()}.`;
        return actions.slice(0, -1);
      }
    }

    return actions;
  }

  /** Normalize one action object — same logic for both plan steps and followUp. */
  _normalizeAction(a) {
    const platform = this._normalizePlatform(a.platform) || 'unknown';
    let actionId = a.actionId || 'unknown';
    if (actionId.includes(':')) actionId = actionId.split(':').pop();

    const catalogEntry = actionRegistry.getAction(platform, actionId);
    const description  = catalogEntry?.stepLabel || a.description || actionId;

    // Strip null / undefined / empty-string parameter values AND empty
    // objects/arrays. JS defaults only trigger for `undefined`; null literals
    // and empty filter objects (`filters: {}`) would otherwise leak through
    // and either corrupt URLs or display as noise in the Plan card.
    const parameters = {};
    for (const [k, v] of Object.entries(a.parameters || {})) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
      parameters[k] = v;
    }

    return { actionId, platform, description, parameters };
  }

  /**
   * Snap any AI-echoed platform string ("LinkedIn", "linked in",
   * "LinkedIn.com", " linkedin ") to a canonical id from the allowlist.
   * Returns null if no close match found.
   */
  _normalizePlatform(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const ALLOWED = ['linkedin', 'hubspot', 'ghl', 'slack', 'notion', 'smartlead'];
    // Strip whitespace/punctuation, lowercase, drop common suffixes the AI loves to add
    const cleaned = raw.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    // Exact match
    if (ALLOWED.includes(cleaned)) return cleaned;
    // Substring containment (handles "linkedincom", "linkedin1", etc.)
    for (const id of ALLOWED) {
      if (cleaned.includes(id)) return id;
    }
    return null;
  }

  /**
   * Return a fallback plan when generation fails entirely.
   */
  _fallbackPlan() {
    return {
      planReady: false,
      message: 'Could not generate a plan from the AI response.',
      clarificationNeeded: 'I had trouble understanding the response. Could you try again?',
      actions: []
    };
  }
}

module.exports = new PlanGenerator();
