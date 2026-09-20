"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { compteARebours, estFlash } from "@/lib/dealFormat";

type Props = {
  dateFin: string | null;
  className?: string;
};

/**
 * Le badge des offres qui se terminent dans moins de 24 heures.
 *
 * Il se calcule côté client et se rafraîchit chaque minute : rendu une seule
 * fois au chargement, un compte à rebours affiche « 3 h 05 » pendant des heures
 * sur un onglet resté ouvert, ce qui est pire que pas de compte à rebours du
 * tout. Le composant disparaît de lui-même quand l'échéance est passée.
 */
export function BadgeFlash({ dateFin, className = "" }: Props) {
  const [maintenant, setMaintenant] = useState<number | null>(null);

  useEffect(() => {
    // La première valeur n'est posée qu'après le montage : la date du serveur
    // et celle du navigateur ne coïncident pas, et un rendu initial différent
    // déclencherait une erreur d'hydratation.
    setMaintenant(Date.now());

    const timer = setInterval(() => setMaintenant(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (maintenant === null || !estFlash(dateFin, maintenant)) return null;

  const restant = compteARebours(dateFin, maintenant);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-marigold px-2 py-0.5 text-xs font-bold text-contrast shadow-soft ${className}`}
    >
      <Zap size={12} strokeWidth={2.5} className="shrink-0" />
      Flash · {restant}
    </span>
  );
}
