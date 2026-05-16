/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],  // v4 uses preset, not plugins
  theme: {
    extend: {
      colors: {
        rydo: {
          bg:        '#06090A',
          card:      '#101C12',
          cardAlt:   '#0D1C0F',
          primary:   '#BEFF00',
          primaryDim:'rgba(190,255,0,0.08)',
          text:      '#EEF0E8',
          textMuted: 'rgba(255,255,255,0.38)',
          textFaint: 'rgba(255,255,255,0.28)',
          success:   '#00D4A0',
          danger:    '#FF8080',
          nav:       '#090D0B',
        },
      },
    },
  },
  plugins: [],
};