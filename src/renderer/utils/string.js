
export const capitalize = (str) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str) => {
  if (!str) return str;
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
};

export const truncate = (str, maxLength) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
};

export const removeWhitespace = (str) => {
  return str.replace(/\s+/g, '');
};

export const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getInitials = (name, maxInitials = 2) => {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '';

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return words
    .slice(0, maxInitials)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
};

export const maskSensitive = (str, type = 'custom', visibleChars = 4) => {
  if (type === 'email') {
    const [local, domain] = str.split('@');
    if (!domain) return maskSensitive(str, 'custom', visibleChars);
    const maskedLocal = maskSensitive(local, 'custom', Math.min(visibleChars, local.length));
    return `${maskedLocal}@${domain}`;
  }

  if (type === 'phone') {
    const digits = str.replace(/\D/g, '');
    if (digits.length <= visibleChars) return str;
    const lastDigits = digits.slice(-visibleChars);
    return `***-***-${lastDigits}`;
  }

  if (str.length <= visibleChars) return str;
  const visible = str.slice(-visibleChars);
  const masked = '*'.repeat(str.length - visibleChars);
  return masked + visible;
};

