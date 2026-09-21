"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { ChevronLeft, Store, Sparkles, Archive, MessageSquareText, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { discountLabel } from "@/lib/dealFormat";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { FollowMerchantButton } from "@/components/FollowMerchantButton";
import { ReportButton } from "@/components/ReportButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PanierVide } from "@/components/ui/Illustrations";
import { ErrorState } from "@/components/ui/ErrorState";
import { Etoiles } from "@/components/ui/Etoiles";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import {
  chargerAvis,
  chargerResume,
  deposerAvis,
  monAvis,
  supprimerAvis,
  type Avis,
  type Resume,
} from "@/lib/avis";

type Merchant = {
  id: string;
  nom_enseigne: string;
  description: string | null;
  logo_url: string | null;
  user_id: string;
};

type Deal = {
  id: string;
  titre: string;
  photos: string[];
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  date_fin: string | null;
  likes_count: number;
  comments_count: number;
};

function isActive(deal: Deal): boolean {
  return !deal.date_fin || new Date(deal.date_fin) > new Date();
}

export default function CommercantVitrinePage() {
  const params = useParams<{ id: string }>();
  const userId = useCurrentUserId();
  const [state, setState] = useState<"loading" | "not-found" | "error" | "ready">("loading");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);

  const [resume, setResume] = useState<Resume | null>(null);
  const [avisListe, setAvisListe] = useState<Avis[]>([]);
  // `undefined` = pas encore su si on a déjà déposé un avis ; ce n'est pas la
  // même chose que « aucun avis » (`null`), qui décide d'afficher le
  // formulaire vide plutôt que d'attendre.
  const [monAvisState, setMonAvisState] = useState<
    { id: string; note: number; commentaire: string | null } | null | undefined
  >(undefined);
  const [editionAvis, setEditionAvis] = useState(false);
  const [noteChoisie, setNoteChoisie] = useState(0);
  const [commentaireSaisi, setCommentaireSaisi] = useState("");
  const [envoiAvis, setEnvoiAvis] = useState(false);
  const [erreurAvis, setErreurAvis] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!userId) return;
    monAvis(params.id, userId)
      .then((a) => {
        setMonAvisState(a);
        if (a) {
          setNoteChoisie(a.note);
          setCommentaireSaisi(a.commentaire ?? "");
        }
      })
      .catch(() => setMonAvisState(null));
  }, [userId, params.id]);

  async function chargerAvisEtResume() {
    const [r, liste] = await Promise.all([chargerResume(params.id), chargerAvis(params.id)]);
    setResume(r);
    setAvisListe(liste);
  }

  async function envoyerAvis() {
    if (!userId) return;
    if (noteChoisie < 1) {
      setErreurAvis("Choisis une note avant d'envoyer.");
      return;
    }

    setErreurAvis(null);
    setEnvoiAvis(true);

    const { error } = await deposerAvis(
      monAvisState?.id ?? null,
      params.id,
      userId,
      noteChoisie,
      commentaireSaisi
    );

    setEnvoiAvis(false);

    if (error) {
      setErreurAvis("Ton avis n'a pas pu être envoyé.");
      return;
    }

    setEditionAvis(false);
    await Promise.all([
      monAvis(params.id, userId).then(setMonAvisState),
      chargerAvisEtResume(),
    ]);
  }

  async function retirerAvis() {
    if (!monAvisState || !window.confirm("Retirer ton avis ?")) return;

    setEnvoiAvis(true);
    const { error } = await supprimerAvis(monAvisState.id);
    setEnvoiAvis(false);

    if (error) {
      setErreurAvis("Le retrait a échoué.");
      return;
    }

    setMonAvisState(null);
    setNoteChoisie(0);
    setCommentaireSaisi("");
    await chargerAvisEtResume();
  }

  async function load() {
    setState("loading");
    const { data: merchantRow, error } = await supabase
      .from("merchant_profiles")
      .select("id, nom_enseigne, description, logo_url, user_id")
      .eq("id", params.id)
      .single();

    if (error) {
      setState(error.code === "PGRST116" ? "not-found" : "error");
      return;
    }

    setMerchant(merchantRow);

    const { data: dealRows, error: dealsError } = await supabase
      .from("deals")
      .select("id, titre, photos, prix_avant, prix_apres, reduction_pourcentage, date_fin, likes_count, comments_count")
      .eq("merchant_id", merchantRow.id)
      .eq("statut", "publie")
      .order("created_at", { ascending: false });

    // L'erreur du profil était traitée, pas celle-ci : la vitrine annonçait
    // « Rien d'actif pour le moment » à un commerçant qui a des offres en ligne.
    if (dealsError) {
      setState("error");
      return;
    }

    setDeals(dealRows ?? []);
    setState("ready");

    // Les avis sont publics et ne conditionnent pas l'affichage de la
    // vitrine : un échec ici ne doit pas empêcher de voir la page.
    try {
      await chargerAvisEtResume();
    } catch {
      // Section avis silencieusement vide plutôt que de casser toute la page ;
      // resume reste `null`, ce que l'affichage traite comme « pas encore de
      // note » — acceptable pour une section non bloquante.
    }
  }

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-paper px-4 pt-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-card mb-3" />
          <Skeleton className="h-20 w-full rounded-card" />
        </div>
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={Store}
          title="Ce commerçant n'existe pas"
          action={
            <Link href="/" className="press text-teal underline font-medium">
              Retour au fil
            </Link>
          }
        />
      </main>
    );
  }

  if (state === "error" || !merchant) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <ErrorState onRetry={load} />
      </main>
    );
  }

  const actifs = deals.filter(isActive);
  const passes = deals.filter((d) => !isActive(d));
  const engagement = deals.reduce((sum, d) => sum + d.likes_count + d.comments_count, 0);

  function renderDeal(deal: Deal, muted = false) {
    const badge = discountLabel(deal);
    return (
      <Link
        key={deal.id}
        href={`/bons-plans/${deal.id}`}
        className={`press flex items-center gap-3 rounded-card border border-ink/10 bg-surface p-3 shadow-soft hover:shadow-raised transition-shadow ${muted ? "opacity-60" : ""}`}
      >
        {deal.photos[0] ? (
          <Image
            src={deal.photos[0]}
            alt={deal.titre}
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
    );
  }

  return (
    <main className="min-h-screen bg-paper pb-16">
      <div className="h-24 bg-gradient-to-br from-teal to-teal/70" />

      <div className="max-w-2xl mx-auto px-4">
        <Link
          href="/"
          aria-label="Retour au fil"
          className="press absolute top-4 left-4 w-9 h-9 rounded-full bg-surface/90 backdrop-blur flex items-center justify-center shadow-soft"
        >
          <ChevronLeft size={19} className="text-ink" />
        </Link>

        <div className="flex items-end gap-4 -mt-10 mb-3">
          {merchant.logo_url ? (
            <Image
              src={merchant.logo_url}
              alt={merchant.nom_enseigne}
              width={80}
              height={80}
              sizes="80px"
              priority
              className="w-20 h-20 rounded-full object-cover border-4 border-paper shadow-soft"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-surface border-4 border-paper shadow-soft flex items-center justify-center">
              <Store size={26} className="text-teal" strokeWidth={1.75} />
            </div>
          )}
          <div className="flex-1 pb-1">
            <FollowMerchantButton merchantId={merchant.id} userId={userId} />
          </div>
        </div>

        <div className="flex items-start justify-between gap-2 mb-1">
          <h1 className="text-xl font-extrabold text-ink">{merchant.nom_enseigne}</h1>
          <ReportButton
            targetType="merchant"
            targetId={merchant.id}
            userId={userId}
            iconOnly
            className="press p-1.5 rounded-full text-ink/60 hover:text-tag hover:bg-tag/5 mt-0.5"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
          {resume && resume.total > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-ink/70">
              <Etoiles valeur={resume.moyenne} />
              <strong className="text-ink">{resume.moyenne}</strong>
              <span className="text-ink/60">
                ({resume.total} avis{resume.total > 1 ? "" : ""})
              </span>
            </span>
          )}
          <p className="inline-flex items-center gap-1 text-sm text-ink/60">
            <Sparkles size={13} className="text-marigold" />
            {engagement} interaction{engagement !== 1 ? "s" : ""} cumulée{engagement !== 1 ? "s" : ""}
          </p>
        </div>

        {merchant.description && (
          <p className="text-ink/70 text-sm leading-relaxed mb-6">{merchant.description}</p>
        )}

        <div className="mb-8">
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2.5">
            Bons plans actifs ({actifs.length})
          </p>
          {actifs.length === 0 ? (
            <EmptyState
              illustration={PanierVide}
              title="Rien d'actif pour le moment"
              description="Reviens bientôt découvrir ses prochaines offres."
            />
          ) : (
            <div className="space-y-2">{actifs.map((d) => renderDeal(d))}</div>
          )}
        </div>

        {passes.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2.5 inline-flex items-center gap-1.5">
              <Archive size={12} /> Passés ({passes.length})
            </p>
            <div className="space-y-2">{passes.map((d) => renderDeal(d, true))}</div>
          </div>
        )}

        <section>
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2.5 inline-flex items-center gap-1.5">
            <MessageSquareText size={12} /> Avis ({resume?.total ?? 0})
          </p>

          {erreurAvis && <p className="text-tag text-sm mb-2.5">{erreurAvis}</p>}

          {/* Le propriétaire de l'enseigne ne peut pas la noter — la base le
              refuserait de toute façon, mais autant ne pas lui montrer un
              formulaire voué à échouer. */}
          {userId && merchant.user_id !== userId && (
            <div className="rounded-card border border-ink/10 bg-surface p-4 mb-4">
              {monAvisState === undefined ? (
                <Skeleton className="h-16 w-full" />
              ) : editionAvis || !monAvisState ? (
                <>
                  <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2">
                    {monAvisState ? "Modifier ton avis" : "Laisser un avis"}
                  </p>
                  <Etoiles valeur={noteChoisie} taille={22} onChange={setNoteChoisie} className="mb-2.5" />
                  <textarea
                    value={commentaireSaisi}
                    onChange={(e) => setCommentaireSaisi(e.target.value)}
                    placeholder="Ton expérience chez ce commerçant (optionnel)"
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-control border border-ink/15 px-3 py-2 text-sm focus:border-teal mb-2.5"
                  />
                  <div className="flex gap-2">
                    {monAvisState && (
                      <button
                        onClick={() => {
                          setEditionAvis(false);
                          setNoteChoisie(monAvisState.note);
                          setCommentaireSaisi(monAvisState.commentaire ?? "");
                          setErreurAvis(null);
                        }}
                        className="press rounded-control border border-ink/15 px-4 py-2 text-sm font-medium text-ink"
                      >
                        Annuler
                      </button>
                    )}
                    <button
                      onClick={envoyerAvis}
                      disabled={envoiAvis}
                      className="press inline-flex items-center gap-1.5 rounded-control bg-teal text-white px-4 py-2 text-sm font-semibold shadow-soft disabled:opacity-60"
                    >
                      {envoiAvis && <Spinner size={14} />}
                      Envoyer
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2">Ton avis</p>
                  <Etoiles valeur={monAvisState.note} taille={18} className="mb-1.5" />
                  {monAvisState.commentaire && (
                    <p className="text-sm text-ink/75 mb-2.5">{monAvisState.commentaire}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditionAvis(true)}
                      className="press rounded-control border border-ink/15 px-4 py-2 text-sm font-medium text-ink"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={retirerAvis}
                      disabled={envoiAvis}
                      className="press inline-flex items-center gap-1.5 rounded-control text-tag px-4 py-2 text-sm font-medium disabled:opacity-60"
                    >
                      <Trash2 size={14} />
                      Retirer
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!userId && (
            <p className="text-sm text-ink/70 mb-4">
              <a href="/connexion" className="text-teal underline font-medium">
                Connecte-toi
              </a>{" "}
              pour laisser un avis.
            </p>
          )}

          {avisListe.length === 0 ? (
            <p className="text-sm text-ink/60">Aucun avis pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-3">
              {avisListe.map((a) => (
                <li key={a.id} className="flex gap-2.5">
                  <Avatar pseudo={a.auteur?.pseudo} url={a.auteur?.avatar_url} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink truncate">
                        {a.auteur?.pseudo ?? "Compte supprimé"}
                      </span>
                      <Etoiles valeur={a.note} taille={13} />
                    </div>
                    {a.commentaire && (
                      <p className="text-sm text-ink/75 break-words mt-0.5">{a.commentaire}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
