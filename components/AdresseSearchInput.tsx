"use client";

import { useEffect, useId, useState } from "react";
import { MapPin } from "lucide-react";
import { rechercherAdresses, type AdresseTrouvee } from "@/lib/cities";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  valeur: string;
  onChoisir: (adresse: AdresseTrouvee) => void;
  onEffacer: () => void;
};

/**
 * Saisie d'adresse avec suggestions de l'API Adresse.
 *
 * L'adresse n'est retenue que si elle a été choisie dans la liste : c'est ce
 * qui garantit qu'on dispose de coordonnées. Une adresse tapée librement
 * s'afficherait sur la fiche mais laisserait le commerçant absent de la carte,
 * sans qu'il comprenne pourquoi.
 */
export function AdresseSearchInput({ valeur, onChoisir, onEffacer }: Props) {
  const champId = useId();
  const [requete, setRequete] = useState("");
  const [suggestions, setSuggestions] = useState<AdresseTrouvee[]>([]);
  const [chargement, setChargement] = useState(false);
  const [echec, setEchec] = useState(false);
  const [enEdition, setEnEdition] = useState(false);

  useEffect(() => {
    if (requete.trim().length < 4) {
      setSuggestions([]);
      setChargement(false);
      setEchec(false);
      return;
    }

    setChargement(true);
    setEchec(false);
    const controleur = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setSuggestions(await rechercherAdresses(requete.trim(), controleur.signal));
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setSuggestions([]);
        setEchec(true);
      }
      setChargement(false);
    }, 350);

    return () => {
      clearTimeout(timer);
      controleur.abort();
    };
  }, [requete]);

  // « Changer » n'efface plus rien : il ouvre la saisie. L'ancien bouton
  // appelait directement l'effacement en base, si bien que le seul moyen de
  // modifier son adresse était de la détruire, sans confirmation ni retour en
  // arrière — et le message affiché disait « Adresse retirée ».
  if (valeur && !enEdition) {
    return (
      <div className="mb-4">
        <span className="text-xs font-semibold text-ink/60 uppercase tracking-wide">Adresse</span>
        <div className="mt-1.5 flex items-center gap-2 rounded-control border border-ink/15 bg-surface px-3.5 py-2.5">
          <MapPin size={15} className="text-teal shrink-0" />
          <span className="flex-1 min-w-0 text-sm text-ink truncate">{valeur}</span>
          <button
            type="button"
            onClick={() => setEnEdition(true)}
            className="press text-xs font-semibold text-teal shrink-0 -my-2 py-2"
          >
            Changer
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm("Retirer ton adresse ? Tu n'apparaîtras plus sur la carte.")) return;
              onEffacer();
            }}
            className="press text-xs font-semibold text-ink/60 hover:text-tag shrink-0 -my-2 py-2"
          >
            Retirer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 relative">
      <label
        htmlFor={champId}
        className="text-xs font-semibold text-ink/60 uppercase tracking-wide"
      >
        {valeur ? "Nouvelle adresse" : "Adresse (optionnel)"}
      </label>
      <input
        id={champId}
        type="text"
        value={requete}
        onChange={(e) => setRequete(e.target.value)}
        placeholder="12 rue de la Paix, Besançon"
        autoComplete="off"
        className="mt-1.5 w-full rounded-control border border-ink/15 px-3.5 py-2.5 text-sm focus:border-teal transition-colors"
      />
      <p className="mt-1 text-xs text-ink/60">
        Choisis une suggestion pour apparaître sur la carte.
        {valeur && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => {
                setEnEdition(false);
                setRequete("");
              }}
              className="press font-semibold text-teal underline"
            >
              Annuler
            </button>
          </>
        )}
      </p>

      {chargement && (
        <p className="flex items-center gap-1.5 text-xs text-ink/60 mt-1.5">
          <Spinner size={12} /> Recherche…
        </p>
      )}

      {echec && (
        <p className="text-xs text-tag mt-1.5">
          La recherche d&apos;adresse est indisponible. Réessaie dans un instant.
        </p>
      )}

      {!chargement && !echec && requete.trim().length >= 4 && suggestions.length === 0 && (
        <p className="text-xs text-ink/60 mt-1.5">Aucune adresse ne correspond.</p>
      )}

      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-surface border border-ink/10 rounded-control mt-1 shadow-raised max-h-60 overflow-auto">
          {suggestions.map((a) => (
            <li key={a.libelle}>
              <button
                type="button"
                onClick={() => {
                  onChoisir(a);
                  setRequete("");
                  setSuggestions([]);
                  setEnEdition(false);
                }}
                className="press w-full text-left px-3.5 py-3 text-sm hover:bg-paper"
              >
                {a.libelle}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
