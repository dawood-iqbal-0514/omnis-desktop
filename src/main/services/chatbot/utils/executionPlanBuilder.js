const { RegistryLoader } = require('./registryLoader');

class ExecutionPlanBuilder {
  determineExecutionMethod(platformId, actionId, actionParams = {}) {
    // Check if it's a hybrid action
    const hybridAction = RegistryLoader.getHybridAction(platformId, actionId);
    if (hybridAction) {
      return {
        method: 'hybrid',
        automationFirst: hybridAction.automationFirst,
        automationScript: hybridAction.automationScript,
        apiAction: hybridAction.thenAPI,
        parameters: actionParams
      };
    }

    // Check if it's API-only
    if (RegistryLoader.isAPIAction(platformId, actionId)) {
      return {
        method: 'api',
        endpoint: `/api/${platformId}/${actionId}`,
        parameters: actionParams
      };
    }

    // Default: automation
    const automationScript = RegistryLoader.getAutomationScript(platformId, actionId);
    return {
      method: 'automation',
      script: automationScript?.name || `${actionId}.py`,
      parameters: actionParams
    };
  }

  buildExecutionPlan(platformId, actions) {
    const steps = [];
    let order = 1;

    for (const action of actions) {
      const { actionId, parameters, description } = action;
      const executionMethod = this.determineExecutionMethod(platformId, actionId, parameters);

      if (executionMethod.method === 'hybrid') {
        // Add automation step first if needed
        if (executionMethod.automationFirst) {
          steps.push({
            order: order++,
            type: 'automation',
            action: actionId,
            description: `Login/Authentication for ${description || actionId}`,
            parameters: executionMethod.parameters,
            automationConfig: {
              script: executionMethod.automationScript
            }
          });
        }

        // Add API step
        steps.push({
          order: order++,
          type: 'api',
          action: executionMethod.apiAction || actionId,
          description: description || actionId,
          parameters: executionMethod.parameters,
          apiConfig: {
            endpoint: `/api/${platformId}/${executionMethod.apiAction || actionId}`,
            method: 'POST'
          }
        });

        // Add automation step after if needed
        if (!executionMethod.automationFirst) {
          steps.push({
            order: order++,
            type: 'automation',
            action: actionId,
            description: description || actionId,
            parameters: executionMethod.parameters,
            automationConfig: {
              script: executionMethod.automationScript
            }
          });
        }
      } else if (executionMethod.method === 'api') {
        steps.push({
          order: order++,
          type: 'api',
          action: actionId,
          description: description || actionId,
          parameters: executionMethod.parameters,
          apiConfig: {
            endpoint: executionMethod.endpoint,
            method: 'POST'
          }
        });
      } else {
        // Automation
        steps.push({
          order: order++,
          type: 'automation',
          action: actionId,
          description: description || actionId,
          parameters: executionMethod.parameters,
          automationConfig: {
            script: executionMethod.script
          }
        });
      }
    }

    return {
      platform: platformId,
      steps: steps
    };
  }

  validateExecutionPlan(executionPlan) {
    if (!executionPlan.platform) {
      return { valid: false, error: 'Platform is required' };
    }

    if (!executionPlan.steps || !Array.isArray(executionPlan.steps) || executionPlan.steps.length === 0) {
      return { valid: false, error: 'At least one step is required' };
    }

    for (const step of executionPlan.steps) {
      if (!step.type || !['api', 'automation', 'hybrid'].includes(step.type)) {
        return { valid: false, error: `Invalid step type: ${step.type}` };
      }

      if (!step.action) {
        return { valid: false, error: 'Step action is required' };
      }

      if (step.type === 'api' && !step.apiConfig) {
        return { valid: false, error: 'API config is required for API steps' };
      }

      if (step.type === 'automation' && !step.automationConfig) {
        return { valid: false, error: 'Automation config is required for automation steps' };
      }
    }

    return { valid: true };
  }
}

module.exports = { ExecutionPlanBuilder: new ExecutionPlanBuilder() };

