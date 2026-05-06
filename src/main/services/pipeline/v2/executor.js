/**
 * Flow Executor — runs a compiled Plan stage by stage.
 *
 * State machine:
 *   IDLE → COMPILING → RUNNING → AWAITING_INPUT → RUNNING → ... → DONE
 *
 * The executor lives in the main process. It holds an in-memory map of
 * active flows keyed by chat id (one flow per chat at a time). Each flow
 * tracks where it is in the compiled plan and what it has already produced.
 *
 * When a stage emits a UI card (pick / ask / menu / approve), the executor
 * pauses and returns the card spec to the renderer. The renderer collects
 * the user's input and POSTs it back via `flowEvent()`. The executor then
 * resumes from where it left off.
 *
 * Outputs from completed stages live in a typed scratchpad keyed by stage
 * index. Slot bindings reference scratchpad entries by index — that's how
 * downstream stages get URNs they need without anyone hallucinating them.
 */

const { compile } = require('./compiler');
const { findAction, toBackendParams } = require('./catalog');
const aiSubtasks = require('./aiSubtasks');

class FlowExecutor {
  constructor() {
    this.flows = new Map();   // chatId → flow state
  }

  /** Start a new flow from a compiled goal. Returns the first user-facing card. */
  async start(chatId, goal, deps) {
    const compiled = compile(goal);
    if (compiled.errors.length > 0 || compiled.stages.length === 0) {
      return {
        kind:   'error',
        message: compiled.errors.join('; ') || 'Could not compile a plan for that request.',
      };
    }

    const flow = {
      id:        chatId,
      goal,
      stages:    compiled.stages,
      cursor:    0,
      outputs:   [],   // outputs[i] = result data of stage i (if executed)
      pickedFrom:[],   // pickedFrom[i] = which row was picked (for pick stages)
      slotValues:{},   // accumulated user-supplied values keyed by slot name
      state:     'RUNNING',
      planSummary: this._summarizePlan(compiled.stages),
    };
    this.flows.set(chatId, flow);
    return await this._tick(flow, deps);
  }

  /**
   * The renderer dispatches a user event back into the flow:
   *   { kind: 'pick',     value }    — user picked a candidate / post
   *   { kind: 'ask',      value }    — user typed the requested input
   *   { kind: 'menu',     option }   — user chose a menu option
   *   { kind: 'approve' }            — user approved a destructive action
   *   { kind: 'cancel'   }           — user aborted; clear the flow
   *   { kind: 'edit',     value }    — user wants to change a previous step
   */
  async event(chatId, event, deps) {
    const flow = this.flows.get(chatId);
    if (!flow) {
      return { kind: 'error', message: 'No active flow.' };
    }

    if (event.kind === 'cancel') {
      this.flows.delete(chatId);
      return { kind: 'prose', text: 'Cancelled — no action taken.' };
    }

    const stage = flow.stages[flow.cursor];
    if (!stage) {
      this.flows.delete(chatId);
      return { kind: 'prose', text: 'Flow already completed.' };
    }

    // Execute results come from the renderer after the renderer ran the
    // backend HTTP call. They're not tied to a "stage kind = execute_result"
    // because the executor emits an execute_request card and waits.
    if (event.kind === 'execute_result') {
      flow.outputs[event.stageIdx ?? flow.cursor] = event.result;
      flow.cursor = (event.stageIdx ?? flow.cursor) + 1;
      return await this._tick(flow, deps);
    }
    if (event.kind === 'execute_error') {
      this.flows.delete(flow.id);
      return {
        kind: 'error',
        message: event.message || 'Action failed.',
        linkedinChallenge: event.linkedinChallenge || null,
      };
    }

    if (stage.kind === 'pick' && event.kind === 'pick') {
      flow.pickedFrom[flow.cursor] = event.value;
      flow.cursor += 1;
    } else if (stage.kind === 'ask' && event.kind === 'ask') {
      flow.slotValues[stage.slot] = event.value;
      flow.cursor += 1;
    } else if (stage.kind === 'approve' && event.kind === 'approve') {
      // For comment_on_post specifically the user may have edited the body
      // in the approval card. Carry that into the slot store.
      if (event.editedBody) {
        flow.slotValues.body = event.editedBody;
      }
      flow.cursor += 1;
    } else if (stage.kind === 'menu_for_body' && event.kind === 'menu') {
      const picked = this._mostRecentPickedPost(flow);
      const choice = event.option?.id;

      if (choice === 'manual') {
        // Replace the menu stage with an ask stage and re-enter.
        flow.stages[flow.cursor] = {
          kind:  'ask',
          slot:  'body',
          type:  'string',
          prompt: 'What would you like to say?',
        };
        // Don't advance cursor — _tick will execute the ask.
        return await this._tick(flow, deps);
      }

      if (choice === 'analyze') {
        try {
          const summary = await aiSubtasks.analyzePost(picked || {});
          // Stay on the same menu stage; emit a prose message + the menu
          // again so the user can pick a different option after reading.
          return {
            kind: 'prose_then_menu',
            chatId: flow.id,
            text: summary,
            menu: {
              target: picked || {},
              options: [
                { id: 'manual',   label: 'Comment manually',   hint: 'Type your own comment.',           icon: '✍️' },
                { id: 'analyze',  label: 'Analyze again',      hint: 'Re-run the analysis.',             icon: '🔍' },
                { id: 'generate', label: 'Generate a comment', hint: 'AI drafts a comment based on the post.', icon: '✨', primary: true },
                { id: 'cancel',   label: 'Cancel',             hint: 'Don\'t comment — back out.',        icon: '✖️' },
              ],
            },
          };
        } catch (err) {
          return { kind: 'error', message: `Analysis failed: ${err.message}` };
        }
      }

      if (choice === 'generate') {
        try {
          const draft = await aiSubtasks.generateComment(picked || {});
          flow.slotValues.body = draft;
          flow.draftSource = 'ai';
          flow.cursor += 1;   // Advance past the menu_for_body stage.
          return await this._tick(flow, deps);
        } catch (err) {
          return { kind: 'error', message: `Comment generation failed: ${err.message}` };
        }
      }

      if (choice === 'cancel') {
        this.flows.delete(flow.id);
        return { kind: 'prose', text: 'Cancelled — no comment posted.' };
      }

      return { kind: 'error', message: `Unknown menu option: ${choice}` };
    } else if (stage.kind === 'menu' && event.kind === 'menu') {
      flow.menuChoice = event.option;
      flow.cursor += 1;
    } else {
      return {
        kind:   'error',
        message: `Stage ${flow.cursor} is awaiting "${stage.kind}" — got "${event.kind}".`,
      };
    }
    return await this._tick(flow, deps);
  }

  /** Return the active flow for a chat, if any. */
  has(chatId) {
    return this.flows.has(chatId);
  }

  /** Drop the active flow, no further events resumable. */
  clear(chatId) {
    this.flows.delete(chatId);
  }

  // ── Stage runner ────────────────────────────────────────────────────────

  /**
   * Drive the flow forward as far as possible without blocking on user input.
   * Emits exactly one user-facing card (or an execute_request the renderer
   * must run before the flow can resume).
   */
  async _tick(flow, deps) {
    while (flow.cursor < flow.stages.length) {
      const stage = flow.stages[flow.cursor];

      switch (stage.kind) {
        case 'execute': {
          const slots = this._gatherSlots(flow, stage);
          let params = toBackendParams(stage.platform, stage.actionId, slots);
          // For post-targeted actions, also pass auxiliary URNs (activityUrn,
          // socialDetailUrn) when the picked post carries them — needed for
          // the BrowserWindow-driven comment_on_post which navigates to the
          // post URL via activity URN, and for fallback variants elsewhere.
          if (stage.platform === 'linkedin' && /post|comment|repost|save/.test(stage.actionId)) {
            params = { ...this._auxPostUrns(flow, stage), ...params };
          }
          return {
            kind:     'execute_request',
            chatId:   flow.id,
            platform: stage.platform,
            actionId: stage.actionId,
            params,
            label:    stage.label,
            stageIdx: flow.cursor,
          };
        }

        case 'pick': {
          // Walk back to the producing stage's output and surface a card.
          const producerOutput = flow.outputs[stage.fromStageIdx];
          const list = this._extractList(producerOutput, stage.fromOutput);

          // Auto-pick "latest" / "first" without asking.
          if (stage.autoPick === 'first' && list.length > 0) {
            flow.pickedFrom[flow.cursor] = list[0];
            flow.cursor += 1;
            break;
          }

          if (list.length === 0) {
            this.flows.delete(flow.id);
            return {
              kind:    'prose',
              text:    `I couldn't find anything matching that. Try a different name?`,
            };
          }

          // Single-result auto-pick.
          if (list.length === 1) {
            flow.pickedFrom[flow.cursor] = list[0];
            flow.cursor += 1;
            break;
          }

          return this._buildPickCard(stage, list, flow);
        }

        case 'ask': {
          return {
            kind:   'ask',
            slot:   stage.slot,
            type:   stage.type,
            prompt: stage.prompt,
            chatId: flow.id,
          };
        }

        case 'approve': {
          const targetStage = flow.stages[stage.forStageIdx];
          const targetAction = findAction(targetStage.platform, targetStage.actionId);
          const slots = this._gatherSlots(flow, targetStage);
          return {
            kind:    'approve',
            chatId:  flow.id,
            actionLabel: targetAction?.label || targetStage.actionId,
            sideEffect:  targetStage.sideEffect,
            slotPreview: this._previewSlots(slots),
            // For comment_on_post specifically, surface the body for review.
            body:        slots.body || null,
            draftSource: flow.draftSource || null,
            target:      this._mostRecentPickedPost(flow),
          };
        }

        case 'menu': {
          return {
            kind:    'menu',
            chatId:  flow.id,
            options: stage.options,
            target:  stage.target,
          };
        }

        case 'menu_for_body': {
          // Surface the Comment / Analyze / Generate menu, anchored to the
          // most recently picked post (so the user has the post text right
          // there for context).
          const picked = this._mostRecentPickedPost(flow);
          return {
            kind:    'menu',
            chatId:  flow.id,
            target:  picked || {},
            forStage: flow.cursor,
            options: [
              { id: 'manual',   label: 'Comment manually',   hint: 'I\'ll type the comment myself.', icon: '✍️' },
              { id: 'analyze',  label: 'Analyze the post',   hint: 'Quick AI summary of what this post is about.', icon: '🔍' },
              { id: 'generate', label: 'Generate a comment', hint: 'AI drafts a comment — you review and approve.',  icon: '✨', primary: true },
            ],
          };
        }

        default:
          this.flows.delete(flow.id);
          return { kind: 'error', message: `Unknown stage kind: ${stage.kind}` };
      }
    }

    // ── Flow complete ──────────────────────────────────────────────────
    const lastOutput = flow.outputs.filter(Boolean).pop();
    this.flows.delete(flow.id);

    return {
      kind:    'result',
      result:  lastOutput,
      label:   this._finalLabel(flow),
      planSummary: flow.planSummary,
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Resolve the slot dict that an execute stage will pass to its action. */
  _gatherSlots(flow, stage) {
    const slots = { ...stage.directValues };
    for (const [slotName, binding] of Object.entries(stage.slotBindings || {})) {
      // First, check whether a pick stage already chose a single row that
      // satisfies this slot.
      const picked = this._findPickFor(flow, stage, slotName);
      if (picked != null) {
        slots[slotName] = this._unwrap(picked, slotName);
        continue;
      }
      // Otherwise pull from the producing stage's output directly.
      const producerOut = flow.outputs[binding.fromStageIdx];
      if (producerOut) {
        slots[slotName] = this._unwrap(producerOut?.[binding.fromOutput] || producerOut, slotName);
      }
    }
    // Slot values supplied via 'ask' stages also flow in.
    for (const [k, v] of Object.entries(flow.slotValues || {})) {
      if (slots[k] === undefined) slots[k] = v;
    }
    return slots;
  }

  /** Return the picked-from value if a `pick` stage targets this slot. */
  _findPickFor(flow, executeStage, slotName) {
    for (let i = 0; i < flow.stages.length; i++) {
      const s = flow.stages[i];
      if (s.kind === 'pick' && s.targetActionId === executeStage.actionId && s.slotInTarget === slotName) {
        return flow.pickedFrom[i] ?? null;
      }
    }
    return null;
  }

  /**
   * From a typed object (Person, LinkedInPostUrn record, etc.) extract the
   * scalar URN or value that fits the named slot. Slots map to specific
   * URN fields by convention.
   */
  _unwrap(obj, slotName) {
    if (obj == null) return null;
    if (typeof obj === 'string') return obj;
    // LinkedInPostUrn: {threadUrn, activityUrn, socialDetailUrn, ...}
    if (slotName === 'post' && obj.threadUrn)        return obj.threadUrn;
    if (slotName === 'post' && obj.activityUrn)      return obj.activityUrn;
    if (slotName === 'repost' && obj.activityUrn)    return obj.activityUrn;
    // Person → linkedInUrn / profileUrn
    if (slotName === 'person')        return obj.linkedInUrn || obj.profileUrn || obj.urn || obj.publicIdentifier;
    if (slotName === 'invite')        return obj.inviteUrn  || obj.urn;
    if (slotName === 'conversation')  return obj.conversationUrn || obj.urn;
    if (slotName === 'parentComment') return obj.commentUrn || obj.urn;
    return obj.urn || obj;
  }

  /**
   * For post-targeted execute stages, the picked post object carries multiple
   * URNs (threadUrn, activityUrn, socialDetailUrn). The _unwrap helper picks
   * one, but the backend may need the others as auxiliary params for fallback
   * payload variants. Return them as a flat dict keyed by their voyager
   * field names.
   */
  _auxPostUrns(flow, executeStage) {
    const slotName = 'post';
    const picked = this._findPickFor(flow, executeStage, slotName);
    if (!picked || typeof picked !== 'object') return {};
    const out = {};
    if (picked.activityUrn)     out.activityUrn     = picked.activityUrn;
    if (picked.socialDetailUrn) out.socialDetailUrn = picked.socialDetailUrn;
    return out;
  }

  _extractList(producerOutput, outputName) {
    if (!producerOutput) return [];
    // The backend wraps responses as {success, data: {...}}. Unwrap if needed.
    const inner = (producerOutput.data && typeof producerOutput.data === 'object')
      ? producerOutput.data
      : producerOutput;
    const node = inner[outputName] || inner.candidates || inner.posts
              || inner.connections || inner.invitations || inner.conversations
              || inner.comments;
    return Array.isArray(node) ? node : [];
  }

  /** Build the right typed card for a pick stage, depending on element type. */
  _buildPickCard(stage, list, flow) {
    const targetActionId = stage.targetActionId;
    const slotName = stage.slotInTarget;
    const targetAction = findAction(flow.goal.platform, targetActionId);

    // Decide card kind based on what kind of thing we're picking.
    // The slotInTarget tells us: a 'person' slot wants a person picker,
    // a 'post' slot wants a post picker.
    let kind;
    if (slotName === 'person')          kind = 'people_picker';
    else if (slotName === 'post')       kind = 'post_picker';
    else if (slotName === 'conversation') kind = 'conversation_picker';
    else                                  kind = 'generic_picker';

    return {
      kind,
      chatId:        flow.id,
      candidates:    list,
      label:         stage.label,
      followUpLabel: targetAction?.label || targetActionId,
    };
  }

  /** A short preview of slot values to show on the approval card. */
  _previewSlots(slots) {
    const out = {};
    for (const [k, v] of Object.entries(slots)) {
      if (v == null) continue;
      if (typeof v === 'string')      out[k] = v.length > 200 ? v.slice(0, 200) + '…' : v;
      else if (typeof v === 'number') out[k] = v;
      else                              out[k] = '[object]';
    }
    return out;
  }

  /**
   * Walk the flow's pick history backward to find the last post the user
   * picked (for surfacing as context in the comment menu / approval card).
   */
  _mostRecentPickedPost(flow) {
    for (let i = flow.pickedFrom.length - 1; i >= 0; i--) {
      const v = flow.pickedFrom[i];
      if (v && (v.threadUrn || v.activityUrn)) return v;
    }
    return null;
  }

  _summarizePlan(stages) {
    return stages
      .filter((s) => s.kind === 'execute')
      .map((s) => ({ actionId: s.actionId, label: s.label, platform: s.platform }));
  }

  _finalLabel(flow) {
    const last = [...flow.stages].reverse().find((s) => s.kind === 'execute');
    return last ? last.label : 'Done';
  }
}

module.exports = new FlowExecutor();
