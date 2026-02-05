/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D4A574',
          hover: '#C9A362',
        },
        dark: {
          DEFAULT: '#2C2C2C',
          darker: '#1F1F1F',
        },
        bg: {
          main: '#EFEDE8',
          card: '#FFFFFF',
          secondary: '#F5F5F0',
        },
        border: {
          DEFAULT: '#E5E5E5',
          light: 'rgba(255,255,255,0.08)',
        }
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      }
    },
  },
  plugins: [],
}
