/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d9e3",
          300: "#aeb6c8",
          400: "#828da8",
          500: "#636d8c",
          600: "#4e5673",
          700: "#41475e",
          800: "#393e50",
          900: "#1c1f2b",
          950: "#12141c",
        },
        accent: {
          400: "#f0a35e",
          500: "#e8893a",
          600: "#d4722a",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
