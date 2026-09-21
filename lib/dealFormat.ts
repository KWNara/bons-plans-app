// `%` et `_` sont des jokers en ILIKE : un titre contenant un pourcentage
// ("-20%", très courant sur un bon plan) transformait silencieusement une
// recherche de doublon en motif partiel, faisant remonter des annonces sans
// rapport comme de faux doublons.
export function echapperIlike(valeur: string): string {
  return valeur.replace(/[\\%_]/g, (c) => `\\${c}`);
}

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

export const FENETRE_FLASH_MS = 24 * 3_600_000;

/**
 * Un bon plan « flash » est une offre qui se termine dans moins de 24 heures.
 *
 * C'est une propriété dérivée de `date_fin`, pas un champ en base : le statut
 * s'éteint tout seul au bon moment. Stocker un booléen aurait demandé une tâche
 * planifiée pour l'éteindre, et affiché « Flash » sur des offres terminées
 * depuis des semaines en cas de panne de cette tâche.
 */
export function estFlash(dateFin: string | null, maintenant = Date.now()): boolean {
  if (!dateFin) return false;
  const restant = new Date(dateFin).getTime() - maintenant;
  return restant > 0 && restant <= FENETRE_FLASH_MS;
}

/** Compte à rebours court, pensé pour un badge : « 3 h 05 », « 12 min ». */
export function compteARebours(dateFin: string | null, maintenant = Date.now()): string | null {
  if (!dateFin) return null;

  const restant = new Date(dateFin).getTime() - maintenant;
  if (restant <= 0) return null;

  const heures = Math.floor(restant / 3_600_000);
  const minutes = Math.floor((restant % 3_600_000) / 60_000);

  // Sous l'heure, les heures à zéro n'apportent rien et mangent la place.
  if (heures === 0) return `${minutes} min`;
  return `${heures} h ${String(minutes).padStart(2, "0")}`;
}

export function formatTimeRemaining(dateFin: string | null): string {
  if (!dateFin) return "Sans limite de temps";

  const diffMs = new Date(dateFin).getTime() - Date.now();

  // Une date déjà passée n'est pas « aujourd'hui » : un bon plan expiré en mars
  // affichait « Expire aujourd'hui » toute l'année.
  if (diffMs <= 0) return "Offre terminée";

  // Le compte se fait en jours calendaires, pas en tranches de 24 heures : une
  // offre qui se termine ce matin à 7 h était annoncée « Expire demain », parce
  // que l'écart restant arrondissait à un jour.
  const fin = new Date(dateFin);
  const maintenant = new Date();
  const jourFin = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  const jourMaintenant = new Date(
    maintenant.getFullYear(),
    maintenant.getMonth(),
    maintenant.getDate()
  );

  const days = Math.round((jourFin.getTime() - jourMaintenant.getTime()) / 86_400_000);

  if (days === 0) return "Expire aujourd'hui";
  if (days === 1) return "Expire demain";
  if (days <= 30) return `Expire dans ${days} jours`;

  return `Jusqu'au ${new Date(dateFin).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  })}`;
}
