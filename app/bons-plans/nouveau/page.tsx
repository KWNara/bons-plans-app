"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DealForm } from "@/components/DealForm";

type Gate =
  | { status: "loading" }
  | { status: "non-commercant" }
  | { status: "en-attente" }
  | { status: "quota-atteint" }
  | { status: "ok"; merchantId: string };

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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  if (gate.status === "non-commercant") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-ink/70 mb-3">
            Seuls les comptes commerçants peuvent publier des bons plans.
          </p>
          <Link href="/devenir-commercant" className="text-teal underline">
            Devenir commerçant vérifié
          </Link>
        </div>
      </main>
    );
  }

  if (gate.status === "en-attente") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="text-marigold">
          ⏳ Vérification en cours — tu pourras publier des bons plans une fois ton SIRET vérifié.
        </p>
      </main>
    );
  }

  if (gate.status === "quota-atteint") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-tag mb-3">
            Passez à l&apos;offre payante pour publier plus d&apos;annonces.
          </p>
          <Link href="/tarifs" className="text-teal underline font-medium">
            Voir les tarifs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-6">Nouveau bon plan</h1>
        <DealForm merchantId={gate.merchantId} />
      </div>
    </main>
  );
}
