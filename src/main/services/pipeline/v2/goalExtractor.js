/**
 * Goal Extractor — one narrow AI call.
 *
 * Replaces the old IntentRouter + PlanGenerator. Given a user message + chat
 * history + the typed catalog, it outputs a Goal:
 *
 *   { platform, actionId, descriptor: { ... freeform values ... } }
 *
 * It does NOT decide order, does NOT pick chains, does NOT fill URNs.
 * Composition is the compiler's job. This call is purely about "what does
 * the user want?"
 *
 * The prompt is principle-based: it lists the available typed actions and
 * asks the model to map the user's request to ONE actionId + a descriptor.
 * No verb enumeration, no example phrases.
 */

const { CerebrasService } = require('../../cerebrasService');
const { allActions } = require('./catalog');

const SYSTEM_PROMPT = `You are a goal extractor for a CRM automation tool. The user types a natural-language request. Your job is to identify which catalog action they want and extract any freeform values they gave.

You output exactly one JSON object, no prose:
{
  "platform":   "<platform id>",
  "actionId":   "<action id>",
  "descriptor": { "<freeform slot>": "<value>", ... },
  "confidence": 0.0 to 1.0,
  "needsClarification": false,
  "clarificationMessage": null
}

Or, when the request is too ambiguous to map confidently:
{
  "platform":   null,
  "actionId":   null,
  "descriptor": {},
  "confidence": 0.0,
  "needsClarification": true,
  "clarificationMessage": "<one short question>"
}

Or, when the user is just chatting (greetings, thanks, small talk):
{
  "type": "conversation",
  "conversationResponse": "<short friendly reply>"
}

RULES:
- Pick the SINGLE action that best matches the user's intent. The compiler will figure out any prerequisite steps automatically — do NOT chain multiple actions yourself.
- Never invent URNs, IDs, or identifiers. Leave URN-shaped slots empty; the compiler resolves them via prerequisite actions.
- Fill freeform/userInput slots only with values the user actually said.
- Default to a confident classification. Reach for "needsClarification" only when the request is genuinely missing the user's intent (e.g., "do something" with no verb), NOT when an identifier is missing.
- Imperatives are tasks. Mentions of real entities (people, posts, contacts) on a connected platform are tasks.

WHAT YOU MUST NEVER ASK THE USER:
- Never ask for a URL, vanity slug, profile handle, username, or any platform-specific identifier. The user gave you a name; that is sufficient. The compiler will run a search step automatically to resolve it.
- Never ask for a URN, post id, message id, comment id, contact id, deal id, channel id, or any internal id. Those are produced by prerequisite actions in the chain.
- Never ask "which one?" when the user gave a relative qualifier (latest, most recent, first, top, etc.). The compiler auto-picks based on the qualifier.
- Never ask for a platform name when one connected platform clearly fits the entity type (e.g., a "post" on a feed → LinkedIn).

If the only thing missing is an identifier, that is NEVER missing — the system resolves identifiers automatically. Set planReady=true (i.e., emit the goal) and let the compiler take care of it.

Only ask "needsClarification" when the user's intent itself is unclear — what they want to DO is unknown — not what entity to do it on.

DESCRIPTOR SHAPE:
- The descriptor is a plain object whose keys are slot names that the catalog action consumes, and whose values are what the user said.
- When the user names a person, place the name string under "person".
- When the user pastes or types a post URL, place the URN string under "post".
- When the user gives a free-text body, message, or comment, place it under the matching slot ("body", "message", etc.).
- When the user qualifies which item among a list to act on (any positional or recency adjective), capture the qualifier in a "*_hint" or "recency" key so the compiler can auto-pick.

Output JSON only. No markdown.`;

class GoalExtractor {
  /**
   * @param {string} userMessage
   * @param {Array}  chatHistory     last N turns of {type, content}
   * @param {string[]} connectedPlatforms
   * @returns {Promise<Goal>}
   */
  async extract(userMessage, chatHistory = [], connectedPlatforms = []) {
    const catalogContext = this._buildCatalogContext(connectedPlatforms);
    const fullPrompt = SYSTEM_PROMPT + '\n\n' + catalogContext;

    const trimmedHistory = (chatHistory || []).slice(-6).map((msg) => ({
      type:    msg.type || msg.role || 'user',
      content: msg.content || msg.text || '',
    }));

    try {
      const response = await CerebrasService.sendMessage(
        userMessage,
        trimmedHistory,
        null,
        fullPrompt,
        { temperature: 0, max_tokens: 400 },
      );
      const text = response.message || response;
      return this._parse(text);
    } catch (err) {
      console.error('[GoalExtractor] extraction failed:', err.message);
      return {
        type: 'error',
        message: 'I had trouble understanding that. Could you rephrase?',
      };
    }
  }

  /**
   * Build the catalog context. Deliberately exposes ONLY the user-facing
   * concept of each action (label + plain-English description). We do NOT
   * leak slot names, parameter types, URN types, or consumes/produces
   * structure — that's the compiler's job. If the AI doesn't know
   * identifiers exist, it can't ask the user for one.
   */
  _buildCatalogContext(connectedPlatforms) {
    const lines = ['CONNECTED PLATFORMS: ' + (connectedPlatforms.join(', ') || '(none)')];
    lines.push('');
    lines.push('AVAILABLE ACTIONS (emit ONE of these as actionId):');
    for (const action of allActions()) {
      if (connectedPlatforms.length > 0 && !connectedPlatforms.includes(action.platform)) continue;
      lines.push(
        `- ${action.platform}.${action.id}: ${action.label}` +
        (action.description ? ` — ${action.description.slice(0, 140)}` : ''),
      );
    }
    return lines.join('\n');
  }

  _parse(text) {
    if (!text || typeof text !== 'string') {
      return { type: 'error', message: 'Empty response from extractor.' };
    }
    let str = text.trim();
    const codeBlock = str.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) str = codeBlock[1].trim();
    const objectMatch = str.match(/\{[\s\S]*\}/);
    if (objectMatch) str = objectMatch[0];

    // Try strict parse first, then jsonrepair fallback for the common
    // model glitches (trailing commas, unquoted keys, smart quotes).
    let obj;
    try {
      obj = JSON.parse(str);
    } catch (e1) {
      try {
        const { jsonrepair } = require('jsonrepair');
        obj = JSON.parse(jsonrepair(str));
      } catch (e2) {
        console.error('[GoalExtractor] parse + repair failed:', e1.message, '|', e2.message, '| raw:', text.slice(0, 200));
        return { type: 'error', message: 'Could not parse extractor output.' };
      }
    }
    try {
      if (obj.type === 'conversation') return obj;
      if (obj.needsClarification) {
        return {
          type:                 'clarification',
          clarificationMessage: obj.clarificationMessage || 'Could you say more about what you want to do?',
        };
      }
      if (obj.platform && obj.actionId) {
        return {
          type:       'goal',
          platform:   obj.platform,
          actionId:   obj.actionId,
          descriptor: obj.descriptor || {},
          confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.5,
        };
      }
      return { type: 'error', message: 'Could not interpret your request.' };
    } catch (err) {
      console.error('[GoalExtractor] parse failed:', err.message);
      return { type: 'error', message: 'Could not parse extractor output.' };
    }
  }
}

module.exports = new GoalExtractor();
