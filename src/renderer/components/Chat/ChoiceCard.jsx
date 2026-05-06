import React, { useState } from 'react';
import { ButtonPlain } from '../Button';

/**
 * ChoiceCard — pick a LinkedIn person from a search candidate list.
 *
 * Visual: rich profile cards with avatar, name, headline, location, plus a
 * subtle selection chrome. Clicking a card selects it; "Continue" fires the
 * follow-up action.
 *
 * Props:
 *   candidates    — [{ profileUrn, name, headline, location, profilePictureUrl, profileUrl, distance? }]
 *   followUpLabel — short string ("Send connection request", "Send message", "Continue")
 *   total         — total result count when known
 *   hasMore       — explicit pagination flag
 *   loadingMore   — true while fetching the next page
 *   onPick        — fn(candidate)
 *   onShowMore    — fn() — fetch next page
 *   onCancel      — fn()
 */
const ChoiceCard = ({
  candidates = [],
  followUpLabel = 'Continue',
  total = null,
  hasMore,
  loadingMore = false,
  onPick,
  onShowMore,
  onCancel,
}) => {
  const [selected, setSelected] = useState(null);

  const initials = (name) =>
    (name || '?').split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  const moreAvailable = (hasMore != null)
    ? hasMore
    : (total != null ? candidates.length < total : true);

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-xl shadow-sm p-5 my-4">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">
          Pick the right person
        </h3>
        <span className="text-xs text-text-muted">
          {total != null && total > 0
            ? `${candidates.length}${moreAvailable ? '+' : ''} of ~${total.toLocaleString()}`
            : `${candidates.length} ${candidates.length === 1 ? 'match' : 'matches'}`}
        </span>
      </div>

      <ul className="space-y-2">
        {candidates.map((c, i) => {
          const id = c.profileUrn || `cand-${i}`;
          const isSel = selected?.profileUrn === c.profileUrn;
          return (
            <li key={id}>
              <div
                onClick={() => setSelected(c)}
                className={`group rounded-xl border-2 transition-all cursor-pointer p-3 flex items-center gap-3 ${
                  isSel
                    ? 'border-primary-accent bg-primary-accent/5 shadow-sm'
                    : 'border-border-muted hover:border-primary-accent/40 hover:bg-black/[.02] dark:hover:bg-white/[.02]'
                }`}
              >
                <div className="relative shrink-0">
                  {c.profilePictureUrl ? (
                    <img
                      src={c.profilePictureUrl}
                      alt={c.name || ''}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center text-sm font-semibold">
                      {initials(c.name)}
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {c.name || 'LinkedIn Member'}
                    </span>
                    {c.distance && (
                      <span className="text-[10px] uppercase tracking-wide font-medium text-text-muted bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                        {c.distance === 'DISTANCE_1' ? '1st' : c.distance === 'DISTANCE_2' ? '2nd' : c.distance === 'DISTANCE_3' ? '3rd' : ''}
                      </span>
                    )}
                  </div>
                  {c.headline && (
                    <div className="text-xs text-text-secondary truncate mt-0.5">{c.headline}</div>
                  )}
                  {c.location && (
                    <div className="text-xs text-text-muted truncate mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5A2.5 2.5 0 1 1 8 3.5a2.5 2.5 0 0 1 0 5z"/>
                      </svg>
                      <span className="truncate">{c.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 mt-5 pt-4 border-t border-border-muted">
        {moreAvailable && onShowMore && (
          <ButtonPlain
            variant="outline"
            className="flex-shrink-0"
            onClick={onShowMore}
            isLoading={loadingMore}
          >
            Show more
          </ButtonPlain>
        )}
        <div className="flex-1" />
        <ButtonPlain variant="outline" onClick={onCancel}>Cancel</ButtonPlain>
        <ButtonPlain
          variant="primary"
          disabled={!selected}
          onClick={() => selected && onPick && onPick(selected)}
        >
          {followUpLabel}
        </ButtonPlain>
      </div>
    </div>
  );
};

export default ChoiceCard;
