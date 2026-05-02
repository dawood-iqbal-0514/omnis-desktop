import apiClient from './index';
import usePlatformStore from '../../store/platformStore';

// ─── Session expiry detection (ONLY for automation/browser steps) ─────────────
const SESSION_EXPIRED_PATTERNS = [
  'session expired', 'log in again', 'login automation', 'please log in',
  'session invalid', 'not logged in',
];
const SESSION_EXPIRED_RE = new RegExp(SESSION_EXPIRED_PATTERNS.join('|'), 'i');

function isSessionExpired(error) {
  const msg = error?.message || error?.error || '';
  return SESSION_EXPIRED_RE.test(msg);
}

/**
 * CRM API Service
 * Routes all CRM actions through POST /api/crm/execute so the backend
 * middleware chain runs: auth → execute
 */

/**
 * Execute a CRM action via the backend.
 */
export async function executeAction(platform, action, params = {}) {
  return apiClient.post('/crm/execute', { platform, action, params });
}

/**
 * Execute a full execution plan (multiple steps) sequentially.
 *
 * Re-login prompt is ONLY triggered for automation steps that report
 * "session expired". API errors (bad API key, validation, etc.) just
 * show the raw error in the chat — they are NOT session issues.
 *
 * @returns {Promise<{results: Array, allSuccess: boolean, authError: boolean}>}
 */
export async function executeplan(executionJSON, { onStepStart, onStepDone, onStepError } = {}) {
  const results = [];
  let allSuccess = true;
  let authError = false;

  for (const step of executionJSON.steps) {
    onStepStart?.(step, step.order);

    try {
      let result;

      if (step.type === 'api') {
        result = await executeAction(
          executionJSON.platform,
          step.action,
          step.parameters || {}
        );
      } else if (step.type === 'automation') {
        result = await window.automationAPI.executeTask({
          platform: executionJSON.platform,
          action: step.action || step.actionId,
          parameters: step.parameters,
          script: step.automationConfig?.script,
        });
      } else if (step.type === 'hybrid') {
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

      // Only flag session expiry for automation steps (browser login expired)
      // API errors (bad key, validation, etc.) are NOT session issues
      if (step.type === 'automation' && isSessionExpired(error)) {
        authError = true;
        try {
          await usePlatformStore.getState().updateConnectionStatus(
            executionJSON.platform, true, false
          );
        } catch (_) { /* best-effort */ }
      }

      results.push({
        step,
        status: 'error',
        error: error.message,
        // Carry the LinkedIn challenge marker through so the chatbot can
        // open the inline verification window and auto-retry.
        linkedinChallenge: error.linkedinChallenge || null,
      });
      onStepError?.(step, error);
      break;
    }
  }

  // Surface the most-recent LinkedIn challenge (if any) at the top level so
  // the executor caller doesn't have to walk results.
  const linkedinChallenge = results
    .map((r) => r.linkedinChallenge)
    .filter(Boolean)
    .pop() || null;

  return { results, allSuccess, authError, linkedinChallenge };
}

/**
 * Fetch the user's stored LinkedIn cookie jar.
 *
 * Returns the SHORT-LIVED challenge cookies (bound to the last issued
 * challenge URL) when present — those are what the verification BrowserWindow
 * needs to replay the URL. Falls back to the regular long-lived cookies when
 * no challenge is pending.
 *
 * The cookies stay local — round-tripped from backend → renderer → Electron
 * BrowserWindow → renderer → backend. Never leaves the user's machine.
 */
export async function getLinkedinCookies() {
  const r = await apiClient.get('/crm/linkedin/cookies');
  const data = r?.data || {};
  // Prefer challenge cookies when a challenge is pending — only those match
  // the JSESSIONID that the challenge URL's token was issued against.
  if (data.challengeCookies && Object.keys(data.challengeCookies).length > 0) {
    return data.challengeCookies;
  }
  return data.cookies || {};
}

/**
 * Replace the stored LinkedIn cookie jar with a fresh set captured after the
 * user completes a challenge in the inline BrowserWindow.
 */
export async function updateLinkedinCookies(cookies) {
  return apiClient.put('/crm/linkedin/cookies', { cookies });
}

/**
 * Returns the pending LinkedIn verification challenge URL (if any), or null.
 * Used to swap the dashboard's "Re-Login" button for "Verify on LinkedIn"
 * when there's an outstanding checkpoint that just needs the user to verify.
 */
export async function getLinkedinPendingChallenge() {
  try {
    const r = await apiClient.get('/crm/linkedin/pending-challenge');
    return r?.data?.challengeUrl || null;
  } catch {
    return null;
  }
}

export const crmAPI = {
  executeAction,
  executeplan,
  getLinkedinCookies,
  updateLinkedinCookies,
  getLinkedinPendingChallenge,
};
