"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Sparkles, Store, Bell, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui/Spinner";

type Plan = "gratuit" | "payant" | null;

const FEATURES_FREE = [
  { icon: Check, label: "Jusqu'à 3 bons plans actifs" },
  { icon: Store, label: "Profil et vitrine commerçant" },
  { icon: Bell, label: "Suivi et notifications" },
];

const FEATURES_PRO = [
  { icon: InfinityIcon, label: "Bons plans illimités" },
  { icon: Store, label: "Profil et vitrine commerçant" },
  { icon: Bell, label: "Suivi et notifications" },
];

export default function TarifsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("merchant_profiles")
        .select("plan")
        .eq("user_id", user.id)
        .maybeSingle();
      setCurrentPlan((data?.plan as Plan) ?? null);
    });
  }, []);

  async function handleSubscribe() {
    setError(null);
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/connexion");
      return;
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const body = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(body.error ?? "Une erreur est survenue.");
      return;
    }

    window.location.href = body.url;
  }

  return (
    <main className="min-h-screen bg-paper px-4 pt-4 pb-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="press inline-flex items-center justify-center w-9 h-9 -ml-1.5 mb-3 rounded-full hover:bg-white"
          aria-label="Retour"
        >
          <ChevronLeft size={20} className="text-ink" />
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-ink mb-2">Tarifs commerçants</h1>
          <p className="text-ink/55">Publie tes bons plans gratuitement, ou passe en illimité.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-card border border-ink/10 bg-white p-6 flex flex-col">
            <h2 className="text-lg font-bold text-ink mb-1">Gratuit</h2>
            <p className="text-3xl font-extrabold text-ink mb-5">
              0 € <span className="text-sm font-normal text-ink/45">/mois</span>
            </p>
            <ul className="space-y-3 text-sm text-ink/70 mb-6 flex-1">
              {FEATURES_FREE.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
                    <f.icon size={12} className="text-ink/60" />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>
            {currentPlan === "gratuit" && (
              <span className="text-center text-xs font-semibold text-ink/45 uppercase tracking-wide py-2.5">
                Ton plan actuel
              </span>
            )}
          </div>

          <div className="relative rounded-card border-2 border-marigold bg-white p-6 flex flex-col shadow-raised">
            <span className="absolute -top-3 left-6 bg-marigold text-ink text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles size={11} /> Recommandé
            </span>
            <h2 className="text-lg font-bold text-ink mb-1">Pro</h2>
            <p className="text-3xl font-extrabold text-ink mb-5">
              14,90 € <span className="text-sm font-normal text-ink/45">/mois</span>
            </p>
            <ul className="space-y-3 text-sm text-ink/70 mb-6 flex-1">
              {FEATURES_PRO.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-teal/10 flex items-center justify-center shrink-0">
                    <f.icon size={12} className="text-teal" />
                  </span>
                  {f.label.includes("illimités") ? (
                    <span>
                      Bons plans <strong className="text-ink">illimités</strong>
                    </span>
                  ) : (
                    f.label
                  )}
                </li>
              ))}
            </ul>

            {error && <p className="text-tag text-sm mb-3">{error}</p>}

            {currentPlan === "payant" ? (
              <Link
                href="/mon-abonnement"
                className="press text-center w-full rounded-control border border-teal text-teal py-3 font-semibold"
              >
                Gérer mon abonnement
              </Link>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="press w-full flex items-center justify-center gap-2 rounded-control bg-teal text-white py-3 font-semibold shadow-soft disabled:opacity-50"
              >
                {loading && <Spinner size={16} />}
                {loading ? "..." : "S'abonner"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
