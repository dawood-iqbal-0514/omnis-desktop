const path = require('path');
const fs = require('fs');

class ActionRegistry {
  constructor() {
    this._actions = [];         // flat array of all actions
    this._actionMap = {};       // platform:actionId -> action (O(1) lookup)
    this._platforms = [];       // list of platform names
    this._vocabulary = {};      // term -> index
    this._vocabSize = 0;
    this._idf = [];             // IDF values per term
    this._actionVectors = [];   // pre-computed TF-IDF vectors per action
    this._initialized = false;
  }

  /**
   * Load action-catalog.json, build flat action list, compute TF-IDF vectors.
   */
  initialize() {
    if (this._initialized) return;

    const catalogPath = path.join(__dirname, 'data', 'action-catalog.json');
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const catalog = JSON.parse(raw);

    this._actions = [];
    this._actionMap = {};
    this._platforms = [];

    // Build flat array of all actions
    for (const [platformKey, platformData] of Object.entries(catalog)) {
      if (platformKey === '_meta') continue;
      if (!platformData.actions || !Array.isArray(platformData.actions)) continue;

      const platformId = platformData.platformId || platformKey;
      this._platforms.push(platformId);

      for (const action of platformData.actions) {
        const entry = {
          ...action,
          platform: platformId,
          displayName: platformData.displayName || platformId,
          searchText: this._buildSearchText(action)
        };
        this._actions.push(entry);
        this._actionMap[`${platformId}:${action.actionId}`] = entry;
      }
    }

    // Build TF-IDF index
    this._buildVocabulary();
    this._computeIDF();
    this._actionVectors = this._actions.map(a => this._computeTFIDF(this._tokenize(a.searchText)));

    this._initialized = true;
    console.log(`[ActionRegistry] Initialized with ${this._actions.length} actions across ${this._platforms.length} platforms`);
  }

  /**
   * Build the searchable text string for a single action.
   */
  _buildSearchText(action) {
    const parts = [
      action.description || '',
      (action.keywords || []).join(' '),
      action.category || '',
      action.operation || '',
      (action.actionId || '').replace(/_/g, ' ')
    ];
    return parts.join(' ');
  }

  /**
   * Tokenize text: split on whitespace/underscores, lowercase, remove short words (<=2 chars).
   */
  _tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .split(/[\s_]+/)
      .map(t => t.replace(/[^a-z0-9]/g, ''))
      .filter(t => t.length > 2);
  }

  /**
   * Build term->index vocabulary from all action search texts.
   */
  _buildVocabulary() {
    const termSet = new Set();
    for (const action of this._actions) {
      const tokens = this._tokenize(action.searchText);
      for (const token of tokens) {
        termSet.add(token);
      }
    }
    this._vocabulary = {};
    let idx = 0;
    for (const term of termSet) {
      this._vocabulary[term] = idx++;
    }
    this._vocabSize = idx;
  }

  /**
   * Compute IDF for each term: log(N / df).
   * df = number of actions containing the term.
   */
  _computeIDF() {
    const N = this._actions.length;
    const df = new Float64Array(this._vocabSize); // document frequency

    for (const action of this._actions) {
      const tokens = this._tokenize(action.searchText);
      const seen = new Set(tokens);
      for (const token of seen) {
        const idx = this._vocabulary[token];
        if (idx !== undefined) {
          df[idx]++;
        }
      }
    }

    this._idf = new Float64Array(this._vocabSize);
    for (let i = 0; i < this._vocabSize; i++) {
      this._idf[i] = df[i] > 0 ? Math.log(N / df[i]) : 0;
    }
  }

  /**
   * Compute TF-IDF vector for a given token array.
   * TF = count of term in tokens / total tokens.
   */
  _computeTFIDF(tokens) {
    if (tokens.length === 0) return null;

    const tf = new Float64Array(this._vocabSize);
    for (const token of tokens) {
      const idx = this._vocabulary[token];
      if (idx !== undefined) {
        tf[idx]++;
      }
    }

    // Normalize TF by total token count
    const totalTokens = tokens.length;
    const vec = new Float64Array(this._vocabSize);
    for (let i = 0; i < this._vocabSize; i++) {
      vec[i] = (tf[i] / totalTokens) * this._idf[i];
    }
    return vec;
  }

  /**
   * Cosine similarity between two TF-IDF vectors.
   */
  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < this._vocabSize; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
  }

  /**
   * Search actions by platform(s) and query text using TF-IDF cosine similarity.
   * @param {string[]} platforms - Filter to these platforms (empty = all)
   * @param {string} queryText - Natural language query
   * @param {number} topK - Number of results to return
   * @returns {{ action: object, score: number }[]}
   */
  search(platforms, queryText, topK = 5) {
    this.initialize();

    const queryTokens = this._tokenize(queryText);
    const queryVec = this._computeTFIDF(queryTokens);
    if (!queryVec) return [];

    const platformSet = platforms && platforms.length > 0
      ? new Set(platforms.map(p => p.toLowerCase()))
      : null;

    const scored = [];

    for (let i = 0; i < this._actions.length; i++) {
      const action = this._actions[i];

      // Platform filter
      if (platformSet && !platformSet.has(action.platform.toLowerCase())) {
        continue;
      }

      const score = this._cosineSimilarity(queryVec, this._actionVectors[i]);
      if (score > 0) {
        scored.push({ action, score });
      }
    }

    // Sort descending by score and return top K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /**
   * Direct O(1) lookup by platform and actionId.
   * @param {string} platform
   * @param {string} actionId
   * @returns {object|null}
   */
  getAction(platform, actionId) {
    this.initialize();
    return this._actionMap[`${platform}:${actionId}`] || null;
  }

  /**
   * List all platform names in the catalog.
   * @returns {string[]}
   */
  getAllPlatforms() {
    this.initialize();
    return [...this._platforms];
  }
}

module.exports = new ActionRegistry();
