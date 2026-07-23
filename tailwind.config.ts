import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#EFF0E4",
        ink: "#20263B",
        marigold: "#E3A23C",
        tag: "#C1432A",
        teal: "#2F6E64",
      },
    },
  },
  plugins: [],
};

export default config;
