"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DealForm } from "@/components/DealForm";

type Loaded = {
  merchantId: string;
  deal: {
    id: string;
    titre: string;
    description: string | null;
    photos: string[];
    prix_avant: number | null;
    prix_apres: number | null;
    reduction_pourcentage: number | null;
    category_id: string | null;
    date_debut: string | null;
    date_fin: string | null;
    stock_limite: number | null;
    statut: "brouillon" | "publie" | "expire";
    selectedCityIds: string[];
  };
};

export default function ModifierBonPlanPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<"loading" | "not-found" | "ready">("loading");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: deal } = await supabase
        .from("deals")
        .select(
          "id, merchant_id, titre, description, photos, prix_avant, prix_apres, reduction_pourcentage, category_id, date_debut, date_fin, stock_limite, statut, merchant_profiles!inner(user_id)"
        )
        .eq("id", params.id)
        .single();

      if (!deal || (deal.merchant_profiles as unknown as { user_id: string }).user_id !== user.id) {
        setState("not-found");
        return;
      }

      const { data: dealCities } = await supabase
        .from("deal_cities")
        .select("city_id")
        .eq("deal_id", deal.id);

      setLoaded({
        merchantId: deal.merchant_id,
        deal: {
          ...deal,
          selectedCityIds: (dealCities ?? []).map((dc) => dc.city_id),
        },
      });
      setState("ready");
    }

    load();
  }, [params.id, router]);

  if (state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Ce bon plan n&apos;existe pas ou ne t&apos;appartient pas.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-6">Modifier le bon plan</h1>
        <DealForm merchantId={loaded!.merchantId} existingDeal={loaded!.deal} />
      </div>
    </main>
  );
}
