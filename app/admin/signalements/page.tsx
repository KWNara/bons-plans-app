"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  EyeOff,
  Trash2,
  Ban,
  Flag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";

const MOTIF_LABELS: Record<string, string> = {
  contenu_trompeur: "Contenu trompeur",
  arnaque_suspectee: "Arnaque suspectée",
  produit_non_conforme: "Produit non conforme",
  contenu_inapproprie: "Contenu inapproprié",
  doublon: "Doublon",
  autre: "Autre",
};

const STATUT_BADGES: Record<string, { label: string; className: string }> = {
  en_attente: { label: "En attente", className: "bg-marigold/20 text-ink" },
  traite: { label: "Traité", className: "bg-teal/10 text-teal" },
  rejete: { label: "Rejeté", className: "bg-ink/10 text-ink/70" },
};

type Report = {
  id: string;
  target_type: "deal" | "comment" | "merchant";
  deal_id: string | null;
  merchant_id: string | null;
  motif: string;
  reason: string | null;
  status: "en_attente" | "traite" | "rejete";
  created_at: string;
  reporter: { pseudo: string } | null;
  deals: { titre: string; statut: string } | null;
  merchant_profiles: { nom_enseigne: string; suspendu: boolean } | null;
};

type Sort = "date" | "motif";

export default function AdminSignalementsPage() {
  const router = useRouter();
  const [access, setAccess] = useState<"loading" | "denied" | "error" | "granted">("loading");
  const [reports, setReports] = useState<Report[]>([]);
  const [sort, setSort] = useState<Sort>("date");
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    const { data, error } = await supabase
      .from("reports")
      .select(
        "id, target_type, deal_id, merchant_id, motif, reason, status, created_at, reporter:reporter_id (pseudo), deals:deal_id (titre, statut), merchant_profiles:merchant_id (nom_enseigne, suspendu)"
      )
      .order("created_at", { ascending: false });

    // Sans ce contrôle, une base injoignable affichait « Aucun signalement »
    // à un modérateur qui en a peut-être des dizaines en attente.
    if (error) {
      setAccess("error");
      return;
    }

    setReports((data as unknown as Report[]) ?? []);
    setAccess("granted");
  }, []);

  useEffect(() => {
    async function guard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: userRow, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        setAccess("error");
        return;
      }

      if (userRow?.role !== "admin") {
        setAccess("denied");
        return;
      }

      loadReports();
    }

    guard();
  }, [router, loadReports]);

  // Les constructeurs de requête Supabase sont « thenable » sans être des
  // Promise au sens strict : PromiseLike suffit et évite un cast.
  async function executer(
    id: string,
    action: () => PromiseLike<{ error: unknown }>,
    echec: string
  ) {
    if (busyId) return;

    setActionError(null);
    setBusyId(id);

    const { error } = await action();

    setBusyId(null);

    if (error) {
      setActionError(echec);
      return;
    }

    await loadReports();
  }

  function updateStatus(report: Report, status: "traite" | "rejete") {
    executer(
      report.id,
      async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return supabase.from("reports").update({ status, reviewed_by: user?.id }).eq("id", report.id);
      },
      "Le statut n'a pas pu être mis à jour."
    );
  }

  function depublierDeal(report: Report) {
    const confirme = window.confirm(
      `Dépublier « ${report.deals?.titre ?? "ce bon plan"} » ? Il disparaîtra du fil mais ne sera pas supprimé.`
    );
    if (!confirme) return;

    executer(
      report.id,
      () => supabase.from("deals").update({ statut: "brouillon" }).eq("id", report.deal_id!),
      "Le bon plan n'a pas pu être dépublié."
    );
  }

  function supprimerDeal(report: Report) {
    const confirme = window.confirm(
      `Supprimer définitivement « ${report.deals?.titre ?? "ce bon plan"} » ? Cette action est irréversible.`
    );
    if (!confirme) return;

    executer(
      report.id,
      () => supabase.from("deals").delete().eq("id", report.deal_id!),
      "Le bon plan n'a pas pu être supprimé."
    );
  }

  function basculerSuspension(report: Report) {
    const suspendu = report.merchant_profiles?.suspendu ?? false;
    const nom = report.merchant_profiles?.nom_enseigne ?? "ce commerçant";

    const confirme = window.confirm(
      suspendu
        ? `Réactiver ${nom} ? Ses bons plans redeviendront visibles.`
        : `Suspendre ${nom} ? Son compte et ses bons plans seront masqués.`
    );
    if (!confirme) return;

    executer(
      report.id,
      () =>
        supabase
          .from("merchant_profiles")
          .update({ suspendu: !suspendu })
          .eq("id", report.merchant_id!),
      "Le statut du commerçant n'a pas pu être modifié."
    );
  }

  if (access === "loading") {
    return (
      <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
        <div className="max-w-2xl mx-auto space-y-3">
          <Skeleton className="h-8 w-48 rounded-control" />
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-32 w-full rounded-card" />
        </div>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={ShieldAlert}
          title="Accès réservé"
          description="Cette page est réservée aux administrateurs."
          action={
            <Link href="/" className="press text-teal underline font-medium">
              Retour au fil
            </Link>
          }
        />
      </main>
    );
  }

  if (access === "error") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <ErrorState
          title="Chargement impossible"
          description="Les signalements n'ont pas pu être récupérés."
          onRetry={() => {
            setAccess("loading");
            loadReports();
          }}
        />
      </main>
    );
  }

  const filtres = showAll ? reports : reports.filter((r) => r.status === "en_attente");
  const tries = [...filtres].sort((a, b) => {
    if (sort === "motif") return a.motif.localeCompare(b.motif);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const enAttente = reports.filter((r) => r.status === "en_attente").length;

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour au fil"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-9 h-9 rounded-full bg-tag/10 flex items-center justify-center shrink-0">
            <Flag size={17} className="text-tag" strokeWidth={1.75} />
          </span>
          <h1 className="text-2xl font-extrabold text-ink">Signalements</h1>
        </div>
        <p className="text-sm text-ink/70 mb-5">
          {enAttente === 0
            ? "Aucun signalement en attente."
            : `${enAttente} signalement${enAttente > 1 ? "s" : ""} en attente de traitement.`}
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <button
            onClick={() => setShowAll((v) => !v)}
            className={`press rounded-control border px-3.5 py-2.5 text-sm font-medium transition-colors ${
              showAll ? "border-teal bg-teal/10 text-teal" : "border-ink/15 text-ink/70 hover:bg-white"
            }`}
          >
            {showAll ? "Tous les signalements" : "En attente uniquement"}
          </button>

          <label className="flex items-center gap-2 text-sm text-ink/70">
            <span className="sr-only">Trier les signalements</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Trier les signalements"
              className="rounded-control border border-ink/15 px-3 py-2.5 text-sm bg-white focus:border-teal transition-colors"
            >
              <option value="date">Trier par date</option>
              <option value="motif">Trier par motif</option>
            </select>
          </label>
        </div>

        {actionError && <p className="text-tag text-sm mb-3">{actionError}</p>}

        {tries.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={showAll ? "Aucun signalement" : "Rien à traiter"}
            description={
              showAll
                ? "Aucun contenu n'a été signalé pour le moment."
                : "Tous les signalements ont été traités."
            }
          />
        ) : (
          <ul className="space-y-3">
            {tries.map((r) => {
              const badge = STATUT_BADGES[r.status];
              const occupe = busyId === r.id;

              return (
                <li key={r.id} className="bg-white rounded-card shadow-soft border border-ink/10 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-teal">
                      {r.target_type === "deal"
                        ? "Bon plan"
                        : r.target_type === "merchant"
                          ? "Commerçant"
                          : "Commentaire"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs text-ink/60">
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  </div>

                  {r.target_type === "deal" && r.deal_id && (
                    <Link
                      href={`/bons-plans/${r.deal_id}`}
                      className="press block font-semibold text-ink underline break-words mb-1"
                    >
                      {r.deals?.titre ?? "(bon plan supprimé)"}
                    </Link>
                  )}
                  {r.target_type === "merchant" && r.merchant_id && (
                    <Link
                      href={`/commercant/${r.merchant_id}`}
                      className="press block font-semibold text-ink underline break-words mb-1"
                    >
                      {r.merchant_profiles?.nom_enseigne ?? "(commerçant supprimé)"}
                      {r.merchant_profiles?.suspendu && (
                        <span className="text-tag text-xs ml-2 font-medium">suspendu</span>
                      )}
                    </Link>
                  )}

                  <p className="text-sm text-ink/70 break-words">
                    Motif : <strong className="text-ink">{MOTIF_LABELS[r.motif] ?? r.motif}</strong>
                    {r.reporter?.pseudo && <span> · signalé par {r.reporter.pseudo}</span>}
                  </p>
                  {r.reason && (
                    <p className="text-sm text-ink/70 break-words mt-1 bg-paper rounded-control px-3 py-2">
                      « {r.reason} »
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {r.status === "en_attente" && (
                      <>
                        <button
                          onClick={() => updateStatus(r, "traite")}
                          disabled={occupe}
                          className="press inline-flex items-center gap-1.5 rounded-control border border-teal text-teal px-3 py-2 text-sm font-medium hover:bg-teal/5 disabled:opacity-50"
                        >
                          {occupe ? <Spinner size={14} /> : <Check size={14} />}
                          Marquer traité
                        </button>
                        <button
                          onClick={() => updateStatus(r, "rejete")}
                          disabled={occupe}
                          className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 text-ink px-3 py-2 text-sm font-medium hover:bg-paper disabled:opacity-50"
                        >
                          <X size={14} />
                          Rejeter
                        </button>
                      </>
                    )}

                    {r.target_type === "deal" && r.deal_id && r.deals?.statut === "publie" && (
                      <button
                        onClick={() => depublierDeal(r)}
                        disabled={occupe}
                        className="press inline-flex items-center gap-1.5 rounded-control border border-tag/40 text-tag px-3 py-2 text-sm font-medium hover:bg-tag/5 disabled:opacity-50"
                      >
                        <EyeOff size={14} />
                        Dépublier
                      </button>
                    )}
                    {r.target_type === "deal" && r.deal_id && (
                      <button
                        onClick={() => supprimerDeal(r)}
                        disabled={occupe}
                        className="press inline-flex items-center gap-1.5 rounded-control bg-tag text-white px-3 py-2 text-sm font-medium shadow-soft disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    )}
                    {r.target_type === "merchant" && r.merchant_id && (
                      <button
                        onClick={() => basculerSuspension(r)}
                        disabled={occupe}
                        className="press inline-flex items-center gap-1.5 rounded-control border border-tag/40 text-tag px-3 py-2 text-sm font-medium hover:bg-tag/5 disabled:opacity-50"
                      >
                        <Ban size={14} />
                        {r.merchant_profiles?.suspendu ? "Réactiver" : "Suspendre"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
