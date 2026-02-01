import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        barcode: ['"Libre Barcode 39"', 'cursive'],
      },
      keyframes: {
        'cart-bump': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.5)' },
          '50%': { transform: 'scale(0.9)' },
          '70%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'cart-bump': 'cart-bump 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
export default config;
