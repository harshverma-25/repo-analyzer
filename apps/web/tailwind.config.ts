import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(215 28% 17%)',
        background: 'hsl(222 47% 7%)',
        surface: 'hsl(222 47% 11%)',
        surfaceHover: 'hsl(217 33% 17%)',
        primary: {
          DEFAULT: 'hsl(217 91% 60%)',
          hover: 'hsl(217 91% 52%)',
          muted: 'hsl(217 91% 60% / 0.15)',
        },
        accent: 'hsl(190 95% 42%)',
        text: {
          main: 'hsl(210 40% 98%)',
          muted: 'hsl(215 20% 65%)',
          subtle: 'hsl(215 16% 47%)',
        },
        badge: {
          get: 'hsl(217 91% 60%)',
          post: 'hsl(142 71% 45%)',
          put: 'hsl(38 92% 50%)',
          delete: 'hsl(0 84% 60%)',
          patch: 'hsl(262 83% 58%)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
