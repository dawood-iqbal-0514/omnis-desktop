import React from 'react';
import { ButtonPlain } from '../../Button';

/**
 * ActionMenuCard — quick-action menu after an entity is resolved.
 *
 * Props:
 *   target    — the resolved entity preview ({ kind: 'post', text, authorName, ... })
 *   options   — [{ id, label, hint?, icon?, primary?, loading? }]
 *   onPick    — fn(option)
 *   onCancel  — fn()
 */
const ActionMenuCard = ({ target = {}, options = [], onPick, onCancel }) => {
  const truncate = (s, n = 220) =>
    !s ? '' : s.length > n ? s.slice(0, n).trim() + '…' : s;

  const initials = (name) =>
    (name || '?').split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-xl shadow-sm p-5 my-4">
      {target?.text && (
        <div className="rounded-lg bg-black/5 dark:bg-white/5 border border-border-muted/70 p-3 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center text-[10px] font-semibold">
              {initials(target.authorName)}
            </div>
            <div className="text-xs font-medium text-text-primary truncate">
              {target.authorName || 'Selected post'}
            </div>
          </div>
          <div className="text-sm text-text-secondary leading-snug">
            {truncate(target.text)}
          </div>
        </div>
      )}

      <h3 className="text-base font-semibold text-text-primary mb-3">What would you like to do?</h3>

      <div className="grid gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={!!opt.loading}
            onClick={() => !opt.loading && onPick && onPick(opt)}
            className={`group text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
              opt.primary
                ? 'border-primary-accent bg-primary-accent/5 hover:bg-primary-accent/10'
                : 'border-border-muted hover:border-primary-accent/40 hover:bg-black/[.02] dark:hover:bg-white/[.02]'
            } ${opt.loading ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
          >
            <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base ${
              opt.primary
                ? 'bg-primary-accent text-white'
                : 'bg-black/5 dark:bg-white/5 text-text-secondary group-hover:bg-primary-accent/10 group-hover:text-primary-accent'
            } transition-colors`}>
              {opt.icon || '⚡'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-text-primary">{opt.label}</div>
              {opt.hint && <div className="text-xs text-text-muted mt-0.5">{opt.hint}</div>}
            </div>
            {opt.loading && (
              <div className="shrink-0 text-xs text-text-muted">…</div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end mt-4 pt-3 border-t border-border-muted">
        <ButtonPlain variant="outline" onClick={onCancel}>Cancel</ButtonPlain>
      </div>
    </div>
  );
};

export default ActionMenuCard;
