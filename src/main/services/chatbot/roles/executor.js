const fs = require('fs');
const path = require('path');
const { CerebrasService } = require('../../cerebrasService');
const { ExecutionPlanBuilder } = require('../utils/executionPlanBuilder');

class Executor {
  /**
   * Load platform-specific executor prompt
   * @param {string} platformId - Platform identifier
   * @returns {string} System prompt
   */
  loadSystemPrompt(platformId) {
    try {
      const promptPath = path.join(
        __dirname,
        '../../../../automation/platforms',
        platformId,
        'prompts',
        'executor-prompt.txt'
      );

      if (!fs.existsSync(promptPath)) {
        console.warn(`⚠️  Executor prompt not found for ${platformId}, using default`);
        return this.getDefaultPrompt(platformId);
      }

      return fs.readFileSync(promptPath, 'utf8');
    } catch (error) {
      console.error(`❌ Failed to load executor prompt for ${platformId}:`, error);
      return this.getDefaultPrompt(platformId);
    }
  }

  /**
   * Get default executor prompt
   * @param {string} platformId - Platform identifier
   * @returns {string} Default prompt
   */
  getDefaultPrompt(platformId) {
    return `You are an execution assistant for ${platformId} automation.

Your ONLY job is to:
1. Receive an approved execution plan
2. Check API and automation registries
3. Determine execution method for each action
4. Create valid execution JSON
5. Output ONLY valid JSON, no explanations`;
  }

  /**
   * Create execution JSON from approved plan
   * @param {Object} approvedPlan - Approved plan from gatherer
   * @param {string} platformId - Platform identifier
   * @returns {Promise<Object>} Execution JSON
   */
  async createExecutionJSON(approvedPlan, platformId) {
    try {
      // If plan already has structured actions, use ExecutionPlanBuilder
      if (approvedPlan.actions && Array.isArray(approvedPlan.actions)) {
        const executionPlan = ExecutionPlanBuilder.buildExecutionPlan(platformId, approvedPlan.actions);
        const validation = ExecutionPlanBuilder.validateExecutionPlan(executionPlan);
        
        if (!validation.valid) {
          throw new Error(`Invalid execution plan: ${validation.error}`);
        }

        return executionPlan;
      }

      // Otherwise, use AI to generate execution JSON
      const systemPrompt = this.loadSystemPrompt(platformId);
      const planContext = JSON.stringify(approvedPlan, null, 2);

      const prompt = `Create execution JSON for this approved plan:\n\n${planContext}\n\nOutput ONLY valid JSON:`;

      const response = await CerebrasService.sendMessage(
        prompt,
        [],
        platformId,
        systemPrompt
      );

      // Parse JSON from response
      let executionJSON = this.extractJSON(response.message);

      // Validate and enhance with ExecutionPlanBuilder if needed
      if (executionJSON && executionJSON.steps) {
        const validation = ExecutionPlanBuilder.validateExecutionPlan(executionJSON);
        if (!validation.valid) {
          throw new Error(`Invalid execution JSON: ${validation.error}`);
        }
      } else {
        // Fallback: build from approved plan structure
        executionJSON = ExecutionPlanBuilder.buildExecutionPlan(platformId, approvedPlan.actions || []);
      }

      return executionJSON;
    } catch (error) {
      console.error('❌ Executor error:', error);
      throw error;
    }
  }

  /**
   * Extract JSON from AI response
   * @param {string} message - AI response message
   * @returns {Object|null} Parsed JSON or null
   */
  extractJSON(message) {
    try {
      // Remove markdown code blocks if present
      let cleaned = message.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      // Try to find JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Try parsing entire message
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('❌ Failed to extract JSON:', error);
      return null;
    }
  }
}

module.exports = { Executor: new Executor() };

