"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Merchant = {
  plan: "gratuit" | "payant";
  stripe_customer_id: string | null;
  stripe_subscription_status: string | null;
  subscription_current_period_end: string | null;
};

export default function MonAbonnementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data } = await supabase
        .from("merchant_profiles")
        .select("plan, stripe_customer_id, stripe_subscription_status, subscription_current_period_end")
        .eq("user_id", user.id)
        .single();

      if (!data) {
        router.push("/compte");
        return;
      }

      setMerchant(data);
      setLoading(false);
    }

    load();
  }, [router]);

  async function handlePortal() {
    setError(null);
    setPortalLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${session!.access_token}` },
    });
    const body = await res.json();

    setPortalLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Une erreur est survenue.");
      return;
    }

    window.location.href = body.url;
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-6">Mon abonnement</h1>

        <div className="rounded border border-ink/10 bg-white/50 p-4 mb-4">
          <p className="text-sm text-ink/60">Plan actuel</p>
          <p className="font-medium text-lg mb-3">
            {merchant?.plan === "payant" ? (
              <span className="text-teal">Pro (illimité)</span>
            ) : (
              "Gratuit (3 annonces actives max)"
            )}
          </p>

          {merchant?.plan === "payant" && merchant.subscription_current_period_end && (
            <>
              <p className="text-sm text-ink/60">Prochain renouvellement</p>
              <p className="font-medium mb-3">
                {new Date(merchant.subscription_current_period_end).toLocaleDateString("fr-FR")}
              </p>
            </>
          )}

          {merchant?.stripe_subscription_status && merchant.stripe_subscription_status !== "active" && (
            <p className="text-tag text-sm">Statut Stripe : {merchant.stripe_subscription_status}</p>
          )}
        </div>

        {error && <p className="text-tag text-sm mb-3">{error}</p>}

        {merchant?.plan === "payant" ? (
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="w-full rounded border border-teal text-teal py-2 font-medium disabled:opacity-50"
          >
            {portalLoading ? "..." : "Gérer / annuler mon abonnement"}
          </button>
        ) : (
          <Link
            href="/tarifs"
            className="block text-center w-full rounded bg-teal text-white py-2 font-medium"
          >
            Passer en Pro
          </Link>
        )}
      </div>
    </main>
  );
}
