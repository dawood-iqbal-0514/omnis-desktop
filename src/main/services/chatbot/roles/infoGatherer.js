const fs = require('fs');
const path = require('path');
const { CerebrasService } = require('../../cerebrasService');
const { RegistryLoader } = require('../utils/registryLoader');

class InfoGatherer {
  loadSystemPrompt(platformId) {
    try {
      const promptPath = path.join(
        __dirname,
        '../../../../automation/platforms',
        platformId,
        'prompts',
        'gatherer-prompt.txt'
      );

      if (!fs.existsSync(promptPath)) {
        console.warn(`⚠️  Gatherer prompt not found for ${platformId}, using default`);
        return this.getDefaultPrompt(platformId);
      }

      let prompt = fs.readFileSync(promptPath, 'utf8');
      
      // Inject available automation scripts into the prompt
      const automationRegistry = RegistryLoader.loadAutomationScripts(platformId);
      if (automationRegistry.availableScripts && automationRegistry.availableScripts.length > 0) {
        const scriptsList = automationRegistry.availableScripts.map(script => 
          `- actionId: "${script.actionId}" - ${script.description}`
        ).join('\n');
        
        const automationScriptsSection = `\n\nAVAILABLE AUTOMATION SCRIPTS:\nThe following automation scripts are available for ${platformId}. Use the exact actionId when creating execution plans:\n\n${scriptsList}\n\nIMPORTANT: When the user requests a task that matches an automation script description, you MUST use the corresponding actionId in your execution plan.\n\nExamples:\n- User says "create a list", "create an active list", or "create a segment" → use actionId: "create_active_list"\n- User says "create a workflow" → use actionId: "workflow_creator"\n- User says "login to HubSpot" → use actionId: "login"`;
        
        // Insert before the [PLAN_READY] section or at the end
        if (prompt.includes('[PLAN_READY]')) {
          prompt = prompt.replace('[PLAN_READY]', automationScriptsSection + '\n\n[PLAN_READY]');
        } else {
          prompt += automationScriptsSection;
        }
        
        console.log(`✅ Injected ${automationRegistry.availableScripts.length} automation scripts into gatherer prompt for ${platformId}`);
      } else {
        console.warn(`⚠️  No automation scripts found for ${platformId}`);
      }

      return prompt;
    } catch (error) {
      console.error(`❌ Failed to load gatherer prompt for ${platformId}:`, error);
      return this.getDefaultPrompt(platformId);
    }
  }

  getDefaultPrompt(platformId) {
    return `You are an information gathering assistant for ${platformId} automation.

Your ONLY job is to:
1. Understand what the user wants to do
2. Ask clarifying questions if any information is missing
3. Gather ALL required information for the task
4. Present a clear, detailed execution plan to the user
5. Wait for user approval before proceeding

IMPORTANT RULES:
- DO NOT execute anything. Only gather information and present plans.
- Ask ONE question at a time to avoid overwhelming the user
- Be concise and professional
- Once you have ALL required information, present the execution plan clearly
- After presenting the plan, wait for user to click "Approve" or "Edit"`;
  }

  async process(userMessage, chatHistory = [], platformId) {
    try {
      const systemPrompt = this.loadSystemPrompt(platformId);
      
      // Format chat history for CerebrasService
      const formattedHistory = chatHistory.map(msg => ({
        type: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content || msg.message || msg.text
      }));

      console.log(`📝 InfoGatherer processing: "${userMessage}" for platform: ${platformId}`);
      console.log(`📊 Chat history length: ${formattedHistory.length}`);

      const response = await CerebrasService.sendMessage(
        userMessage,
        formattedHistory,
        platformId,
        systemPrompt
      );

      console.log(`✅ InfoGatherer response received: ${response.message?.substring(0, 100)}...`);

      // Check if plan is ready - AI should signal with [PLAN_READY] marker
      const planReady = this.detectPlanReady(response.message, chatHistory);
      
      console.log(`🔍 Plan ready detected: ${planReady}`);
      
      // Clean message - remove [PLAN_READY] marker if present
      const cleanMessage = response.message.replace(/\[PLAN_READY\]/g, '').trim();

      // If plan is ready but message doesn't contain plan format, create structured plan
      let plan = null;
      if (planReady) {
        plan = this.extractPlan(response.message);
        // If no structured plan extracted, create one from message and context
        if (!plan) {
          console.log('📋 Creating plan from context...');
          plan = this.createPlanFromContext(response.message || userMessage, chatHistory, userMessage);
        }
        
        // Ensure plan has required structure
        if (!plan || !plan.actions || !Array.isArray(plan.actions) || plan.actions.length === 0) {
          console.warn('⚠️ Plan missing actions, creating default structure from context');
          plan = this.createPlanFromContext(response.message || userMessage, chatHistory, userMessage);
          
          // If still no actions, create a minimal plan
          if (!plan.actions || plan.actions.length === 0) {
            plan = {
              message: response.message || 'Execution plan ready',
              actions: [{
                actionId: 'create_contact',
                description: 'Create contact with provided information',
                parameters: {}
              }]
            };
          }
        }
        
        console.log('📋 Plan created:', JSON.stringify(plan, null, 2));
      }

      return {
        message: cleanMessage || response.message,
        planReady: planReady,
        plan: plan
      };
    } catch (error) {
      console.error('❌ InfoGatherer error:', error);
      throw error;
    }
  }

  /**
   * Detect if gatherer has presented a plan
   * Uses AI's explicit signal [PLAN_READY] instead of hardcoded words
   * @param {string} message - Assistant message
   * @param {Array} chatHistory - Chat history to check context
   * @returns {boolean}
   */
  detectPlanReady(message, chatHistory = []) {
    if (!message || message.trim().length === 0) {
      return false;
    }

    // Primary detection: AI explicitly signals with [PLAN_READY] marker
    if (message.includes('[PLAN_READY]')) {
      console.log('✅ Plan ready detected: AI used [PLAN_READY] marker');
      return true;
    }

    // Secondary detection: AI presents plan with explicit indicators
    const lowerMessage = message.toLowerCase();
    const planIndicators = [
      'execution plan',
      '📋',
      'here\'s your execution plan',
      'here is your execution plan',
      'review and click',
      'click approve',
      'click edit',
      'approve to proceed'
    ];

    if (planIndicators.some(indicator => lowerMessage.includes(indicator))) {
      console.log('✅ Plan ready detected: AI presented execution plan');
      return true;
    }

    return false;
  }

  /**
   * Extract plan from message (basic extraction, AI will provide structured plan)
   * @param {string} message - Assistant message
   * @returns {Object|null} Extracted plan or null
   */
  extractPlan(message) {
    try {
      // Look for JSON in message
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      // If no JSON found, return null - plan will be created from context
    }

    return null;
  }

  /**
   * Create plan from conversation context when AI doesn't provide structured plan
   * @param {string} aiMessage - AI's confirmation message
   * @param {Array} chatHistory - Chat history
   * @param {string} lastUserMessage - Last user message
   * @returns {Object} Structured plan
   */
  createPlanFromContext(aiMessage, chatHistory, lastUserMessage) {
    // Extract action and parameters from conversation
    const userMessages = chatHistory.filter(m => m.type === 'user').map(m => m.content || m.message || m.text);
    userMessages.push(lastUserMessage);

    // Try to identify the action (create contact, create list, etc.)
    let action = null;
    const params = {};

    // Look for workflow creation keywords FIRST (most specific)
    const fullConversation = userMessages.join(' ').toLowerCase();
    if (fullConversation.includes('workflow')) {
      // User wants to create a workflow
      action = 'workflow_creator';

      // Extract workflow name
      const wfNameMatch = fullConversation.match(/(?:workflow\s+)?(?:name|call|titled?)\s+(?:it\s+)?(?:as\s+)?["']([^"']+)["']/i)
        || fullConversation.match(/(?:name|call|titled?)\s+(?:it\s+)?(?:as\s+)?["']?([^"'\n,]+?)["']?(?:\s+that|\s+which|\s+when|\s+and|$)/i);
      if (wfNameMatch && wfNameMatch[1] && wfNameMatch[1].length > 2) {
        params.workflowName = wfNameMatch[1].trim();
      }

      // Extract workflow details
      // Trigger: when a contact is created, when a deal is created, etc.
      if (fullConversation.includes('contact') && (fullConversation.includes('create') || fullConversation.includes('new'))) {
        params.trigger = 'new_contact_created';
      } else if (fullConversation.includes('deal') && (fullConversation.includes('create') || fullConversation.includes('new'))) {
        params.trigger = 'new_deal_created';
      } else if (fullConversation.includes('form') && fullConversation.includes('submit')) {
        params.trigger = 'form_submitted';
      }

      // Extract email recipient
      const emailMatch = fullConversation.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
      if (emailMatch) {
        params.email = emailMatch[1];
      }

      // Extract subject
      const subjectMatch = fullConversation.match(/subject\s+(?:is|as|:)?\s*["']?([^"']+)["']?/i);
      if (subjectMatch && subjectMatch[1]) {
        params.subject = subjectMatch[1].trim();
      }

      // Extract body
      const bodyMatch = fullConversation.match(/body\s+(?:is|as|:)?\s*["']?([^"']+)["']?/i);
      if (bodyMatch && bodyMatch[1]) {
        params.body = bodyMatch[1].trim();
      }

      // If subject and body are the same (common pattern)
      if (!params.subject && !params.body) {
        const sameMatch = fullConversation.match(/subject\s+and\s+body\s+(?:is|as|:)?\s*["']?([^"']+)["']?/i);
        if (sameMatch && sameMatch[1]) {
          params.subject = sameMatch[1].trim();
          params.body = sameMatch[1].trim();
        }
      }

      // Build a full description from all gathered context
      // This is the key parameter the API script uses to talk to HubSpot AI
      const descParts = [];
      if (params.trigger) descParts.push(`triggers when ${params.trigger.replace(/_/g, ' ')}`);
      if (params.email) descParts.push(`sends an email to ${params.email}`);
      if (params.subject) descParts.push(`with subject "${params.subject}"`);
      if (params.body) descParts.push(`with body "${params.body}"`);

      if (descParts.length > 0) {
        params.description = descParts.join(', ');
      } else {
        // Fall back to the full conversation as description
        params.description = fullConversation.replace(/\b(create|make|build)\s+(?:a\s+)?workflow\s+/i, '').trim();
      }
    } else if (fullConversation.includes('list') || fullConversation.includes('segment')) {
      // User wants to create an active list/segment
      action = 'create_active_list';

      // Extract the full natural language description for the NL→filter converter
      // Try multiple patterns to capture the description
      const descPatterns = [
        /(?:list|segment)\s+(?:of\s+)?(?:contacts?\s+)?(?:who|that|which)\s+(.+)/i,
        /create\s+(?:a\s+)?(?:active\s+)?(?:list|segment)(?:\s+of\s+contacts?)?\s+(.+)/i,
        /(?:list|segment)\s+(.+)/i,
      ];

      for (const pattern of descPatterns) {
        const descMatch = fullConversation.match(pattern);
        if (descMatch && descMatch[1]) {
          params.description = descMatch[1].trim();
          break;
        }
      }

      // Extract list name if mentioned
      const nameMatch = fullConversation.match(/(?:name|call|titled?)\s+(?:it\s+)?(?:as\s+)?["']?([^"']+)["']?/i);
      if (nameMatch && nameMatch[1]) {
        params.name = nameMatch[1].trim();
      }

      // Default object type: contacts
      params.objectType = '0-1';
    } else if (fullConversation.includes('contact') && fullConversation.includes('create')) {
      // Only if it's explicitly "create contact" (not "create list of contacts")
      if (!fullConversation.includes('list') && !fullConversation.includes('segment')) {
        action = 'create_contact';
        
        // Extract name - handle "named as", "name", "named" patterns
        const namePatterns = [
          /(?:name|call|named?)\s+(?:as\s+)?(?:is\s+)?([a-z]+(?:\s+[a-z]+)?)/i,
          /create\s+(?:a\s+)?contact\s+(?:named\s+)?(?:as\s+)?([a-z]+(?:\s+[a-z]+)?)/i
        ];
      
      for (const pattern of namePatterns) {
        const nameMatch = fullConversation.match(pattern);
        if (nameMatch && nameMatch[1]) {
          params.name = nameMatch[1].trim();
          break;
        }
      }
      
      // Extract email
      const emailMatch = fullConversation.match(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
      if (emailMatch) {
        params.email = emailMatch[1];
      }
      }
    }

    // Always create at least one action, even if params are missing
    const actions = [];
    
    if (action === 'workflow_creator') {
      // Handle workflow creation
      let description = 'Create workflow';
      if (params.trigger) {
        description += `: ${params.trigger.replace(/_/g, ' ')}`;
      }
      if (params.email) {
        description += `, send email to ${params.email}`;
      }
      if (params.subject || params.body) {
        description += ` with subject "${params.subject || params.body}" and body "${params.body || params.subject}"`;
      }
      
      actions.push({
        actionId: 'workflow_creator',
        description: description,
        parameters: params
      });
    } else if (action === 'create_active_list') {
      // Handle active list/segment creation
      actions.push({
        actionId: 'create_active_list',
        description: params.description
          ? `Create active list: ${params.description}`
          : 'Create active contact list',
        parameters: params
      });
    } else if (action === 'create_contact') {
      // Handle contact creation
      if (params.name || params.email) {
        actions.push({
          actionId: 'create_contact',
          description: `Create contact: ${params.name || 'Unknown'} (${params.email || 'No email'})`,
          parameters: params
        });
      } else {
        actions.push({
          actionId: 'create_contact',
          description: 'Create contact with information from conversation',
          parameters: params
        });
      }
    } else if (action) {
      // Other identified actions
      actions.push({
        actionId: action,
        description: `${action} with provided parameters`,
        parameters: params
      });
    } else {
      // Fallback if no specific action could be identified
      actions.push({
        actionId: 'unknown_action',
        description: 'Perform a task based on conversation context',
        parameters: { raw_query: fullConversation }
      });
    }

    return {
      actions: actions,
      message: aiMessage || 'Execution plan ready'
    };
  }
}

module.exports = { InfoGatherer: new InfoGatherer() };
