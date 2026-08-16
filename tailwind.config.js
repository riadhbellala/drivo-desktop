/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F5F0',
        text: '#0B0D10',
        accent: '#E8542E',
        'accent-blue': '#2955F5',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        data: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
};
