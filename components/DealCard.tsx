import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { discountLabel, formatTimeRemaining } from "@/lib/dealFormat";
import { LikeButton } from "@/components/LikeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RepostButton } from "@/components/RepostButton";

export type FeedDeal = {
  id: string;
  titre: string;
  photos: string[];
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
  date_fin: string | null;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  category_id: string | null;
  merchant_profiles: { id: string; nom_enseigne: string } | null;
};

type Props = {
  deal: FeedDeal;
  villeLabel: string;
  userId: string | null | undefined;
  liked: boolean;
  favorited: boolean;
  reposted: boolean;
};

export function DealCard({ deal, villeLabel, userId, liked, favorited, reposted }: Props) {
  const badge = discountLabel(deal);

  return (
    <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-ink/5 h-full">
      <div className="relative">
        <Link href={`/bons-plans/${deal.id}`}>
          {deal.photos[0] ? (
            <img src={deal.photos[0]} alt={deal.titre} className="w-full h-40 object-cover" />
          ) : (
            <div className="w-full h-40 bg-ink/5" />
          )}
          {badge && (
            <div className="absolute top-3 left-0 bg-tag text-white text-sm font-bold px-3 py-1 rounded-r-full shadow">
              {badge}
            </div>
          )}
        </Link>
        <FavoriteButton
          dealId={deal.id}
          userId={userId}
          initialFavorited={favorited}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2 rounded-full"
        />
      </div>

      <Link href={`/bons-plans/${deal.id}`}>
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-teal uppercase tracking-wide">
              {deal.merchant_profiles?.nom_enseigne}
            </span>
            <span className="text-xs text-ink/50">{formatTimeRemaining(deal.date_fin)}</span>
          </div>
          <h3 className="font-bold text-ink leading-snug mb-1">{deal.titre}</h3>
          <p className="text-xs text-ink/50 mb-1">{villeLabel}</p>
        </div>
      </Link>

      <div className="px-4 pb-4 flex items-center gap-4 text-ink/60">
        <LikeButton dealId={deal.id} userId={userId} initialLiked={liked} initialCount={deal.likes_count} />
        <Link href={`/bons-plans/${deal.id}`} className="flex items-center gap-1 text-sm">
          <MessageCircle size={18} />
          {deal.comments_count}
        </Link>
        <RepostButton
          dealId={deal.id}
          userId={userId}
          initialReposted={reposted}
          initialCount={deal.reposts_count}
        />
      </div>
    </article>
  );
}
