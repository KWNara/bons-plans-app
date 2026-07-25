"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { discountLabel } from "@/lib/dealFormat";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { FollowMerchantButton } from "@/components/FollowMerchantButton";
import { ReportButton } from "@/components/ReportButton";

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
  const [state, setState] = useState<"loading" | "not-found" | "ready">("loading");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    async function load() {
      const { data: merchantRow } = await supabase
        .from("merchant_profiles")
        .select("id, nom_enseigne, description, logo_url")
        .eq("id", params.id)
        .single();

      if (!merchantRow) {
        setState("not-found");
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

    load();
  }, [params.id]);

  if (state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  if (state === "not-found" || !merchant) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-ink/60">Ce commerçant n&apos;existe pas.</p>
      </main>
    );
  }

  const actifs = deals.filter(isActive);
  const passes = deals.filter((d) => !isActive(d));
  const engagement = deals.reduce((sum, d) => sum + d.likes_count + d.comments_count, 0);

  function renderDeal(deal: Deal) {
    const badge = discountLabel(deal);
    return (
      <Link
        key={deal.id}
        href={`/bons-plans/${deal.id}`}
        className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/60 p-3"
      >
        {deal.photos[0] ? (
          <img src={deal.photos[0]} alt={deal.titre} className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-ink/5" />
        )}
        <div className="flex-1">
          <p className="font-medium text-ink">{deal.titre}</p>
          {badge && <p className="text-tag text-sm font-bold">{badge}</p>}
        </div>
      </Link>
    );
  }

  return (
    <main className="min-h-screen bg-paper pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center gap-4 mb-2">
          {merchant.logo_url ? (
            <img src={merchant.logo_url} alt={merchant.nom_enseigne} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink/10" />
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-ink">{merchant.nom_enseigne}</h1>
            <p className="text-sm text-ink/50">{engagement} interactions cumulées</p>
          </div>
          <FollowMerchantButton merchantId={merchant.id} userId={userId} />
        </div>

        {merchant.description && <p className="text-ink/70 mb-4">{merchant.description}</p>}

        <ReportButton targetType="merchant" targetId={merchant.id} userId={userId} className="mb-6 flex items-center gap-1 text-sm text-ink/50" />

        <div className="mb-8">
          <p className="text-sm text-ink/60 mb-2">Bons plans actifs ({actifs.length})</p>
          {actifs.length === 0 ? (
            <p className="text-sm text-ink/40">Aucun bon plan actif pour le moment.</p>
          ) : (
            <div className="space-y-2">{actifs.map(renderDeal)}</div>
          )}
        </div>

        {passes.length > 0 && (
          <div>
            <p className="text-sm text-ink/60 mb-2">Bons plans passés ({passes.length})</p>
            <div className="space-y-2 opacity-60">{passes.map(renderDeal)}</div>
          </div>
        )}
      </div>
    </main>
  );
}
