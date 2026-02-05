import React, { useRef, useEffect } from 'react';
import { useField } from 'formik';

/**
 * Reusable OTP Input Component
 * 6-digit OTP input with auto-focus and paste support
 */
const OTPInput = ({ name, label, className = '' }) => {
  const [field, meta, helpers] = useField(name);
  const otpInputs = useRef([]);
  const hasError = meta.touched && meta.error;

  // Convert OTP string to array for display
  const otpArray = field.value ? field.value.split('') : ['', '', '', '', '', ''];
  while (otpArray.length < 6) otpArray.push('');

  const handleOtpChange = (index, value) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otpArray];
    newOtp[index] = value.slice(-1);
    const otpString = newOtp.join('').slice(0, 6);
    
    helpers.setValue(otpString);
    helpers.setTouched(true);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      helpers.setValue(pastedData);
      helpers.setTouched(true);
      
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      otpInputs.current[lastFilledIndex]?.focus();
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-text-secondary text-sm font-medium mb-3 text-center">
          {label}
        </label>
      )}
      <div className="flex justify-center gap-2">
        {otpArray.map((digit, index) => (
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
            onBlur={() => helpers.setTouched(true)}
            className={`
              w-12 h-12 text-center text-lg font-semibold 
              bg-base-background border rounded-lg text-text-primary 
              focus:outline-none focus:ring-2 focus:ring-primary-accent focus:border-transparent 
              transition-all
              ${hasError 
                ? 'border-error focus:ring-error' 
                : 'border-border-muted'
              }
              ${className}
            `}
          />
        ))}
      </div>
      {hasError && (
        <p className="mt-2 text-sm text-error text-center">{meta.error}</p>
      )}
    </div>
  );
};

export default OTPInput;

