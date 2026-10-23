import { discountLabel } from "./dealFormat";

export type Zone = { nord: number; sud: number; est: number; ouest: number };

export type PinCommerce = {
  id: string;
  nom: string;
  latitude: number;
  longitude: number;
  /** "-30%", "2 offres"… ou null pour un partenaire sans offre en cours. */
  etiquette: string | null;
};

export type Groupe = { cle: string; latitude: number; longitude: number; membres: PinCommerce[] };

type Offre = {
  prix_avant: number | null;
  prix_apres: number | null;
  reduction_pourcentage: number | null;
};

export function meilleureReduction(offres: Offre[]): string | null {
  let meilleure: string | null = null;
  for (const o of offres) {
    const l = discountLabel(o);
    if (l && (!meilleure || parseInt(l.slice(1)) > parseInt(meilleure.slice(1)))) meilleure = l;
  }
  return meilleure;
}

/** Le texte de la pastille d'un commerce, comme le prix sur une carte Airbnb. */
export function etiquette(offres: Offre[]): string | null {
  const n = offres.length;
  return meilleureReduction(offres) ?? (n > 0 ? `${n} offre${n > 1 ? "s" : ""}` : null);
}

export function noteMoyenne(avis: { note: number }[]): { moyenne: number; total: number } | null {
  if (avis.length === 0) return null;
  return { moyenne: avis.reduce((s, a) => s + a.note, 0) / avis.length, total: avis.length };
}

export function dansZone(p: { latitude: number; longitude: number }, z: Zone): boolean {
  return p.latitude <= z.nord && p.latitude >= z.sud && p.longitude <= z.est && p.longitude >= z.ouest;
}

/** "Épicerie" et "epicerie" doivent se trouver l'une l'autre. */
export function sansAccents(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function memeAdresse(membres: { latitude: number; longitude: number }[]): boolean {
  return membres.every((m) => m.latitude === membres[0].latitude && m.longitude === membres[0].longitude);
}

/**
 * Regroupe les repères qui tomberaient dans la même cellule de `cellule`
 * pixels à ce zoom. À partir de `zoomDetail`, on est à l'échelle de la rue :
 * seuls les commerces à la même adresse exacte restent regroupés.
 *
 * ponytail: grille fixe — deux repères voisins de part et d'autre d'une
 * cellule ne fusionnent pas. Passer à leaflet.markercluster si ça gêne.
 */
export function grouper(
  pins: PinCommerce[],
  zoom: number,
  projeter: (latitude: number, longitude: number, zoom: number) => { x: number; y: number },
  cellule = 64,
  zoomDetail = 17
): Groupe[] {
  const cellules = new Map<string, PinCommerce[]>();

  for (const p of pins) {
    let cle: string;
    if (zoom >= zoomDetail) {
      cle = `${p.latitude},${p.longitude}`;
    } else {
      const pt = projeter(p.latitude, p.longitude, zoom);
      cle = `${Math.floor(pt.x / cellule)}:${Math.floor(pt.y / cellule)}`;
    }
    const membres = cellules.get(cle);
    if (membres) membres.push(p);
    else cellules.set(cle, [p]);
  }

  return [...cellules].map(([cle, membres]) => ({
    cle,
    latitude: membres.reduce((s, m) => s + m.latitude, 0) / membres.length,
    longitude: membres.reduce((s, m) => s + m.longitude, 0) / membres.length,
    membres,
  }));
}
