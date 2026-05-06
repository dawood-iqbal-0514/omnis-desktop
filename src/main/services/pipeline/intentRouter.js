const { CerebrasService } = require('../cerebrasService');

const INTENT_SYSTEM_PROMPT = `You are Omnis Assistant. You help users get things done. You are friendly, concise, and slightly witty.

CONNECTED PLATFORMS (ONLY these exist, NEVER mention any other platform): {platformList}

Classify the user message and output ONLY a JSON object. Nothing else.

If the user is making conversation (greeting, question, thanks, chit-chat):
{"type":"conversation","conversationResponse":"your short friendly reply"}

If the user is requesting an action — anything they want done on a platform, on an entity, or to a person:
{"type":"task","platforms":["platform"],"category":"contacts","operation":"create","keywords":["word1","word2"],"confidence":0.9,"needsClarification":false,"clarificationMessage":null}

CLASSIFICATION RULES:
- Default to task. Classify as conversation only when the message is unambiguously chit-chat with no actionable verb and no reference to a platform-specific entity (person, post, contact, channel, deal, etc.).
- A request that refers to a real-world entity that lives on a connected platform is a task. Pick the platform from context and the entity type — do not require the platform name to be spelled out.
- The user's message is interpreted in light of the prior turns. If the assistant just asked a clarifying question, the user's reply continues that task — re-emit the prior task's classification rather than resetting.
- Never re-interpret an action request as the user expressing an opinion or sharing thoughts. The user is here to operate the system, not to converse.

CONVERSATION RULES (when the message really is chit-chat):
- Greetings: short friendly reply like "Hey! What would you like to do today?" — do not list platforms.
- "What can you do?": describe capabilities in terms of outcomes ("I can create contacts, send messages, manage campaigns, etc."). Do not name specific platforms.

OUTPUT RULES:
- NEVER mention APIs, integrations, tokens, scripts, endpoints, or any platform not in the connected list: {platformList}.
- Output raw JSON only. No markdown, no explanation, no code blocks.`;

class IntentRouter {
  /**
   * Classify user message into a structured intent via Cerebras AI.
   * @param {string} userMessage - The user's natural language message
   * @param {string[]} connectedPlatforms - List of connected platform names
   * @returns {Promise<object>} Parsed intent object
   */
  async classify(userMessage, connectedPlatforms, chatHistory = []) {
    const platformList = connectedPlatforms.join(', ');
    const systemPrompt = INTENT_SYSTEM_PROMPT.replace('{platformList}', platformList);

    // Trim history to last 6 turns — enough for follow-up references like
    // "go ahead", "the latest one", "just comment" to resolve back to the
    // task that was interrupted, without paying for a long context window.
    const trimmedHistory = (chatHistory || []).slice(-6).map((msg) => ({
      type:    msg.type || msg.role || 'user',
      content: msg.content || msg.text || '',
    }));

    try {
      console.log('[IntentRouter] System prompt being sent:', systemPrompt.substring(0, 200));
      console.log('[IntentRouter] User message:', userMessage);

      const response = await CerebrasService.sendMessage(
        userMessage,
        trimmedHistory,
        null,
        systemPrompt,
        { temperature: 0, max_tokens: 300 }
      );

      const responseText = response.message || response;
      console.log('[IntentRouter] Raw AI response:', responseText);
      return this._parseIntent(responseText);
    } catch (error) {
      console.error('[IntentRouter] Classification failed:', error.message);
      return this._fallbackIntent(connectedPlatforms);
    }
  }

  /**
   * Parse intent JSON from the AI response.
   * Handles markdown code blocks, raw JSON, and malformed responses.
   */
  _parseIntent(response) {
    if (!response || typeof response !== 'string') {
      return this._fallbackIntent([]);
    }

    let jsonStr = response.trim();

    // Strip markdown code blocks if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to extract JSON object from the string
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      return this._validateIntent(parsed);
    } catch (parseError) {
      console.error('[IntentRouter] JSON parse failed:', parseError.message);
      return this._fallbackIntent([]);
    }
  }

  /**
   * Validate and normalize the parsed intent, filling in defaults for missing fields.
   */
  _validateIntent(parsed) {
    // Handle conversation type (greetings, questions, thanks)
    if (parsed.type === 'conversation') {
      return {
        type: 'conversation',
        conversationResponse: parsed.conversationResponse || "Hey! What would you like to automate?",
      };
    }

    // Task type (action request)
    return {
      type: 'task',
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms : [],
      category: typeof parsed.category === 'string' ? parsed.category : 'unknown',
      operation: typeof parsed.operation === 'string' ? parsed.operation : 'unknown',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      needsClarification: !!parsed.needsClarification,
      clarificationMessage: parsed.clarificationMessage || null
    };
  }

  /**
   * Return a fallback intent when classification fails entirely.
   */
  _fallbackIntent(connectedPlatforms) {
    return {
      platforms: connectedPlatforms.length > 0 ? [connectedPlatforms[0]] : [],
      category: 'unknown',
      operation: 'unknown',
      keywords: [],
      confidence: 0,
      needsClarification: true,
      clarificationMessage: 'I could not understand your request. Could you rephrase what you would like to do?'
    };
  }
}

module.exports = new IntentRouter();
