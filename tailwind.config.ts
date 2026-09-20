import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // Les couleurs passent par des variables CSS plutôt que par des valeurs
      // figées : le thème sombre se contente de redéfinir les variables, sans
      // qu'il faille ajouter une variante `dark:` sur les ~400 usages existants.
      colors: {
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        contrast: "rgb(var(--c-contrast) / <alpha-value>)",
        marigold: "rgb(var(--c-marigold) / <alpha-value>)",
        tag: "rgb(var(--c-tag) / <alpha-value>)",
        teal: "rgb(var(--c-teal) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
        control: "0.85rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--ombre) / 0.06), 0 1px 3px rgb(var(--ombre) / 0.08)",
        raised: "0 4px 14px rgb(var(--ombre) / 0.12)",
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
        "confetti": {
          "0%": { opacity: "1", transform: "translate(0, 0) rotate(0deg) scale(1)" },
          "100%": {
            opacity: "0",
            transform: "translate(var(--cx), var(--cy)) rotate(var(--cr)) scale(0.4)",
          },
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
