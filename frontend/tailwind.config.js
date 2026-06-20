/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: '#0d1117',
        panel: '#12161d',
        raised: '#171c25',
        line: '#232a35',
        dim: '#6b7280',
        body: '#a8b0bd',
        bright: '#e6e8ec',
        signal: '#39d98a',
        'signal-dim': '#163d2c',
        warn: '#f0b429',
        'warn-dim': '#473410',
        critical: '#ef4565',
        'critical-dim': '#451a26',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
