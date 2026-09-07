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

// Les champs <input type="date"> renvoient "YYYY-MM-DD", que Postgres
// interprète comme minuit UTC. Un commerçant qui choisit « fin le 10 » voyait
// donc son offre disparaître le 9 à 22 h heure de Paris. On borne explicitement
// la journée dans le fuseau local du commerçant.
export function startOfDayIso(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

export function endOfDayIso(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

export function isExpired(dateFin: string | null): boolean {
  if (!dateFin) return false;
  return new Date(dateFin).getTime() <= Date.now();
}

export function formatTimeRemaining(dateFin: string | null): string {
  if (!dateFin) return "Sans limite de temps";

  const diffMs = new Date(dateFin).getTime() - Date.now();

  // Une date déjà passée n'est pas « aujourd'hui » : un bon plan expiré en mars
  // affichait « Expire aujourd'hui » toute l'année.
  if (diffMs <= 0) return "Offre terminée";

  const days = Math.ceil(diffMs / 86_400_000);
  if (days === 1) return "Expire demain";
  if (days <= 30) return `Expire dans ${days} jours`;

  return `Jusqu'au ${new Date(dateFin).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })}`;
}
