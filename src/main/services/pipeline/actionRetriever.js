const actionRegistry = require('./actionRegistry');

class ActionRetriever {
  /**
   * Retrieve the most relevant actions for a given intent.
   * Pure JavaScript -- no AI call. Uses TF-IDF search from ActionRegistry
   * with category/operation/platform boosting.
   *
   * @param {object} intent - Structured intent from IntentRouter
   * @param {string[]} intent.platforms - Target platforms
   * @param {string} intent.category - Action category (contacts, deals, etc.)
   * @param {string} intent.operation - Action operation (create, list, etc.)
   * @param {string[]} intent.keywords - Extracted keywords
   * @returns {{ action: object, score: number }[]} Top 5 actions with boosted scores
   */
  retrieve(intent) {
    // Build query text from intent fields
    const queryParts = [];
    if (intent.operation && intent.operation !== 'unknown') queryParts.push(intent.operation);
    if (intent.category && intent.category !== 'unknown') queryParts.push(intent.category);
    if (Array.isArray(intent.keywords)) queryParts.push(...intent.keywords);

    const queryText = queryParts.join(' ');

    if (!queryText.trim()) {
      console.warn('[ActionRetriever] Empty query text from intent, returning empty results');
      return [];
    }

    // Search for 8 candidates (we will re-rank and trim to 5)
    const candidates = actionRegistry.search(intent.platforms, queryText, 8);

    if (candidates.length === 0) {
      return [];
    }

    const primaryPlatform = intent.platforms && intent.platforms.length > 0
      ? intent.platforms[0].toLowerCase()
      : null;

    // Apply boosts based on category, operation, and platform match
    const boosted = candidates.map(({ action, score }) => {
      let boostedScore = score;

      // Category match boost
      if (
        intent.category &&
        intent.category !== 'unknown' &&
        action.category &&
        action.category.toLowerCase() === intent.category.toLowerCase()
      ) {
        boostedScore += 0.3;
      }

      // Operation match boost
      if (
        intent.operation &&
        intent.operation !== 'unknown' &&
        action.operation &&
        action.operation.toLowerCase() === intent.operation.toLowerCase()
      ) {
        boostedScore += 0.3;
      }

      // Primary platform boost
      if (
        primaryPlatform &&
        action.platform &&
        action.platform.toLowerCase() === primaryPlatform
      ) {
        boostedScore += 0.1;
      }

      return { action, score: boostedScore };
    });

    // Re-sort by boosted score descending, return top 5
    boosted.sort((a, b) => b.score - a.score);
    return boosted.slice(0, 5);
  }
}

module.exports = new ActionRetriever();
