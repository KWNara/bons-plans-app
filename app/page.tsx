"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCity } from "@/lib/cityContext";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { DealCard, type FeedDeal } from "@/components/DealCard";

type Category = { id: string; nom: string };
type Sort = "recent" | "popularite" | "expire_bientot";
type Tab = "ville" | "pourtoi";

export default function Home() {
  const { selectedCity, loaded } = useCity();
  const userId = useCurrentUserId();
  const [tab, setTab] = useState<Tab>("ville");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const [deals, setDeals] = useState<FeedDeal[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [followedMerchantIds, setFollowedMerchantIds] = useState<Set<string>>(new Set());
  const [topCategoryIds, setTopCategoryIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, nom")
      .order("nom")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .then(({ count }) => setUnreadCount(count ?? 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setFollowedMerchantIds(new Set());
      setTopCategoryIds(new Set());
      return;
    }

    supabase
      .from("follows")
      .select("followed_merchant_id")
      .eq("follower_id", userId)
      .not("followed_merchant_id", "is", null)
      .then(({ data }) => {
        setFollowedMerchantIds(new Set((data ?? []).map((f) => f.followed_merchant_id as string)));
      });

    supabase
      .from("likes")
      .select("deals:deal_id (category_id)")
      .eq("user_id", userId)
      .then(({ data }) => {
        const counts = new Map<string, number>();
        for (const row of (data as unknown as { deals: { category_id: string | null } | null }[]) ?? []) {
          const catId = row.deals?.category_id;
          if (!catId) continue;
          counts.set(catId, (counts.get(catId) ?? 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
        setTopCategoryIds(new Set(top));
      });
  }, [userId]);

  useEffect(() => {
    if (!selectedCity) {
      setDeals([]);
      return;
    }

    setFeedLoading(true);

    let query = supabase
      .from("deals")
      .select(
        "id, titre, photos, prix_avant, prix_apres, reduction_pourcentage, date_fin, likes_count, comments_count, reposts_count, category_id, created_at, merchant_profiles(id, nom_enseigne), deal_cities!inner(city_id)"
      )
      .eq("statut", "publie")
      .eq("deal_cities.city_id", selectedCity.id)
      .or(`date_fin.is.null,date_fin.gt.${new Date().toISOString()}`);

    if (categoryId) query = query.eq("category_id", categoryId);

    if (sort === "recent") query = query.order("created_at", { ascending: false });
    else if (sort === "popularite") query = query.order("likes_count", { ascending: false });
    else query = query.order("date_fin", { ascending: true, nullsFirst: false });

    query.then(async ({ data }) => {
      const feedDeals = (data as unknown as FeedDeal[]) ?? [];
      setDeals(feedDeals);
      setFeedLoading(false);

      if (userId && feedDeals.length > 0) {
        const dealIds = feedDeals.map((d) => d.id);
        const [{ data: likes }, { data: favorites }, { data: reposts }] = await Promise.all([
          supabase.from("likes").select("deal_id").eq("user_id", userId).in("deal_id", dealIds),
          supabase.from("favorites").select("deal_id").eq("user_id", userId).in("deal_id", dealIds),
          supabase.from("reposts").select("deal_id").eq("user_id", userId).in("deal_id", dealIds),
        ]);
        setLikedIds(new Set((likes ?? []).map((l) => l.deal_id)));
        setFavoritedIds(new Set((favorites ?? []).map((f) => f.deal_id)));
        setRepostedIds(new Set((reposts ?? []).map((r) => r.deal_id)));
      } else {
        setLikedIds(new Set());
        setFavoritedIds(new Set());
        setRepostedIds(new Set());
      }
    });
  }, [selectedCity, categoryId, sort, userId]);

  const displayedDeals = useMemo(() => {
    if (tab === "ville") return deals;

    // "Pour toi" : priorise commerçants suivis, puis catégories les plus
    // likées. Sans historique (nouvel utilisateur), le score est nul pour
    // tous les bons plans et on retombe naturellement sur l'ordre du fil Ville.
    function score(d: FeedDeal): number {
      if (d.merchant_profiles && followedMerchantIds.has(d.merchant_profiles.id)) return 2;
      if (d.category_id && topCategoryIds.has(d.category_id)) return 1;
      return 0;
    }

    return [...deals].sort((a, b) => score(b) - score(a));
  }, [tab, deals, followedMerchantIds, topCategoryIds]);

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-paper font-sans">
      <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur border-b border-ink/10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <Link href="/ville" className="flex items-center gap-1 text-ink font-bold text-lg">
            <MapPin size={18} className="text-tag" />
            {selectedCity ? selectedCity.nom : "Choisir une ville"}
            <ChevronDown size={16} />
          </Link>
          <nav className="flex items-center gap-4 text-sm text-ink/70">
            <Link href="/alertes" className="underline">
              Mes alertes
            </Link>
            <Link href="/notifications" className="relative">
              <Bell size={20} className="text-ink" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-tag text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link href="/compte" className="underline">
              Mon compte
            </Link>
          </nav>
        </div>

        <div className="flex gap-6 border-b border-ink/10">
          <button
            onClick={() => setTab("ville")}
            className={`pb-2 text-sm font-semibold ${
              tab === "ville" ? "text-ink border-b-2 border-marigold" : "text-ink/40"
            }`}
          >
            Fil Ville
          </button>
          <button
            onClick={() => setTab("pourtoi")}
            className={`pb-2 text-sm font-semibold ${
              tab === "pourtoi" ? "text-ink border-b-2 border-marigold" : "text-ink/40"
            }`}
          >
            Pour toi
          </button>
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

        {selectedCity && !feedLoading && displayedDeals.length === 0 && (
          <p className="text-ink/50 text-sm col-span-full text-center py-10">
            Aucun bon plan dans cette catégorie pour l&apos;instant.
          </p>
        )}

        {selectedCity &&
          displayedDeals.map((deal) => (
            <DealCard
              key={`${deal.id}:${likedIds.has(deal.id)}:${favoritedIds.has(deal.id)}:${repostedIds.has(deal.id)}`}
              deal={deal}
              villeLabel={selectedCity.nom}
              userId={userId}
              liked={likedIds.has(deal.id)}
              favorited={favoritedIds.has(deal.id)}
              reposted={repostedIds.has(deal.id)}
            />
          ))}
      </main>
    </div>
  );
}
