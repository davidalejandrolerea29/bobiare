/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF7FF',
          100: '#DBEEFF',
          200: '#BFE0FF',
          300: '#93C9FF',
          400: '#60A9FA',
          500: '#2F86F6',
          600: '#1267E9',
          700: '#0D52C2',
          800: '#10469D',
          900: '#123D7B',
        },
        ink: '#0B1F3A',
        mist: '#EAF4FF',
      },
    },
  },
  plugins: [],
};
