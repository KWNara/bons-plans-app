"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

type Props = {
  titre: string;
  enseigne?: string | null;
  className?: string;
};

// Le partage passe par la feuille native du téléphone (WhatsApp, SMS,
// Instagram…), qui est le vrai canal de bouche-à-oreille pour une app locale.
// Sur les navigateurs de bureau qui ne l'implémentent pas, on retombe sur une
// copie du lien plutôt que de masquer le bouton.
export function ShareButton({ titre, enseigne, className }: Props) {
  const [copie, setCopie] = useState(false);

  async function partager(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const url = window.location.href;
    const texte = enseigne ? `${titre} — ${enseigne}, sur Déniche` : `${titre}, sur Déniche`;

    if (navigator.share) {
      try {
        await navigator.share({ title: titre, text: texte, url });
        return;
      } catch {
        // L'utilisateur a fermé la feuille de partage : ce n'est pas une
        // erreur, on ne bascule pas sur la copie du lien pour autant.
        return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  return (
    <button
      onClick={partager}
      aria-label="Partager ce bon plan"
      className={className ?? "press flex items-center gap-1.5 text-sm text-ink/70 -m-1.5 p-1.5 rounded-full hover:bg-teal/5"}
    >
      {copie ? <Check size={18} className="text-teal" /> : <Share2 size={18} />}
      {copie && <span className="text-xs text-teal font-medium">Lien copié</span>}
    </button>
  );
}
