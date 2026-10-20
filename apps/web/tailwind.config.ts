import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// Muted accent palette. Each feature/area gets one hue; 50/100 for surfaces, 600/700 for text and icons.
const accents = {
  sage: { 50: '#EEF3EE', 100: '#DDE8DF', 200: '#C4D6C8', 300: '#A9C2B0', 600: '#4F7361', 700: '#3D5A4C', 800: '#2F473B' },
  clay: { 50: '#FBF1EC', 100: '#F5DED3', 200: '#EDC7B6', 300: '#E3B39E', 600: '#B0654A', 700: '#8E4E38', 800: '#6E3C2B' },
  sky: { 50: '#EEF3F8', 100: '#DCE6F1', 200: '#C4D3E5', 300: '#A9BFD8', 600: '#4E6E92', 700: '#3D5775', 800: '#2F4359' },
  ochre: { 50: '#FBF5E6', 100: '#F5E8C4', 200: '#EED9A0', 300: '#E6C980', 600: '#A57C22', 700: '#82611A', 800: '#624914' },
  plum: { 50: '#F4F1F8', 100: '#E7E0F0', 200: '#D6CBE6', 300: '#C3B4DA', 600: '#6F5B93', 700: '#584876', 800: '#433759' },
  rose: { 50: '#FBF0F1', 100: '#F5DCDF', 200: '#EDC3C8', 300: '#E2A9B0', 600: '#A8566A', 700: '#874455', 800: '#673441' },
};

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        surface: v('surface'),
        sand: v('sand'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        soft: v('soft'),
        danger: v('danger'),
        primary: { DEFAULT: accents.sage[700], hover: accents.sage[800], soft: accents.sage[50] },
        ...accents,
      },
      fontFamily: {
        serif: ['var(--font-serif)', '"Iowan Old Style"', 'Georgia', '"Noto Serif"', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', '"Segoe UI"', '"Noto Sans"', 'sans-serif'],
      },
      maxWidth: { page: '72rem' },
      boxShadow: {
        card: '0 1px 2px rgb(33 37 41 / 0.04), 0 4px 16px -4px rgb(33 37 41 / 0.08)',
        lift: '0 2px 4px rgb(33 37 41 / 0.04), 0 16px 32px -12px rgb(33 37 41 / 0.18)',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -18px) scale(1.06)' },
          '66%': { transform: 'translate(-16px, 14px) scale(0.96)' },
        },
        'fade-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fill: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        'pop-in': { '0%': { opacity: '0', transform: 'scale(0.92)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        draw: { from: { strokeDashoffset: '400' }, to: { strokeDashoffset: '0' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'pop-in': 'pop-in 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        draw: 'draw 1.4s 0.6s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
