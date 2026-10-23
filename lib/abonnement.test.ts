import { describe, expect, it } from "vitest";
import { abonnementDeReference, finProgrammee, STATUTS_EN_COURS, STATUTS_PRO } from "./abonnement";

const abo = (id: string, status: string, created: number) => ({ id, status, created });

describe("abonnementDeReference", () => {
  it("un abonnement résilié ne masque pas celui qui paie, même s'il est plus récent", () => {
    const ref = abonnementDeReference([abo("paye", "active", 100), abo("mort", "canceled", 200)]);
    expect(ref?.id).toBe("paye");
  });

  it("entre deux abonnements qui donnent le Pro, retient le plus récent", () => {
    const ref = abonnementDeReference([abo("ancien", "active", 100), abo("recent", "trialing", 200)]);
    expect(ref?.id).toBe("recent");
  });

  it("sans abonnement Pro, retient celui qui reste à régulariser", () => {
    const ref = abonnementDeReference([abo("impaye", "unpaid", 100), abo("fini", "canceled", 200)]);
    expect(ref?.id).toBe("impaye");
  });

  it("sinon, le plus récent ; et rien pour une liste vide", () => {
    expect(abonnementDeReference([abo("a", "canceled", 100), abo("b", "incomplete_expired", 200)])?.id).toBe("b");
    expect(abonnementDeReference([])).toBeNull();
  });
});

describe("statuts", () => {
  it("un impayé ne donne pas le Pro mais bloque un second abonnement", () => {
    expect(STATUTS_PRO).not.toContain("unpaid");
    expect(STATUTS_EN_COURS).toContain("unpaid");
    expect(STATUTS_EN_COURS).not.toContain("canceled");
  });
});

describe("finProgrammee", () => {
  it("lit une date de résiliation explicite", () => {
    expect(finProgrammee({ cancel_at: 1_800_000_000, cancel_at_period_end: false }, null)).toBe(
      new Date(1_800_000_000_000).toISOString()
    );
  });

  it("une résiliation en fin de période prend la fin de période", () => {
    expect(finProgrammee({ cancel_at: null, cancel_at_period_end: true }, "2026-11-23T00:00:00.000Z")).toBe(
      "2026-11-23T00:00:00.000Z"
    );
  });

  it("aucune résiliation : null", () => {
    expect(finProgrammee({ cancel_at: null, cancel_at_period_end: false }, "2026-11-23T00:00:00.000Z")).toBeNull();
  });
});
