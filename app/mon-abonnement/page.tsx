"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Crown, CalendarClock, CreditCard, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";

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

  const isPro = merchant?.plan === "payant";

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

        <h1 className="text-2xl font-extrabold text-ink mb-5">Mon abonnement</h1>

        {loading ? (
          <>
            <Skeleton className="h-32 w-full rounded-card mb-4" />
            <Skeleton className="h-11 w-full rounded-control" />
          </>
        ) : (
          <>
            <div
              className={`rounded-card p-5 mb-4 shadow-soft ${
                isPro ? "bg-gradient-to-br from-ink to-ink/85 text-white" : "bg-white border border-ink/8"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isPro && <Crown size={16} className="text-marigold" />}
                <p className={`text-xs font-semibold uppercase tracking-wide ${isPro ? "text-white/60" : "text-ink/45"}`}>
                  Plan actuel
                </p>
              </div>
              <p className={`text-xl font-extrabold mb-3 ${isPro ? "text-white" : "text-ink"}`}>
                {isPro ? "Pro · illimité" : "Gratuit"}
              </p>
              {!isPro && (
                <p className="text-sm text-ink/50 mb-1">Jusqu&apos;à 3 bons plans actifs simultanément.</p>
              )}

              {isPro && merchant?.subscription_current_period_end && (
                <p className="flex items-center gap-1.5 text-sm text-white/70">
                  <CalendarClock size={14} />
                  Renouvellement le{" "}
                  {new Date(merchant.subscription_current_period_end).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}

              {merchant?.stripe_subscription_status && merchant.stripe_subscription_status !== "active" && (
                <p className="flex items-center gap-1.5 text-sm text-tag mt-2 bg-tag/10 rounded-control px-2.5 py-1.5 w-fit">
                  <AlertCircle size={14} />
                  Statut Stripe : {merchant.stripe_subscription_status}
                </p>
              )}
            </div>

            {error && <p className="text-tag text-sm mb-3">{error}</p>}

            {isPro ? (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="press w-full flex items-center justify-center gap-2 rounded-control border border-ink/15 bg-white text-ink py-3 font-semibold shadow-soft disabled:opacity-50"
              >
                <CreditCard size={16} />
                {portalLoading ? "..." : "Gérer / annuler mon abonnement"}
              </button>
            ) : (
              <Link
                href="/tarifs"
                className="press flex items-center justify-center gap-2 w-full rounded-control bg-teal text-white py-3 font-semibold shadow-soft"
              >
                <Crown size={16} />
                Passer en Pro
              </Link>
            )}
          </>
        )}
      </div>
    </main>
  );
}
