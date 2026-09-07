import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const siteUrl = "https://bons-plans-app.vercel.app";

// Régénère le sitemap au plus toutes les heures plutôt que de le figer
// au moment du build (sinon les nouveaux bons plans n'y apparaissent jamais).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/tarifs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/cgu`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/confidentialite`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("id, created_at")
    .eq("statut", "publie")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (dealsError) {
    console.error("[sitemap] deals query failed:", dealsError);
  }

  const dealRoutes: MetadataRoute.Sitemap = (deals ?? []).map((deal) => ({
    url: `${siteUrl}/bons-plans/${deal.id}`,
    lastModified: deal.created_at ?? undefined,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [...staticRoutes, ...dealRoutes];
}
