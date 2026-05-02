import React from 'react';

/**
 * ResultRenderer — picks the right sub-component based on the spec.type
 * emitted by the main-process resultPresenter.
 *
 * Spec contract (kept in sync with omnis-desktop/src/main/services/pipeline/resultPresenter.js):
 *   { type: 'profile',      name, headline, location, summary, premium, avatar, link, sections, platform }
 *   { type: 'table',        title, total, columns:[{key,label}], rows:[{[key]:string}], truncated, shown }
 *   { type: 'confirmation', title, detail }
 *   { type: 'kv',           pairs:[{label,value}] }
 *   { type: 'empty',        message }
 *   { type: 'multi',        items:[{platform,actionId,spec}] }
 */
const ResultRenderer = ({ spec }) => {
  if (!spec) return null;

  switch (spec.type) {
    case 'profile':      return <ProfileCard      spec={spec} />;
    case 'table':        return <DataTable        spec={spec} />;
    case 'confirmation': return <ConfirmationCard spec={spec} />;
    case 'kv':           return <KeyValueList     spec={spec} />;
    case 'empty':        return <EmptyCard        spec={spec} />;
    case 'multi':        return <MultiResults     spec={spec} />;
    default:             return <KeyValueList     spec={{ pairs: [{ label: 'Type', value: spec.type || 'unknown' }] }} />;
  }
};

// ─── Shared shell ───────────────────────────────────────────────────────────
const Shell = ({ children, className = '' }) => (
  <div
    className={`bg-[var(--color-base-background-light)] border border-border-muted rounded-lg p-5 my-4 ${className}`}
  >
    {children}
  </div>
);

// ─── Profile card ───────────────────────────────────────────────────────────
const ProfileCard = ({ spec }) => {
  const initials = (spec.name || '?').split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Shell className="overflow-hidden p-0">
      {/* Banner */}
      {spec.banner ? (
        <img src={spec.banner} alt="" className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-16 bg-gradient-to-r from-primary-accent/20 to-primary-accent/5" />
      )}

      <div className="px-5 pb-5 -mt-8">
        <div className="flex gap-4 items-end">
          {spec.avatar ? (
            <img
              src={spec.avatar}
              alt={spec.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-[var(--color-base-background-light)] shrink-0 bg-[var(--color-base-background-light)]"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center font-semibold text-xl shrink-0 border-4 border-[var(--color-base-background-light)]">
              {initials}
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-text-primary">{spec.name}</h3>
            {spec.premium && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                ⭐ Premium
              </span>
            )}
          </div>
          {spec.headline && <p className="text-sm text-text-secondary mt-0.5">{spec.headline}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-text-muted">
            {spec.location && <span>📍 {spec.location}</span>}
            {spec.industry && <span>🏷️ {spec.industry}</span>}
            {typeof spec.numConnections === 'number' && spec.numConnections > 0 && (
              <span>👥 {spec.numConnections.toLocaleString()} {spec.numConnections === 1 ? 'connection' : 'connections'}</span>
            )}
          </div>
        </div>

        {spec.summary && (
          <p className="text-sm text-text-secondary mt-4 leading-relaxed whitespace-pre-wrap">
            {spec.summary}
          </p>
        )}

        {Array.isArray(spec.sections) && spec.sections.map((sec, i) => (
          <div key={i} className="mt-5 pt-4 border-t border-border-muted">
            <h4 className="text-sm font-semibold text-text-primary mb-2">{sec.title}</h4>
            {sec.layout === 'chips' ? (
              <div className="flex flex-wrap gap-1.5">
                {sec.items.map((it, j) => (
                  <span
                    key={j}
                    className="inline-block text-xs px-2.5 py-1 rounded-full bg-primary-accent/10 text-primary-accent border border-primary-accent/20"
                  >
                    {it.primary}
                  </span>
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {sec.items.map((it, j) => (
                  <li key={j} className="text-sm">
                    <div className="text-text-primary font-medium">{it.primary}</div>
                    {it.secondary && <div className="text-text-secondary text-xs">{it.secondary}</div>}
                    {(it.tertiary || it.extra) && (
                      <div className="text-text-muted text-xs mt-0.5">
                        {[it.tertiary, it.extra].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {it.description && (
                      <div className="text-text-secondary text-xs mt-1 leading-relaxed whitespace-pre-wrap">
                        {it.description}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
};

// ─── Data table ─────────────────────────────────────────────────────────────
// Avatar cell — image when URL present, initials circle otherwise.
const AvatarCell = ({ url, name }) => {
  const initials = (name || '?').split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  return url ? (
    <img
      src={url}
      alt={name || ''}
      className="w-9 h-9 rounded-full object-cover border border-border-muted shrink-0"
      onError={(e) => { e.currentTarget.style.display = 'none'; }}
    />
  ) : (
    <div className="w-9 h-9 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center text-xs font-semibold shrink-0">
      {initials}
    </div>
  );
};

const DataTable = ({ spec }) => (
  <Shell>
    <div className="flex items-baseline gap-2 mb-3">
      <h3 className="text-md font-semibold text-text-primary">{spec.title}</h3>
      {spec.truncated && (
        <span className="text-xs text-text-muted">
          (showing {spec.shown} of {spec.total})
        </span>
      )}
    </div>
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-muted">
            {spec.columns.map((c) => (
              <th
                key={c.key}
                className={`text-left px-2 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide ${c.type === 'avatar' ? 'w-12' : ''}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {spec.rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-border-muted/50 ${i % 2 === 1 ? 'bg-black/5 dark:bg-white/[0.02]' : ''}`}
            >
              {spec.columns.map((c) => (
                <td key={c.key} className="px-2 py-2 text-text-primary align-middle break-words max-w-xs">
                  {c.type === 'avatar'
                    ? <AvatarCell url={row[c.key]} name={row.__name} />
                    : (row[c.key] || <span className="text-text-muted">—</span>)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Shell>
);

// ─── Confirmation card ──────────────────────────────────────────────────────
const ConfirmationCard = ({ spec }) => (
  <Shell className="border-green-500/30 bg-green-500/5">
    <div className="flex gap-3 items-start">
      <span className="text-2xl shrink-0">✅</span>
      <div className="flex-1">
        <h3 className="text-md font-semibold text-text-primary">{spec.title}</h3>
        {spec.detail && <p className="text-sm text-text-secondary mt-1">{spec.detail}</p>}
      </div>
    </div>
  </Shell>
);

// ─── Key-value list ─────────────────────────────────────────────────────────
const KeyValueList = ({ spec }) => (
  <Shell>
    {spec.title && <h3 className="text-md font-semibold text-text-primary mb-3">{spec.title}</h3>}
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
      {spec.pairs.map((p) => (
        <React.Fragment key={p.key || p.label}>
          <dt className="text-text-secondary font-medium">{p.label}</dt>
          <dd className="text-text-primary break-words">{p.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  </Shell>
);

// ─── Empty result ───────────────────────────────────────────────────────────
const EmptyCard = ({ spec }) => (
  <Shell>
    <p className="text-sm text-text-secondary text-center py-2">{spec.message || 'Nothing to show.'}</p>
  </Shell>
);

// ─── Multi (one card per step in a multi-step plan) ─────────────────────────
const MultiResults = ({ spec }) => (
  <div className="space-y-3">
    {spec.items.map((it, i) => (
      <div key={i}>
        {it.actionId && (
          <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">
            Step {i + 1} · {it.platform}:{it.actionId}
          </p>
        )}
        <ResultRenderer spec={it.spec} />
      </div>
    ))}
  </div>
);

export default ResultRenderer;
