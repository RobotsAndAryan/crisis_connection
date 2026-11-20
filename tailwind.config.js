/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        recessed: '#0c0d0c',
        canvas: '#111211',
        surface: '#171817',
        raised: '#202120',
        'raised-hover': '#282a28',
        ink: {
          primary: '#ededeb',
          secondary: '#a5a7a4',
          muted: '#828581',
        },
        accent: {
          DEFAULT: '#4ea1f3',
          muted: '#24405c',
        },
        safe: {
          DEFAULT: '#4cc38a',
          dim: '#193126',
        },
        caution: {
          DEFAULT: '#e2a43b',
          dim: '#332714',
        },
        hazard: {
          DEFAULT: '#e5484d',
          dim: '#351719',
        },
      },
      borderColor: {
        hairline: 'rgba(237, 237, 235, 0.09)',
        control: 'rgba(237, 237, 235, 0.18)',
        strong: 'rgba(237, 237, 235, 0.28)',
      },
      transitionTimingFunction: {
        instrument: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      boxShadow: {
        overlay: '0 8px 24px rgba(0, 0, 0, 0.48)',
        'btn-top': 'inset 0 1px 0 rgba(255, 255, 255, 0.14)',
      },
    },
  },
  plugins: [],
};
