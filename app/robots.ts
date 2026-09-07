import type { MetadataRoute } from "next";

const siteUrl = "https://bons-plans-app.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/compte", "/mes-bons-plans", "/mon-abonnement", "/admin", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
