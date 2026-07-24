import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { discountLabel, formatTimeRemaining } from "@/lib/dealFormat";

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
  merchant_profiles: { nom_enseigne: string } | null;
};

export function DealCard({ deal, villeLabel }: { deal: FeedDeal; villeLabel: string }) {
  const badge = discountLabel(deal);

  return (
    <Link href={`/bons-plans/${deal.id}`}>
      <article className="bg-white rounded-2xl overflow-hidden shadow-sm border border-ink/5 h-full">
        <div className="relative">
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
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-teal uppercase tracking-wide">
              {deal.merchant_profiles?.nom_enseigne}
            </span>
            <span className="text-xs text-ink/50">{formatTimeRemaining(deal.date_fin)}</span>
          </div>
          <h3 className="font-bold text-ink leading-snug mb-1">{deal.titre}</h3>
          <p className="text-xs text-ink/50 mb-3">{villeLabel}</p>

          <div className="flex items-center gap-4 text-ink/60">
            <span className="flex items-center gap-1 text-sm">
              <Heart size={18} />
              {deal.likes_count}
            </span>
            <span className="flex items-center gap-1 text-sm">
              <MessageCircle size={18} />
              {deal.comments_count}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
