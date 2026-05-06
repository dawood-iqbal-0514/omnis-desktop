/**
 * Typed catalog index — aggregates per-platform catalogs and exposes
 * lookup helpers used by the compiler.
 *
 * As of this build, LinkedIn is fully migrated to the typed format.
 * Other platforms (hubspot, slack, notion, ghl, smartlead) still resolve
 * via the legacy pipeline; they can be migrated incrementally by adding
 * a typed catalog file here and registering it.
 */

const linkedin = require('./linkedin');

const PLATFORMS = {
  [linkedin.platform]: linkedin,
};

/** Flat list of every typed action across every platform. */
function allActions() {
  const out = [];
  for (const [platform, cat] of Object.entries(PLATFORMS)) {
    for (const a of cat.actions) {
      out.push({ ...a, platform });
    }
  }
  return out;
}

/** Look up an action by `${platform}.${id}`. Returns the action with the
 *  platform field set, so callers don't have to remember to attach it. */
function findAction(platform, actionId) {
  const cat = PLATFORMS[platform];
  const a = cat?.actions.find((x) => x.id === actionId);
  return a ? { ...a, platform } : null;
}

/**
 * Find every action that produces a value of the given type. Used by the
 * compiler when walking the dependency graph backward.
 *
 * Type-name comparison is structural with a small type-bridge layer:
 *   • Direct match: produces "Person" satisfies need for "Person".
 *   • List unwrap: produces "List<Person>" satisfies need for "Person".
 *   • Field bridge: produces "Person" (which has a `linkedInUrn` field of
 *     type `LinkedInPersonUrn`) satisfies need for "LinkedInPersonUrn".
 *     This is what bridges cross-type composition without forcing every
 *     entity to declare every URN flavor it carries as a separate output.
 */
const { TYPES, unwrapOptional } = require('../types');

function findProducersOf(typeName) {
  const out = [];
  for (const action of allActions()) {
    for (const [outName, outType] of Object.entries(action.produces || {})) {
      const elem = listElementType(outType);
      const baseType = elem || outType;

      // Direct match.
      if (baseType === typeName) {
        out.push({ action, outName, isList: !!elem, viaField: null });
        continue;
      }

      // Field bridge: does the produced entity's shape contain a field of
      // the needed type?
      const bridgeField = bridgeFieldFor(baseType, typeName);
      if (bridgeField) {
        out.push({ action, outName, isList: !!elem, viaField: bridgeField });
      }
    }
  }
  return out;
}

/**
 * Returns the field name on `entityType`'s shape whose type equals
 * `targetType` (after unwrapping optional). Returns null if no such field.
 */
function bridgeFieldFor(entityType, targetType) {
  const t = TYPES[entityType];
  if (!t || !t.shape) return null;
  for (const [field, spec] of Object.entries(t.shape)) {
    if (unwrapOptional(spec) === targetType) return field;
  }
  return null;
}

/**
 * Returns 'Foo' if typeSpec is 'List<Foo>', else null.
 */
function listElementType(typeSpec) {
  const m = typeof typeSpec === 'string' && typeSpec.match(/^List<(.+)>$/);
  return m ? m[1] : null;
}

/**
 * Map a typed action's slot dict (e.g. { person: '...', body: 'hi' }) to the
 * backend parameter dict the legacy /crm/execute endpoint expects.
 */
function toBackendParams(platform, actionId, slotValues) {
  const cat = PLATFORMS[platform];
  const map = cat?.paramMap?.[actionId] || {};
  const out = {};
  for (const [slot, value] of Object.entries(slotValues || {})) {
    if (value === undefined || value === null || value === '') continue;
    const targetKey = map[slot] || slot;
    out[targetKey] = value;
  }
  return out;
}

module.exports = {
  PLATFORMS,
  allActions,
  findAction,
  findProducersOf,
  listElementType,
  toBackendParams,
};
