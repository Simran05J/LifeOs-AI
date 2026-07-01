/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#060816',
        panel: '#0f172a',
        accent: '#7c3aed',
      },
      boxShadow: {
        glow: '0 20px 60px rgba(124, 58, 237, 0.18)',
      },
    },
  },
  plugins: [],
};
