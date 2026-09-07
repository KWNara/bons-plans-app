import Link from "next/link";
import { MessageCircle, ImageOff } from "lucide-react";
import { discountLabel, formatTimeRemaining } from "@/lib/dealFormat";
import { LikeButton } from "@/components/LikeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RepostButton } from "@/components/RepostButton";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

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
  categoryIcone?: string | null;
  onInteraction?: (kind: "like" | "favorite" | "repost", active: boolean) => void;
};

export function DealCard({
  deal,
  villeLabel,
  userId,
  liked,
  favorited,
  reposted,
  categoryIcone,
  onInteraction,
}: Props) {
  const badge = discountLabel(deal);

  return (
    <article className="group bg-white rounded-card overflow-hidden shadow-soft border border-ink/5 h-full transition-shadow duration-200 hover:shadow-raised">
      <div className="relative">
        <Link href={`/bons-plans/${deal.id}`} className="block">
          {deal.photos[0] ? (
            <img
              src={deal.photos[0]}
              alt={deal.titre}
              className="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-40 bg-ink/5 flex items-center justify-center">
              <ImageOff size={22} className="text-ink/20" strokeWidth={1.5} />
            </div>
          )}
          {badge && (
            <div className="absolute top-3 left-0 bg-tag text-white text-sm font-bold px-3 py-1 rounded-r-full shadow-soft">
              {badge}
            </div>
          )}
        </Link>
        <FavoriteButton
          dealId={deal.id}
          userId={userId}
          initialFavorited={favorited}
          onToggled={(active) => onInteraction?.("favorite", active)}
          className="absolute top-3 right-3 bg-white/90 backdrop-blur p-2.5 rounded-full shadow-soft hover:bg-white"
        />
      </div>

      <Link href={`/bons-plans/${deal.id}`} className="block">
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              {categoryIcone && <CategoryIcon icone={categoryIcone} size={11} className="w-5 h-5 shrink-0" />}
              <span className="text-xs font-semibold text-teal uppercase tracking-wide truncate">
                {deal.merchant_profiles?.nom_enseigne}
              </span>
            </span>
            <span className="text-xs text-ink/45 shrink-0">{formatTimeRemaining(deal.date_fin)}</span>
          </div>
          <h3 className="font-bold text-ink leading-snug mb-1 group-hover:text-teal transition-colors">
            {deal.titre}
          </h3>
          <p className="text-xs text-ink/45 mb-1">{villeLabel}</p>
        </div>
      </Link>

      <div className="px-4 pb-4 flex items-center gap-3 text-ink/70">
        <LikeButton
          dealId={deal.id}
          userId={userId}
          initialLiked={liked}
          initialCount={deal.likes_count}
          onToggled={(active) => onInteraction?.("like", active)}
        />
        <Link
          href={`/bons-plans/${deal.id}`}
          aria-label={`Voir les ${deal.comments_count} commentaires`}
          className="press flex items-center gap-1.5 text-sm -m-1.5 p-1.5 rounded-full hover:bg-ink/5"
        >
          <MessageCircle size={18} />
          {deal.comments_count}
        </Link>
        <RepostButton
          dealId={deal.id}
          userId={userId}
          initialReposted={reposted}
          initialCount={deal.reposts_count}
          onToggled={(active) => onInteraction?.("repost", active)}
        />
      </div>
    </article>
  );
}
