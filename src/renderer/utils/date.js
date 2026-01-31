
export const formatDate = (date, format = 'short') => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'relative') {
    return getRelativeTime(dateObj);
  }

  const options = {
    year: 'numeric',
    month: format === 'long' ? 'long' : 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
};

export const getRelativeTime = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(Math.abs(diffInSeconds) / seconds);
    if (interval >= 1) {
      const isPast = diffInSeconds > 0;
      return isPast
        ? `${interval} ${unit}${interval > 1 ? 's' : ''} ago`
        : `in ${interval} ${unit}${interval > 1 ? 's' : ''}`;
    }
  }

  return 'just now';
};

export const isToday = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

export const isPast = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.getTime() < new Date().getTime();
};

export const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const getEndOfDay = (date = new Date()) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

