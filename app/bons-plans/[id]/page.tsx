"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { discountLabel, formatTimeRemaining } from "@/lib/dealFormat";
import { useCurrentUserId } from "@/lib/useCurrentUserId";
import { LikeButton } from "@/components/LikeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RepostButton } from "@/components/RepostButton";
import { CommentSection } from "@/components/CommentSection";

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

export default function BonPlanDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = useCurrentUserId();
  const [state, setState] = useState<"loading" | "not-found" | "ready">("loading");
  const [deal, setDeal] = useState<Detail | null>(null);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [reposted, setReposted] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("deals")
        .select(
          "id, titre, description, photos, prix_avant, prix_apres, reduction_pourcentage, date_debut, date_fin, stock_limite, likes_count, comments_count, reposts_count, merchant_profiles(id, nom_enseigne, logo_url, description), categories(nom), deal_cities(cities(nom, code_postal))"
        )
        .eq("id", params.id)
        .single();

      if (!data) {
        setState("not-found");
        return;
      }

      setDeal(data as unknown as Detail);
      setState("ready");
    }

    load();
  }, [params.id]);

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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-ink/60">Chargement...</p>
      </main>
    );
  }

  if (state === "not-found" || !deal) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-ink/60 mb-4">Ce bon plan n&apos;existe pas ou a expiré.</p>
          <Link href="/" className="text-teal underline">
            Retour au fil
          </Link>
        </div>
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
        <Link href="/" className="inline-block px-4 pt-4 text-sm text-teal underline">
          ← Retour au fil
        </Link>

        <div className="px-4 mt-3 space-y-2">
          {deal.photos.length > 0 ? (
            deal.photos.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt={deal.titre} className="w-full rounded-2xl object-cover" />
              </div>
            ))
          ) : (
            <div className="w-full h-56 bg-ink/5 rounded-2xl" />
          )}
        </div>

        <div className="px-4 mt-4">
          {badge && (
            <span className="inline-block bg-tag text-white text-sm font-bold px-3 py-1 rounded-full mb-2">
              {badge}
            </span>
          )}

          {deal.merchant_profiles && (
            <Link
              href={`/commercant/${deal.merchant_profiles.id}`}
              className="block text-xs font-semibold text-teal uppercase tracking-wide"
            >
              {deal.merchant_profiles.nom_enseigne}
            </Link>
          )}
          <h1 className="text-2xl font-bold text-ink mt-1 mb-3">{deal.titre}</h1>

          {(deal.prix_avant || deal.prix_apres) && (
            <p className="mb-3">
              {deal.prix_avant && (
                <span className="line-through text-ink/40 mr-2">{deal.prix_avant} €</span>
              )}
              {deal.prix_apres && <span className="font-bold text-ink">{deal.prix_apres} €</span>}
            </p>
          )}

          {deal.description && <p className="text-ink/80 mb-4 whitespace-pre-line">{deal.description}</p>}

          <div className="flex flex-wrap gap-2 text-sm text-ink/60 mb-4">
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
          </div>

          <div
            key={`${liked}:${favorited}:${reposted}`}
            className="flex items-center gap-4 text-ink/60 mb-2"
          >
            <LikeButton dealId={deal.id} userId={userId} initialLiked={liked} initialCount={deal.likes_count} />
            <RepostButton
              dealId={deal.id}
              userId={userId}
              initialReposted={reposted}
              initialCount={deal.reposts_count}
              allowComment
            />
            <FavoriteButton
              dealId={deal.id}
              userId={userId}
              initialFavorited={favorited}
              className="ml-auto flex items-center gap-1 text-sm"
            />
            <span className="text-sm text-ink/50">{formatTimeRemaining(deal.date_fin)}</span>
          </div>

          {deal.stock_limite !== null && (
            <p className="text-sm text-marigold mb-4">Stock limité : {deal.stock_limite} restant(s)</p>
          )}

          {deal.merchant_profiles?.description && (
            <div className="mt-6 rounded-xl border border-ink/10 bg-white/60 p-4">
              <p className="text-sm text-ink/60 mb-1">À propos de {deal.merchant_profiles.nom_enseigne}</p>
              <p className="text-ink/80 text-sm">{deal.merchant_profiles.description}</p>
            </div>
          )}

          <CommentSection dealId={deal.id} userId={userId} />
        </div>
      </div>
    </main>
  );
}
