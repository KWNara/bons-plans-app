"use client";

import { useEffect, useState } from "react";

// Douze fragments aux couleurs de la marque, projetés en arc au-dessus du
// bouton. Les trajectoires sont calculées une fois pour toutes et fixes : pas
// de valeurs aléatoires, qui provoqueraient un écart entre le rendu serveur et
// le rendu client.
const FRAGMENTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (Math.PI / 11) * i;
  const distance = 34 + (i % 3) * 10;
  return {
    x: Math.round(-Math.cos(angle) * distance),
    y: Math.round(-Math.sin(angle) * distance - 6),
    rotation: (i % 2 === 0 ? 1 : -1) * (90 + i * 12),
    delai: (i % 4) * 22,
    couleur: ["#E3A23C", "#2F6E64", "#C1432A"][i % 3],
  };
});

export function Confetti({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 900);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!visible) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0 motion-reduce:hidden"
    >
      {FRAGMENTS.map((f, i) => (
        <span
          key={i}
          className="absolute block h-1.5 w-1.5 rounded-[1px]"
          style={{
            backgroundColor: f.couleur,
            animation: `confetti 800ms ${f.delai}ms cubic-bezier(0.22, 0.8, 0.3, 1) forwards`,
            ["--cx" as string]: `${f.x}px`,
            ["--cy" as string]: `${f.y}px`,
            ["--cr" as string]: `${f.rotation}deg`,
          }}
        />
      ))}
    </span>
  );
}
