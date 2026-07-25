"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, PlusCircle, ShieldAlert, Clock3, Crown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DealForm } from "@/components/DealForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

type Gate =
  | { status: "loading" }
  | { status: "non-commercant" }
  | { status: "en-attente" }
  | { status: "quota-atteint" }
  | { status: "ok"; merchantId: string };

function BackBar() {
  return (
    <Link
      href="/mes-bons-plans"
      className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
      aria-label="Retour"
    >
      <ChevronLeft size={20} className="text-ink" />
    </Link>
  );
}

export default function NouveauBonPlanPage() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>({ status: "loading" });

  useEffect(() => {
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (userRow?.role !== "commercant") {
        setGate({ status: "non-commercant" });
        return;
      }

      const { data: merchant } = await supabase
        .from("merchant_profiles")
        .select("id, statut_verification, plan")
        .eq("user_id", user.id)
        .single();

      if (!merchant || merchant.statut_verification !== "verifie") {
        setGate({ status: "en-attente" });
        return;
      }

      if (merchant.plan === "gratuit") {
        const { count } = await supabase
          .from("deals")
          .select("id", { count: "exact", head: true })
          .eq("merchant_id", merchant.id)
          .eq("statut", "publie")
          .or(`date_fin.is.null,date_fin.gt.${new Date().toISOString()}`);

        if ((count ?? 0) >= 3) {
          setGate({ status: "quota-atteint" });
          return;
        }
      }

      setGate({ status: "ok", merchantId: merchant.id });
    }

    check();
  }, [router]);

  if (gate.status === "loading") {
    return (
      <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
        <div className="max-w-sm mx-auto">
          <BackBar />
          <Skeleton className="h-96 w-full rounded-card" />
        </div>
      </main>
    );
  }

  if (gate.status === "non-commercant") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={ShieldAlert}
          title="Réservé aux commerçants"
          description="Seuls les comptes commerçants peuvent publier des bons plans."
          action={
            <Link
              href="/devenir-commercant"
              className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
            >
              Devenir commerçant vérifié
            </Link>
          }
        />
      </main>
    );
  }

  if (gate.status === "en-attente") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={Clock3}
          title="Vérification en cours"
          description="Tu pourras publier des bons plans une fois ton SIRET vérifié."
        />
      </main>
    );
  }

  if (gate.status === "quota-atteint") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={Crown}
          title="Limite du plan gratuit atteinte"
          description="Passe à l'offre payante pour publier plus d'annonces."
          action={
            <Link
              href="/tarifs"
              className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
            >
              Voir les tarifs
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-sm mx-auto">
        <BackBar />
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle size={20} className="text-teal" />
          <h1 className="text-xl font-extrabold text-ink">Nouveau bon plan</h1>
        </div>
        <DealForm merchantId={gate.merchantId} />
      </div>
    </main>
  );
}
