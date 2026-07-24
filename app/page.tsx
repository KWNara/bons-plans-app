"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCity } from "@/lib/cityContext";
import { DealCard, type FeedDeal } from "@/components/DealCard";

type Category = { id: string; nom: string };
type Sort = "recent" | "popularite" | "expire_bientot";

export default function Home() {
  const { selectedCity, loaded } = useCity();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const [deals, setDeals] = useState<FeedDeal[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, nom")
      .order("nom")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setDeals([]);
      return;
    }

    setFeedLoading(true);

    let query = supabase
      .from("deals")
      .select(
        "id, titre, photos, prix_avant, prix_apres, reduction_pourcentage, date_fin, likes_count, comments_count, created_at, merchant_profiles(nom_enseigne), deal_cities!inner(city_id)"
      )
      .eq("statut", "publie")
      .eq("deal_cities.city_id", selectedCity.id)
      .or(`date_fin.is.null,date_fin.gt.${new Date().toISOString()}`);

    if (categoryId) query = query.eq("category_id", categoryId);

    if (sort === "recent") query = query.order("created_at", { ascending: false });
    else if (sort === "popularite") query = query.order("likes_count", { ascending: false });
    else query = query.order("date_fin", { ascending: true, nullsFirst: false });

    query.then(({ data }) => {
      setDeals((data as unknown as FeedDeal[]) ?? []);
      setFeedLoading(false);
    });
  }, [selectedCity, categoryId, sort]);

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-paper font-sans">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur border-b border-ink/10 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <Link href="/ville" className="flex items-center gap-1 text-ink font-bold text-lg">
            <MapPin size={18} className="text-tag" />
            {selectedCity ? selectedCity.nom : "Choisir une ville"}
            <ChevronDown size={16} />
          </Link>
          <nav className="flex items-center gap-3 text-sm text-ink/70">
            <Link href="/compte" className="underline">
              Mon compte
            </Link>
          </nav>
        </div>
      </header>

      {selectedCity && (
        <>
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            <button
              onClick={() => setCategoryId(null)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border ${
                categoryId === null
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink/70 border-ink/10"
              }`}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium border ${
                  categoryId === c.id
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink/70 border-ink/10"
                }`}
              >
                {c.nom}
              </button>
            ))}
          </div>

          <div className="px-4 pb-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded border border-ink/20 px-2 py-1 text-sm bg-white"
            >
              <option value="recent">Plus récents</option>
              <option value="popularite">Popularité</option>
              <option value="expire_bientot">Expire bientôt</option>
            </select>
          </div>
        </>
      )}

      <main className="px-4 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {!selectedCity && (
          <div className="col-span-full text-center py-16">
            <p className="text-ink/60 mb-4">Choisis une ville pour découvrir les bons plans autour de toi.</p>
            <Link href="/ville" className="text-teal underline font-medium">
              Choisir une ville
            </Link>
          </div>
        )}

        {selectedCity && !feedLoading && deals.length === 0 && (
          <p className="text-ink/50 text-sm col-span-full text-center py-10">
            Aucun bon plan dans cette catégorie pour l&apos;instant.
          </p>
        )}

        {selectedCity &&
          deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} villeLabel={selectedCity.nom} />
          ))}
      </main>
    </div>
  );
}
