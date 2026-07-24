"use client";

import Link from "next/link";
import { useCity } from "@/lib/cityContext";

export function CityBadge() {
  const { selectedCity, loaded } = useCity();

  if (!loaded) return null;

  return (
    <Link href="/ville" className="text-sm text-ink/70 underline">
      📍 {selectedCity ? `${selectedCity.nom} (${selectedCity.code_postal})` : "Choisir une ville"}
    </Link>
  );
}
