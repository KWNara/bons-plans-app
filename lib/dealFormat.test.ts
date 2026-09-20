import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  discountLabel,
  endOfDayIso,
  formatTimeRemaining,
  isExpired,
  startOfDayIso,
} from "./dealFormat";

describe("discountLabel", () => {
  it("privilégie le pourcentage saisi par le commerçant", () => {
    expect(discountLabel({ reduction_pourcentage: 30, prix_avant: 20, prix_apres: 12 })).toBe("-30%");
  });

  it("calcule le pourcentage à partir des deux prix", () => {
    expect(discountLabel({ reduction_pourcentage: null, prix_avant: 20, prix_apres: 12 })).toBe("-40%");
  });

  it("n'affiche pas de badge sans réduction réelle", () => {
    expect(discountLabel({ reduction_pourcentage: null, prix_avant: 20, prix_apres: 20 })).toBeNull();
    expect(discountLabel({ reduction_pourcentage: null, prix_avant: null, prix_apres: null })).toBeNull();
  });

  it("ne divise pas par zéro sur un prix initial nul", () => {
    expect(discountLabel({ reduction_pourcentage: null, prix_avant: 0, prix_apres: 5 })).toBeNull();
  });
});

describe("bornes de journée locale", () => {
  // Le bug d'origine : une date « YYYY-MM-DD » envoyée telle quelle était lue
  // comme minuit UTC, donc un bon plan « jusqu'au 10 » disparaissait le 9 au
  // soir en heure de Paris.
  it("place la fin de validité en fin de journée locale, pas à minuit UTC", () => {
    const fin = new Date(endOfDayIso("2026-09-10"));
    expect(fin.getFullYear()).toBe(2026);
    expect(fin.getMonth()).toBe(8);
    expect(fin.getDate()).toBe(10);
    expect(fin.getHours()).toBe(23);
    expect(fin.getMinutes()).toBe(59);
  });

  it("place le début de validité au tout début de la journée locale", () => {
    const debut = new Date(startOfDayIso("2026-09-10"));
    expect(debut.getDate()).toBe(10);
    expect(debut.getHours()).toBe(0);
    expect(debut.getMinutes()).toBe(0);
  });

  it("garde le même jour après un aller-retour de conversion", () => {
    const iso = endOfDayIso("2026-01-01");
    expect(new Date(iso).getDate()).toBe(1);
    expect(new Date(iso).getMonth()).toBe(0);
  });
});

describe("formatTimeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("indique l'absence de limite quand il n'y a pas de date de fin", () => {
    expect(formatTimeRemaining(null)).toBe("Sans limite de temps");
  });

  it("ne présente jamais une offre passée comme expirant aujourd'hui", () => {
    // Le bug d'origine : un bon plan expiré en mars affichait « Expire
    // aujourd'hui » toute l'année, parce que tout écart négatif tombait dans
    // le même cas que « moins d'un jour ».
    const enMars = new Date(2026, 2, 1).toISOString();
    expect(formatTimeRemaining(enMars)).toBe("Offre terminée");
  });

  it("annonce demain pour une fin dans les prochaines 24 heures", () => {
    const demain = new Date(2026, 8, 21, 10, 0, 0).toISOString();
    expect(formatTimeRemaining(demain)).toBe("Expire demain");
  });

  it("compte les jours restants sur un horizon court", () => {
    const dansCinqJours = new Date(2026, 8, 25, 12, 0, 0).toISOString();
    expect(formatTimeRemaining(dansCinqJours)).toBe("Expire dans 5 jours");
  });

  it("bascule sur une date explicite au-delà d'un mois", () => {
    const loin = new Date(2026, 11, 24, 12, 0, 0).toISOString();
    expect(formatTimeRemaining(loin)).toContain("Jusqu'au");
  });
});

describe("isExpired", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 20, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ne considère jamais comme expiré un bon plan sans date de fin", () => {
    expect(isExpired(null)).toBe(false);
  });

  it("distingue une date passée d'une date à venir", () => {
    expect(isExpired(new Date(2026, 8, 19).toISOString())).toBe(true);
    expect(isExpired(new Date(2026, 8, 21).toISOString())).toBe(false);
  });
});
