import React, { useState } from 'react';
import { ButtonPlain } from '../components/Button';
import useAuthStore from '../store/authStore';
import logo from '@assets/logos/logo.png';

const SignUp = ({ onSignInClick }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      login({ email, name });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Omnis Reach" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-text-primary mb-2">Create Account</h1>
          <p className="text-text-secondary">Sign up to get started with Omnis Reach</p>
        </div>

        <div className="bg-[var(--color-base-background-light)] rounded-lg p-8 border border-border-muted">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-base-background border border-border-muted rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent transition-all"
                placeholder="Confirm your password"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                required
                className="w-4 h-4 text-primary-accent bg-base-background border-border-muted rounded focus:ring-primary-accent"
              />
              <span className="ml-2 text-sm text-text-secondary">
                I agree to the{' '}
                <button type="button" className="text-primary-accent hover:text-[var(--color-primary-accent-hover)]">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-primary-accent hover:text-[var(--color-primary-accent-hover)]">
                  Privacy Policy
                </button>
              </span>
            </div>

            <ButtonPlain
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Create Account
            </ButtonPlain>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSignInClick}
                className="text-primary-accent hover:text-[var(--color-primary-accent-hover)] font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;

