import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrors";

describe("authErrorMessage", () => {
  it("traduit un mot de passe erroné", () => {
    expect(authErrorMessage(new Error("Invalid login credentials"))).toBe(
      "Email ou mot de passe incorrect."
    );
  });

  it("traduit un compte déjà existant", () => {
    expect(authErrorMessage(new Error("User already registered"))).toContain("existe déjà");
  });

  it("traduit un lien de réinitialisation expiré", () => {
    expect(authErrorMessage(new Error("Token has expired or is invalid"))).toContain("expiré");
  });

  it("traduit une limite de tentatives", () => {
    expect(authErrorMessage(new Error("Email rate limit exceeded"))).toContain("Trop de tentatives");
  });

  it("traduit une adresse refusée, au libellé actuel de Supabase", () => {
    const erreur = Object.assign(new Error('Email address "qa@example.com" is invalid'), {
      code: "email_address_invalid",
    });
    expect(authErrorMessage(erreur)).toBe("Cette adresse email n'est pas valide.");
  });

  it("se fie au code d'erreur même si le texte anglais change", () => {
    const erreur = Object.assign(new Error("A wording nobody has seen yet"), {
      code: "over_email_send_rate_limit",
    });
    expect(authErrorMessage(erreur)).toContain("Trop de tentatives");
  });

  it("accepte aussi bien une chaîne qu'une Error", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("Email ou mot de passe incorrect.");
  });

  it("ne laisse jamais fuiter un message technique inconnu", () => {
    const message = authErrorMessage(new Error("PGRST301: JWT expired at cluster edge"));
    expect(message).toBe("Une erreur est survenue. Réessaie dans un instant.");
    expect(message).not.toContain("PGRST");
  });

  it("reste lisible face à une valeur inattendue", () => {
    expect(authErrorMessage(null)).toBe("Une erreur est survenue. Réessaie dans un instant.");
    expect(authErrorMessage(undefined)).toBe("Une erreur est survenue. Réessaie dans un instant.");
  });
});
