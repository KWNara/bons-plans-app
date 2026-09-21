"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/ui/Avatar";
import { BulleSilencieuse } from "@/components/ui/Illustrations";
import { TexteAvecMentions } from "@/components/TexteAvecMentions";
import { appliquerMention, extraireMentions, fragmentEnCours } from "@/lib/mentions";

type Comment = {
  id: string;
  texte: string;
  created_at: string;
  user_id: string;
  users: { pseudo: string; avatar_url: string | null } | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function CommentSection({
  dealId,
  userId,
  onCountChange,
}: {
  dealId: string;
  userId: string | null | undefined;
  onCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [echecChargement, setEchecChargement] = useState(false);
  const [profilsMentionnes, setProfilsMentionnes] = useState<Map<string, string>>(new Map());
  const [suggestions, setSuggestions] = useState<{ id: string; pseudo: string; avatar_url: string | null }[]>([]);
  const champRef = useRef<HTMLInputElement>(null);
  const jetonSuggestion = useRef(0);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("comments")
      .select("id, texte, created_at, user_id, users:user_id (pseudo, avatar_url)")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });

    setLoading(false);

    // Sans ce contrôle, une base injoignable affichait « Sois le premier à
    // commenter » sur un bon plan qui a des dizaines de commentaires.
    //
    // L'échec de chargement a son propre état, distinct de `error` qui porte
    // les échecs d'action : mélanger les deux affichait un bouton
    // « Réessayer » rechargeant la liste après un échec de publication.
    if (loadError) {
      setEchecChargement(true);
      return;
    }

    setEchecChargement(false);
    const list = (data as unknown as Comment[]) ?? [];
    setComments(list);
    onCountChange?.(list.length);
    await resoudreMentions(list);
  }

  // Les « @pseudo » sont résolus en une seule requête pour toute la liste :
  // une par commentaire aurait multiplié les allers-retours sur un fil animé.
  async function resoudreMentions(list: Comment[]) {
    const pseudos = [...new Set(list.flatMap((c) => extraireMentions(c.texte)))];
    if (pseudos.length === 0) return;

    // Correspondance exacte : `ilike` demanderait un `or()` construit à partir
    // des pseudos, or une virgule ou une parenthèse dans l'un d'eux casserait
    // le filtre PostgREST. L'autocomplétion insérant le pseudo tel qu'il est
    // enregistré, la casse concorde dans le cas courant ; sinon la mention
    // s'affiche en texte brut, ce qui reste correct.
    const { data, error } = await supabase
      .from("users")
      .select("id, pseudo")
      .in("pseudo", pseudos);

    // Sans ce contrôle, une panne se déguisait en « aucun de ces pseudos
    // n'existe » et toutes les mentions retombaient en texte brut.
    if (error) {
      console.error(error);
      return;
    }

    setProfilsMentionnes((precedent) => {
      const suivant = new Map(precedent);
      for (const u of data ?? []) suivant.set(u.pseudo.toLowerCase(), u.id);
      return suivant;
    });
  }

  // L'autocomplétion ne se déclenche qu'à partir d'une lettre saisie : sur un
  // simple « @ », elle aurait proposé les dix premiers pseudos de la base, sans
  // rapport avec qui que ce soit.
  async function surSaisie(valeur: string, position: number) {
    setText(valeur);

    const fragment = fragmentEnCours(valeur, position);

    if (fragment === null || fragment.length < 1) {
      setSuggestions([]);
      return;
    }

    // Une requête part à chaque frappe : sans jeton de fraîcheur, c'est la
    // dernière RÉPONSE arrivée qui gagne, pas la dernière frappe, et « le »
    // pouvait afficher les suggestions de « l ».
    const jeton = ++jetonSuggestion.current;

    const { data, error } = await supabase
      .from("users")
      .select("id, pseudo, avatar_url")
      .ilike("pseudo", `${fragment}%`)
      .limit(5);

    if (jeton !== jetonSuggestion.current) return;

    // Un échec ne doit pas se lire comme « personne ne s'appelle ainsi » : on
    // laisse la liste telle quelle plutôt que de la vider à tort.
    if (error) return;

    // Un pseudo que le motif ne sait pas relire entier (une espace, un point
    // final) produirait une mention qui ne désigne plus la bonne personne.
    setSuggestions((data ?? []).filter((u) => extraireMentions(`@${u.pseudo}`)[0] === u.pseudo));
  }

  function choisirMention(pseudo: string) {
    const champ = champRef.current;
    if (!champ) return;

    const { texte, curseur } = appliquerMention(text, champ.selectionStart ?? text.length, pseudo);

    setText(texte);
    setSuggestions([]);

    // Le curseur est replacé après le rendu, sinon React le renvoie en fin de
    // champ et la suite de la phrase s'écrit au mauvais endroit.
    requestAnimationFrame(() => {
      champ.focus();
      champ.setSelectionRange(curseur, curseur);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      router.push("/connexion");
      return;
    }
    if (!text.trim()) return;

    setError(null);
    setPosting(true);
    // Le menu d'autocomplétion ne dépend que du nombre de suggestions : sans
    // cette remise à zéro, il restait ouvert au-dessus d'un champ vidé dès que
    // la dernière frappe avant l'envoi appartenait à un pseudo.
    setSuggestions([]);

    const { error: insertError } = await supabase
      .from("comments")
      .insert({ user_id: userId, deal_id: dealId, texte: text.trim() });
    setPosting(false);

    if (insertError) {
      setError("Ton commentaire n'a pas pu être publié. Réessaie.");
      return;
    }

    setText("");
    load();
  }

  async function handleDelete(id: string) {
    const previous = comments;
    const next = comments.filter((c) => c.id !== id);

    setComments(next);
    onCountChange?.(next.length);

    const { error: deleteError } = await supabase.from("comments").delete().eq("id", id);

    if (deleteError) {
      setComments(previous);
      onCountChange?.(previous.length);
      setError("La suppression a échoué.");
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-ink/10">
      <p className="text-sm font-semibold text-ink mb-3">Commentaires ({comments.length})</p>

      {userId ? (
        <form onSubmit={handleSubmit} className="relative mb-5">
          <div className="flex gap-2">
            <input
              ref={champRef}
              type="text"
              value={text}
              onChange={(e) => surSaisie(e.target.value, e.target.selectionStart ?? e.target.value.length)}
              // Le seul intitulé était le marque-place, qui disparaît dès la
              // première frappe : plus rien ne rappelait le rôle du champ.
              aria-label="Ajouter un commentaire"
              placeholder="Ajouter un commentaire, @pseudo pour citer…"
              autoComplete="off"
              className="flex-1 rounded-control border border-ink/15 px-3.5 py-2.5 text-sm focus:border-teal"
            />
            <button
              type="submit"
              disabled={posting || !text.trim()}
              aria-label="Publier"
              className="press rounded-control bg-teal text-white w-11 flex items-center justify-center disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>

          {suggestions.length > 0 && (
            <ul className="absolute z-10 left-0 right-12 mt-1 rounded-control border border-ink/10 bg-surface shadow-raised overflow-hidden">
              {suggestions.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => choisirMention(u.pseudo)}
                    className="press flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-paper"
                  >
                    <Avatar pseudo={u.pseudo} url={u.avatar_url} size={24} />
                    <span className="text-sm font-medium text-ink truncate">{u.pseudo}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>
      ) : (
        <p className="text-sm mb-5 rounded-control bg-surface border border-ink/10 px-3.5 py-2.5">
          <a href="/connexion" className="text-teal underline font-medium">
            Connecte-toi
          </a>{" "}
          pour commenter.
        </p>
      )}

      {error && <p className="text-tag text-sm mb-3">{error}</p>}

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2.5">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && echecChargement && (
        <div className="flex flex-col items-center text-center py-6">
          <p className="text-sm text-ink/70 mb-2">Les commentaires n&apos;ont pas pu être chargés.</p>
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="press rounded-control border border-ink/15 px-4 py-2 text-sm font-medium text-ink"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !echecChargement && comments.length === 0 && (
        <div className="flex flex-col items-center text-center py-6">
          <BulleSilencieuse size={68} />
          <p className="text-sm text-ink/60">Sois le premier à commenter.</p>
        </div>
      )}

      <ul className="space-y-4">
        {comments.map((c) => (
          <li key={c.id} className="flex gap-2.5 animate-fade-in">
            <Link href={`/profil/${c.user_id}`} className="press shrink-0">
              <Avatar pseudo={c.users?.pseudo} url={c.users?.avatar_url} size={32} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profil/${c.user_id}`}
                  className="press text-sm font-semibold text-ink hover:underline"
                >
                  {c.users?.pseudo}
                </Link>
                <span className="text-xs text-ink/60">{formatDate(c.created_at)}</span>
              </div>
              <TexteAvecMentions
                texte={c.texte}
                profils={profilsMentionnes}
                className="text-sm text-ink/75 break-words"
              />
              {c.user_id === userId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  // Marges négatives compensées par le rembourrage : la cible
                  // passe de 16 à 40 px sans décaler la mise en page. `mt-0.5`
                  // est retiré, il annulait la marge négative du haut.
                  className="press text-xs text-ink/60 hover:text-tag -mx-2 -my-2 px-2 py-3"
                >
                  Supprimer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
