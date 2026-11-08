import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Source Sans 3", "Segoe UI", "sans-serif"],
      },
      colors: {
        ink: "#1c2418",
        leaf: "#2c5a38",
        paper: "#f3efe6",
      },
    },
  },
  plugins: [],
};

export default config;
