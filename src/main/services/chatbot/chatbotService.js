const { InfoGatherer } = require('./roles/infoGatherer');
const { Executor } = require('./roles/executor');

class ChatbotService {
  constructor() {
    this.currentRole = 'gatherer';
    this.pendingPlan = null;
    this.platformId = null;
  }

  reset() {
    this.currentRole = 'gatherer';
    this.pendingPlan = null;
    this.platformId = null;
  }

  setPlatform(platformId) {
    this.platformId = platformId;
    this.reset(); // Reset when platform changes
  }

  async processMessage(userMessage, chatHistory = [], platformId) {
    if (!platformId) {
      throw new Error('Platform ID is required');
    }

    this.platformId = platformId;

    // Handle role-specific processing
    if (this.currentRole === 'gatherer') {
      return await this.handleGathererMessage(userMessage, chatHistory);
    } else if (this.currentRole === 'executor') {
      return await this.handleExecutorMessage(userMessage);
    }
  }

  async handleGathererMessage(userMessage, chatHistory) {
    try {
      const response = await InfoGatherer.process(userMessage, chatHistory, this.platformId);

      console.log('🔍 ChatbotService - Plan ready:', response.planReady);
      console.log('🔍 ChatbotService - Response message:', response.message?.substring(0, 100));

      // If plan is ready, switch to executor role
      if (response.planReady) {
        // Ensure we have a valid plan structure
        let plan = response.plan;
        
        if (!plan || !plan.actions || plan.actions.length === 0) {
          console.warn('⚠️ Plan missing actions, creating default');
          plan = {
            message: response.message || 'Execution plan ready',
            actions: plan?.actions || [{
              actionId: 'create_contact',
              description: 'Create contact with provided information',
              parameters: {}
            }]
          };
        }
        
        this.pendingPlan = plan;
        this.currentRole = 'executor';

        console.log('✅ Returning plan type response');
        return {
          type: 'plan',
          message: response.message || 'Here\'s your execution plan:',
          plan: this.pendingPlan
        };
      }

      return {
        type: 'message',
        message: response.message
      };
    } catch (error) {
      console.error('❌ ChatbotService handleGathererMessage error:', error);
      throw error;
    }
  }

  async handleExecutorMessage(userMessage) {
    if (userMessage.toUpperCase() === 'APPROVE' || userMessage.toLowerCase().includes('approve')) {
      // User approved plan, create execution JSON
      try {
        const executionJSON = await Executor.createExecutionJSON(this.pendingPlan, this.platformId);

        // Reset to gatherer for next task
        this.currentRole = 'gatherer';
        this.pendingPlan = null;

        return {
          type: 'execute',
          executionJSON: executionJSON
        };
      } catch (error) {
        console.error('❌ Failed to create execution JSON:', error);
        throw error;
      }
    } else if (userMessage.toUpperCase() === 'EDIT' || userMessage.toLowerCase().includes('edit')) {
      // User wants to edit, switch back to gatherer
      this.currentRole = 'gatherer';
      this.pendingPlan = null;

      return {
        type: 'edit',
        message: 'What would you like to change?'
      };
    } else {
      // Unknown command in executor role
      return {
        type: 'message',
        message: 'Please click "Approve" to execute or "Edit" to make changes.'
      };
    }
  }

  getCurrentRole() {
    return this.currentRole;
  }

  getPendingPlan() {
    return this.pendingPlan;
  }
}

module.exports = { ChatbotService: new ChatbotService() };

