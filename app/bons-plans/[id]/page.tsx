"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, ChevronLeft, ImageOff, PackageX, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { discountLabel, formatTimeRemaining } from "@/lib/dealFormat";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { LikeButton } from "@/components/LikeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RepostButton } from "@/components/RepostButton";
import { CommentSection } from "@/components/CommentSection";
import { ReportButton } from "@/components/ReportButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type Detail = {
  id: string;
  titre: string;
  description: string | null;
  photos: string[];
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  date_debut: string | null;
  date_fin: string | null;
  stock_limite: number | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  merchant_profiles: {
    id: string;
    nom_enseigne: string;
    logo_url: string | null;
    description: string | null;
  } | null;
  categories: { nom: string } | null;
  deal_cities: { cities: { nom: string; code_postal: string } | null }[];
};

function BackButton() {
  return (
    <Link
      href="/"
      aria-label="Retour au fil"
      className="press absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft"
    >
      <ChevronLeft size={20} className="text-ink" />
    </Link>
  );
}

export default function BonPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = useCurrentUserId();
  const [state, setState] = useState<"loading" | "not-found" | "error" | "ready">("loading");
  const [deal, setDeal] = useState<Detail | null>(null);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function load() {
    setState("loading");
    const { data, error } = await supabase
      .from("deals")
      .select(
        "id, titre, description, photos, prix_avant, prix_apres, reduction_pourcentage, date_debut, date_fin, stock_limite, likes_count, comments_count, reposts_count, merchant_profiles(id, nom_enseigne, logo_url, description), categories(nom), deal_cities(cities(nom, code_postal))"
      )
      .eq("id", params.id)
      .single();

    if (error) {
      setState(error.code === "PGRST116" ? "not-found" : "error");
      return;
    }

    setDeal(data as unknown as Detail);
    setState("ready");
  }

  useEffect(() => {
    if (!userId || !deal) return;

    Promise.all([
      supabase.from("likes").select("id").eq("user_id", userId).eq("deal_id", deal.id).maybeSingle(),
      supabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId)
        .eq("deal_id", deal.id)
        .maybeSingle(),
      supabase.from("reposts").select("id").eq("user_id", userId).eq("deal_id", deal.id).maybeSingle(),
    ]).then(([likeRes, favRes, repostRes]) => {
      setLiked(!!likeRes.data);
      setFavorited(!!favRes.data);
      setReposted(!!repostRes.data);
    });
  }, [userId, deal]);

  if (state === "loading") {
    return (
      <main className="min-h-screen bg-paper pb-16">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="w-full h-72 sm:h-96 rounded-none" />
          <div className="px-4 mt-4 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (state === "not-found") {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <EmptyState
          icon={PackageX}
          title="Ce bon plan n'existe pas ou a expiré"
          description="Il a peut-être été retiré par le commerçant."
          action={
            <Link href="/" className="press text-teal underline font-medium">
              Retour au fil
            </Link>
          }
        />
      </main>
    );
  }

  if (state === "error" || !deal) {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <ErrorState onRetry={load} />
      </main>
    );
  }

  const badge = discountLabel(deal);
  const villes = deal.deal_cities.map((dc) => dc.cities).filter(Boolean) as {
    nom: string;
    code_postal: string;
  }[];

  return (
    <main className="min-h-screen bg-paper pb-16">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <BackButton />
          {deal.photos.length > 0 ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
              {deal.photos.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={deal.titre}
                  className="w-full shrink-0 snap-center h-72 sm:h-96 object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-72 sm:h-96 bg-ink/5 flex items-center justify-center">
              <ImageOff size={32} className="text-ink/20" strokeWidth={1.5} />
            </div>
          )}
          {badge && (
            <div className="absolute bottom-0 left-0 bg-tag text-white text-base font-bold px-4 py-1.5 rounded-tr-2xl shadow-soft">
              {badge}
            </div>
          )}
          {deal.photos.length > 1 && (
            <span className="absolute top-4 right-4 bg-ink/60 backdrop-blur text-white text-xs font-medium px-2.5 py-1 rounded-full">
              {deal.photos.length} photos
            </span>
          )}
        </div>

        <div className="px-4 mt-5">
          {deal.merchant_profiles && (
            <Link
              href={`/commercant/${deal.merchant_profiles.id}`}
              className="press inline-flex items-center gap-2 -ml-1 pl-1 pr-2 py-1 rounded-control hover:bg-white"
            >
              {deal.merchant_profiles.logo_url ? (
                <img
                  src={deal.merchant_profiles.logo_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <span className="w-6 h-6 rounded-full bg-teal/15 flex items-center justify-center text-[10px] font-bold text-teal">
                  {deal.merchant_profiles.nom_enseigne[0]?.toUpperCase()}
                </span>
              )}
              <span className="text-xs font-semibold text-teal uppercase tracking-wide">
                {deal.merchant_profiles.nom_enseigne}
              </span>
            </Link>
          )}
          <h1 className="text-2xl font-extrabold text-ink mt-2 mb-2 leading-tight">{deal.titre}</h1>

          {(deal.prix_avant || deal.prix_apres) && (
            <p className="mb-3 flex items-baseline gap-2">
              {deal.prix_avant && (
                <span className="line-through text-ink/60 text-sm">{deal.prix_avant} €</span>
              )}
              {deal.prix_apres && <span className="font-extrabold text-ink text-xl">{deal.prix_apres} €</span>}
            </p>
          )}

          {deal.description && (
            <p className="text-ink/75 mb-4 whitespace-pre-line leading-relaxed">{deal.description}</p>
          )}

          <div className="flex flex-wrap gap-2 text-sm text-ink/60 mb-5">
            {deal.categories && (
              <span className="rounded-full bg-white border border-ink/10 px-3 py-1">
                {deal.categories.nom}
              </span>
            )}
            {villes.map((v) => (
              <span
                key={v.nom + v.code_postal}
                className="rounded-full bg-white border border-ink/10 px-3 py-1 flex items-center gap-1"
              >
                <MapPin size={14} /> {v.nom}
              </span>
            ))}
            {deal.stock_limite !== null && (
              <span className="rounded-full bg-marigold/20 text-marigold font-medium px-3 py-1">
                {deal.stock_limite} en stock
              </span>
            )}
          </div>

          <div
            key={`${liked}:${favorited}:${reposted}`}
            className="flex items-center gap-1 text-ink/60 py-3 border-y border-ink/10"
          >
            <LikeButton dealId={deal.id} userId={userId} initialLiked={liked} initialCount={deal.likes_count} />
            <a
              href="#commentaires"
              className="press flex items-center gap-1.5 text-sm -m-1.5 p-1.5 ml-2 rounded-full hover:bg-ink/5"
            >
              <MessageCircle size={18} />
              {deal.comments_count}
            </a>
            <span className="ml-2">
              <RepostButton
                dealId={deal.id}
                userId={userId}
                initialReposted={reposted}
                initialCount={deal.reposts_count}
                allowComment
              />
            </span>
            <span className="ml-auto flex items-center gap-3">
              <ReportButton targetType="deal" targetId={deal.id} userId={userId} iconOnly className="press p-1.5 -m-1.5 rounded-full text-ink/60 hover:text-tag hover:bg-tag/5" />
              <FavoriteButton
                dealId={deal.id}
                userId={userId}
                initialFavorited={favorited}
                className="press p-1.5 -m-1.5 rounded-full hover:bg-ink/5"
              />
            </span>
          </div>

          <p className="text-xs text-ink/60 mt-2">{formatTimeRemaining(deal.date_fin)}</p>

          {deal.merchant_profiles?.description && (
            <div className="mt-6 rounded-card border border-ink/10 bg-white/60 p-4">
              <p className="text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5">
                À propos de {deal.merchant_profiles.nom_enseigne}
              </p>
              <p className="text-ink/75 text-sm leading-relaxed">{deal.merchant_profiles.description}</p>
            </div>
          )}

          <div id="commentaires">
            <CommentSection dealId={deal.id} userId={userId} />
          </div>
        </div>
      </div>
    </main>
  );
}
