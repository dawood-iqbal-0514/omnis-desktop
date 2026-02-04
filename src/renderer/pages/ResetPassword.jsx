import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import { ButtonPlain } from '../components/Button';
import { OTPInput, FormField } from '../components/Form';
import useAuthStore from '../store/authStore';
import useToast from '../hooks/useToast';
import { resetPasswordSchema, initialValues } from '../schemas/auth.schemas';
import logo from '@assets/logos/logo.png';

const ResetPassword = ({ email, onBack, onResetSuccess, onRedirectToDashboard }) => {
  const [success, setSuccess] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const { showSuccess, showError } = useToast();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('omnis-reach-token');
    if (token && isAuthenticated && onRedirectToDashboard) {
      onRedirectToDashboard();
    }
  }, [isAuthenticated, onRedirectToDashboard]);

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await resetPassword(email, values.otp, values.password);

      if (response.success) {
        setSuccess(true);
        showSuccess('Password reset successful!');

        setTimeout(() => {
          onResetSuccess();
          resetForm();
        }, 2000);
      } else {
        showError(response.error || 'Failed to reset password');
      }
    } catch (err) {
      showError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          <Formik
            initialValues={initialValues.resetPassword}
            validationSchema={resetPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <OTPInput name="otp" label="Enter OTP" />

                <FormField
                  name="password"
                  type="password"
                  label="New Password"
                  placeholder="Enter new password"
                  required
                />

                <FormField
                  name="confirmPassword"
                  type="password"
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  required
                />

                <ButtonPlain type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                  Reset Password
                </ButtonPlain>
              </Form>
            )}
          </Formik>
        )}

        {!success && (
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => onBack(email)}
              className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none block w-full"
            >
              ← Back to Forgot Password
            </button>
            <button
              onClick={() => onBack()}
              className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none block w-full"
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
