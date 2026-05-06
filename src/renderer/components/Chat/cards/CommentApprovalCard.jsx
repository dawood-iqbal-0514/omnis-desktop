import React, { useState, useEffect } from 'react';
import { ButtonPlain } from '../../Button';

/**
 * CommentApprovalCard — final review before publishing a comment.
 *
 * Visual: post preview at the top, editable textarea, character counter,
 * Regenerate (if AI-drafted), Cancel, Post comment.
 */
const CommentApprovalCard = ({
  target = {},
  draftBody = '',
  draftSource = null,        // 'ai' | 'manual' | null
  onApprove,
  onRegenerate,
  onCancel,
  regenerating = false,
}) => {
  const [body, setBody] = useState(draftBody);
  useEffect(() => { setBody(draftBody); }, [draftBody]);

  const truncate = (s, n = 220) => (s && s.length > n ? s.slice(0, n).trim() + '…' : s || '');
  const initials = (name) =>
    (name || '?').split(/\s+/).filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  // LinkedIn limits comments to 1250 chars (soft) — show counter near limit.
  const MAX = 1250;
  const remaining = MAX - body.length;

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-xl shadow-sm p-5 my-4">
      {target?.text && (
        <div className="rounded-lg bg-black/5 dark:bg-white/5 border border-border-muted/70 p-3 mb-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-primary-accent/15 text-primary-accent flex items-center justify-center text-[10px] font-semibold">
              {initials(target.authorName)}
            </div>
            <div className="text-xs font-medium text-text-primary truncate">
              Replying to {target.authorName || 'this post'}
            </div>
          </div>
          <div className="text-sm text-text-secondary leading-snug">{truncate(target.text)}</div>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <label className="text-base font-semibold text-text-primary">
          Your comment
        </label>
        {draftSource === 'ai' && (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-primary-accent bg-primary-accent/10 px-2 py-0.5 rounded">
            AI draft — review before posting
          </span>
        )}
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What would you like to say?"
        rows={5}
        maxLength={MAX}
        disabled={regenerating}
        className="w-full bg-base-background border border-border-muted rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all resize-y"
      />

      <div className="flex items-center justify-between mt-1.5 text-xs">
        <span className={regenerating ? 'text-text-muted' : 'invisible'}>
          {regenerating ? 'Regenerating draft…' : ''}
        </span>
        <span className={remaining < 100 ? 'text-amber-500' : 'text-text-muted'}>
          {body.length} / {MAX}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-muted">
        {onRegenerate && (
          <ButtonPlain variant="outline" onClick={onRegenerate} disabled={regenerating}>
            <span className="flex items-center gap-1.5">
              <span aria-hidden>🔄</span>
              <span>Regenerate</span>
            </span>
          </ButtonPlain>
        )}
        <div className="flex-1" />
        <ButtonPlain variant="outline" onClick={onCancel}>Cancel</ButtonPlain>
        <ButtonPlain
          variant="primary"
          disabled={!body.trim() || regenerating}
          onClick={() => onApprove && onApprove(body.trim())}
        >
          Post comment
        </ButtonPlain>
      </div>
    </div>
  );
};

export default CommentApprovalCard;
