"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function TarifsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-ink text-center mb-2">Tarifs commerçants</h1>
        <p className="text-ink/60 text-center mb-10">
          Publie tes bons plans gratuitement, ou passe en illimité.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-ink/10 bg-white/60 p-6">
            <h2 className="text-xl font-bold text-ink mb-1">Gratuit</h2>
            <p className="text-3xl font-bold text-ink mb-4">
              0 € <span className="text-sm font-normal text-ink/50">/mois</span>
            </p>
            <ul className="space-y-2 text-sm text-ink/70">
              <li className="flex items-center gap-2">
                <Check size={16} className="text-teal" /> Jusqu&apos;à 3 bons plans actifs
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} className="text-teal" /> Profil et vitrine commerçant
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} className="text-teal" /> Suivi et notifications
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border-2 border-marigold bg-white p-6 relative">
            <span className="absolute -top-3 left-6 bg-marigold text-ink text-xs font-bold px-3 py-1 rounded-full">
              Recommandé
            </span>
            <h2 className="text-xl font-bold text-ink mb-1">Pro</h2>
            <p className="text-3xl font-bold text-ink mb-4">
              14,90 € <span className="text-sm font-normal text-ink/50">/mois</span>
            </p>
            <ul className="space-y-2 text-sm text-ink/70 mb-6">
              <li className="flex items-center gap-2">
                <Check size={16} className="text-teal" /> Bons plans <strong>illimités</strong>
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} className="text-teal" /> Profil et vitrine commerçant
              </li>
              <li className="flex items-center gap-2">
                <Check size={16} className="text-teal" /> Suivi et notifications
              </li>
            </ul>

            {error && <p className="text-tag text-sm mb-3">{error}</p>}

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded bg-teal text-white py-2 font-medium disabled:opacity-50"
            >
              {loading ? "..." : "S'abonner"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
