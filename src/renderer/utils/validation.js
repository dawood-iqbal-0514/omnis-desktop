
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const isNotEmpty = (value) => {
  return value !== null && value !== undefined && value.trim().length > 0;
};

export const isValidNumber = (value) => {
  return !isNaN(Number(value)) && isFinite(Number(value));
};

export const validatePasswordStrength = (password) => {
  const errors = [];
  let strength = 'weak';

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (errors.length === 0) {
    strength = password.length >= 12 ? 'strong' : 'medium';
  }

  return {
    isValid: errors.length === 0,
    strength,
    errors,
  };
};

