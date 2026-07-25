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
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
        control: "0.85rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(32,38,59,0.06), 0 1px 3px rgba(32,38,59,0.08)",
        raised: "0 4px 14px rgba(32,38,59,0.12)",
      },
      keyframes: {
        "pop": {
          "0%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        pop: "pop 320ms cubic-bezier(0.34,1.56,0.64,1)",
        shimmer: "shimmer 1.6s infinite linear",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
