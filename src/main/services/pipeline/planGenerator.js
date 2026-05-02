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
When the user wants to perform a LinkedIn action ON a person AND that person is NOT given as a LinkedIn URL or vanity slug — emit a TWO-PART plan:
  • A first action that SEARCHES for the person via "search_people"
  • A "followUp" object describing what to do once the user picks one candidate

Triggering verbs: "send invite/connection request to ...", "send a message to ...", "like ... post", "comment on ... post", "follow ...", "view ... profile", "fetch ... posts", etc.

A LinkedIn URL looks like https://www.linkedin.com/in/<vanity>/ or just a recognizable vanity slug. If the user gave one of those, use the direct path (no search step, no followUp). If they only gave a person's name (and optionally their company / location / school) — disambiguation is REQUIRED.

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
- "keywords" should be a free-text query (e.g. "john smith openai" or "data scientist openai san francisco"). It does NOT have to map to an exact name.
- Only include filters the user actually mentioned. Drop empty filter keys entirely.
- "network" filter: "F" = 1st-degree, "S" = 2nd-degree. Use "F,S" when the user says "people I know" / "my network".
- paramSlot is ALWAYS "profileUrn" for LinkedIn person targets — never anything else.
- "When user says \"this/her/him/that person/them\" referring to a previously-shown candidate, the orchestrator will resolve from chat context — still emit the same disambiguation plan if the prior pick is unclear.
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
   * If the plan has 2+ actions where:
   *  - the LAST action's parameters lack `profileUrn` (or have it empty/placeholder), AND
   *  - a previous action is `search_people`
   * …pull the last action OUT of `actions[]` and into `out.followUp`. This
   * recovers from the AI's most common slip-up around the disambiguation
   * pattern.
   */
  _extractFollowUp(plan) {
    const actions = plan.actions || [];
    if (plan.followUp || actions.length < 2) return actions;

    const last = actions[actions.length - 1];
    const prev = actions.slice(0, -1).find((a) => a.actionId === 'search_people');
    if (!prev) return actions;

    // Person-targeted actions all use `profileUrn` as their primary slot.
    const PERSON_TARGETED = new Set([
      'send_invite', 'send_message', 'follow', 'unfollow',
      'get_user_posts', 'get_profile', 'get_connection_status',
    ]);
    const hasProfileUrn = last.parameters?.profileUrn
                       && typeof last.parameters.profileUrn === 'string'
                       && last.parameters.profileUrn.startsWith('urn:');
    if (PERSON_TARGETED.has(last.actionId) && !hasProfileUrn) {
      // Remove profileUrn placeholder if present (e.g. AI wrote "<TBD>")
      const params = { ...(last.parameters || {}) };
      delete params.profileUrn;
      plan.followUp = { ...last, parameters: params, paramSlot: 'profileUrn' };
      return actions.slice(0, -1);   // drop the last action
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
