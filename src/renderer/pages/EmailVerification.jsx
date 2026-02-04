import React, { useState, useEffect, useRef } from 'react';
import { Formik, Form } from 'formik';
import { ButtonPlain } from '../components/Button';
import { OTPInput } from '../components/Form';
import useAuthStore from '../store/authStore';
import useToast from '../hooks/useToast';
import { emailVerificationSchema, initialValues } from '../schemas/auth.schemas';
import logo from '@assets/logos/logo.png';

const EmailVerification = ({ email, name, onVerificationSuccess, onBack }) => {
  const [isResending, setIsResending] = useState(false);
  const hasShownToast = useRef(false);
  const sendVerificationOTP = useAuthStore((state) => state.sendVerificationOTP);
  const verifyEmailOTP = useAuthStore((state) => state.verifyEmailOTP);
  const { showSuccess, showError } = useToast();

  // Show toast on mount - OTP was already sent from backend during signup
  useEffect(() => {
    if (email && !hasShownToast.current) {
      hasShownToast.current = true;
      showSuccess('OTP has been sent to your email!');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const sendOTP = async () => {
    setIsResending(true);

    try {
      const response = await sendVerificationOTP(email, name);
      if (response.success) {
        showSuccess('OTP has been sent to your email!');
      } else {
        showError(response.error || 'Failed to send OTP');
      }
    } catch (err) {
      showError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (values, { setSubmitting }) => {
    try {
      const response = await verifyEmailOTP(email, values.otp);

      if (response.success) {
        showSuccess('Email verified successfully!');
        if (onVerificationSuccess) {
          onVerificationSuccess();
        }
      } else {
        showError(response.error || 'Invalid or expired OTP');
      }
    } catch (err) {
      showError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    await sendOTP();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Omnis Reach" className="h-20 w-auto mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-text-primary mb-2">Verify Your Email</h1>
          <p className="text-text-secondary">We've sent a 6-digit code to</p>
          <p className="text-text-primary font-medium">{email}</p>
        </div>

        <div className="bg-[var(--color-base-background-light)] rounded-lg p-8 border border-border-muted">
          <Formik
            initialValues={initialValues.emailVerification}
            validationSchema={emailVerificationSchema}
            onSubmit={handleVerify}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <OTPInput name="otp" />

                <ButtonPlain
                  type="submit"
                  variant="primary"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  Verify Email
                </ButtonPlain>

                <div className="text-center">
                  <p className="text-text-secondary text-sm mb-2">
                    Didn't receive the code?
                  </p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-primary-accent hover:text-[var(--color-primary-accent-hover)] text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? 'Sending...' : 'Resend OTP'}
                  </button>
                </div>
              </Form>
            )}
          </Formik>

          {onBack && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onBack}
                className="text-text-secondary text-sm hover:text-primary-accent transition-colors"
              >
                ← Back to Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
