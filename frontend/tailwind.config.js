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
          orange: '#FF6B35',
          'orange-hover': '#E55A2B',
        },
        gray: {
          dark: '#2D2D2D',
          medium: '#3A3A3A',
          light: '#F5F5F5',
        },
        status: {
          success: '#4CAF50',
          error: '#F44336',
          info: '#2196F3',
          warning: '#FFC107',
        },
        visualization: {
          pipeline: '#4A90E2',
          detection: '#7ED321',
          analytics: '#9013FE',
        }
      },
      fontFamily: {
        'primary': ['Inter', 'Roboto', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem', // 72px
        '80': '20rem',  // 320px
        '240': '60rem', // 960px
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

