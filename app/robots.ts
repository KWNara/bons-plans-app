import type { MetadataRoute } from "next";

const siteUrl = "https://bons-plans-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/compte",
        "/mes-bons-plans",
        "/mon-abonnement",
        "/admin",
        "/api",
        // Les profils sont publics au sein de l'application, ce qui ne veut pas
        // dire indexables : un pseudo, une bio, une ville et la liste de ce que
        // quelqu'un relaie n'ont rien à faire dans un moteur de recherche. Les
        // pages sociales, elles, ne montrent rien sans session.
        "/profil",
        "/amis",
        "/messages",
        "/notifications",
        "/alertes",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
