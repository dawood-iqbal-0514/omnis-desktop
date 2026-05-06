import React, { useState, useEffect, useRef } from 'react';
import { ButtonPlain } from '../../Button';

/**
 * AskCard — collect a free-text input the user owes the flow.
 *
 * The executor surfaces this when an action's userInput slot is required
 * and the user didn't provide it in their original message (e.g. asking
 * for a comment body, a personal note on an invite, a reaction type).
 */
const AskCard = ({ prompt, slot, type, onSubmit, onCancel }) => {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const isShort = type === 'number' || (slot === 'reactionType');

  return (
    <div className="bg-[var(--color-base-background-light)] border border-border-muted rounded-lg p-5 my-4">
      <label className="block text-md font-medium text-text-primary mb-2">
        {prompt || `What value for ${slot}?`}
      </label>
      {isShort ? (
        <input
          ref={ref}
          type={type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSubmit(value.trim()); }}
          className="w-full bg-base-background border border-border-muted rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent"
        />
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          className="w-full bg-base-background border border-border-muted rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent"
        />
      )}
      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-border-muted">
        <ButtonPlain variant="outline" onClick={onCancel}>Cancel</ButtonPlain>
        <ButtonPlain
          variant="primary"
          disabled={!value.trim()}
          onClick={() => onSubmit(value.trim())}
        >
          Continue
        </ButtonPlain>
      </div>
    </div>
  );
};

export default AskCard;
