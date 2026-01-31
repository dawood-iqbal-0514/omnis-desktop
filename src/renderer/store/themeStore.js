import { create } from 'zustand';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('omnis-reach-theme');

  return saved || 'light';
};

const useThemeStore = create((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnis-reach-theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
  },
}));

if (typeof window !== 'undefined') {
  const initialTheme = getInitialTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
}

export default useThemeStore;

