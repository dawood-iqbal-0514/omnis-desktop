import React, { useState, useRef } from 'react';
import { ButtonPlain } from '../components/Button';
import logo from '@assets/logos/logo.png';

const ResetPassword = ({ email, onBack, onResetSuccess }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const otpInputs = useRef([]);

  const handleOtpChange = (index, value) => {

    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); 
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {

    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtp(newOtp);

      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      otpInputs.current[lastFilledIndex]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSuccess(true);

      setTimeout(() => {
        onResetSuccess();
      }, 2000);
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-background p-4">
      <div className="bg-[var(--color-base-background-light)] p-8 rounded-lg shadow-lg w-full max-w-md border border-border-muted">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Omnis Reach Logo" className="h-16 w-auto" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary text-center mb-2">Reset Password</h2>
        <p className="text-text-secondary text-sm text-center mb-6">
          Enter the 6-digit OTP sent to <span className="font-medium text-text-primary">{email}</span> and your new password.
        </p>

        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-success font-medium mb-2">Password Reset Successful!</p>
            <p className="text-text-secondary text-sm">Redirecting to sign in...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-3 text-center">
              Enter OTP
            </label>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-12 text-center text-lg font-semibold bg-base-background border border-border-muted rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-1" htmlFor="password">
              New Password
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-accent"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {}
          <div>
            <label className="block text-text-secondary text-sm font-medium mb-1" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              className="w-full px-4 py-2 rounded-lg bg-base-background border border-border-muted text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-accent"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && <p className="text-error text-sm text-center">{error}</p>}

          <ButtonPlain type="submit" variant="primary" className="w-full" isLoading={isLoading}>
            Reset Password
          </ButtonPlain>
        </form>
        )}

        {!success && (
          <div className="mt-6 text-center space-y-2">
          <button
            onClick={() => onBack(email)}
            className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none block w-full"
            disabled={isLoading}
          >
            ← Back to Forgot Password
          </button>
          <button
            onClick={() => onBack()}
            className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none block w-full"
            disabled={isLoading}
          >
            Back to Sign In
          </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

