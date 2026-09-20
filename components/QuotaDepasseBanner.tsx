import Link from "next/link";
import { Crown, Info } from "lucide-react";

const LIMITE_GRATUITE = 3;

// Après une résiliation, un commerçant peut se retrouver avec plus d'annonces
// en ligne que le plan gratuit n'en autorise. Ses offres restent publiées (on ne
// les retire pas dans son dos), mais il ne peut plus en publier de nouvelles.
// Sans ce bandeau, il découvrait la limite en se prenant une erreur au moment de
// publier, sans comprendre pourquoi.
export function QuotaDepasseBanner({ actifs }: { actifs: number }) {
  if (actifs <= LIMITE_GRATUITE) return null;

  return (
    <div className="flex items-start gap-2.5 bg-marigold/10 border border-marigold/30 rounded-control px-4 py-3 mb-4">
      <Info size={16} className="text-marigold shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm text-ink leading-relaxed">
          Tu as <strong>{actifs} bons plans en ligne</strong>, alors que le plan gratuit en autorise{" "}
          {LIMITE_GRATUITE}.
        </p>
        <p className="text-sm text-ink/70 leading-relaxed mt-1">
          Ils restent visibles et tu peux toujours les modifier. En revanche, tu ne pourras pas en
          publier de nouveau tant que tu n&apos;es pas repassé sous la limite.
        </p>
        <Link
          href="/tarifs"
          className="press inline-flex items-center gap-1.5 mt-2.5 rounded-control bg-teal text-white px-3.5 py-2 text-sm font-semibold shadow-soft"
        >
          <Crown size={14} />
          Repasser en Pro
        </Link>
      </div>
    </div>
  );
}
