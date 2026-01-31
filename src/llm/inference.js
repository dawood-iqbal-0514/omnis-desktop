const { SYSTEM_PROMPT, INTENT_EXTRACTION_PROMPT, TASK_GENERATION_PROMPT } = require('./prompts/system');
const { intentSchema } = require('./schemas/intent');
const { taskSchema } = require('./schemas/task');

class InferenceEngine {
  constructor(modelManager) {
    this.modelManager = modelManager;
    this.defaultOptions = {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxTokens: 1024,
      stopSequences: [],
    };
  }

  async complete(options) {
    const { messages, ...inferenceOptions } = options;

    if (!this.modelManager.isLoaded) {
      await this.modelManager.load();
    }

    const opts = { ...this.defaultOptions, ...inferenceOptions };

    try {
      console.log('[LLM] Running inference...');

      const response = {
        role: 'assistant',
        content: 'This is a placeholder response. Implement actual LLM inference.',
      };

      console.log('[LLM] Inference complete');
      return response;
    } catch (error) {
      console.error('[LLM] Inference error:', error);
      throw error;
    }
  }

  async extractIntent(userMessage) {
    const messages = [
      { role: 'system', content: INTENT_EXTRACTION_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const response = await this.complete({
      messages,
      temperature: 0.3,
      maxTokens: 512,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[LLM] Failed to parse intent:', error);
    }

    return {
      platform: null,
      action: null,
      params: {},
      confidence: 0,
    };
  }

  async generateTasks(userMessage, context = {}) {
    const messages = [
      { role: 'system', content: TASK_GENERATION_PROMPT },
      { role: 'user', content: userMessage },
    ];

    const response = await this.complete({
      messages,
      temperature: 0.5,
      maxTokens: 1024,
    });

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[LLM] Failed to parse tasks:', error);
    }

    return [];
  }

  async chat(messages, options = {}) {
    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    return this.complete({
      messages: fullMessages,
      ...options,
    });
  }

  async generateResultResponse(action, result) {
    const prompt = `Generate a friendly response for the following completed action:
Action: ${action}
Result: ${JSON.stringify(result, null, 2)}

Respond naturally, confirming what was done.`;

    const response = await this.complete({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      maxTokens: 256,
    });

    return response.content;
  }
}

module.exports = { InferenceEngine };
