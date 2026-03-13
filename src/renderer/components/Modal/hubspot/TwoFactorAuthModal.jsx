import React, { useState } from 'react';
import Modal from '../Modal';
import { ButtonPlain } from '../../Button';

const TwoFactorAuthModal = ({ isOpen, onClose, onSubmit, isLoading = false }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please enter the 2FA token');
      return;
    }

    if (token.trim().length < 4) {
      setError('Token must be at least 4 characters');
      return;
    }

    onSubmit(token.trim());
    setToken('');
  };

  const handleClose = () => {
    if (!isLoading) {
      setToken('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Two-Factor Authentication"
      size="md"
      closeOnOutsideClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-text-secondary text-sm mb-4">
            HubSpot has sent a 2FA code to your email. Please enter it below to continue.
          </p>
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="2fa-token"
          >
            Verification Code
          </label>
          <input
            type="text"
            id="2fa-token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError('');
            }}
            placeholder="Enter 2FA code"
            disabled={isLoading}
            className="w-full px-4 py-3 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder:text-lg placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center text-2xl tracking-widest font-mono"
            maxLength={10}
            autoFocus
          />
        </div>

        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <ButtonPlain
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isLoading}
          >
            Verify
          </ButtonPlain>
        </div>
      </form>
    </Modal>
  );
};

export default TwoFactorAuthModal;

