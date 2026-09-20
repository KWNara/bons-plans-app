import { describe, it, expect } from "vitest";
import {
  appliquerMention,
  decouperMentions,
  extraireMentions,
  fragmentEnCours,
} from "./mentions";

describe("extraireMentions", () => {
  it("relève un pseudo simple", () => {
    expect(extraireMentions("salut @lea")).toEqual(["lea"]);
  });

  it("garde les lettres accentuées", () => {
    expect(extraireMentions("merci @Léa et @Noé")).toEqual(["Léa", "Noé"]);
  });

  // Sans ça, « salut @lea ! » aurait mentionné le pseudo « lea » suivi d'un
  // point d'exclamation, qui ne correspond à personne.
  it("ne mange pas la ponctuation finale", () => {
    expect(extraireMentions("salut @lea !")).toEqual(["lea"]);
    expect(extraireMentions("on y va @sam, non ?")).toEqual(["sam"]);
  });

  it("dédoublonne sans tenir compte de la casse", () => {
    expect(extraireMentions("@lea puis @LEA puis @Lea")).toEqual(["lea"]);
  });

  it("ignore une adresse e-mail", () => {
    expect(extraireMentions("écris à contact@exemple.fr")).toEqual([]);
  });

  it("exige au moins deux caractères", () => {
    expect(extraireMentions("@a")).toEqual([]);
    expect(extraireMentions("@ab")).toEqual(["ab"]);
  });

  it("ne relève rien sur un texte sans mention", () => {
    expect(extraireMentions("un commentaire ordinaire")).toEqual([]);
  });
});

describe("decouperMentions", () => {
  it("sépare le texte et les mentions dans l'ordre", () => {
    expect(decouperMentions("salut @lea ça va ?")).toEqual([
      { type: "texte", valeur: "salut " },
      { type: "mention", pseudo: "lea" },
      { type: "texte", valeur: " ça va ?" },
    ]);
  });

  it("gère une mention en début et en fin", () => {
    expect(decouperMentions("@lea")).toEqual([{ type: "mention", pseudo: "lea" }]);
  });

  it("conserve le texte intégralement quand il n'y a aucune mention", () => {
    const texte = "rien à signaler ici";
    expect(decouperMentions(texte)).toEqual([{ type: "texte", valeur: texte }]);
  });

  // La reconstitution doit être fidèle au caractère près, sinon un commentaire
  // se retrouverait tronqué à l'affichage.
  it("se recolle à l'identique", () => {
    const texte = "coucou @lea et @Noé, on y va ? @sam";
    const recolle = decouperMentions(texte)
      .map((s) => (s.type === "texte" ? s.valeur : `@${s.pseudo}`))
      .join("");
    expect(recolle).toBe(texte);
  });
});

describe("fragmentEnCours", () => {
  it("rend le fragment qui suit un arobase", () => {
    expect(fragmentEnCours("salut @le", 9)).toBe("le");
  });

  it("rend une chaîne vide juste après l'arobase", () => {
    expect(fragmentEnCours("salut @", 7)).toBe("");
  });

  it("se ferme dès qu'un espace suit", () => {
    expect(fragmentEnCours("salut @lea ça", 13)).toBeNull();
  });

  it("ignore un arobase collé à un mot", () => {
    expect(fragmentEnCours("contact@exemple", 15)).toBeNull();
  });

  it("s'ouvre après une parenthèse", () => {
    expect(fragmentEnCours("(@le", 4)).toBe("le");
  });

  it("ne rend rien sans arobase", () => {
    expect(fragmentEnCours("salut", 5)).toBeNull();
  });
});

describe("appliquerMention", () => {
  it("remplace le fragment et place le curseur après l'espace", () => {
    expect(appliquerMention("salut @le", 9, "lea")).toEqual({
      texte: "salut @lea ",
      curseur: 11,
    });
  });

  it("préserve ce qui suit le curseur", () => {
    expect(appliquerMention("salut @le ça va", 9, "lea")).toEqual({
      texte: "salut @lea  ça va",
      curseur: 11,
    });
  });

  it("ne touche à rien si aucune mention n'est en cours", () => {
    expect(appliquerMention("salut", 5, "lea")).toEqual({ texte: "salut", curseur: 5 });
  });
});
