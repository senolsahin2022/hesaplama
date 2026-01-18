/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✨ Tailwind'in tüm Astro ve React dosyalarınızı taradığından emin olun:
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}', 
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#0066FF',
        'primary-dark': '#0052CC',
      },
    },
  },
  plugins: [],
}