/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Neutrals — swap via the `.dark` class (see index.css for the
        // actual RGB values); <alpha-value> keeps opacity utilities working.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        'btn-primary': 'rgb(var(--btn-primary) / <alpha-value>)',
        'btn-primary-text': 'rgb(var(--btn-primary-text) / <alpha-value>)',
        // Accents — cyan/coral/lime are tied to specific metrics
        // (weight/energy/sessions); violet doubles as the progression color
        // and the default UI accent everywhere else. Each swaps to a deeper
        // shade in light mode for legible text on the light surface, and the
        // original vivid shade in dark mode (see index.css).
        accent: {
          cyan: 'rgb(var(--accent-cyan) / <alpha-value>)',
          coral: 'rgb(var(--accent-coral) / <alpha-value>)',
          lime: 'rgb(var(--accent-lime) / <alpha-value>)',
          violet: 'rgb(var(--accent-violet) / <alpha-value>)',
        },
        danger: '#e5484d',
      },
    },
  },
  plugins: [],
};
