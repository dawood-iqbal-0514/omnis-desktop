import React, { useState } from 'react';
import { ButtonPlain } from '../../Button';

/**
 * PostChoiceCard — pick one post out of a fetched list.
 *
 * Visual: one post card per row, LinkedIn-flavored — author + headline +
 * post text + engagement counts + selectable border. Clicking a row picks
 * it; "Continue" fires the followUp.
 */
const PostChoiceCard = ({
  candidates = [],
  followUpLabel = 'Continue',
  loadingMore = false,
  onPick,
  onCancel,
}) => {
  const [selected, setSelected] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const truncate = (s, n = 320) =>
    !s ? '' : s.length > n ? s.slice(0, n).trim() + '…' : s;

  const formatRelative = (val) => {
    if (!val) return '';
    // If LinkedIn already gave us a human string ("1d •", "2w", "3 mo ago"),
    // just clean and pass through.
    if (typeof val === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(val)) {
      return val.replace(/[•\s]+$/, '').trim();
    }
    try {
      const d = new Date(val);
      const diff = Date.now() - d.getTime();
      const days = Math.floor(diff / 86400000);
      if (days < 1)   return 'today';
      if (days < 7)   return `${days}d ago`;
      if (days < 30)  return `${Math.floor(days / 7)}w ago`;
      if (days < 365) return `${Math.floor(days / 30)}mo ago`;
      return `${Math.floor(days / 365)}y ago`;
    } catch { return ''; }
  };

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-xl shadow-sm p-5 my-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">Pick a post</h3>
        <span className="text-xs text-text-muted">{candidates.length} found</span>
      </div>

      <ul className="space-y-2.5">
        {candidates.map((p, i) => {
          const id = p.threadUrn || p.activityUrn || `post-${i}`;
          const isSel = selected && selected.threadUrn === p.threadUrn;
          const isExpanded = expandedIdx === i;
          const initials = ((p.authorName || p.actorName) || '?')
            .split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

          return (
            <li key={id}>
              <div
                onClick={() => setSelected(p)}
                className={`group rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
                  isSel
                    ? 'border-primary-accent bg-primary-accent/5 shadow-md'
                    : 'border-border-muted hover:border-primary-accent/40 hover:bg-black/[.02] dark:hover:bg-white/[.02]'
                }`}
              >
                {/* Author row */}
                <div className="flex items-center gap-3 p-3 pb-2">
                  <div className="relative shrink-0">
                    {p.authorPictureUrl ? (
                      <img
                        src={p.authorPictureUrl}
                        alt={(p.authorName || p.actorName) || ''}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center text-xs font-semibold">
                        {initials}
                      </div>
                    )}
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 ${
                      isSel
                        ? 'bg-primary-accent border-white dark:border-[var(--color-base-background-light)]'
                        : 'bg-transparent border-border-muted group-hover:border-primary-accent/50'
                    } transition-colors`}>
                      {isSel && (
                        <svg className="w-full h-full text-white p-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text-primary truncate">
                      {(p.authorName || p.actorName) || 'LinkedIn Member'}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {p.shareAudience === 'CONNECTIONS' ? 'Connections only' : 'Public'}
                      {p.postedAt && <span className="mx-1">•</span>}
                      {p.postedAt && <span>{formatRelative(p.postedAt)}</span>}
                    </div>
                  </div>
                </div>

                {/* Post text */}
                <div className="px-3 pb-3">
                  <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {p.text
                      ? (isExpanded ? p.text : truncate(p.text))
                      : <span className="italic text-text-muted">No text content (image / video / shared link)</span>}
                  </div>
                  {p.text && p.text.length > 320 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedIdx(isExpanded ? null : i); }}
                      className="text-xs text-primary-accent hover:underline mt-1.5"
                    >
                      {isExpanded ? 'See less' : 'See more'}
                    </button>
                  )}
                </div>

                {/* Engagement bar */}
                <div className="flex items-center gap-4 px-3 py-2 border-t border-border-muted/50 bg-black/[.015] dark:bg-white/[.015]">
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <span aria-hidden>👍</span>
                    <span className="tabular-nums">{p.reactions ?? 0}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <span aria-hidden>💬</span>
                    <span className="tabular-nums">{p.comments ?? 0}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <span aria-hidden>🔁</span>
                    <span className="tabular-nums">{p.reposts ?? 0}</span>
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border-muted">
        <div className="flex-1" />
        <ButtonPlain variant="outline" onClick={onCancel}>Cancel</ButtonPlain>
        <ButtonPlain
          variant="primary"
          disabled={!selected || loadingMore}
          onClick={() => selected && onPick && onPick(selected)}
        >
          {followUpLabel}
        </ButtonPlain>
      </div>
    </div>
  );
};

export default PostChoiceCard;
