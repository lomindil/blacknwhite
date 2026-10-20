import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        soft: v('soft'),
        danger: v('danger'),
      },
      fontFamily: {
        serif: ['"Iowan Old Style"', '"Palatino Linotype"', 'Palatino', 'Georgia', '"Noto Serif"', 'serif'],
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Noto Sans"', 'sans-serif'],
      },
      maxWidth: { page: '72rem' },
    },
  },
  plugins: [],
} satisfies Config;
