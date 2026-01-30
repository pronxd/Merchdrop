import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kassyPink: '#ff94b3',
        baroqueGold: '#d4af37',
        creamWhite: '#faf7f2',
        deepBurgundy: '#6b2737',
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        cormorant: ['Cormorant Garamond', 'serif'],
        cursive: ['Brother Signature', 'cursive'],
      },
    },
  },
  plugins: [],
};
export default config;
