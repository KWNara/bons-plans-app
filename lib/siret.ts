export type SiretCheckResult =
  | { status: "valide" }
  | { status: "ferme" }
  | { status: "introuvable" }
  | { status: "indisponible" };

// Vérifie un SIRET auprès de l'API "Recherche d'entreprises" (api.gouv.fr),
// qui s'appuie sur les données Sirene de l'INSEE, gratuite et sans clé.
export async function checkSiret(siret: string): Promise<SiretCheckResult> {
  try {
    const res = await fetch(
      `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siret)}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) return { status: "indisponible" };

    const data = await res.json();
    const etablissement = data?.results?.[0]?.matching_etablissements?.[0];

    if (!etablissement || etablissement.siret !== siret) {
      return { status: "introuvable" };
    }

    return etablissement.etat_administratif === "A"
      ? { status: "valide" }
      : { status: "ferme" };
  } catch {
    return { status: "indisponible" };
  }
}

export function isValidSiretFormat(siret: string): boolean {
  return /^\d{14}$/.test(siret);
}
