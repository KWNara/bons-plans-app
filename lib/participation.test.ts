import { describe, it, expect } from "vitest";
import { phraseParticipation } from "./participation";

describe("phraseParticipation", () => {
  it("annonce le vide quand personne n'a répondu", () => {
    expect(phraseParticipation({ amis: [], total: 0, jyVais: false })).toBe(
      "Personne n'a encore dit y aller."
    );
  });

  it("encourage à partager quand on est seul à y aller", () => {
    expect(phraseParticipation({ amis: [], total: 1, jyVais: true })).toBe(
      "Tu y vas. Dis-le à tes amis !"
    );
  });

  it("accorde le verbe au singulier pour un inconnu isolé", () => {
    expect(phraseParticipation({ amis: [], total: 1, jyVais: false })).toBe("1 personne y va.");
  });

  it("reste anonyme quand aucun ami n'y va", () => {
    expect(phraseParticipation({ amis: [], total: 12, jyVais: false })).toBe("12 personnes y vont.");
  });

  it("nomme un ami seul", () => {
    expect(phraseParticipation({ amis: ["Léa"], total: 1, jyVais: false })).toBe("Léa y va.");
  });

  it("nomme deux amis sans compteur superflu", () => {
    expect(phraseParticipation({ amis: ["Léa", "Sam"], total: 2, jyVais: false })).toBe(
      "Léa et Sam y vont."
    );
  });

  it("ne compte pas l'utilisateur courant parmi les anonymes", () => {
    // Léa, Sam et moi : il ne reste personne à agréger.
    expect(phraseParticipation({ amis: ["Léa", "Sam"], total: 3, jyVais: true })).toBe(
      "Léa et Sam y vont."
    );
  });

  it("agrège les inconnus derrière les amis nommés", () => {
    expect(phraseParticipation({ amis: ["Léa", "Sam"], total: 9, jyVais: false })).toBe(
      "Léa, Sam et 7 autres y vont."
    );
  });

  it("accorde « autre » au singulier", () => {
    expect(phraseParticipation({ amis: ["Léa"], total: 2, jyVais: false })).toBe(
      "Léa et 1 autre y vont."
    );
  });

  // Le compteur public et la liste d'amis viennent de deux requêtes distinctes :
  // sans ce garde-fou, un total en retard d'une seconde affichait « et -1 autres ».
  it("ne produit jamais un nombre négatif si le total est en retard", () => {
    expect(phraseParticipation({ amis: ["Léa", "Sam"], total: 1, jyVais: true })).toBe(
      "Léa et Sam y vont."
    );
  });

  it("ne nomme jamais plus de deux amis", () => {
    expect(
      phraseParticipation({ amis: ["Léa", "Sam", "Noé", "Ines"], total: 4, jyVais: false })
    ).toBe("Léa, Sam et 2 autres y vont.");
  });
});
