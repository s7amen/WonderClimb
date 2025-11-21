/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          brand: '#ea7a24', // Figma orange
        },
        beige: {
          DEFAULT: '#eddcca', // Figma beige for badges
        },
        dark: {
          DEFAULT: '#35383d', // Figma dark gray for table header
        },
        neutral: {
          100: '#f3f3f5', // Figma light gray for inputs
          950: '#35383d', // Figma dark text
        },
      },
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

