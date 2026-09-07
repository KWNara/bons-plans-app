"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, ChevronDown, Bell, UserRound, BellPlus, MapPinOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCity } from "@/lib/cityContext";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { DealCard, type FeedDeal } from "@/components/DealCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { DealCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type Category = { id: string; nom: string; icone: string | null };
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
  const [feedError, setFeedError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [followedMerchantIds, setFollowedMerchantIds] = useState<Set<string>>(new Set());
  const [topCategoryIds, setTopCategoryIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);

  const categoryIcones = useMemo(
    () => new Map(categories.map((c) => [c.id, c.icone])),
    [categories]
  );

  // Le changement d'onglet remonte les cartes, qui repartent alors des données
  // du dernier chargement : il faut donc répercuter ici l'état ET le compteur,
  // sinon un like tout juste posé se réaffiche à zéro.
  const rememberInteraction = useCallback(
    (kind: "like" | "favorite" | "repost", dealId: string, active: boolean) => {
      const setter =
        kind === "like" ? setLikedIds : kind === "favorite" ? setFavoritedIds : setRepostedIds;

      setter((previous) => {
        const next = new Set(previous);
        if (active) next.add(dealId);
        else next.delete(dealId);
        return next;
      });

      if (kind === "favorite") return;

      const field = kind === "like" ? "likes_count" : "reposts_count";
      setDeals((previous) =>
        previous.map((deal) =>
          deal.id === dealId
            ? { ...deal, [field]: Math.max(0, deal[field] + (active ? 1 : -1)) }
            : deal
        )
      );
    },
    []
  );

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, nom, icone")
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
    setFeedError(false);

    // Deux filtres enchaînés rapidement partent en parallèle et rien ne
    // garantit l'ordre des réponses : sans ce drapeau, la plus lente (donc la
    // plus ancienne) écrase la plus récente et le fil ne correspond plus au
    // filtre affiché.
    let stale = false;

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

    query.then(async ({ data, error }) => {
      if (stale) return;

      if (error) {
        setFeedError(true);
        setFeedLoading(false);
        return;
      }

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

        if (stale) return;

        setLikedIds(new Set((likes ?? []).map((l) => l.deal_id)));
        setFavoritedIds(new Set((favorites ?? []).map((f) => f.deal_id)));
        setRepostedIds(new Set((reposts ?? []).map((r) => r.deal_id)));
      } else {
        setLikedIds(new Set());
        setFavoritedIds(new Set());
        setRepostedIds(new Set());
      }
    });

    return () => {
      stale = true;
    };
  }, [selectedCity, categoryId, sort, userId, reloadTick]);

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
          <Link
            href="/ville"
            className="press flex items-center gap-1 text-ink font-extrabold text-lg -ml-1.5 pl-1.5 pr-2 py-1 rounded-control hover:bg-ink/5"
          >
            <MapPin size={18} className="text-tag shrink-0" />
            <span className="truncate max-w-[40vw]">{selectedCity ? selectedCity.nom : "Choisir une ville"}</span>
            <ChevronDown size={16} className="text-ink/60 shrink-0" />
          </Link>
          <nav className="flex items-center gap-1 text-ink/70">
            <Link
              href="/alertes"
              aria-label="Mes alertes"
              className="press p-2 rounded-full hover:bg-ink/5"
            >
              <BellPlus size={20} />
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="press relative p-2 rounded-full hover:bg-ink/5"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-tag text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="press p-2 rounded-full hover:bg-ink/5"
            >
              <UserRound size={20} />
            </Link>
          </nav>
        </div>

        {/* Le soulignement est porté par l'onglet lui-même : la version
            précédente positionnait la barre avec des pixels codés en dur, qui
            se décalaient dès que la taille de police changeait. */}
        <div role="tablist" aria-label="Type de fil" className="flex gap-6 border-b border-ink/10">
          {(
            [
              { value: "ville", label: "Fil Ville" },
              { value: "pourtoi", label: "Pour toi" },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`press relative pt-1 pb-3 text-sm font-semibold transition-colors ${
                tab === value ? "text-ink" : "text-ink/60 hover:text-ink"
              }`}
            >
              {label}
              <span
                className={`absolute inset-x-0 -bottom-px h-[2.5px] rounded-full transition-opacity duration-200 ${
                  tab === value ? "bg-marigold opacity-100" : "opacity-0"
                }`}
              />
            </button>
          ))}
        </div>
      </header>

      {selectedCity && (
        <>
          <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
            <button
              onClick={() => setCategoryId(null)}
              className={`press whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                categoryId === null
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink/70 border-ink/10 hover:border-ink/25"
              }`}
            >
              Tout
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`press flex items-center gap-1.5 whitespace-nowrap pl-1.5 pr-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  categoryId === c.id
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink/70 border-ink/10 hover:border-ink/25"
                }`}
              >
                <CategoryIcon
                  icone={c.icone}
                  size={11}
                  className={`w-5 h-5 ${categoryId === c.id ? "!bg-white/20 [&_svg]:!text-white" : ""}`}
                />
                {c.nom}
              </button>
            ))}
          </div>

          <div className="px-4 pb-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-control border border-ink/15 px-3 py-1.5 text-sm bg-white text-ink font-medium"
            >
              <option value="recent">Plus récents</option>
              <option value="popularite">Popularité</option>
              <option value="expire_bientot">Expire bientôt</option>
            </select>
          </div>
        </>
      )}

      <main
        key={tab}
        className="animate-fade-in px-4 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto"
      >
        {!selectedCity && (
          <EmptyState
            icon={MapPinOff}
            title="Choisis une ville"
            description="Découvre les bons plans des commerçants autour de toi."
            action={
              <Link
                href="/ville"
                className="press inline-block rounded-control bg-teal text-white px-5 py-2.5 text-sm font-semibold shadow-soft"
              >
                Choisir une ville
              </Link>
            }
          />
        )}

        {selectedCity && feedLoading && (
          <>
            <DealCardSkeleton />
            <DealCardSkeleton />
            <DealCardSkeleton />
            <DealCardSkeleton />
          </>
        )}

        {selectedCity && !feedLoading && feedError && (
          <ErrorState
            title="Le fil n'a pas pu être chargé"
            description="Vérifie ta connexion internet et réessaie."
            onRetry={() => setReloadTick((t) => t + 1)}
          />
        )}

        {selectedCity && !feedLoading && !feedError && displayedDeals.length === 0 && (
          <EmptyState
            title="Aucun bon plan pour l'instant"
            description={
              categoryId
                ? "Essaie une autre catégorie, ou reviens bientôt."
                : "Reviens bientôt, ou suis un commerçant pour être prévenu à sa prochaine publication."
            }
          />
        )}

        {selectedCity &&
          !feedLoading &&
          !feedError &&
          displayedDeals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              villeLabel={selectedCity.nom}
              userId={userId}
              liked={likedIds.has(deal.id)}
              favorited={favoritedIds.has(deal.id)}
              reposted={repostedIds.has(deal.id)}
              categoryIcone={deal.category_id ? categoryIcones.get(deal.category_id) : null}
              onInteraction={(kind, active) => rememberInteraction(kind, deal.id, active)}
            />
          ))}
      </main>
    </div>
  );
}
