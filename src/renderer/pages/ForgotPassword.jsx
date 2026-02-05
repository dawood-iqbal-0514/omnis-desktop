import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import { ButtonPlain } from '../components/Button';
import { FormField } from '../components/Form';
import useAuthStore from '../store/authStore';
import useToast from '../hooks/useToast';
import { forgotPasswordSchema, initialValues } from '../schemas/auth.schemas';
import logo from '@assets/logos/logo.png';

const ForgotPassword = ({ onBack, onOTPSent, onRedirectToDashboard }) => {
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sendPasswordResetOTP = useAuthStore((state) => state.sendPasswordResetOTP);
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
      setSuccess(false);
      setEmail(values.email);

      const response = await sendPasswordResetOTP(values.email);

      if (response.success) {
        setSuccess(true);
        showSuccess('OTP sent to your email!');

        setTimeout(() => {
          onOTPSent(values.email);
          resetForm();
        }, 1500);
      } else {
        showError(response.error || 'Failed to send OTP');
      }
    } catch (err) {
      showError(err.message || 'Failed to send OTP. Please try again.');
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
          <Formik
            initialValues={initialValues.forgotPassword}
            validationSchema={forgotPasswordSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting, values }) => (
              <Form className="space-y-4">
                <FormField
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="your@example.com"
                  required
                />
                <ButtonPlain type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                  Send OTP
                </ButtonPlain>
              </Form>
            )}
          </Formik>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
