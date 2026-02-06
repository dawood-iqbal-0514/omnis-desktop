import * as Yup from 'yup';

// Common validation rules
const emailValidation = Yup.string()
  .email('Please enter a valid email address')
  .required('Email is required')
  .trim()
  .lowercase();

const passwordValidation = Yup.string()
  .min(8, 'Password must be at least 8 characters long')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)'
  )
  .required('Password is required');

const nameValidation = Yup.string()
  .min(2, 'Name must be at least 2 characters long')
  .max(50, 'Name must be less than 50 characters')
  .required('Name is required')
  .trim();

const otpValidation = Yup.string()
  .required('OTP is required')
  .length(6, 'OTP must be 6 digits')
  .matches(/^\d+$/, 'OTP must contain only numbers');

export const signUpSchema = Yup.object().shape({
  name: nameValidation,
  email: emailValidation,
  password: passwordValidation,
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
  termsAccepted: Yup.boolean()
    .required('You must accept the terms and conditions')
    .oneOf([true], 'You must accept the terms and conditions'),
});

/**
 * Sign In validation schema
 * Password only needs to be required, no complexity rules
 */
const signInPasswordValidation = Yup.string()
  .required('Password is required');

export const signInSchema = Yup.object().shape({
  email: emailValidation,
  password: signInPasswordValidation,
});

export const forgotPasswordSchema = Yup.object().shape({
  email: emailValidation,
});


export const verifyPasswordResetOTPSchema = Yup.object().shape({
  otp: otpValidation,
});


export const resetPasswordSchema = Yup.object().shape({
  password: passwordValidation,
  confirmPassword: Yup.string()
    .required('Please confirm your password')
    .oneOf([Yup.ref('password')], 'Passwords must match'),
});

export const emailVerificationSchema = Yup.object().shape({
  otp: otpValidation,
});

export const initialValues = {
  signUp: {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  },
  signIn: {
    email: '',
    password: '',
  },
  forgotPassword: {
    email: '',
  },
  verifyPasswordResetOTP: {
    otp: '',
  },
  resetPassword: {
    password: '',
    confirmPassword: '',
  },
  emailVerification: {
    otp: '',
  },
};

