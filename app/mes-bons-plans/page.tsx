"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Pencil, Trash2, PackageSearch } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Spinner } from "@/components/ui/Spinner";

type Deal = {
  id: string;
  titre: string;
  statut: "brouillon" | "publie" | "expire";
  date_fin: string | null;
};

type DealState = "brouillon" | "actif" | "expire";

function computeState(deal: Deal): DealState {
  if (deal.statut === "brouillon") return "brouillon";
  if (deal.date_fin && new Date(deal.date_fin) <= new Date()) return "expire";
  return "actif";
}

const BADGES: Record<DealState, { label: string; className: string }> = {
  actif: { label: "En ligne", className: "bg-teal/10 text-teal" },
  brouillon: { label: "Brouillon", className: "bg-marigold/20 text-ink" },
  expire: { label: "Terminé", className: "bg-ink/10 text-ink/70" },
};

export default function MesBonsPlansPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return;
    }

    const { data: merchant, error: merchantError } = await supabase
      .from("merchant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (merchantError) {
      setState("error");
      return;
    }

    if (!merchant) {
      router.push("/compte");
      return;
    }

    const { data, error } = await supabase
      .from("deals")
      .select("id, titre, statut, date_fin")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false });

    // Sans cette distinction, une base injoignable affichait « Tu n'as pas
    // encore publié de bon plan » à un commerçant qui en a douze.
    if (error) {
      setState("error");
      return;
    }

    setDeals(data ?? []);
    setState("ready");
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(deal: Deal) {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${deal.titre} » ? Cette action est irréversible.`
    );
    if (!confirmed) return;

    setActionError(null);
    setDeletingId(deal.id);

    const { error } = await supabase.from("deals").delete().eq("id", deal.id);

    setDeletingId(null);

    if (error) {
      setActionError("La suppression a échoué. Le bon plan est toujours en ligne.");
      return;
    }

    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
  }

  const groups: { title: string; items: Deal[] }[] = [
    { title: "En ligne", items: deals.filter((d) => computeState(d) === "actif") },
    { title: "Brouillons", items: deals.filter((d) => computeState(d) === "brouillon") },
    { title: "Terminés", items: deals.filter((d) => computeState(d) === "expire") },
  ];

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-md mx-auto">
        <Link
          href="/compte"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour au compte"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-extrabold text-ink">Mes bons plans</h1>
          <Link
            href="/bons-plans/nouveau"
            className="press inline-flex items-center gap-1.5 rounded-control bg-teal text-white px-3.5 py-2.5 text-sm font-semibold shadow-soft shrink-0"
          >
            <Plus size={16} />
            Nouveau
          </Link>
        </div>

        {state === "loading" && (
          <div className="space-y-2.5">
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
            <Skeleton className="h-16 w-full rounded-card" />
          </div>
        )}

        {state === "error" && (
          <ErrorState
            title="Chargement impossible"
            description="Tes bons plans n'ont pas pu être récupérés."
            onRetry={() => {
              setState("loading");
              load();
            }}
          />
        )}

        {state === "ready" && deals.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Aucun bon plan pour l'instant"
            description="Publie ta première offre pour la faire apparaître dans le fil de ta ville."
            action={
              <Link
                href="/bons-plans/nouveau"
                className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
              >
                Créer un bon plan
              </Link>
            }
          />
        )}

        {actionError && <p className="text-tag text-sm mb-3">{actionError}</p>}

        {state === "ready" &&
          groups.map(({ title, items }) =>
            items.length === 0 ? null : (
              <section key={title} className="mb-6">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-2">
                  {title} ({items.length})
                </h2>
                <ul className="space-y-2.5">
                  {items.map((deal) => {
                    const badge = BADGES[computeState(deal)];
                    return (
                      <li
                        key={deal.id}
                        className="bg-white rounded-card shadow-soft border border-ink/10 p-3.5"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <p className="font-semibold text-ink leading-snug min-w-0 break-words">
                            {deal.titre}
                          </p>
                          <span
                            className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/bons-plans/${deal.id}/modifier`}
                            className="press inline-flex items-center gap-1.5 rounded-control border border-ink/15 px-3 py-2 text-sm font-medium text-ink hover:bg-paper"
                          >
                            <Pencil size={14} />
                            Modifier
                          </Link>
                          <button
                            onClick={() => handleDelete(deal)}
                            disabled={deletingId === deal.id}
                            className="press inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-tag hover:bg-tag/10 disabled:opacity-50"
                          >
                            {deletingId === deal.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                            Supprimer
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )
          )}
      </div>
    </main>
  );
}
