import React, { useState } from 'react';
import { ButtonPlain } from '../Button';

/**
 * ChoiceCard — disambiguation UI for "send invite to <ambiguous person>"
 * style flows.
 *
 * The chatbot pipeline emits this when an action targets a person but the
 * user gave only a name (no LinkedIn URL or vanity slug). After running
 * `search_people`, it presents the top candidates here. The user picks one,
 * and the original action (send_invite, send_message, follow, etc.) fires
 * with the picked profileUrn.
 *
 * Props:
 *   candidates  — array of { profileUrn, name, headline, location, profilePictureUrl, profileUrl }
 *   followUpLabel — short string ("Send connection request", "Send message")
 *   total       — total result count (may be null when LinkedIn doesn't surface it)
 *   hasMore     — explicit "more pages available" flag from the search response;
 *                 takes priority over total comparison. Default: true if not given.
 *   loadingMore — true while fetching the next page
 *   onPick      — fn(candidate) — user selected one and clicked Continue
 *   onShowMore  — fn() — user wants the next page
 *   onCancel    — fn() — drop the disambiguation, end the plan
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

  // hasMore from the server is the most reliable signal. Fallback ladder:
  //   1. explicit prop                   (server told us yes/no)
  //   2. total > candidates.length      (paging metadata exists)
  //   3. default true                    (better UX — let user discover end)
  const moreAvailable = (hasMore != null)
    ? hasMore
    : (total != null ? candidates.length < total : true);

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-lg p-5 my-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-md font-semibold text-text-primary">
          Pick a person
          {total != null && total > 0 && (
            <span className="text-text-muted text-xs font-normal ml-2">
              ({candidates.length}{moreAvailable ? '+' : ''} of ~{total.toLocaleString()})
            </span>
          )}
        </h3>
      </div>

      <ul className="space-y-1.5">
        {candidates.map((c, i) => {
          const id = c.profileUrn || `cand-${i}`;
          const isSel = selected?.profileUrn === c.profileUrn;
          return (
            <li key={id}>
              <label
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                  isSel
                    ? 'bg-primary-accent/10 border-primary-accent'
                    : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 hover:border-border-muted'
                }`}
              >
                <input
                  type="radio"
                  name="choice"
                  className="accent-primary-accent shrink-0"
                  checked={isSel}
                  onChange={() => setSelected(c)}
                />
                {c.profilePictureUrl ? (
                  <img
                    src={c.profilePictureUrl}
                    alt={c.name || ''}
                    className="w-10 h-10 rounded-full object-cover border border-border-muted shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center text-xs font-semibold shrink-0">
                    {initials(c.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {c.name || 'LinkedIn Member'}
                  </div>
                  {c.headline && (
                    <div className="text-xs text-text-secondary truncate">{c.headline}</div>
                  )}
                  {c.location && (
                    <div className="text-xs text-text-muted truncate">📍 {c.location}</div>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border-muted">
        {moreAvailable && onShowMore && (
          <ButtonPlain
            variant="outline"
            className="flex-shrink-0"
            onClick={onShowMore}
            isLoading={loadingMore}
          >
            Show 5 more
          </ButtonPlain>
        )}
        <div className="flex-1" />
        <ButtonPlain variant="outline" onClick={onCancel}>
          Cancel
        </ButtonPlain>
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
