import { describe, it, expect } from "vitest";
import { erreurPseudo } from "./pseudo";
import { extraireMentions } from "./mentions";

describe("erreurPseudo", () => {
  it("accepte un pseudo ordinaire", () => {
    expect(erreurPseudo("lea")).toBeNull();
    expect(erreurPseudo("Jean-Luc")).toBeNull();
    expect(erreurPseudo("jean.dupont")).toBeNull();
    expect(erreurPseudo("marie_75")).toBeNull();
  });

  it("accepte les accents", () => {
    expect(erreurPseudo("Léa")).toBeNull();
    expect(erreurPseudo("Noé")).toBeNull();
  });

  it("refuse trop court ou trop long", () => {
    expect(erreurPseudo("a")).toMatch(/au moins 2/);
    expect(erreurPseudo("a".repeat(31))).toMatch(/dépasser 30/);
  });

  // C'est le cas qui motive toute cette validation : le motif des mentions
  // s'arrête au premier caractère hors jeu, donc « @Jean Dupont » ne désignait
  // plus que « Jean ».
  it("refuse les espaces, en disant pourquoi", () => {
    expect(erreurPseudo("Jean Dupont")).toMatch(/citer avec @/);
  });

  it("refuse un point ou un tiret final", () => {
    expect(erreurPseudo("lea.")).not.toBeNull();
    expect(erreurPseudo("lea-")).not.toBeNull();
  });

  it("refuse les caractères exotiques", () => {
    expect(erreurPseudo("lea@maison")).not.toBeNull();
    expect(erreurPseudo("lea/sam")).not.toBeNull();
  });

  // Le garde-fou qui compte vraiment : tout pseudo accepté doit être relisible
  // entier par l'analyseur de mentions, sinon la citation désigne la mauvaise
  // personne — ou personne.
  it("garantit que tout pseudo accepté est citable", () => {
    const candidats = [
      "lea",
      "Léa",
      "Jean-Luc",
      "jean.dupont",
      "marie_75",
      "a1",
      "Noé2026",
      "x".repeat(30),
    ];

    for (const pseudo of candidats) {
      expect(erreurPseudo(pseudo), `${pseudo} devrait être accepté`).toBeNull();
      expect(extraireMentions(`salut @${pseudo} !`), `${pseudo} devrait être citable`).toEqual([
        pseudo,
      ]);
    }
  });
});
