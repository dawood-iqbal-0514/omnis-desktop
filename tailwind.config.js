/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,jsx,ts,tsx}",
    "./src/renderer/index.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        primary: {
          accent: 'var(--color-primary-accent)',
          DEFAULT: 'var(--color-primary-accent)',
        },
        secondary: {
          muted: 'var(--color-secondary-muted)',
          DEFAULT: 'var(--color-secondary-muted)',
        },
        base: {
          background: 'var(--color-base-background)',
          DEFAULT: 'var(--color-base-background)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
        },
        border: {
          DEFAULT: 'var(--color-border-muted)',
          primary: 'var(--color-border-primary)',
          secondary: 'var(--color-border-secondary)',
          muted: 'var(--color-border-muted)',
        },
        success: 'var(--color-success)',
        error: 'var(--color-error)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
      },
    },
  },
  plugins: [],
};

