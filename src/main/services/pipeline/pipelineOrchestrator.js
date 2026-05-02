const actionRegistry   = require('./actionRegistry');
const intentRouter     = require('./intentRouter');
const actionRetriever  = require('./actionRetriever');
const planGenerator    = require('./planGenerator');

/**
 * PipelineOrchestrator — Replaces the old ChatbotService.
 *
 * 3-stage pipeline:
 *   1. IntentRouter   (AI call)  — classify platform + intent
 *   2. ActionRetriever (math)    — find matching actions via TF-IDF
 *   3. PlanGenerator  (AI call)  — build execution plan from relevant actions
 *
 * Returns the EXACT same response format as the old ChatbotService:
 *   { type: 'message'|'plan'|'execute'|'edit', message, plan?, executionJSON? }
 */
class PipelineOrchestrator {
  constructor() {
    this.state = 'idle';          // idle | clarifying | plan_presented
    this.pendingPlan = null;
    this.lastIntent = null;
    this.lastRetrievedActions = null;
    this.initialized = false;
  }

  // ─── Initialization ──────────────────────────────────────────────────────
  async initialize() {
    if (this.initialized) return;
    try {
      await actionRegistry.initialize();
      this.initialized = true;
      console.log('✅ PipelineOrchestrator initialized');
    } catch (error) {
      console.error('❌ PipelineOrchestrator initialization failed:', error);
      throw error;
    }
  }

  // ─── Reset state ─────────────────────────────────────────────────────────
  reset() {
    this.state = 'idle';
    this.pendingPlan = null;
    this.lastIntent = null;
    this.lastRetrievedActions = null;
  }

  // ─── Main entry point (same signature as old ChatbotService) ─────────────
  async processMessage(userMessage, chatHistory = [], platformName = null, connectedPlatforms = null) {
    // Ensure initialized
    if (!this.initialized) {
      await this.initialize();
    }

    // Handle plan approval/edit state
    if (this.state === 'plan_presented') {
      return this._handlePlanResponse(userMessage);
    }

    // Handle clarification response — re-run pipeline with new context
    if (this.state === 'clarifying') {
      this.state = 'idle';
    }

    // Run the 3-stage pipeline
    return this._runPipeline(userMessage, chatHistory, platformName, connectedPlatforms);
  }

  // ─── 3-Stage Pipeline ────────────────────────────────────────────────────
  async _runPipeline(userMessage, chatHistory, platformName, connectedPlatformsFromRenderer = null) {
    try {
      // Get connected platforms (prefer live list from renderer)
      const connectedPlatforms = this._getConnectedPlatforms(platformName, connectedPlatformsFromRenderer);

      // ── Stage 1: IntentRouter (AI call #1) ────────────────────────────
      console.log('🔍 Stage 1: IntentRouter — classifying intent...');
      const intent = await intentRouter.classify(userMessage, connectedPlatforms);
      console.log('✅ Intent:', JSON.stringify(intent));

      // If it's a conversational message (greeting, question, thanks), respond directly
      if (intent.type === 'conversation') {
        return {
          type: 'message',
          message: intent.conversationResponse || "Hey! Tell me what you'd like to automate."
        };
      }

      // If router can't determine platform, ask for clarification
      if (intent.needsClarification) {
        this.state = 'clarifying';
        return {
          type: 'message',
          message: intent.clarificationMessage
            || `I can help with that! Which platform would you like to use? You have: ${connectedPlatforms.join(', ')}`
        };
      }

      this.lastIntent = intent;

      // ── Stage 2: ActionRetriever (no AI — vector math) ────────────────
      console.log('📂 Stage 2: ActionRetriever — searching actions...');
      const retrievedActions = actionRetriever.retrieve(intent);
      console.log(`✅ Retrieved ${retrievedActions.length} actions:`, retrievedActions.map(a => a.actionId));

      this.lastRetrievedActions = retrievedActions;

      if (retrievedActions.length === 0) {
        return {
          type: 'message',
          message: `I couldn't find a matching action for that request. Could you rephrase what you'd like to do?`
        };
      }

      // ── Stage 3: PlanGenerator (AI call #2) ──────────────────────────
      console.log('📋 Stage 3: PlanGenerator — building plan...');
      const plan = await planGenerator.generate(userMessage, retrievedActions, chatHistory);
      console.log('✅ Plan:', JSON.stringify(plan).substring(0, 200));

      // If plan needs clarification (missing required params)
      if (!plan.planReady && plan.clarificationNeeded) {
        this.state = 'clarifying';
        return {
          type: 'message',
          message: plan.clarificationNeeded
        };
      }

      // If plan somehow isn't ready but no clarification needed
      if (!plan.planReady) {
        return {
          type: 'message',
          message: plan.message || 'I need more information. Could you provide more details about what you want to do?'
        };
      }

      // ── Plan ready — present to user ──────────────────────────────────
      // Determine the primary platform from the plan actions or intent
      const primaryPlatform = plan.actions?.[0]?.platform || intent.platforms[0];

      this.pendingPlan = {
        ...plan,
        platform: primaryPlatform
      };
      this.state = 'plan_presented';

      return {
        type: 'plan',
        message: plan.message || "Here's your execution plan:",
        plan: {
          message: plan.message,
          actions: plan.actions,
          // followUp surfaces in the Plan Approval card so the user sees
          // the full intent ("Search OpenAI people, then send connection
          // request") even though the actual action is gated behind a pick.
          followUp: plan.followUp || null,
        }
      };

    } catch (error) {
      console.error('❌ Pipeline error:', error);
      return {
        type: 'message',
        message: `Sorry, I encountered an error: ${error.message}. Please try again.`
      };
    }
  }

  // ─── Handle approve/edit after plan is shown ─────────────────────────────
  async _handlePlanResponse(userMessage) {
    const lower = userMessage.toLowerCase().trim();

    // Approve
    if (lower === 'approve' || lower === 'yes' || lower.includes('approve')) {
      try {
        const executionJSON = await planGenerator.generateExecutionJSON(
          this.pendingPlan,
          this.pendingPlan.platform
        );

        const result = {
          type: 'execute',
          message: 'Executing plan...',
          executionJSON: executionJSON
        };

        this.state = 'idle';
        this.pendingPlan = null;
        return result;

      } catch (error) {
        console.error('❌ Execution JSON generation failed:', error);
        return {
          type: 'message',
          message: `Failed to generate execution plan: ${error.message}. Please try again.`
        };
      }
    }

    // Edit
    if (lower === 'edit' || lower.includes('edit') || lower.includes('change')) {
      this.state = 'idle';
      this.pendingPlan = null;
      return {
        type: 'edit',
        message: 'What would you like to change?'
      };
    }

    // Neither approve nor edit
    return {
      type: 'message',
      message: 'Please click "Approve" to execute or "Edit" to make changes.'
    };
  }

  // ─── Get connected platforms ──────────────────────────────────────────────
  _getConnectedPlatforms(platformName, connectedPlatformsFromRenderer = null) {
    // If a platform was explicitly passed (backward compat), use it
    if (platformName) {
      return [platformName.toLowerCase()];
    }

    // Use the live connected platforms list from the renderer (from platformStore)
    if (connectedPlatformsFromRenderer && connectedPlatformsFromRenderer.length > 0) {
      return connectedPlatformsFromRenderer;
    }

    // Fallback: all platforms with working backends
    return ['hubspot', 'ghl', 'slack', 'notion', 'smartlead'];
  }
}

// Export singleton
const orchestrator = new PipelineOrchestrator();
module.exports = { PipelineOrchestrator: orchestrator };
