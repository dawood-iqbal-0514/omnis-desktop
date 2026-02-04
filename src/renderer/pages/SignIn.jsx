import React, { useEffect } from 'react';
import { Formik, Form } from 'formik';
import { ButtonPlain } from '../components/Button';
import { FormField } from '../components/Form';
import useAuthStore from '../store/authStore';
import useToast from '../hooks/useToast';
import { signInSchema, initialValues } from '../schemas/auth.schemas';
import logo from '@assets/logos/logo.png';

const SignIn = ({ onSignUpClick, onForgotPassword, onRedirectToDashboard }) => {
  const signin = useAuthStore((state) => state.signin);
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
      const response = await signin(values.email, values.password);

      if (response.success) {
        showSuccess('Signed in successfully!');
        // Navigation will be handled by App.jsx based on auth state
      } else {
        // Show the specific error message from backend
        showError(response.error || 'Failed to sign in');
      }
    } catch (err) {
      // Handle specific error cases
      if (err.message && err.message.includes('Account does not exist')) {
        showError('Account does not exist. Please sign up.');
      } else if (err.message && err.message.includes('Email not verified')) {
        showError('Email not verified. Please sign up again.');
      } else {
        // Show the error message from backend (could be "Invalid email or password")
        showError(err.message || 'Failed to sign in. Please try again.');
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome Back</h1>
          <p className="text-text-secondary">Sign in to your account to continue</p>
        </div>

        <div className="bg-[var(--color-base-background-light)] rounded-lg p-8 border border-border-muted">
          <Formik
            initialValues={initialValues.signIn}
            validationSchema={signInSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
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
                  placeholder="Enter your password"
                  required
                />

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-sm text-primary-accent hover:text-[var(--color-primary-accent-hover)]"
                  >
                    Forgot password?
                  </button>
                </div>

                <ButtonPlain
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Sign In
                </ButtonPlain>
              </Form>
            )}
          </Formik>

          <div className="mt-6 text-center">
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onSignUpClick}
                className="text-primary-accent hover:text-[var(--color-primary-accent-hover)] font-medium"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
