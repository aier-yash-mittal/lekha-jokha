/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Splitwise-inspired palette
        brand: {
          50: '#fff1f2',   // Rose 50
          100: '#ffe4e6',  // Rose 100
          200: '#fecdd3',  // Rose 200
          300: '#fda4af',  // Rose 300
          400: '#fb7185',  // Rose 400
          500: '#f43f5e',  // Primary Rose 500
          600: '#e11d48',  // Rose 600
          700: '#be123c',  // Rose 700
          800: '#9f1239',  // Rose 800
          900: '#881337'   // Rose 900
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
        fab: '0 4px 14px rgba(244,63,94,0.4)'
      }
    }
  },
  plugins: []
}
