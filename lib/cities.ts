import type { SelectedCity } from "@/lib/cityContext";

export type BanSuggestion = {
  nom: string;
  code_postal: string;
  code_insee: string;
  region: string;
};

function parseRegion(context?: string): string {
  return context?.split(", ").pop() ?? "";
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<BanSuggestion[]> {
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`,
    { signal }
  );
  const data = await res.json();

  return (data.features ?? []).map((f: any) => ({
    nom: f.properties.city,
    code_postal: f.properties.postcode,
    code_insee: f.properties.citycode,
    region: parseRegion(f.properties.context),
  }));
}

export async function reverseGeocodeCity(lon: number, lat: number): Promise<BanSuggestion | null> {
  const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`);
  const data = await res.json();
  const props = data.features?.[0]?.properties;
  if (!props) return null;

  return {
    nom: props.city,
    code_postal: props.postcode,
    code_insee: props.citycode,
    region: parseRegion(props.context),
  };
}

export async function resolveCity(suggestion: BanSuggestion): Promise<SelectedCity> {
  const res = await fetch("/api/cities/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(suggestion),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Impossible d'enregistrer cette ville.");
  return body.city;
}
