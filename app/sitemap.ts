import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const siteUrl = "https://bons-plans-app.vercel.app";

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
