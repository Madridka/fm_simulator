import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        pitch: '#1f7a4d',
        panel: '#111827',
      },
    },
  },
  plugins: [],
} satisfies Config
