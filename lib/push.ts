/**
 * Conversion de la clé publique VAPID pour `pushManager.subscribe`.
 *
 * La clé est distribuée en base64 « URL-safe », alors que l'API du navigateur
 * attend un Uint8Array. Sans cette conversion, l'abonnement échoue avec une
 * erreur qui ne dit rien du format attendu.
 */
export function cleVersTableau(base64UrlSafe: string) {
  const remplissage = "=".repeat((4 - (base64UrlSafe.length % 4)) % 4);
  const base64 = (base64UrlSafe + remplissage).replace(/-/g, "+").replace(/_/g, "/");

  const brut = atob(base64);

  // La vue est construite sur un ArrayBuffer explicite : `new Uint8Array(n)`
  // est typé sur ArrayBufferLike, qui englobe SharedArrayBuffer, et
  // `applicationServerKey` refuse ce type plus large.
  const tableau = new Uint8Array(new ArrayBuffer(brut.length));
  for (let i = 0; i < brut.length; i += 1) tableau[i] = brut.charCodeAt(i);

  return tableau;
}

/** Extrait les deux clés d'un abonnement, en base64 tel que les attend web-push. */
export function clesAbonnement(abonnement: PushSubscription) {
  const json = abonnement.toJSON();
  return {
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}
