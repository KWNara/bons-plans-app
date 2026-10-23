import { describe, expect, it } from "vitest";
import { dansZone, etiquette, grouper, memeAdresse, noteMoyenne, sansAccents, type PinCommerce } from "./carte";

const offre = (o: Partial<{ prix_avant: number; prix_apres: number; reduction_pourcentage: number }>) => ({
  prix_avant: null,
  prix_apres: null,
  reduction_pourcentage: null,
  ...o,
});

describe("etiquette", () => {
  it("affiche la meilleure réduction, pas la première", () => {
    expect(etiquette([offre({ reduction_pourcentage: 10 }), offre({ prix_avant: 20, prix_apres: 10 })])).toBe("-50%");
  });

  it("compte les offres quand aucune n'annonce de réduction", () => {
    expect(etiquette([offre({}), offre({})])).toBe("2 offres");
  });

  it("ne renvoie rien pour un partenaire sans offre", () => {
    expect(etiquette([])).toBeNull();
  });
});

describe("noteMoyenne", () => {
  it("fait la moyenne et compte les avis", () => {
    expect(noteMoyenne([{ note: 5 }, { note: 4 }])).toEqual({ moyenne: 4.5, total: 2 });
  });

  it("ne renvoie rien sans avis plutôt qu'une note de 0", () => {
    expect(noteMoyenne([])).toBeNull();
  });
});

describe("dansZone", () => {
  const zone = { nord: 48, sud: 47, est: 7, ouest: 6 };

  it("retient un point à l'intérieur, bords compris", () => {
    expect(dansZone({ latitude: 47.5, longitude: 6.5 }, zone)).toBe(true);
    expect(dansZone({ latitude: 48, longitude: 7 }, zone)).toBe(true);
  });

  it("écarte un point hors zone", () => {
    expect(dansZone({ latitude: 48.1, longitude: 6.5 }, zone)).toBe(false);
  });
});

describe("sansAccents", () => {
  it("rend une recherche insensible aux accents et à la casse", () => {
    expect(sansAccents("Épicerie Côté Jardin")).toBe("epicerie cote jardin");
  });
});

describe("grouper", () => {
  const pin = (id: string, latitude: number, longitude: number): PinCommerce => ({
    id,
    nom: id,
    latitude,
    longitude,
    etiquette: null,
  });
  // Projection factice : 1 degré = 100 px, quel que soit le zoom.
  const projeter = (lat: number, lng: number) => ({ x: lng * 100, y: lat * 100 });

  it("regroupe les repères d'une même cellule et laisse les autres seuls", () => {
    const groupes = grouper([pin("a", 0.1, 0.1), pin("b", 0.2, 0.2), pin("c", 5, 5)], 10, projeter);
    expect(groupes.map((g) => g.membres.map((m) => m.id))).toEqual([["a", "b"], ["c"]]);
    expect(groupes[0].latitude).toBeCloseTo(0.15);
  });

  it("au zoom de détail, ne regroupe que les adresses identiques", () => {
    const groupes = grouper([pin("a", 0.1, 0.1), pin("b", 0.1, 0.1), pin("c", 0.10001, 0.1)], 17, projeter);
    expect(groupes.map((g) => g.membres.length)).toEqual([2, 1]);
    expect(memeAdresse(groupes[0].membres)).toBe(true);
  });
});
