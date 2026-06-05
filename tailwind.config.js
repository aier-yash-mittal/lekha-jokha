/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Splitwise-inspired palette
        brand: {
          50: '#fff5f5',
          100: '#ffe3e3',
          200: '#ffc9c9',
          300: '#ffa8a8',
          400: '#ff8787',
          500: '#ff1e1e',   // Hot red 500
          600: '#e01a1a',   // Hot red 600
          700: '#b81414',
          800: '#910f0f',
          900: '#6b0a0a'
        },
        owe: '#ea580c',     // you owe (orange-coral)
        owed: '#10b981',    // you are owed (emerald green)
        ink: '#2c2c2c',
        muted: '#6b7280'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        fab: '0 4px 14px rgba(255,30,30,0.4)'
      }
    }
  },
  plugins: []
}
