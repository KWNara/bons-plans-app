// Règles de l'abonnement Pro, sans dépendance à Stripe ni à Supabase : partagées
// par la route de paiement, le webhook et la page « Mon abonnement ».

type Statut =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "canceled"
  | "paused";

/** Donnent le plan Pro. past_due en fait partie : Stripe relance la carte
 * pendant environ trois semaines, couper l'accès dès le premier échec
 * dégraderait un commerçant qui a payé, pour un incident bancaire passager. */
export const STATUTS_PRO: readonly string[] = ["active", "trialing", "past_due"];

/** Abonnement encore vivant chez Stripe, même sans donner le Pro : en ouvrir
 * un second ferait payer deux fois (l'ancien reste facturable, ses impayés
 * avec). Le commerçant doit passer par le portail pour le régulariser. */
export const STATUTS_EN_COURS: readonly string[] = [...STATUTS_PRO, "unpaid", "incomplete", "paused"];

export type AbonnementStripe = {
  id: string;
  status: Statut | string;
  created: number;
};

/**
 * L'abonnement qui fait foi pour un client Stripe.
 *
 * Synchroniser la base sur le seul abonnement visé par un événement rétrogradait
 * un commerçant qui payait : un vieil abonnement résilié, ou un doublon, écrasait
 * l'état du bon. On retient donc, dans l'ordre : le plus récent qui donne le Pro,
 * sinon le plus récent encore en cours, sinon le plus récent tout court.
 */
export function abonnementDeReference<T extends AbonnementStripe>(abonnements: T[]): T | null {
  const recents = [...abonnements].sort((a, b) => b.created - a.created);
  return (
    recents.find((a) => STATUTS_PRO.includes(a.status)) ??
    recents.find((a) => STATUTS_EN_COURS.includes(a.status)) ??
    recents[0] ??
    null
  );
}

/** Date à laquelle l'abonnement prendra fin, si une résiliation est
 * programmée — sinon null. Le portail Stripe résilie par défaut en fin de
 * période : le statut reste « active » jusque-là. */
export function finProgrammee(
  abonnement: { cancel_at: number | null; cancel_at_period_end: boolean },
  finDePeriode: string | null
): string | null {
  if (abonnement.cancel_at) return new Date(abonnement.cancel_at * 1000).toISOString();
  return abonnement.cancel_at_period_end ? finDePeriode : null;
}
