import { test, expect } from "@playwright/test";
import { supprimerCompteParEmail } from "./fixtures/donnees";

test.describe("Inscription", () => {
  test("un pseudo avec une espace est refusé avant tout envoi", async ({ page }) => {
    await page.goto("/inscription");

    await page.getByLabel("Pseudo").fill("Jean Dupont");
    await page.getByLabel("Email").fill("qa-refuse@example.com");
    // Voir connexion.spec.ts : le <label> englobe aussi le bouton
    // « Afficher le mot de passe », ce qui rend getByLabel ambigu ici.
    await page.locator('input[type="password"]').fill("MotDePasseTest!1");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    // lib/pseudo.ts : ce message ne sort que d'un contrôle client, avant tout
    // appel réseau — la page reste donc sur le formulaire, pas de redirection.
    await expect(
      page.getByText("Ton pseudo ne peut pas contenir d'espace")
    ).toBeVisible();
    await expect(page).toHaveURL(/\/inscription/);
  });

  test("un pseudo valide mène à l'écran de confirmation", async ({ page }) => {
    const suffixe = `${Date.now()}`;
    const email = `qa-inscription-${suffixe}@example.com`;

    try {
      await page.goto("/inscription");

      await page.getByLabel("Pseudo").fill(`QaInscription${suffixe}`);
      await page.getByLabel("Email").fill(email);
      await page.locator('input[type="password"]').fill("MotDePasseTest!1");
      await page.getByRole("button", { name: "Créer mon compte" }).click();

      // L'inscription publique exige une confirmation par courriel : on ne
      // peut pas aller plus loin sans cliquer un lien qu'aucun test n'a reçu.
      // Atteindre cet écran prouve déjà que signUp() a réellement réussi.
      await expect(page.getByText("Vérifie ta boîte mail")).toBeVisible();
      await expect(page.getByText(email)).toBeVisible();
    } finally {
      await supprimerCompteParEmail(email);
    }
  });
});
