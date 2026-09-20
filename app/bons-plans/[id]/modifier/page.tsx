"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Pencil, PackageX } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DealForm } from "@/components/DealForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

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
  const [state, setState] = useState<"loading" | "not-found" | "error" | "ready">("loading");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  // `load` vit au niveau du composant, et non dans l'effet, pour que le bouton
  // « Réessayer » de l'état d'erreur puisse l'appeler.
  const load = useCallback(async () => {
    setState("loading");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/connexion");
      return;
    }

    const { data: deal, error } = await supabase
      .from("deals")
      .select(
        "id, merchant_id, titre, description, photos, prix_avant, prix_apres, reduction_pourcentage, category_id, date_debut, date_fin, stock_limite, statut, merchant_profiles!inner(user_id)"
      )
      .eq("id", params.id)
      .single();

    // PGRST116 = aucune ligne : c'est bien « introuvable ». Toute autre erreur
    // est une panne, et annoncer « ne t'appartient pas » à un commerçant
    // légitime est le pire message qu'on puisse lui faire lire.
    if (error && error.code !== "PGRST116") {
      setState("error");
      return;
    }

    if (!deal || (deal.merchant_profiles as unknown as { user_id: string }).user_id !== user.id) {
      setState("not-found");
      return;
    }

    const { data: dealCities, error: citiesError } = await supabase
      .from("deal_cities")
      .select("city_id")
      .eq("deal_id", deal.id);

    // Un échec ici pré-remplirait le formulaire sans ses villes : enregistrer
    // effacerait silencieusement la diffusion existante.
    if (citiesError) {
      setState("error");
      return;
    }

    setLoaded({
      merchantId: deal.merchant_id,
      deal: {
        ...deal,
        selectedCityIds: (dealCities ?? []).map((dc) => dc.city_id),
      },
    });
    setState("ready");
  }, [params.id, router]);

  useEffect(() => {
    load();
  }, [load]);

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
        <div className="max-w-sm mx-auto">
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <ErrorState
          title="Chargement impossible"
          description="Ce bon plan n'a pas pu être récupéré."
          onRetry={load}
        />
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={PackageX}
          title="Introuvable"
          description="Ce bon plan n'existe pas ou ne t'appartient pas."
          action={
            <Link href="/mes-bons-plans" className="press text-teal underline font-medium">
              Retour à mes bons plans
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-sm mx-auto">
        <Link
          href="/mes-bons-plans"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-surface"
          aria-label="Retour"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>
        <div className="flex items-center gap-2 mb-4">
          <Pencil size={18} className="text-teal" />
          <h1 className="text-xl font-extrabold text-ink">Modifier le bon plan</h1>
        </div>
        <DealForm merchantId={loaded!.merchantId} existingDeal={loaded!.deal} />
      </div>
    </main>
  );
}
