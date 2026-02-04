import React, { useEffect } from 'react';
import { Formik, Form } from 'formik';
import { ButtonPlain } from '../components/Button';
import { FormField, FormCheckbox } from '../components/Form';
import useAuthStore from '../store/authStore';
import useToast from '../hooks/useToast';
import { signUpSchema, initialValues } from '../schemas/auth.schemas';
import logo from '@assets/logos/logo.png';

const SignUp = ({ onSignInClick, onRedirectToDashboard, onEmailVerification }) => {
  const signup = useAuthStore((state) => state.signup);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { showSuccess, showError } = useToast();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('omnis-reach-token');
    if (token && isAuthenticated && onRedirectToDashboard) {
      onRedirectToDashboard();
    }
  }, [isAuthenticated, onRedirectToDashboard]);

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      const response = await signup(values.name, values.email, values.password);

      if (response.success) {
        const userData = {
          email: response.data.user.email,
          name: response.data.user.name,
        };
        
        // Don't show toast here - EmailVerification page will show it after OTP is sent
        // Navigate to email verification page
        if (onEmailVerification) {
          onEmailVerification(userData.email, userData.name);
        }
      } else {
        showError(response.error || 'Failed to create account');
      }
    } catch (err) {
      // Handle different error cases
      if (err.message && err.message.includes('already exists')) {
        // Check if the message says to sign in (means email is verified)
        if (err.message.includes('sign in')) {
          showError('An account with this email already exists. Please sign in instead.');
        } else {
          // Otherwise, email is not verified
          showError('An account with this email exists but is not verified. Please check your email for the verification code or try signing in.');
        }
      } else {
        showError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
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
          <Formik
            initialValues={initialValues.signUp}
            validationSchema={signUpSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <FormField
                  name="name"
                  label="Full Name"
                  placeholder="John Doe"
                  required
                />

                <FormField
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  required
                />

                <FormField
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="At least 8 characters"
                  required
                />

                <FormField
                  name="confirmPassword"
                  type="password"
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  required
                />

                <FormCheckbox
                  name="termsAccepted"
                  label={
                    <>
                      I agree to the{' '}
                      <button type="button" className="text-primary-accent hover:text-[var(--color-primary-accent-hover)]">
                        Terms of Service
                      </button>{' '}
                      and{' '}
                      <button type="button" className="text-primary-accent hover:text-[var(--color-primary-accent-hover)]">
                        Privacy Policy
                      </button>
                    </>
                  }
                  required
                />

                <ButtonPlain
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Create Account
                </ButtonPlain>
              </Form>
            )}
          </Formik>

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
