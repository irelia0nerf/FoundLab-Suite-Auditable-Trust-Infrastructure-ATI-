/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['JetBrains Mono', 'monospace'], 
      },
      colors: {
        obsidian: '#09090b', 
        gold: '#D4AF37',
        'signal-success': '#00f0ff', 
        'signal-warn': '#ffbd2e',
        'signal-danger': '#ff2a6d',
        'tech-border': '#27272a',
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          800: '#075985',
          900: '#0c4a6e',
        },
        slate: {
          850: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}
