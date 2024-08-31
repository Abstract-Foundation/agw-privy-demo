const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: (_theme) => ({
        "gradient-primary":
          "linear-gradient(106.09deg, #F6F6F5 -3.46%, #E7EAEF 11.66%, #D1D5DE 22.41%, #E3E7EE 32.93%, #FFFFFF 63.13%, #D5DAE1 77.68%, #F7F9FD 94.11%)",
      }),
      fontFamily: {
        sans: ["Roobert", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        "privy-navy": "#160B45",
        "privy-light-blue": "#EFF1FD",
        "privy-blueish": "#D4D9FC",
        "privy-pink": "#FF8271",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
