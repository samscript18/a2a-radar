import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161616",
        paper: "#f7f4ed",
        radar: "#17a398",
        signal: "#e4572e",
        wire: "#2d6cdf",
        mint: "#c8f7dc"
      }
    }
  },
  plugins: []
};

export default config;

