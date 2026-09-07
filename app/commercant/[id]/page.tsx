"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Store, Sparkles, Archive } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { discountLabel } from "@/lib/dealFormat";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { FollowMerchantButton } from "@/components/FollowMerchantButton";
import { ReportButton } from "@/components/ReportButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type Merchant = {
  id: string;
  nom_enseigne: string;
  description: string | null;
  logo_url: string | null;
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function load() {
    setState("loading");
    const { data: merchantRow, error } = await supabase
      .from("merchant_profiles")
      .select("id, nom_enseigne, description, logo_url")
      .eq("id", params.id)
      .single();

    if (error) {
      setState(error.code === "PGRST116" ? "not-found" : "error");
      return;
    }

    setMerchant(merchantRow);

    const { data: dealRows } = await supabase
      .from("deals")
      .select("id, titre, photos, prix_avant, prix_apres, reduction_pourcentage, date_fin, likes_count, comments_count")
      .eq("merchant_id", merchantRow.id)
      .eq("statut", "publie")
      .order("created_at", { ascending: false });

    setDeals(dealRows ?? []);
    setState("ready");
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
        className={`press flex items-center gap-3 rounded-card border border-ink/10 bg-white p-3 shadow-soft hover:shadow-raised transition-shadow ${muted ? "opacity-60" : ""}`}
      >
        {deal.photos[0] ? (
          <img src={deal.photos[0]} alt={deal.titre} className="w-16 h-16 rounded-control object-cover shrink-0" />
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
          className="press absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft"
        >
          <ChevronLeft size={19} className="text-ink" />
        </Link>

        <div className="flex items-end gap-4 -mt-10 mb-3">
          {merchant.logo_url ? (
            <img
              src={merchant.logo_url}
              alt={merchant.nom_enseigne}
              className="w-20 h-20 rounded-full object-cover border-4 border-paper shadow-soft"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white border-4 border-paper shadow-soft flex items-center justify-center">
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
        <p className="inline-flex items-center gap-1 text-sm text-ink/60 mb-3">
          <Sparkles size={13} className="text-marigold" />
          {engagement} interaction{engagement !== 1 ? "s" : ""} cumulée{engagement !== 1 ? "s" : ""}
        </p>

        {merchant.description && (
          <p className="text-ink/70 text-sm leading-relaxed mb-6">{merchant.description}</p>
        )}

        <div className="mb-8">
          <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2.5">
            Bons plans actifs ({actifs.length})
          </p>
          {actifs.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Rien d'actif pour le moment"
              description="Reviens bientôt découvrir ses prochaines offres."
            />
          ) : (
            <div className="space-y-2">{actifs.map((d) => renderDeal(d))}</div>
          )}
        </div>

        {passes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-2.5 inline-flex items-center gap-1.5">
              <Archive size={12} /> Passés ({passes.length})
            </p>
            <div className="space-y-2">{passes.map((d) => renderDeal(d, true))}</div>
          </div>
        )}
      </div>
    </main>
  );
}
