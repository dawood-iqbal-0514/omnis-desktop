import React, { useState } from 'react';
import Modal from '../Modal';
import { ButtonPlain } from '../../Button';

const HubSpotAIModal = ({ isOpen, onClose, onSubmit, question, isLoading = false }) => {
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!response.trim()) {
      setError('Please enter a response');
      return;
    }

    onSubmit(response.trim());
    setResponse('');
  };

  const handleClose = () => {
    if (!isLoading) {
      setResponse('');
      setError('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="HubSpot AI Question"
      size="md"
      closeOnOutsideClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-text-secondary text-sm mb-4">
            {question || 'HubSpot AI is asking a question. Please provide your response below.'}
          </p>
          <label
            className="block text-text-secondary text-sm font-medium mb-2"
            htmlFor="hubspot-ai-response"
          >
            Your Response
          </label>
          <textarea
            id="hubspot-ai-response"
            value={response}
            onChange={(e) => {
              setResponse(e.target.value);
              setError('');
            }}
            placeholder="Enter your response to HubSpot AI..."
            disabled={isLoading}
            rows={4}
            className="w-full px-4 py-3 rounded-lg bg-base-background border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-none"
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
            Send Response
          </ButtonPlain>
        </div>
      </form>
    </Modal>
  );
};

export default HubSpotAIModal;

