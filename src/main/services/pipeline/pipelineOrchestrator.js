const actionRegistry  = require('./actionRegistry');
const intentRouter    = require('./intentRouter');
const actionRetriever = require('./actionRetriever');
const planGenerator   = require('./planGenerator');
const v2              = require('./v2');

/**
 * PipelineOrchestrator (v2 + legacy)
 *
 * Two paths now share this entry point:
 *   • v2 pipeline — typed catalog + plan compiler + flow executor.
 *     Currently handles LinkedIn (the platform with the richest typed
 *     catalog). Other platforms can be migrated incrementally.
 *   • legacy pipeline — IntentRouter + ActionRetriever (TF-IDF) +
 *     PlanGenerator. Still serves HubSpot, Slack, Notion, GHL, Smartlead.
 *
 * The orchestrator picks based on whether v2 has a typed catalog entry
 * for the action the user wants. v2 routing happens first; on miss it
 * falls through to the legacy pipeline.
 *
 * v2 emits typed cards with kind ∈ {prose, people_picker, post_picker,
 * conversation_picker, ask, menu, approve, result, error}. The legacy
 * pipeline still emits {message, plan, execute} as before.
 */
class PipelineOrchestrator {
  constructor() {
    this.state           = 'idle';     // idle | clarifying | plan_presented (legacy only)
    this.pendingPlan     = null;
    this.lastIntent      = null;
    this.lastRetrievedActions = null;
    this.initialized     = false;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      await actionRegistry.initialize();
      this.initialized = true;
      console.log('✅ PipelineOrchestrator initialized (v2 + legacy)');
    } catch (error) {
      console.error('❌ PipelineOrchestrator initialization failed:', error);
      throw error;
    }
  }

  reset() {
    this.state           = 'idle';
    this.pendingPlan     = null;
    this.lastIntent      = null;
    this.lastRetrievedActions = null;
    // Clear any active v2 flow.
    v2.clearFlow('default');
  }

  /**
   * Main entry. Returns a typed response that Chat.jsx renders directly.
   *
   *   { type: 'message',  message }
   *   { type: 'plan',     plan, message }                       (legacy)
   *   { type: 'execute',  executionJSON }                       (legacy approve)
   *   { type: 'flow',     card }                                (v2 — see card kinds)
   */
  async processMessage(userMessage, chatHistory = [], platformName = null, connectedPlatforms = null) {
    if (!this.initialized) await this.initialize();

    // Legacy plan approval handler (only for legacy plans).
    if (this.state === 'plan_presented') {
      return this._handlePlanResponse(userMessage);
    }
    if (this.state === 'clarifying') {
      this.state = 'idle';
    }

    return this._runPipeline(userMessage, chatHistory, platformName, connectedPlatforms);
  }

  async _runPipeline(userMessage, chatHistory, platformName, connectedPlatformsFromRenderer) {
    const connectedPlatforms = this._getConnectedPlatforms(platformName, connectedPlatformsFromRenderer);
    const chatId = 'default';   // single-chat for now; can become per-tab later

    // ── v2 first if there's an active flow OR LinkedIn is connected ────────
    if (v2.hasFlow(chatId) || v2.shouldHandle(connectedPlatforms)) {
      try {
        const card = await v2.processMessage(
          chatId,
          userMessage,
          chatHistory,
          connectedPlatforms,
          this._buildDeps(),
        );
        if (card.kind !== 'fallback') {
          return this._wrapV2(card);
        }
        // v2 returned 'fallback' meaning the goal extractor couldn't map to
        // a typed action — fall through to legacy.
      } catch (err) {
        console.error('❌ v2 pipeline error:', err);
        // Fall through to legacy on hard error.
      }
    }

    // ── Legacy path ────────────────────────────────────────────────────────
    return this._runLegacyPipeline(userMessage, chatHistory, connectedPlatforms);
  }

  /**
   * Resume an in-progress v2 flow with a structured user event.
   *   { kind: 'pick'|'ask'|'approve'|'cancel'|'menu', value, option? }
   */
  async processFlowEvent(event) {
    const chatId = 'default';
    const card = await v2.processEvent(chatId, event, this._buildDeps());
    return this._wrapV2(card);
  }

  /** Build the deps the v2 executor needs to actually run actions. */
  _buildDeps() {
    return {
      runAction: async (platform, actionId, params) => {
        // The actual HTTP call happens in the renderer (which has the auth
        // token + handles LinkedIn challenges). The executor delegates here
        // by emitting an `execute_request` card and awaiting the response —
        // but for simplicity we mark v2 stages as "renderer-executed" via
        // the wrapped card spec, and the orchestrator never directly calls
        // backend HTTP from main.
        throw new Error('runAction must be invoked via the renderer-side dispatcher.');
      },
    };
  }

  /** Wrap a v2 card spec for the IPC response. */
  _wrapV2(card) {
    return {
      type: 'flow',
      card,
    };
  }

  // ── Legacy path (unchanged) ─────────────────────────────────────────────
  async _runLegacyPipeline(userMessage, chatHistory, connectedPlatforms) {
    try {
      const intent = await intentRouter.classify(userMessage, connectedPlatforms, chatHistory);

      if (intent.type === 'conversation') {
        return { type: 'message', message: intent.conversationResponse || "Hey! Tell me what you'd like to automate." };
      }
      if (intent.needsClarification) {
        this.state = 'clarifying';
        return {
          type: 'message',
          message: intent.clarificationMessage
            || `I can help with that! Which platform would you like to use? You have: ${connectedPlatforms.join(', ')}`,
        };
      }

      this.lastIntent = intent;
      const retrievedActions = actionRetriever.retrieve(intent);
      this.lastRetrievedActions = retrievedActions;

      if (retrievedActions.length === 0) {
        return { type: 'message', message: `I couldn't find a matching action for that request. Could you rephrase?` };
      }

      const plan = await planGenerator.generate(userMessage, retrievedActions, chatHistory);

      if (!plan.planReady && plan.clarificationNeeded) {
        this.state = 'clarifying';
        return { type: 'message', message: plan.clarificationNeeded };
      }
      if (!plan.planReady) {
        return { type: 'message', message: plan.message || 'I need more information.' };
      }

      const primaryPlatform = plan.actions?.[0]?.platform || intent.platforms[0];
      this.pendingPlan = { ...plan, platform: primaryPlatform };
      this.state = 'plan_presented';

      return {
        type: 'plan',
        message: plan.message || "Here's your execution plan:",
        plan: { message: plan.message, actions: plan.actions, followUp: plan.followUp || null },
      };
    } catch (error) {
      console.error('❌ Legacy pipeline error:', error);
      return { type: 'message', message: `Sorry, I encountered an error: ${error.message}.` };
    }
  }

  async _handlePlanResponse(userMessage) {
    const lower = userMessage.toLowerCase().trim();
    if (lower === 'approve' || lower === 'yes' || lower.includes('approve')) {
      try {
        const executionJSON = await planGenerator.generateExecutionJSON(this.pendingPlan, this.pendingPlan.platform);
        this.state = 'idle';
        this.pendingPlan = null;
        return { type: 'execute', message: 'Executing plan...', executionJSON };
      } catch (error) {
        return { type: 'message', message: `Failed to generate execution plan: ${error.message}.` };
      }
    }
    if (lower === 'edit' || lower.includes('edit') || lower.includes('change')) {
      this.state = 'idle';
      this.pendingPlan = null;
      return { type: 'edit', message: 'What would you like to change?' };
    }
    return { type: 'message', message: 'Please click "Approve" to execute or "Edit" to make changes.' };
  }

  _getConnectedPlatforms(platformName, fromRenderer = null) {
    if (platformName)                            return [platformName.toLowerCase()];
    if (fromRenderer && fromRenderer.length > 0) return fromRenderer;
    return ['hubspot', 'ghl', 'slack', 'notion', 'smartlead'];
  }
}

const orchestrator = new PipelineOrchestrator();
module.exports = { PipelineOrchestrator: orchestrator };
