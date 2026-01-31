import React, { useState } from 'react';
import { ButtonPlain } from '../Button';
import { Modal } from '../Modal';

const LinkedInConnection = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {

      await new Promise((resolve) => setTimeout(resolve, 2000));

      onSuccess({
        platform: 'linkedin',
        email,
        connectedAt: new Date().toISOString(),
      });

      setEmail('');
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to connect to LinkedIn. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setPassword('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Connect LinkedIn"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="linkedin-email"
          >
            Email Address
          </label>
          <input
            type="email"
            id="linkedin-email"
            className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
            placeholder="your@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="linkedin-password"
          >
            Password
          </label>
          <input
            type="password"
            id="linkedin-password"
            className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        {error && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <ButtonPlain
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </ButtonPlain>
          <ButtonPlain
            type="submit"
            variant="primary"
            className="flex-1"
            isLoading={isLoading}
          >
            Connect
          </ButtonPlain>
        </div>
      </form>
    </Modal>
  );
};

export default LinkedInConnection;

