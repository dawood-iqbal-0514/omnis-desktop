import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import { ButtonPlain } from '../components/Button';
import { OTPInput, FormField } from '../components/Form';
import useAuthStore from '../store/authStore';
import useToast from '../hooks/useToast';
import { verifyPasswordResetOTPSchema, resetPasswordSchema, initialValues } from '../schemas/auth.schemas';
import logo from '@assets/logos/logo.png';

const ResetPassword = ({ email, onBack, onResetSuccess, onRedirectToDashboard }) => {
  const [step, setStep] = useState(1); // 1: Verify OTP, 2: Set New Password
  const [verifiedOTP, setVerifiedOTP] = useState('');
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const verifyPasswordResetOTP = useAuthStore((state) => state.verifyPasswordResetOTP);
  const resetPassword = useAuthStore((state) => state.resetPassword);
  const { showSuccess, showError } = useToast();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const token = localStorage.getItem('omnis-reach-token');
    if (token && isAuthenticated && onRedirectToDashboard) {
      onRedirectToDashboard();
    }
  }, [isAuthenticated, onRedirectToDashboard]);

  const handleOTPVerify = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await verifyPasswordResetOTP(email, values.otp);

      if (response.success) {
        setVerifiedOTP(values.otp);
        setStep(2);
        showSuccess('OTP verified successfully!');
        resetForm();
      } else {
        showError(response.error || 'Invalid or expired OTP');
      }
    } catch (err) {
      showError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (values, { setSubmitting, resetForm }) => {
    try {
      const response = await resetPassword(email, verifiedOTP, values.password);

      if (response.success) {
        showSuccess('Password reset successful!');
        onResetSuccess();
        resetForm();
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
        
        {step === 1 && (
          <>
            <p className="text-text-secondary text-sm text-center mb-6">
              Enter the 6-digit OTP sent to <span className="font-medium text-text-primary">{email}</span>
            </p>

            <Formik
              initialValues={initialValues.verifyPasswordResetOTP}
              validationSchema={verifyPasswordResetOTPSchema}
              onSubmit={handleOTPVerify}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-6">
                  <OTPInput name="otp" label="Enter OTP" />

                  <ButtonPlain type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
                    Verify OTP
                  </ButtonPlain>
                </Form>
              )}
            </Formik>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-text-secondary text-sm text-center mb-6">
              OTP verified! Please enter your new password.
            </p>

            <Formik
              initialValues={initialValues.resetPassword}
              validationSchema={resetPasswordSchema}
              onSubmit={handlePasswordReset}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-6">
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
          </>
        )}

        <div className="mt-6 text-center space-y-2">
          {step === 1 && (
            <>
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
            </>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="text-text-secondary text-sm hover:text-primary-accent transition-colors focus:outline-none block w-full"
            >
              ← Back to OTP Verification
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
