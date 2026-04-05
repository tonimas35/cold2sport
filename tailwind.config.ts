import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#111e21',
          'navy-deep': '#0a1518',
          blue: '#009bdb',
          'blue-light': '#00b8e6',
          white: '#ffffff',
          offwhite: '#f5f7f8',
          text: '#111e21',
          'text-mid': '#4a5568',
          'text-light': '#94a3b8',
          border: '#e2e8f0',
        },
      },
      fontFamily: {
        heading: ['var(--font-lexend)', 'sans-serif'],
        body: ['var(--font-manrope)', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'serif'],
      },
      animation: {
        marquee: 'marquee 35s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
