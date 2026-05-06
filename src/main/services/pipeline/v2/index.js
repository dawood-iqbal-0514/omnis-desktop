/**
 * v2 Pipeline entry point.
 *
 * Every chat message goes through one AI call (`goalExtractor`) to map
 * natural language → typed Goal. There are no rule-based pre-routers, no
 * regex shortcuts, no hardcoded verb/phrase lists — the AI handles all
 * natural-language interpretation. The compiler then composes a typed
 * plan deterministically; the executor runs it and surfaces UI cards.
 */

const goalExtractor  = require('./goalExtractor');
const executor       = require('./executor');
const { PLATFORMS, allActions } = require('./catalog');

/**
 * The entry the orchestrator calls. Returns one of:
 *   { kind: 'execute_request', platform, actionId, params, stageIdx, label }
 *   { kind: 'people_picker',   candidates, ... }
 *   { kind: 'post_picker',     candidates, ... }
 *   { kind: 'ask',             prompt, ... }
 *   { kind: 'approve',         summary, ... }
 *   { kind: 'menu',            options, ... }
 *   { kind: 'result',          result, ... }
 *   { kind: 'prose',           text }
 *   { kind: 'fallback' }       — no typed catalog entry; orchestrator should fall
 *                                through to the legacy pipeline
 *   { kind: 'error',           message, linkedinChallenge? }
 */
async function processMessage(chatId, userMessage, chatHistory, connectedPlatforms, deps) {
  // If a flow is already running, treat free-text input as the slot the flow
  // is waiting on. Structured events (pick, approve, menu, execute_result)
  // come through processEvent instead.
  if (executor.has(chatId)) {
    return await executor.event(chatId, { kind: 'ask', value: userMessage }, deps);
  }

  // Single AI extraction. No pre-router, no rule-based fast path.
  const extracted = await goalExtractor.extract(userMessage, chatHistory, connectedPlatforms);

  if (extracted.type === 'conversation') {
    return { kind: 'prose', text: extracted.conversationResponse };
  }
  if (extracted.type === 'clarification') {
    return { kind: 'prose', text: extracted.clarificationMessage };
  }
  if (extracted.type === 'error') {
    return { kind: 'prose', text: extracted.message };
  }
  if (extracted.type !== 'goal') {
    return { kind: 'prose', text: 'Could you say a bit more about what you want?' };
  }

  if (!isV2Supported(extracted.platform, extracted.actionId)) {
    return { kind: 'fallback' };
  }

  return await executor.start(chatId, extracted, deps);
}

/** Resume an in-progress flow with a structured event from the renderer. */
async function processEvent(chatId, event, deps) {
  return await executor.event(chatId, event, deps);
}

/** Whether v2 has a typed catalog entry for this action. */
function isV2Supported(platform, actionId) {
  return !!(PLATFORMS[platform] && PLATFORMS[platform].actions.find((a) => a.id === actionId));
}

/** Whether v2 should at least try to handle this user message (i.e., LinkedIn-relevant). */
function shouldHandle(connectedPlatforms) {
  return Array.isArray(connectedPlatforms) && connectedPlatforms.includes('linkedin');
}

function clearFlow(chatId) {
  executor.clear(chatId);
}

function hasFlow(chatId) {
  return executor.has(chatId);
}

module.exports = {
  processMessage,
  processEvent,
  isV2Supported,
  shouldHandle,
  clearFlow,
  hasFlow,
  allActions,
};
