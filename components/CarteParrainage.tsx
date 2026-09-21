"use client";

import { useEffect, useState } from "react";
import { Gift, Check, Share2, Copy } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = { userId: string };

/**
 * Le bloc « invite tes amis », dans l'espace compte.
 *
 * Il n'y a rien à gagner et c'est assumé : ce que le lien apporte au filleul,
 * c'est d'arriver avec quelqu'un qu'il connaît déjà dans sa liste plutôt que
 * sur une application vide. Promettre une récompense qui n'existe pas se
 * retournerait contre nous à la première inscription.
 */
export function CarteParrainage({ userId }: Props) {
  const [filleuls, setFilleuls] = useState<number | null>(null);
  const [erreurCompte, setErreurCompte] = useState(false);
  const [lien, setLien] = useState("");
  const [copie, setCopie] = useState(false);
  // Les composants clients sont tout de même rendus côté serveur : lire
  // `navigator` pendant le rendu ferait planter la page. Le drapeau n'est posé
  // qu'au montage, donc dans le navigateur.
  const [partageNatif, setPartageNatif] = useState(false);

  useEffect(() => {
    // `window` n'existe pas au rendu serveur : le lien se compose au montage.
    setLien(`${window.location.origin}/inscription?parrain=${userId}`);
    setPartageNatif(typeof navigator !== "undefined" && Boolean(navigator.share));

    // `null` sert déjà d'état de chargement : sans lire l'erreur, une panne
    // s'y confondait et se présentait comme un état neutre définitif.
    supabase.rpc("compte_filleuls", { p_parrain: userId }).then(({ data, error }) => {
      if (error) {
        setErreurCompte(true);
        return;
      }
      setFilleuls(typeof data === "number" ? data : 0);
    });
  }, [userId]);

  async function partager() {
    const texte = "Rejoins-moi sur Déniche, les bons plans de notre ville.";

    // L'API de partage n'existe pas sur tous les navigateurs de bureau, et un
    // utilisateur peut annuler la feuille de partage : dans les deux cas on
    // retombe sur le presse-papiers plutôt que de ne rien faire.
    if (partageNatif) {
      try {
        await navigator.share({ title: "Déniche", text: texte, url: lien });
        return;
      } catch {
        // Partage annulé ou refusé : on enchaîne sur la copie.
      }
    }

    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  }

  return (
    <div className="rounded-card border border-ink/10 bg-surface p-4 shadow-soft">
      <div className="flex items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
          <Gift size={17} className="text-marigold" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">Invite tes amis</p>
          <p className="text-sm text-ink/70">
            {erreurCompte
              ? "Compteur indisponible pour le moment."
              : filleuls === null
                ? "Leur demande d'ami t'arrivera dès leur inscription."
                : filleuls === 0
                  ? "Personne n'est encore venu par ton lien."
                  : `${filleuls} ${filleuls > 1 ? "personnes sont venues" : "personne est venue"} par ton lien.`}
          </p>
        </div>
      </div>

      <button
        onClick={partager}
        disabled={!lien}
        className="press w-full mt-2 inline-flex items-center justify-center gap-1.5 rounded-control bg-teal text-white py-2.5 text-sm font-semibold shadow-soft disabled:opacity-60"
      >
        {copie ? <Check size={15} /> : partageNatif ? <Share2 size={15} /> : <Copy size={15} />}
        {copie ? "Lien copié" : "Partager mon lien"}
      </button>
    </div>
  );
}
