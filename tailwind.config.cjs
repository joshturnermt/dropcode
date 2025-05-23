const footerHeight = 0
const mainHeaderHeight = 40

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"], // Added .vue
  theme: {
    extend: {
      height: {
        main: `calc(100% - ${footerHeight}px)`,
        footer: `${footerHeight}px`,
        mainHeader: `${mainHeaderHeight}px`,
        mainBody: `calc(100% - ${mainHeaderHeight}px)`,
      },
      fontFamily: {
        mono: `'Jetbrains Mono', Consolas, 'Courier New', monospace`,
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
