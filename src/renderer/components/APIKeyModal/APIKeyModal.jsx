import React, { useState } from 'react';
import { ButtonPlain } from '../Button';
import { Modal } from '../Modal';

const APIKeyModal = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!apiKey.trim()) {
      setError('Please enter an API key.');
      return;
    }

    setIsLoading(true);

    try {

      localStorage.setItem('omnis-reach-api-key', apiKey.trim());

      onSave(apiKey.trim());

      setApiKey('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save API key. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setApiKey('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enter API Key"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="api-key"
          >
            API Key
          </label>
          <input
            type="password"
            id="api-key"
            className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
            placeholder="Enter your Claude API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={isLoading}
            required
          />
          <p className="text-text-muted text-xs mt-2">
            Your API key is stored locally and used to access the AI assistant.
          </p>
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
            Save API Key
          </ButtonPlain>
        </div>
      </form>
    </Modal>
  );
};

export default APIKeyModal;

