"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserPlus, Check, X, Users, Search, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  chargerRelations,
  envoyerDemande,
  repondreDemande,
  retirerAmi,
  rechercherUtilisateurs,
  type Ami,
} from "@/lib/amis";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";

type Trouve = { id: string; pseudo: string; avatar_url: string | null };

export default function AmisPage() {
  const router = useRouter();
  const [moi, setMoi] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [amis, setAmis] = useState<Ami[]>([]);
  const [recues, setRecues] = useState<Ami[]>([]);
  const [envoyees, setEnvoyees] = useState<Ami[]>([]);

  const [terme, setTerme] = useState("");
  const [resultats, setResultats] = useState<Trouve[]>([]);
  const [recherche, setRecherche] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const recharger = useCallback(async (uid: string) => {
    try {
      const { amis, recues, envoyees } = await chargerRelations(uid);
      setAmis(amis);
      setRecues(recues);
      setEnvoyees(envoyees);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/connexion");
        return;
      }
      setMoi(user.id);
      recharger(user.id);
    });
  }, [router, recharger]);

  useEffect(() => {
    if (!moi || terme.trim().length < 2) {
      setResultats([]);
      setRecherche(false);
      return;
    }

    setRecherche(true);
    const timer = setTimeout(async () => {
      try {
        setResultats(await rechercherUtilisateurs(terme.trim(), moi));
      } catch {
        setResultats([]);
      }
      setRecherche(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [terme, moi]);

  async function agir(cle: string, action: () => Promise<{ error: unknown }>, echec: string) {
    if (occupe || !moi) return;

    setErreur(null);
    setOccupe(cle);

    const { error } = await action();

    setOccupe(null);

    if (error) {
      setErreur(echec);
      return;
    }

    setTerme("");
    setResultats([]);
    await recharger(moi);
  }

  // Un identifiant déjà en relation ne doit plus proposer « Ajouter » : sinon
  // l'insertion échouerait sur la contrainte d'unicité, sans explication.
  const dejaEnRelation = new Set([
    ...amis.map((a) => a.id),
    ...recues.map((a) => a.id),
    ...envoyees.map((a) => a.id),
  ]);

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <Link
          href="/compte"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-surface"
          aria-label="Retour au compte"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-5">Mes amis</h1>

        <div className="bg-surface rounded-card shadow-soft border border-ink/10 p-4 mb-5">
          <label htmlFor="recherche-amis" className="block text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
            Trouver quelqu&apos;un
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
            <input
              id="recherche-amis"
              type="text"
              value={terme}
              onChange={(e) => setTerme(e.target.value)}
              placeholder="Pseudo de ton ami"
              autoComplete="off"
              className="w-full rounded-control border border-ink/15 pl-9 pr-3 py-2.5 text-sm focus:border-teal transition-colors"
            />
          </div>

          {recherche && (
            <p className="flex items-center gap-1.5 text-xs text-ink/60 mt-2">
              <Spinner size={12} /> Recherche…
            </p>
          )}

          {!recherche && terme.trim().length >= 2 && resultats.length === 0 && (
            <p className="text-xs text-ink/60 mt-2">Aucun pseudo ne correspond.</p>
          )}

          {resultats.length > 0 && (
            <ul className="mt-3 space-y-2">
              {resultats.map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <Avatar pseudo={u.pseudo} url={u.avatar_url} />
                  <span className="flex-1 min-w-0 text-sm font-medium text-ink truncate">
                    {u.pseudo}
                  </span>
                  {dejaEnRelation.has(u.id) ? (
                    <span className="text-xs text-ink/60 shrink-0">Déjà en relation</span>
                  ) : (
                    <button
                      onClick={() =>
                        agir(
                          u.id,
                          () => envoyerDemande(moi!, u.id),
                          "La demande n'a pas pu être envoyée."
                        )
                      }
                      disabled={occupe === u.id}
                      className="press inline-flex items-center gap-1.5 rounded-control bg-teal text-white px-3 py-2 text-sm font-semibold shadow-soft disabled:opacity-50 shrink-0"
                    >
                      {occupe === u.id ? <Spinner size={14} /> : <UserPlus size={14} />}
                      Ajouter
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {erreur && <p className="text-tag text-sm mb-3">{erreur}</p>}

        {state === "loading" && (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        )}

        {state === "error" && (
          <ErrorState
            title="Chargement impossible"
            description="Tes amis n'ont pas pu être récupérés."
            onRetry={() => {
              setState("loading");
              if (moi) recharger(moi);
            }}
          />
        )}

        {state === "ready" && (
          <>
            {recues.length > 0 && (
              <section className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">
                  Demandes reçues ({recues.length})
                </h2>
                <ul className="space-y-2.5">
                  {recues.map((a) => (
                    <li
                      key={a.relationId}
                      className="flex items-center gap-3 bg-surface rounded-card shadow-soft border border-ink/10 p-3"
                    >
                      <Avatar pseudo={a.pseudo} url={a.avatar_url} />
                      <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                        {a.pseudo}
                      </span>
                      <button
                        onClick={() =>
                          agir(
                            a.relationId,
                            () => repondreDemande(a.relationId, true),
                            "La demande n'a pas pu être acceptée."
                          )
                        }
                        disabled={occupe === a.relationId}
                        aria-label={`Accepter la demande de ${a.pseudo}`}
                        className="press w-10 h-10 flex items-center justify-center rounded-full bg-teal text-white shrink-0 disabled:opacity-50"
                      >
                        {occupe === a.relationId ? <Spinner size={14} /> : <Check size={16} />}
                      </button>
                      <button
                        onClick={() =>
                          agir(
                            a.relationId,
                            () => repondreDemande(a.relationId, false),
                            "La demande n'a pas pu être refusée."
                          )
                        }
                        disabled={occupe === a.relationId}
                        aria-label={`Refuser la demande de ${a.pseudo}`}
                        className="press w-10 h-10 flex items-center justify-center rounded-full border border-ink/15 text-ink/70 shrink-0 disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mb-6">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">
                Amis ({amis.length})
              </h2>

              {amis.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Aucun ami pour l'instant"
                  description="Cherche le pseudo de quelqu'un que tu connais pour lui envoyer une demande."
                />
              ) : (
                <ul className="space-y-2.5">
                  {amis.map((a) => (
                    <li
                      key={a.relationId}
                      className="flex items-center gap-3 bg-surface rounded-card shadow-soft border border-ink/10 p-3"
                    >
                      <Avatar pseudo={a.pseudo} url={a.avatar_url} />
                      <span className="flex-1 min-w-0 text-sm font-semibold text-ink truncate">
                        {a.pseudo}
                      </span>
                      <Link
                        href={`/messages/${a.id}`}
                        aria-label={`Écrire à ${a.pseudo}`}
                        className="press w-10 h-10 flex items-center justify-center rounded-full bg-teal/10 text-teal shrink-0"
                      >
                        <MessageCircle size={16} />
                      </Link>
                      <button
                        onClick={() => {
                          if (!window.confirm(`Retirer ${a.pseudo} de tes amis ?`)) return;
                          agir(
                            a.relationId,
                            () => retirerAmi(a.relationId),
                            "Impossible de retirer cet ami."
                          );
                        }}
                        disabled={occupe === a.relationId}
                        aria-label={`Retirer ${a.pseudo} de mes amis`}
                        className="press w-10 h-10 flex items-center justify-center rounded-full text-ink/60 hover:text-tag hover:bg-tag/10 shrink-0 disabled:opacity-50"
                      >
                        {occupe === a.relationId ? <Spinner size={14} /> : <X size={16} />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {envoyees.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">
                  Demandes envoyées ({envoyees.length})
                </h2>
                <ul className="space-y-2.5">
                  {envoyees.map((a) => (
                    <li
                      key={a.relationId}
                      className="flex items-center gap-3 bg-surface rounded-card shadow-soft border border-ink/10 p-3"
                    >
                      <Avatar pseudo={a.pseudo} url={a.avatar_url} />
                      <span className="flex-1 min-w-0 text-sm text-ink/70 truncate">
                        {a.pseudo} · en attente
                      </span>
                      <button
                        onClick={() =>
                          agir(
                            a.relationId,
                            () => retirerAmi(a.relationId),
                            "La demande n'a pas pu être annulée."
                          )
                        }
                        disabled={occupe === a.relationId}
                        className="press rounded-control border border-ink/15 px-3 py-2 text-sm font-medium text-ink/70 shrink-0 disabled:opacity-50"
                      >
                        Annuler
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
