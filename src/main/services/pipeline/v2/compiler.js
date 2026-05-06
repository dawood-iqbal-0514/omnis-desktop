/**
 * Plan Compiler — turns a typed Goal into an ordered chain of typed actions.
 *
 * Pure code. No AI. No prompts.
 *
 * Algorithm: backward chaining from the goal action. For each unfilled
 * required input slot:
 *   • If it's marked userInput, mark it as a slot to ask the user about.
 *   • Otherwise, find a producer (an action whose output type matches the
 *     slot's input type). Push it to the front of the chain and recurse on
 *     its inputs.
 *   • If multiple producers exist and the user gave a hint (a freeform
 *     descriptor), pick the producer whose verbs/category best matches.
 *     If still ambiguous, defer to a runtime ChoiceCard.
 *
 * The output of the compiler is a Plan — a typed sequence of stages.
 * Each stage is one of:
 *   • { kind: 'execute', action, slots, label }   — run this action
 *   • { kind: 'pick',    fromStage, label }       — surface a ChoiceCard
 *                                                   with the previous stage's
 *                                                   list output for the user
 *                                                   to pick from
 *   • { kind: 'ask',     slot, type, prompt }     — ask the user for free
 *                                                   input (a body string,
 *                                                   a number, etc.)
 *   • { kind: 'menu',    options, target }        — present an action menu
 *                                                   (e.g. Comment / Analyze /
 *                                                   Generate after the user
 *                                                   picks a post)
 *   • { kind: 'approve', summary }                — pause for explicit user
 *                                                   approval before any
 *                                                   destructive action runs
 */

const { findAction, findProducersOf, listElementType } = require('./catalog');

/**
 * Compile a goal into a Plan.
 *
 * Goal shape:
 *   {
 *     verb:        'comment' | 'like' | 'send_invite' | ... — what the user wants to do
 *     platform:    'linkedin'                                  — explicit if known
 *     actionId:    'comment_on_post'                          — fully resolved action id
 *     descriptor:  { person: 'satya', post: 'latest', body: '...' }
 *                  — freeform values keyed by goal-shape, used to fill
 *                  user-input slots and to hint at producer disambiguation
 *   }
 *
 * Returns:
 *   { stages: Stage[], errors: string[] }
 */
function compile(goal) {
  const action = findAction(goal.platform, goal.actionId);
  if (!action) {
    return { stages: [], errors: [`Unknown action: ${goal.platform}.${goal.actionId}`] };
  }

  const stages = [];
  const errors = [];

  /**
   * Recursive resolver — given an action and the descriptor available to fill
   * its slots, return an array of stages that satisfy its inputs and end with
   * the action itself.
   *
   * `visiting` is a Set of action IDs in the current resolution chain — used
   * to break cycles introduced by type-bridge symmetry (e.g. get_profile
   * consumes LinkedInPersonUrn and produces Person which bridges back to
   * LinkedInPersonUrn).
   */
  function resolve(action, descriptor, depth = 0, visiting = new Set()) {
    if (depth > 8) {
      errors.push(`Resolution too deep at ${action.id} — likely a cyclic dependency in the catalog.`);
      return [];
    }
    if (visiting.has(action.id)) {
      errors.push(`Cycle detected at ${action.id}.`);
      return [];
    }
    visiting = new Set([...visiting, action.id]);

    const localStages = [];
    const slots = {};      // slot name → { fromStage: idx, fromOutput: name }
    const directValues = {}; // slot name → literal value the user already gave

    for (const [slotName, spec] of Object.entries(action.consumes || {})) {
      // 1) User-input slot — ask if not already in descriptor.
      if (spec.userInput) {
        const given = lookupDescriptorValue(descriptor, slotName);
        if (given !== undefined && given !== null && given !== '') {
          directValues[slotName] = given;
        } else if (!spec.optional) {
          // Special case: when commenting on a post, instead of straight-up
          // asking for the body, surface a menu (Comment manually / Analyze
          // post / Generate comment). The menu stage is consumed by the
          // executor and may resolve the body via AI before reaching the
          // approval step.
          if (action.id === 'comment_on_post' && slotName === 'body') {
            localStages.push({
              kind:        'menu_for_body',
              forAction:   action.id,
              targetKind:  'post',
            });
          } else {
            localStages.push({
              kind:  'ask',
              slot:  slotName,
              type:  spec.type,
              prompt: humanize(slotName, spec.type),
              forAction: action.id,
            });
          }
        }
        continue;
      }

      // 2) Typed slot — needs a producer. Check if descriptor already has
      //    a literal URN-shaped value (e.g., user pasted a LinkedIn URL).
      if (descriptor[slotName] && looksLikeUrn(descriptor[slotName])) {
        directValues[slotName] = descriptor[slotName];
        continue;
      }

      // Otherwise, find a producer for this type. Exclude:
      //   • any action already in the resolution stack (cycle break)
      //   • actions explicitly marked excludeFromComposition (e.g. `me`)
      //   • destructive/write actions (they have side effects — composing
      //     `create_post` to "produce a post" so we can comment on it
      //     would actually publish a new post, which is obviously wrong)
      const producers = findProducersOf(spec.type)
        .filter((p) => !visiting.has(p.action.id))
        .filter((p) => !p.action.excludeFromComposition)
        .filter((p) => p.action.sideEffect === 'read');
      if (producers.length === 0) {
        errors.push(`No producer found for type ${spec.type} (needed by ${action.id}.${slotName}).`);
        continue;
      }

      const chosen = chooseProducer(producers, descriptor);

      // Recursively resolve the producer's own inputs.
      const subStages = resolve(chosen.action, descriptor, depth + 1, visiting);
      localStages.push(...subStages);

      // If the producer outputs a List<T>, insert a pick stage so the user
      // chooses which element to bind.
      if (chosen.isList) {
        const producerStageIdx = localStages.length - 1;
        // Use the producer's actual output element type for labelling — if
        // the producer outputs List<Person>, the user is picking a Person,
        // even if the consumer is typed as LinkedInPersonUrn.
        const producerOutputType = chosen.action.produces?.[chosen.outName];
        const elementType = listElementType(producerOutputType) || producerOutputType || spec.type;
        localStages.push({
          kind:           'pick',
          fromStageIdx:   producerStageIdx,
          fromOutput:     chosen.outName,
          slotInTarget:   slotName,
          targetActionId: action.id,
          elementType,
          autoPick:       inferAutoPick(descriptor, slotName),
          label:          pickLabel(elementType, slotName, descriptor),
        });
      }

      // Wire the slot to the producer's output.
      slots[slotName] = {
        fromStageIdx: localStages.length - 1,
        fromOutput:  chosen.outName,
      };
    }

    // Insert the execute stage for this action.
    localStages.push({
      kind:    'execute',
      actionId: action.id,
      platform: action.platform,
      label:   action.label,
      sideEffect: action.sideEffect,
      slotBindings: slots,
      directValues,
      pickable: !!action.pickable,
    });

    return localStages;
  }

  const resolved = resolve(action, goal.descriptor || {});
  stages.push(...resolved);

  // Insert an explicit approval stage before the final destructive action,
  // unless the goal flagged auto-approve. Read/write/non-destructive don't
  // need approval.
  if (action.sideEffect === 'destructive' && !goal.autoApprove) {
    const finalIdx = stages.length - 1;
    stages.splice(finalIdx, 0, {
      kind:    'approve',
      forStageIdx: finalIdx,
      summary: `${action.label} — confirm before running`,
    });
  }

  return { stages, errors };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function looksLikeUrn(value) {
  return typeof value === 'string' && /^urn:li:[a-zA-Z_]+:[A-Za-z0-9_\-:()=,]+$/.test(value);
}

/**
 * Look up the right value in the descriptor for a slot, allowing for
 * common aliases. e.g. search_people.keywords can be filled by
 * descriptor.person ("satya nadella") or descriptor.search_term, etc.
 *
 * Aliases are slot-driven, not phrase-driven — a small mapping per slot,
 * not an open-ended pattern list.
 */
const SLOT_ALIASES = {
  keywords: ['keywords', 'person', 'query', 'search_term', 'name', 'profileVanity'],
  query:    ['query', 'keywords', 'person', 'name'],
  body:     ['body', 'text', 'message', 'comment', 'content'],
  message:  ['message', 'note', 'body'],
  commentary:['commentary', 'note', 'body'],
};

function lookupDescriptorValue(descriptor, slotName) {
  if (descriptor == null) return undefined;
  const aliases = SLOT_ALIASES[slotName] || [slotName];
  for (const a of aliases) {
    if (descriptor[a] !== undefined && descriptor[a] !== null && descriptor[a] !== '') {
      return descriptor[a];
    }
  }
  return undefined;
}

function humanize(slotName, type) {
  if (slotName === 'body')        return "What would you like to say?";
  if (slotName === 'message')     return "Add a personal note? (or leave blank)";
  if (slotName === 'commentary')  return "Add commentary to the repost? (or leave blank)";
  if (slotName === 'keywords')    return "Who are you searching for?";
  if (type === 'LinkedInReactionType') return "Which reaction? (LIKE / PRAISE / EMPATHY / INTEREST / APPRECIATION / MAYBE / ENTERTAINMENT)";
  return `What value for ${slotName}?`;
}

function pickLabel(elementType, slotName, descriptor) {
  if (slotName === 'person' || elementType === 'Person')             return 'Pick the right person';
  if (slotName === 'post'   || elementType === 'LinkedInPostUrn')    return 'Pick the post';
  if (slotName === 'conversation' || elementType === 'LinkedInConversationUrn') return 'Pick the conversation';
  if (slotName === 'invite' || elementType === 'LinkedInInviteUrn')  return 'Pick the invitation';
  return `Pick a ${elementType.replace(/^LinkedIn/, '').replace(/Urn$/, '')}`;
}

/**
 * Heuristic: when the user said "latest" / "most recent" / "first" / "last",
 * the pick stage auto-binds to the top row instead of asking. For "the post
 * about AI" or no qualifier, return null and surface the pick UI.
 */
function inferAutoPick(descriptor, slotName) {
  const hint = (descriptor[`${slotName}_hint`] || descriptor.post_hint || descriptor.recency || '').toString().toLowerCase();
  if (/\b(latest|most recent|recent|last|newest|first)\b/.test(hint)) return 'first';
  return null;
}

/**
 * When multiple actions can produce a needed type, pick the best one.
 *
 * Goal: route the user's available descriptor values to the right producer.
 * If the descriptor has a person name, search_people (which takes a keyword
 * string the user can supply) wins over get_profile (which requires a URN
 * the user can't possibly have).
 *
 * Scoring (highest wins):
 *   • +10 for each producer userInput slot fillable from the descriptor.
 *   • +5  if the producer's verbs match a descriptor hint string.
 *   • +3  if descriptor.scope='feed' and producer is feed-flavored.
 *   • -1  per required typed (non-userInput) input the producer needs
 *         that the descriptor can't satisfy directly.
 */
function chooseProducer(producers, descriptor) {
  if (producers.length === 1) return producers[0];

  const descriptorKeys = new Set(Object.keys(descriptor || {}));
  const hint = (descriptor.search_hint || descriptor.source || descriptor.scope || '').toString().toLowerCase();

  let best = null;
  let bestScore = -Infinity;

  for (const p of producers) {
    let score = 0;
    const consumes = p.action.consumes || {};

    // Reward producers whose slot names match descriptor keys — this is
    // the strongest signal that the producer "wants" what the user gave.
    for (const [slotName, spec] of Object.entries(consumes)) {
      if (spec.userInput) {
        const v = lookupDescriptorValue(descriptor, slotName);
        if (v !== undefined && v !== null && v !== '') score += 10;
      } else {
        // For typed slots, +5 if descriptor names match the slot name —
        // because the recursive resolver will fill that typed slot from
        // the same descriptor (e.g. get_user_posts.person matches
        // descriptor.person → search_people will use it).
        if (descriptorKeys.has(slotName) ||
            (slotName === 'person' && (descriptorKeys.has('profileVanity') || descriptorKeys.has('person')))) {
          score += 5;
        } else if (!spec.optional) {
          score -= 1;
        }
      }
    }

    // Verb hint match.
    if (hint) {
      const verbs = (p.action.verbs || []).join(' ').toLowerCase();
      if (verbs.includes(hint)) score += 5;
    }

    // Feed scope hint.
    if ((descriptor.feed === true || descriptor.scope === 'feed') &&
        (p.action.id === 'get_feed' || p.action.id.endsWith('_feed'))) {
      score += 3;
    }

    // Penalize bridge producers slightly so direct producers win when both exist.
    if (p.viaField) score -= 0.5;

    if (score > bestScore) { best = p; bestScore = score; }
  }
  return best || producers[0];
}

function requiredInputCount(action) {
  let n = 0;
  for (const spec of Object.values(action.consumes || {})) {
    if (!spec.optional) n++;
  }
  return n;
}

module.exports = { compile };
