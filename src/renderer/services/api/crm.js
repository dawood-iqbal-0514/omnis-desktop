import apiClient from './index';

/**
 * CRM API Service
 * Routes all CRM actions through POST /api/crm/execute so the backend
 * middleware chain runs: auth → subscription → usageTracker → rateLimiter → execute
 */

/**
 * Execute a CRM action via the backend.
 *
 * @param {string} platform  – "hubspot" | "ghl" | "notion"
 * @param {string} action    – action identifier, e.g. "create_contact"
 * @param {object} params    – action-specific parameters
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function executeAction(platform, action, params = {}) {
  return apiClient.post('/crm/execute', { platform, action, params });
}

/**
 * Execute a full execution plan (multiple steps) sequentially.
 * API steps → POST /api/crm/execute
 * Automation steps → window.automationAPI.executeTask (IPC)
 *
 * @param {object}   executionJSON             – { platform, steps: [...] }
 * @param {function} onStepStart(step, index)  – called before each step
 * @param {function} onStepDone(step, result)  – called after each step succeeds
 * @param {function} onStepError(step, error)  – called when a step fails
 * @returns {Promise<{results: Array, allSuccess: boolean}>}
 */
export async function executeplan(executionJSON, { onStepStart, onStepDone, onStepError } = {}) {
  const results = [];
  let allSuccess = true;

  for (const step of executionJSON.steps) {
    onStepStart?.(step, step.order);

    try {
      let result;

      if (step.type === 'api') {
        // ── Route through backend /api/crm/execute ──────────────────
        result = await executeAction(
          executionJSON.platform,
          step.action,
          step.parameters || {}
        );
      } else if (step.type === 'automation') {
        // ── Route through Electron IPC (Python scripts etc.) ────────
        result = await window.automationAPI.executeTask({
          platform: executionJSON.platform,
          action: step.action || step.actionId,
          parameters: step.parameters,
          script: step.automationConfig?.script,
        });
      } else if (step.type === 'hybrid') {
        // ── Hybrid: automation first, then API (or vice versa) ──────
        // The backend's execution plan builder already splits hybrids
        // into separate ordered steps, so this is a fallback.
        result = await executeAction(
          executionJSON.platform,
          step.action,
          step.parameters || {}
        );
      }

      if (result?.success === false) {
        throw new Error(result.error || `Step "${step.action}" failed`);
      }

      results.push({ step, status: 'success', data: result?.data || result?.result });
      onStepDone?.(step, result);
    } catch (error) {
      allSuccess = false;
      results.push({ step, status: 'error', error: error.message });
      onStepError?.(step, error);
      break; // stop on first error
    }
  }

  return { results, allSuccess };
}

export const crmAPI = { executeAction, executeplan };
