import React, { useState } from 'react';
import { ButtonPlain } from '../components/Button';
import logo from '@assets/logos/logo.png';

const ForgotPassword = ({ onBack, onOTPSent }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);

      setTimeout(() => {
        onOTPSent(email);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-background p-4">
      <div className="bg-[var(--color-base-background-light)] p-8 rounded-lg shadow-lg w-full max-w-md border border-border-muted">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Omnis Reach Logo" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary text-center mb-2">Forgot Password</h2>
        <p className="text-text-secondary text-sm text-center mb-6">
          Enter your email address and we'll send you a one-time password (OTP) to reset your password.
        </p>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-success font-medium mb-2">OTP Sent!</p>
            <p className="text-text-secondary text-sm">
              We've sent a 6-digit OTP to <span className="font-medium text-text-primary">{email}</span>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-accent"
                placeholder="your@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-error text-sm text-center">{error}</p>}
            <ButtonPlain type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Send OTP
            </ButtonPlain>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none"
            disabled={isLoading}
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

