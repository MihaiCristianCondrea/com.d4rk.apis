/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/main/**/*.{js,html}', './pages/**/*.html'],
  theme: {
    extend: {
      colors: {
        'surface-container-lowest': 'var(--md-sys-color-surface-container-lowest)',
        'surface-container-low': 'var(--md-sys-color-surface-container-low)',
        'surface-container': 'var(--md-sys-color-surface-container)',
        'surface-container-high': 'var(--md-sys-color-surface-container-high)',
        'surface-container-highest': 'var(--md-sys-color-surface-container-highest)',
      },
    },
  },
  plugins: [],
};
