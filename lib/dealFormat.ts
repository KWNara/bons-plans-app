export function discountLabel(deal: {
  reduction_pourcentage: number | null;
  prix_avant: number | null;
  prix_apres: number | null;
}): string | null {
  if (deal.reduction_pourcentage) return `-${deal.reduction_pourcentage}%`;
  if (deal.prix_avant && deal.prix_apres && deal.prix_avant > 0) {
    const pct = Math.round((1 - deal.prix_apres / deal.prix_avant) * 100);
    if (pct > 0) return `-${pct}%`;
  }
  return null;
}

export function formatTimeRemaining(dateFin: string | null): string {
  if (!dateFin) return "Sans limite de temps";
  const diffMs = new Date(dateFin).getTime() - Date.now();
  const days = Math.ceil(diffMs / 86_400_000);
  if (days <= 0) return "Expire aujourd'hui";
  if (days === 1) return "Expire demain";
  return `Expire dans ${days} j`;
}
