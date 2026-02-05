
export const formatTimeLocal12Hour = (dateString) => {
  const localDate = new Date(dateString);
  const localTimeString = localDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return localTimeString;
};


export const formatDateLocalRelative = (dateString) => {
  const localDate = new Date(dateString);
  const localNow = new Date();
  
  // Get local date components (year, month, day) for comparison
  const dateYear = localDate.getFullYear();
  const dateMonth = localDate.getMonth();
  const dateDay = localDate.getDate();
  
  const nowYear = localNow.getFullYear();
  const nowMonth = localNow.getMonth();
  const nowDay = localNow.getDate();
  
  // Check if it's today
  if (dateYear === nowYear && dateMonth === nowMonth && dateDay === nowDay) {
    return 'Today';
  }
  
  // Check if it's yesterday
  const yesterdayDate = new Date(localNow);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayYear = yesterdayDate.getFullYear();
  const yesterdayMonth = yesterdayDate.getMonth();
  const yesterdayDay = yesterdayDate.getDate();
  
  if (dateYear === yesterdayYear && dateMonth === yesterdayMonth && dateDay === yesterdayDay) {
    return 'Yesterday';
  }
  
  // Format as local date
  return localDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};
