import type { SelectedCity } from "@/lib/cityContext";

export type BanSuggestion = {
  nom: string;
  code_postal: string;
  code_insee: string;
  region: string;
  // L'API Adresse renvoie les coordonnées en [longitude, latitude] — l'ordre
  // GeoJSON, inverse de celui qu'attend Leaflet. On les nomme explicitement
  // pour que l'inversion ne se fasse pas par erreur en aval.
  latitude: number | null;
  longitude: number | null;
};

function parseRegion(context?: string): string {
  return context?.split(", ").pop() ?? "";
}

function parseCoordonnees(geometry?: { coordinates?: [number, number] }) {
  const paire = geometry?.coordinates;
  if (!paire || paire.length !== 2) return { latitude: null, longitude: null };
  return { longitude: paire[0], latitude: paire[1] };
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<BanSuggestion[]> {
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=5`,
    { signal }
  );

  // Sans ce contrôle, une panne de l'API Adresse est indiscernable d'un
  // « aucune ville trouvée » et l'utilisateur croit avoir mal tapé.
  if (!res.ok) {
    throw new Error(`Recherche de villes indisponible (HTTP ${res.status}).`);
  }

  const data = await res.json();

  return (data.features ?? []).map((f: any) => ({
    nom: f.properties.city,
    code_postal: f.properties.postcode,
    code_insee: f.properties.citycode,
    region: parseRegion(f.properties.context),
    ...parseCoordonnees(f.geometry),
  }));
}

export async function reverseGeocodeCity(lon: number, lat: number): Promise<BanSuggestion | null> {
  const res = await fetch(`https://api-adresse.data.gouv.fr/reverse/?lon=${lon}&lat=${lat}`);
  if (!res.ok) {
    throw new Error(`Localisation indisponible (HTTP ${res.status}).`);
  }

  const data = await res.json();
  const premier = data.features?.[0];
  const props = premier?.properties;
  if (!props) return null;

  return {
    nom: props.city,
    code_postal: props.postcode,
    code_insee: props.citycode,
    region: parseRegion(props.context),
    ...parseCoordonnees(premier.geometry),
  };
}

export type AdresseTrouvee = {
  libelle: string;
  latitude: number;
  longitude: number;
};

/**
 * Cherche une adresse postale complète (et non une commune).
 *
 * Sans ça, la carte n'aurait eu que des centres-villes : tous les commerçants
 * d'une même commune se seraient empilés sur un unique point.
 */
export async function rechercherAdresses(
  query: string,
  signal?: AbortSignal
): Promise<AdresseTrouvee[]> {
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`,
    { signal }
  );

  if (!res.ok) {
    throw new Error(`Recherche d'adresse indisponible (HTTP ${res.status}).`);
  }

  const data = await res.json();

  return (data.features ?? [])
    .map((f: any) => {
      const { latitude, longitude } = parseCoordonnees(f.geometry);
      return { libelle: f.properties.label as string, latitude, longitude };
    })
    .filter(
      (a: { latitude: number | null; longitude: number | null }) =>
        a.latitude !== null && a.longitude !== null
    );
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
