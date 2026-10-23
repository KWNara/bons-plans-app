import "server-only";

// L'en-tête Origin est fourni par le client : un appel forgé peut y mettre
// n'importe quel domaine et obtenir une session Stripe qui redirige hors du
// site. On ne l'accepte donc que s'il correspond à l'origine officielle.
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  // En développement seulement, et analysé plutôt que comparé par préfixe :
  // « http://localhost:@evil.example » commence bien par « http://localhost: »,
  // mais son hôte réel est evil.example (« localhost: » n'y est qu'un
  // identifiant de connexion).
  if (process.env.NODE_ENV !== "production") {
    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" && !url.username && !url.password) return url.origin;
      } catch {
        // En-tête mal formé : on retombe sur l'URL de la requête.
      }
    }
  }

  // Sur Vercel, la requête n'arrive jusqu'ici que si son hôte est bien celui
  // du déploiement : cette origine-là n'est pas falsifiable.
  return new URL(req.url).origin;
}
