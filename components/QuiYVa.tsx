"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, PartyPopper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { phraseParticipation } from "@/lib/participation";

type Participant = { id: string; pseudo: string; avatar_url: string | null };

type Props = {
  dealId: string;
  userId: string | null | undefined;
};

// La politique de lecture ne laisse voir que soi-même et ses amis : ce que la
// requête renvoie est donc déjà le cercle de confiance, sans filtrage côté
// client. Le total, lui, passe par une fonction dédiée qui compte tout le monde.
export function QuiYVa({ dealId, userId }: Props) {
  const router = useRouter();
  const [amis, setAmis] = useState<Participant[]>([]);
  const [total, setTotal] = useState(0);
  const [jyVais, setJyVais] = useState(false);
  const [pret, setPret] = useState(false);
  const [enEchec, setEnEchec] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [{ data: lignes, error: erreurListe }, { data: nombre, error: erreurTotal }] =
      await Promise.all([
        supabase
          .from("deal_participations")
          .select("user_id, users:user_id (id, pseudo, avatar_url)")
          .eq("deal_id", dealId),
        supabase.rpc("compte_participants", { p_deal_id: dealId }),
      ]);

    // Sans ce contrôle, une requête en échec renvoyait un total à zéro et le
    // bloc annonçait « Personne n'a encore dit y aller » sur une offre qui
    // compte déjà des participants. Pire : les deux requêtes étant
    // indépendantes, un échec du seul compteur affichait les avatars des amis
    // juste sous cette phrase. Mieux vaut ne rien montrer que mentir.
    if (erreurListe || erreurTotal) {
      setEnEchec(true);
      setPret(true);
      return;
    }

    const visibles = (lignes ?? []) as unknown as {
      user_id: string;
      users: Participant | null;
    }[];

    setEnEchec(false);
    setJyVais(visibles.some((l) => l.user_id === userId));
    setAmis(
      visibles
        .filter((l) => l.user_id !== userId && l.users)
        .map((l) => l.users as Participant)
    );
    setTotal(typeof nombre === "number" ? nombre : 0);
    setPret(true);
  }, [dealId, userId]);

  useEffect(() => {
    charger();
  }, [charger]);

  async function basculer() {
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (occupe) return;

    const avant = jyVais;

    setErreur(null);
    setOccupe(true);
    // Le compteur suit immédiatement le clic : attendre l'aller-retour donnait
    // l'impression que le bouton n'avait pas pris.
    setJyVais(!avant);
    setTotal((n) => Math.max(0, n + (avant ? -1 : 1)));

    const { error } = avant
      ? await supabase
          .from("deal_participations")
          .delete()
          .eq("deal_id", dealId)
          .eq("user_id", userId)
      : await supabase.from("deal_participations").insert({ deal_id: dealId, user_id: userId });

    setOccupe(false);

    if (error) {
      setJyVais(avant);
      setTotal((n) => Math.max(0, n + (avant ? 1 : -1)));
      setErreur("Ta réponse n'a pas pu être enregistrée.");
    }
  }

  if (!pret) return null;

  const phrase = phraseParticipation({ amis: amis.map((a) => a.pseudo), total, jyVais });

  return (
    <div className="mt-5 rounded-card border border-ink/10 bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
          <PartyPopper size={17} className="text-marigold" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">Qui y va ?</p>
          <p className="text-sm text-ink/70">
            {enEchec ? "La liste n'a pas pu être chargée." : phrase}
          </p>
        </div>
        {enEchec && (
          <button
            onClick={() => {
              setPret(false);
              charger();
            }}
            className="press rounded-control border border-ink/15 px-3 py-2 text-sm font-medium text-ink shrink-0"
          >
            Réessayer
          </button>
        )}
      </div>

      {!enEchec && amis.length > 0 && (
        <ul className="flex items-center mt-3 ml-12">
          {amis.slice(0, 6).map((a) => (
            <li key={a.id} className="-ml-2 first:ml-0">
              <Link href={`/profil/${a.id}`} className="press block" title={a.pseudo}>
                <Avatar
                  pseudo={a.pseudo}
                  url={a.avatar_url}
                  size={30}
                  className="ring-2 ring-surface"
                />
              </Link>
            </li>
          ))}
          {amis.length > 6 && (
            <li className="-ml-2 w-[30px] h-[30px] rounded-full bg-ink/10 ring-2 ring-surface flex items-center justify-center text-[11px] font-semibold text-ink/70">
              +{amis.length - 6}
            </li>
          )}
        </ul>
      )}

      {erreur && <p className="text-tag text-sm mt-3">{erreur}</p>}

      {/* Tant qu'on ne sait pas où l'on en est, proposer « J'y vais » ferait
          courir le risque d'un doublon invisible pour l'utilisateur. */}
      {!enEchec && (
        <>
          <button
            onClick={basculer}
            disabled={occupe}
            aria-pressed={jyVais}
            className={`press w-full mt-3 rounded-control py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 ${
              jyVais
                ? "bg-teal/10 text-teal border border-teal/30"
                : "bg-teal text-white shadow-soft"
            }`}
          >
            {occupe ? <Spinner size={15} /> : jyVais ? <Check size={16} /> : null}
            {jyVais ? "Tu y vas" : "J'y vais"}
          </button>

          <p className="text-xs text-ink/60 mt-2 text-center">
            Seuls tes amis voient que tu y vas.
          </p>
        </>
      )}
    </div>
  );
}
