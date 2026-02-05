const axios = require('axios');

class CerebrasService {
  constructor() {
    this.apiKey = null;
    this.baseURL = 'https://api.cerebras.ai/v1';
    this.defaultModel = 'llama-3.1-8b-instruct';
    this.chatHistory = [];
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  getApiKey() {
    return this.apiKey;
  }

  async sendMessage(userMessage, chatHistory = [], platformName = null, customSystemPrompt = null) {
    if (!this.apiKey) {
      throw new Error('Cerebras API key not set. Please enter your API key.');
    }

    try {
      // Use custom system prompt if provided, otherwise use default
      let systemPrompt = customSystemPrompt;
      
      if (!systemPrompt) {
        // Build default system prompt with platform context
        systemPrompt = 'You are Omnis Assistant - a sarcastic, witty, and slightly jaded AI assistant who helps users with platform integrations and tasks. You have a dry sense of humor and make jokes while being helpful. Your personality is: sarcastic, joky, witty, but still professional enough to get the job done. You tease users playfully but always deliver results.';
        
        if (platformName) {
          systemPrompt += ` The user has already selected ${platformName} as their platform. DO NOT ask about the platform again - it's already ${platformName}. The user might want to: 1) Create a workflow (trigger events, actions, conditions), 2) Perform direct actions (create/update/read records, send messages, etc.), or 3) Get information about ${platformName} capabilities. Ask what they want to do and gather the necessary details.`;
        } else {
          systemPrompt += ' The user might want to: 1) Create a workflow, 2) Perform direct actions, or 3) Get information about platform capabilities. First, ask which platform they want to work with, then ask what they want to do and gather the necessary details.';
        }
        
        systemPrompt += ' Ask concise, one-at-a-time questions with your signature sarcastic flair. Once you have all required information, respond with exactly: [COMPLETE]';
      }

      // Format messages for Cerebras API
      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...chatHistory.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.defaultModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const assistantMessage = response.data.choices[0]?.message?.content || '';
      const isComplete = assistantMessage.includes('[COMPLETE]');

      return {
        message: assistantMessage.replace('[COMPLETE]', '').trim(),
        isComplete: isComplete
      };
    } catch (error) {
      console.error('❌ Cerebras API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your Cerebras API key.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 503) {
        throw new Error('Cerebras API is temporarily unavailable. Please try again in a few moments.');
      } else if (error.response?.status === 500) {
        console.error('❌ Cerebras API 500 error details:', error.response?.data);
        throw new Error('Cerebras API encountered an internal error. Please try again or contact support if the issue persists.');
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('aborted')) {
        throw new Error('Request was cancelled or timed out. Please try again.');
      } else if (error.code === 'ERR_CANCELED') {
        throw new Error('Request was cancelled. Please try again.');
      } else if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.message?.includes('getaddrinfo')) {
        throw new Error('Cannot connect to the AI service. Please check your internet connection and DNS settings.');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Connection to the AI service failed. Please check your internet connection and try again.');
      } else {
        throw new Error(error.response?.data?.error?.message || error.message || 'Failed to get response from Cerebras API.');
      }
    }
  }

  async extractWorkflowJSON(chatHistory) {
    if (!this.apiKey) {
      throw new Error('Cerebras API key not set.');
    }

    try {
      const conversationSummary = chatHistory
        .filter(msg => msg.type !== 'system')
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const extractionPrompt = `Extract automation workflow from conversation:

${conversationSummary}

Generate valid JSON workflow. Structure:
{
  "workflow": {
    "id": "workflow_123",
    "trigger": {"platform": "linkedin", "event": "schedule"},
    "steps": [{"id": "step_1", "type": "simple", "action": "post", "params": {"content": "text"}}]
  }
}

Output ONLY valid JSON:`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'You are a JSON extraction assistant. Output only valid JSON, no markdown, no explanations.'
            },
            {
              role: 'user',
              content: extractionPrompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      let jsonResponse = response.data.choices[0]?.message?.content || '';
      
      // Clean response (remove markdown code blocks if present)
      jsonResponse = jsonResponse.trim();
      if (jsonResponse.startsWith('```')) {
        jsonResponse = jsonResponse.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }

      try {
        return JSON.parse(jsonResponse);
      } catch (parseError) {
        // Try to repair JSON if needed
        const jsonrepair = require('jsonrepair');
        const repaired = jsonrepair(jsonResponse);
        return JSON.parse(repaired);
      }
    } catch (error) {
      console.error('❌ Workflow extraction error:', error.response?.data || error.message);
      throw new Error('Failed to extract workflow JSON: ' + (error.response?.data?.error?.message || error.message));
    }
  }

  resetChat() {
    this.chatHistory = [];
  }
}

module.exports = { CerebrasService: new CerebrasService() };

