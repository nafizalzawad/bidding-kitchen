import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        kitchen: {
          dark: '#12141a',
          card: '#1a1d26',
          border: '#2c3140',
          accent: '#f97316',
          gold: '#eab308',
        },
        flavor: {
          smoky: '#78350f',
          spicy: '#b91c1c',
          rich: '#b45309',
          crispy: '#d97706',
          fresh: '#15803d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fredoka', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'card-slap': 'slap 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pulse-subtle': 'pulse 2.5s infinite',
      },
      keyframes: {
        slap: {
          '0%': { transform: 'scale(1.15) translateY(-8px)', opacity: '0.8' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
