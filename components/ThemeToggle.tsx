"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

type Theme = "clair" | "sombre" | "systeme";

export const THEME_STORAGE_KEY = "chiner:theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "clair", label: "Clair", icon: Sun },
  { value: "sombre", label: "Sombre", icon: Moon },
  { value: "systeme", label: "Système", icon: Monitor },
];

function appliquer(theme: Theme) {
  const sombre =
    theme === "sombre" ||
    (theme === "systeme" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", sombre);
}

export function ThemeToggle() {
  // `systeme` par défaut : on suit le réglage du téléphone tant que
  // l'utilisateur n'a pas exprimé de préférence explicite.
  const [theme, setTheme] = useState<Theme>("systeme");

  useEffect(() => {
    const stocke = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (stocke === "clair" || stocke === "sombre" || stocke === "systeme") {
      setTheme(stocke);
    }
  }, []);

  useEffect(() => {
    if (theme !== "systeme") return;

    // En mode système, le thème doit suivre les changements faits dans les
    // réglages du téléphone sans avoir à recharger la page.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => appliquer("systeme");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function choisir(valeur: Theme) {
    setTheme(valeur);
    localStorage.setItem(THEME_STORAGE_KEY, valeur);
    appliquer(valeur);
  }

  return (
    <div role="radiogroup" aria-label="Thème de l'interface" className="grid grid-cols-3 gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const actif = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={actif}
            onClick={() => choisir(value)}
            className={`press flex flex-col items-center gap-1.5 rounded-control border py-3 text-sm font-medium transition-colors ${
              actif ? "border-teal bg-teal/10 text-teal" : "border-ink/15 text-ink/70 hover:bg-paper"
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
