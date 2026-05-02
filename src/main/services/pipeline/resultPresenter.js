/**
 * ResultPresenter — turns raw action results into a *structured render spec*
 * that the chat UI's ResultRenderer component knows how to display.
 *
 * Deterministic only — no AI involved. The spec shape is a stable contract
 * between main process (this file) and renderer (ResultRenderer.jsx).
 *
 * Spec shapes:
 *   { type: 'profile',      … }   — single person/account profile
 *   { type: 'table',        … }   — list of records → tabular view
 *   { type: 'confirmation', … }   — boolean success / one-line confirmation
 *   { type: 'kv',           … }   — generic key:value (fallback)
 *   { type: 'empty',        … }   — nothing meaningful in the result
 *   { type: 'multi',        … }   — multiple sub-specs for multi-step plans
 */

class ResultPresenter {
  /**
   * Build a render spec for one or more action results.
   * @param {string} userMessage — original request (kept for future use)
   * @param {Array<{platform:string, actionId:string, data:any}>} actionResults
   * @returns {Promise<{spec: object|null, source: 'deterministic'}>}
   */
  async buildSpec(userMessage, actionResults) {
    if (!Array.isArray(actionResults) || actionResults.length === 0) {
      return { spec: null, source: 'deterministic' };
    }

    if (actionResults.length === 1) {
      return { spec: this._detectShape(actionResults[0]), source: 'deterministic' };
    }

    // Multi-step plan → wrap each result's spec in a `multi` spec.
    return {
      spec: {
        type: 'multi',
        items: actionResults.map((r) => ({
          actionId: r.actionId,
          platform: r.platform,
          spec: this._detectShape(r),
        })),
      },
      source: 'deterministic',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shape detection
  // ═══════════════════════════════════════════════════════════════════════════

  _detectShape({ platform, actionId, data } = {}) {
    if (data == null) {
      return { type: 'empty', message: 'No data returned.' };
    }

    // Profile shape: has firstName + (publicIdentifier or lastName).
    if (data.firstName != null && (data.publicIdentifier || data.lastName)) {
      return this._buildProfileSpec(data, platform);
    }

    // List shape — try common wrapper field names first, then fall back to
    // ANY top-level array of objects. Catches LinkedIn shapes
    // (`connections`, `posts`, `comments`, `invitations`) without needing
    // to enumerate every wrapper key.
    let items = Array.isArray(data.results)  ? data.results
              : Array.isArray(data.elements) ? data.elements
              : Array.isArray(data.items)    ? data.items
              : Array.isArray(data)          ? data
              : null;
    if (!items && data && typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') { items = v; break; }
        if (Array.isArray(v) && v.length === 0) { items = v; break; }
      }
    }
    if (items) return this._buildTableSpec(data, items, actionId);

    // Confirmation: small object with a success flag.
    if (data.success === true && Object.keys(data).length <= 4) {
      return this._buildConfirmationSpec(data, actionId);
    }

    // Anything else → key:value rendering.
    return this._buildKvSpec(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Spec builders
  // ═══════════════════════════════════════════════════════════════════════════

  _buildProfileSpec(d, platform) {
    const name = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Unknown';
    const sections = [];

    if (Array.isArray(d.experience) && d.experience.length > 0) {
      sections.push({
        title: 'Experience',
        items: d.experience.slice(0, 8).map((e) => ({
          primary:   e.title || 'Position',
          secondary: e.company || '',
          tertiary:  e.dates || [e.startDate, e.endDate].filter(Boolean).join(' – ') || null,
          extra:     e.location || null,
          description: e.description || null,
        })),
      });
    }
    if (Array.isArray(d.education) && d.education.length > 0) {
      sections.push({
        title: 'Education',
        items: d.education.slice(0, 5).map((e) => ({
          primary:   e.school || 'School',
          secondary: e.degree || [e.degree, e.fieldOfStudy].filter(Boolean).join(', ') || '',
          tertiary:  e.dates || [e.startYear, e.endYear].filter(Boolean).join(' – ') || null,
        })),
      });
    }
    if (Array.isArray(d.skills) && d.skills.length > 0) {
      sections.push({
        title: 'Skills',
        // Skills render as a chip/pill list — primary is the only field needed
        items: d.skills.slice(0, 30).map((s) => ({ primary: s.name || s })),
        layout: 'chips',
      });
    }
    if (Array.isArray(d.languages) && d.languages.length > 0) {
      sections.push({
        title: 'Languages',
        items: d.languages.slice(0, 10).map((l) => ({
          primary:   l.name || l,
          secondary: l.proficiency || '',
        })),
      });
    }
    if (Array.isArray(d.certifications) && d.certifications.length > 0) {
      sections.push({
        title: 'Certifications',
        items: d.certifications.slice(0, 10).map((c) => ({
          primary:   c.name || c,
          secondary: c.issuer || '',
          tertiary:  c.dates || null,
        })),
      });
    }

    return {
      type: 'profile',
      platform: platform || null,
      avatar:   d.profilePictureUrl || null,
      banner:   d.backgroundPictureUrl || null,
      name,
      headline:        d.headline || null,
      location:        d.location || d.country || null,
      industry:        d.industry || null,
      summary:         d.summary || null,
      premium:         !!(d.premium || d.premiumSubscriber),
      numConnections:  (typeof d.numConnections === 'number') ? d.numConnections : null,
      sections,
    };
  }

  _buildTableSpec(d, items, actionId) {
    const total = (typeof d.total === 'number') ? d.total : items.length;
    if (total === 0) {
      return {
        type: 'empty',
        message: `No ${this._pluralLabel(actionId, 0)} found.`,
      };
    }

    // Pick representative columns from the first few items.
    const PRIORITY = [
      // Identity
      'firstName', 'firstname', 'lastName', 'lastname', 'name', 'commenterName',
      'title', 'label', 'headline', 'commenterTitle',
      // Contact / detail
      'email', 'company', 'companyName', 'phone',
      // Engagement / counts
      'reactions', 'comments', 'reposts', 'likes', 'replies',
      // Status / stage
      'status', 'stage', 'state', 'amount',
      // Free text content
      'text', 'body',
      // Time
      'createdAt', 'updatedAt', 'connectedAt', 'date', 'lastModifiedDate',
      // URL
      'url', 'profileUrl', 'link',
    ];
    // Image fields — surfaced as a leading avatar column when present.
    const IMAGE_KEYS = ['profilePictureUrl', 'commenterPictureUrl', 'avatar', 'pictureUrl', 'imageUrl'];
    const SKIP = new Set([
      '$type', '$recipeTypes', '$recipeType',
      'entityUrn', 'objectUrn', 'trackingId', 'versionTag', 'urn',
      'plainId', 'profileUrn', 'commenterProfileUrn', 'navigationUrl',
      'socialDetailUrn', 'threadUrn', 'activityUrn', 'commentUrn',
      'publicIdentifier',
    ]);

    const sampleRows = items.slice(0, 5).map((i) => (i && typeof i === 'object' && i.properties) ? i.properties : i);

    // Detect an image column to surface as a leading avatar.
    const imageKey = IMAGE_KEYS.find((k) => sampleRows.some((r) => r && typeof r[k] === 'string' && r[k].length > 0));

    const seen = new Set();
    const ordered = [];
    for (const k of PRIORITY) {
      if (sampleRows.some((r) => r && r[k] != null && r[k] !== '') && !seen.has(k)) {
        ordered.push(k); seen.add(k);
      }
    }
    for (const r of sampleRows) {
      if (!r || typeof r !== 'object') continue;
      for (const k of Object.keys(r)) {
        if (SKIP.has(k) || seen.has(k) || IMAGE_KEYS.includes(k)) continue;
        const v = r[k];
        if (v == null || v === '' || (typeof v === 'object' && !Array.isArray(v))) continue;
        ordered.push(k); seen.add(k);
        if (ordered.length >= 6) break;
      }
      if (ordered.length >= 6) break;
    }

    const columns = [];
    if (imageKey) columns.push({ key: imageKey, label: '', type: 'avatar' });
    for (const k of ordered.slice(0, 6)) columns.push({ key: k, label: this._humanize(k) });

    const MAX_ROWS = 50;
    const normalizedRows = items.slice(0, MAX_ROWS).map((i) => {
      const src = (i && typeof i === 'object' && i.properties) ? i.properties : i;
      const row = {};
      for (const c of columns) {
        const v = src?.[c.key];
        if (c.type === 'avatar') {
          row[c.key] = (typeof v === 'string') ? v : '';
          // Pass name through so the avatar fallback can render initials.
          row.__name = src?.name || src?.commenterName || `${src?.firstName || src?.firstname || ''} ${src?.lastName || src?.lastname || ''}`.trim() || '';
        } else {
          row[c.key] = (v == null) ? ''
                     : (typeof v === 'object') ? JSON.stringify(v).slice(0, 80)
                     : String(v);
        }
      }
      return row;
    });

    return {
      type: 'table',
      title:     `Found ${total} ${this._pluralLabel(actionId, total)}`,
      total,
      columns,
      rows:      normalizedRows,
      truncated: items.length > MAX_ROWS,
      shown:     normalizedRows.length,
    };
  }

  _buildConfirmationSpec(d, actionId) {
    const verb = this._humanize(actionId || 'action');
    return {
      type: 'confirmation',
      title:  `${verb} completed`,
      detail: d.message || null,
    };
  }

  _buildKvSpec(d) {
    const SKIP = new Set([
      '$type', '$recipeTypes', '$recipeType',
      'entityUrn', 'objectUrn', 'trackingId', 'versionTag',
      'plainId', 'profileUrn',
    ]);
    const pairs = [];
    for (const [k, v] of Object.entries(d)) {
      if (SKIP.has(k)) continue;
      if (v == null || v === '' || v === false) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;

      let display;
      if (Array.isArray(v)) display = `${v.length} item${v.length === 1 ? '' : 's'}`;
      else if (typeof v === 'object') display = JSON.stringify(v).slice(0, 120);
      else display = String(v);

      pairs.push({ key: k, label: this._humanize(k), value: display });
      if (pairs.length >= 12) break;
    }

    if (pairs.length === 0) return { type: 'empty', message: 'No data returned.' };
    return { type: 'kv', pairs };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /** "firstName" → "First name" / "first_name" → "First name" */
  _humanize(k) {
    return String(k || '')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
  }

  _pluralLabel(actionId, n) {
    const id = (actionId || '').toLowerCase();
    if (id.includes('contact'))    return n === 1 ? 'contact' : 'contacts';
    if (id.includes('compan'))     return n === 1 ? 'company' : 'companies';
    if (id.includes('deal'))       return n === 1 ? 'deal' : 'deals';
    if (id.includes('message') || id.includes('conversation'))
                                   return n === 1 ? 'conversation' : 'conversations';
    if (id.includes('connection')) return n === 1 ? 'connection' : 'connections';
    if (id.includes('invitation') || id.includes('invite'))
                                   return n === 1 ? 'invitation' : 'invitations';
    if (id.includes('post'))       return n === 1 ? 'post' : 'posts';
    if (id.includes('people') || id.includes('person'))
                                   return n === 1 ? 'person' : 'people';
    return n === 1 ? 'result' : 'results';
  }
}

module.exports = new ResultPresenter();
