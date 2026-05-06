import React from 'react';
import { ButtonPlain } from '../../Button';

/**
 * ApprovalCard — a generic "are you sure?" gate before any destructive
 * action runs. Displays the action label + a small preview of what
 * arguments will be sent.
 *
 * For comment-on-post we use the richer CommentApprovalCard instead, which
 * lets the user edit the body inline.
 */
const ApprovalCard = ({ actionLabel, slotPreview = {}, onApprove, onCancel }) => {
  const entries = Object.entries(slotPreview).filter(([, v]) => v != null);

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-lg p-5 my-4">
      <h3 className="text-md font-semibold text-text-primary mb-3">{actionLabel}</h3>
      <p className="text-sm text-text-secondary mb-3">Confirm before running.</p>

      {entries.length > 0 && (
        <div className="space-y-1.5 text-sm mb-3 p-3 rounded bg-black/5 dark:bg-white/5 border border-border-muted">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-text-muted text-xs uppercase tracking-wide min-w-[5rem]">{k}:</span>
              <span className="text-text-primary flex-1 break-words">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border-muted">
        <ButtonPlain variant="outline" onClick={onCancel}>Cancel</ButtonPlain>
        <ButtonPlain variant="primary" onClick={onApprove}>Confirm</ButtonPlain>
      </div>
    </div>
  );
};

export default ApprovalCard;
