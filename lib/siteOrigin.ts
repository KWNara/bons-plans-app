import "server-only";

// L'en-tête Origin est fourni par le client : un appel forgé peut y mettre
// n'importe quel domaine et obtenir une session Stripe qui redirige hors du
// site. On ne l'accepte donc que s'il correspond à l'origine officielle.
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const origin = req.headers.get("origin");
  if (origin?.startsWith("http://localhost:")) return origin;

  return new URL(req.url).origin;
}
