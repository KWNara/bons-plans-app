"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Deal = {
  id: string;
  titre: string;
  statut: "brouillon" | "publie" | "expire";
  date_fin: string | null;
};

function computeState(deal: Deal): "brouillon" | "actif" | "expire" {
  if (deal.statut === "brouillon") return "brouillon";
  if (deal.date_fin && new Date(deal.date_fin) <= new Date()) return "expire";
  return "actif";
}

export default function MesBonsPlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/connexion");
        return;
      }

      const { data: merchant } = await supabase
        .from("merchant_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!merchant) {
        router.push("/compte");
        return;
      }

      setMerchantId(merchant.id);

      const { data } = await supabase
        .from("deals")
        .select("id, titre, statut, date_fin")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false });

      setDeals(data ?? []);
      setLoading(false);
    }

    load();
  }, [router]);

  async function handleDelete(id: string) {
    await supabase.from("deals").delete().eq("id", id);
    setDeals((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  const actifs = deals.filter((d) => computeState(d) === "actif");
  const brouillons = deals.filter((d) => computeState(d) === "brouillon");
  const expires = deals.filter((d) => computeState(d) === "expire");

  function renderGroup(title: string, items: Deal[]) {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <p className="text-sm text-ink/60 mb-2">
          {title} ({items.length})
        </p>
        <ul className="space-y-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded border border-ink/10 px-3 py-2"
            >
              <span>{d.titre}</span>
              <span className="flex gap-3 text-sm">
                <Link href={`/bons-plans/${d.id}/modifier`} className="text-teal underline">
                  Modifier
                </Link>
                <button onClick={() => handleDelete(d.id)} className="text-tag">
                  Supprimer
                </button>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Mes bons plans</h1>
          <Link href="/bons-plans/nouveau" className="text-sm text-teal underline">
            + Nouveau
          </Link>
        </div>

        {deals.length === 0 && (
          <p className="text-ink/60">Tu n&apos;as pas encore publié de bon plan.</p>
        )}

        {renderGroup("Actifs", actifs)}
        {renderGroup("Brouillons", brouillons)}
        {renderGroup("Expirés", expires)}
      </div>
    </main>
  );
}
