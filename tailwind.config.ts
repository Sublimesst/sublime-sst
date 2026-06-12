import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        petrol: {
          DEFAULT: '#0d4a5c',
          dark: '#082f3b',
          deep: '#051e26',
        },
        teal: {
          DEFAULT: '#1a9e8c',
          light: '#4dbfb0',
          pale: '#e0f5f2',
        },
        brand: {
          green: '#2d9e6b',
          'green-pale': '#e4f5ed',
          'blue-light': '#e8f4fb',
          'blue-mid': '#5ba3d0',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        brand: '12px',
        'brand-lg': '20px',
        'brand-xl': '28px',
      },
      boxShadow: {
        'brand-sm': '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
        brand: '0 4px 16px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.05)',
        'brand-lg': '0 12px 40px rgba(0,0,0,.10), 0 4px 12px rgba(0,0,0,.06)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease forwards',
        'slide-up': 'slide-up 0.4s ease forwards',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.5)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
