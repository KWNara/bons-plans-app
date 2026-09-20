"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, UserPlus, UserCheck, Check, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { discountLabel } from "@/lib/dealFormat";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { envoyerDemande, relationAvec, repondreDemande, retirerAmi, type Relation } from "@/lib/amis";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";

type Profil = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  cities: { nom: string } | null;
};

type Trouvaille = {
  id: string;
  titre: string;
  photos: string[];
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
};

function moisEtAnnee(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function ProfilPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const cible = params.id;
  const moi = useCurrentUserId();

  const [state, setState] = useState<"loading" | "error" | "introuvable" | "ready">("loading");
  const [profil, setProfil] = useState<Profil | null>(null);
  const [trouvailles, setTrouvailles] = useState<Trouvaille[]>([]);
  const [relation, setRelation] = useState<Relation>({ statut: "aucune" });
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const [{ data: p, error }, { data: reposts }] = await Promise.all([
      supabase
        .from("users")
        .select("id, pseudo, avatar_url, bio, created_at, cities:city_id (nom)")
        .eq("id", cible)
        .maybeSingle(),
      supabase
        .from("reposts")
        .select("deals:deal_id (id, titre, photos, prix_avant, prix_apres, reduction_pourcentage, statut)")
        .eq("user_id", cible)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    if (error) {
      setState("error");
      return;
    }
    if (!p) {
      setState("introuvable");
      return;
    }

    setProfil(p as unknown as Profil);

    // Un bon plan retiré ou en attente de modération ne doit pas réapparaître
    // par la bande sur un profil.
    const lignes = (reposts ?? []) as unknown as { deals: (Trouvaille & { statut: string }) | null }[];
    setTrouvailles(
      lignes.map((l) => l.deals).filter((d): d is Trouvaille & { statut: string } => d?.statut === "publie")
    );

    setState("ready");
  }, [cible]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    if (!moi) return;
    relationAvec(moi, cible)
      .then(setRelation)
      .catch(() => setRelation({ statut: "aucune" }));
  }, [moi, cible]);

  async function agir(action: () => Promise<{ error: unknown }>, echec: string) {
    if (!moi) {
      router.push("/connexion");
      return;
    }
    if (occupe) return;

    setErreur(null);
    setOccupe(true);
    const { error } = await action();
    setOccupe(false);

    if (error) {
      setErreur(echec);
      return;
    }

    setRelation(await relationAvec(moi, cible));
  }

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-paper">
        <div className="h-24 bg-ink/5" />
        <div className="max-w-2xl mx-auto px-4 space-y-3 -mt-10">
          <Skeleton className="w-20 h-20 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full rounded-card" />
        </div>
      </main>
    );
  }

  if (state === "error" || state === "introuvable") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        {state === "introuvable" ? (
          <EmptyState
            icon={UserPlus}
            title="Profil introuvable"
            description="Ce compte n'existe plus, ou le lien est incorrect."
            action={
              <Link
                href="/amis"
                className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
              >
                Retour à mes amis
              </Link>
            }
          />
        ) : (
          <ErrorState
            title="Profil indisponible"
            description="Ce profil n'a pas pu être chargé."
            onRetry={() => {
              setState("loading");
              charger();
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper pb-16">
      <div className="h-24 bg-gradient-to-br from-teal to-teal/70" />

      <div className="max-w-2xl mx-auto px-4">
        {/* On arrive ici depuis un commentaire, une liste d'amis ou « Qui y
            va ? » : revenir d'où l'on vient vaut mieux qu'une destination
            fixe. Un profil ouvert par lien direct n'a pas d'historique, d'où
            le repli sur le fil. */}
        <button
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          aria-label="Retour"
          className="press absolute top-4 left-4 w-9 h-9 rounded-full bg-surface/90 backdrop-blur flex items-center justify-center shadow-soft"
        >
          <ChevronLeft size={19} className="text-ink" />
        </button>

        <div className="-mt-10 mb-3">
          <Avatar
            pseudo={profil?.pseudo}
            url={profil?.avatar_url}
            size={80}
            className="border-4 border-paper shadow-soft"
          />
        </div>

        <h1 className="text-2xl font-extrabold text-ink">{profil?.pseudo}</h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/60 mt-1">
          {profil?.cities && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {profil.cities.nom}
            </span>
          )}
          {profil && <span>Sur Déniche depuis {moisEtAnnee(profil.created_at)}</span>}
        </div>

        {profil?.bio && (
          <p className="text-ink/75 mt-3 whitespace-pre-line leading-relaxed">{profil.bio}</p>
        )}

        {erreur && <p className="text-tag text-sm mt-3">{erreur}</p>}

        {relation.statut !== "moi" && (
          <div className="flex flex-wrap gap-2 mt-4">
            {relation.statut === "aucune" && (
              <button
                onClick={() =>
                  agir(
                    () => envoyerDemande(moi!, cible),
                    "La demande n'a pas pu être envoyée."
                  )
                }
                disabled={occupe}
                className="press inline-flex items-center gap-1.5 rounded-control bg-teal text-white px-4 py-2.5 text-sm font-semibold shadow-soft disabled:opacity-60"
              >
                {occupe ? <Spinner size={15} /> : <UserPlus size={15} />}
                Ajouter en ami
              </button>
            )}

            {relation.statut === "envoyee" && (
              <button
                onClick={() =>
                  agir(
                    () => retirerAmi(relation.relationId),
                    "La demande n'a pas pu être annulée."
                  )
                }
                disabled={occupe}
                className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/70 disabled:opacity-60"
              >
                {occupe ? <Spinner size={15} /> : null}
                Demande envoyée · Annuler
              </button>
            )}

            {relation.statut === "recue" && (
              <button
                onClick={() =>
                  agir(
                    () => repondreDemande(relation.relationId, true),
                    "La demande n'a pas pu être acceptée."
                  )
                }
                disabled={occupe}
                className="press inline-flex items-center gap-1.5 rounded-control bg-teal text-white px-4 py-2.5 text-sm font-semibold shadow-soft disabled:opacity-60"
              >
                {occupe ? <Spinner size={15} /> : <Check size={15} />}
                Accepter sa demande
              </button>
            )}

            {relation.statut === "amis" && (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-control bg-teal/10 text-teal px-4 py-2.5 text-sm font-semibold">
                  <UserCheck size={15} />
                  Amis
                </span>
                <Link
                  href={`/messages/${cible}`}
                  className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink"
                >
                  <MessageCircle size={15} />
                  Écrire
                </Link>
              </>
            )}
          </div>
        )}

        <section className="mt-7">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">
            Ses trouvailles ({trouvailles.length})
          </h2>

          {trouvailles.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Rien de partagé pour l'instant"
              description={`${profil?.pseudo} n'a pas encore relayé de bon plan.`}
            />
          ) : (
            <ul className="space-y-2.5">
              {trouvailles.map((deal) => {
                const badge = discountLabel(deal);
                return (
                  <li key={deal.id}>
                    <Link
                      href={`/bons-plans/${deal.id}`}
                      className="press flex items-center gap-3 rounded-card border border-ink/10 bg-surface p-3 shadow-soft hover:shadow-raised transition-shadow"
                    >
                      {deal.photos[0] ? (
                        <Image
                          src={deal.photos[0]}
                          alt=""
                          width={64}
                          height={64}
                          sizes="64px"
                          className="w-16 h-16 rounded-control object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-control bg-ink/5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink truncate">{deal.titre}</p>
                        {badge && <p className="text-tag text-sm font-bold mt-0.5">{badge}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
