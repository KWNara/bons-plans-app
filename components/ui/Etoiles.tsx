"use client";

import { Star } from "lucide-react";

type Props = {
  valeur: number;
  taille?: number;
  /** Rend les étoiles cliquables pour saisir une note. */
  onChange?: (note: number) => void;
  className?: string;
};

/**
 * Cinq étoiles, pleines jusqu'à la note la plus proche.
 *
 * En lecture, `valeur` peut être une moyenne décimale (4.3) : elle est
 * arrondie à l'étoile entière la plus proche pour l'affichage, le chiffre
 * exact étant montré à côté par l'appelant — inutile de simuler des demi-
 * étoiles pour un gain de lisibilité marginal.
 */
export function Etoiles({ valeur, taille = 16, onChange, className = "" }: Props) {
  const pleine = Math.round(valeur);
  const interactif = Boolean(onChange);

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={interactif ? "radiogroup" : "img"}
      aria-label={interactif ? undefined : `${valeur} étoile${valeur > 1 ? "s" : ""} sur 5`}
    >
      {[1, 2, 3, 4, 5].map((n) =>
        interactif ? (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === valeur}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            onClick={() => onChange!(n)}
            className="press -m-0.5 p-0.5"
          >
            <Star
              size={taille}
              className={n <= pleine ? "fill-marigold text-marigold" : "text-ink/20"}
            />
          </button>
        ) : (
          <Star
            key={n}
            size={taille}
            aria-hidden="true"
            className={n <= pleine ? "fill-marigold text-marigold" : "text-ink/20"}
          />
        )
      )}
    </span>
  );
}
