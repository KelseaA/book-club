/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4ff",
          100: "#fae8ff",
          200: "#f5d0fe",
          300: "#e879f9",
          400: "#d946ef",
          500: "#a21caf",
          600: "#86198f",
          700: "#701a75",
        },
      },
    },
  },
  plugins: [],
};
