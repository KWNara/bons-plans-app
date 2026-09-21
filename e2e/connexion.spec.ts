import { test, expect } from "@playwright/test";
import { creerCompte, supprimerComptes, type CompteTest } from "./fixtures/donnees";

test.describe("Connexion", () => {
  let compte: CompteTest;

  test.beforeAll(async () => {
    compte = await creerCompte("Connexion");
  });

  test.afterAll(async () => {
    await supprimerComptes(compte?.id);
  });

  test("un identifiant valide mène au compte", async ({ page }) => {
    await page.goto("/connexion");

    await page.getByLabel("Email").fill(compte.email);
    // `getByLabel("Mot de passe")` est ambigu : le <label> englobe aussi le
    // bouton « Afficher le mot de passe », lui-même labelable, ce qui
    // produit deux correspondances. Le champ mot de passe est le seul de
    // son type sur la page.
    await page.locator('input[type="password"]').fill(compte.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/compte/);
    await expect(page.getByText(compte.pseudo)).toBeVisible();
  });

  test("un mauvais mot de passe affiche une erreur, sans naviguer", async ({ page }) => {
    await page.goto("/connexion");

    await page.getByLabel("Email").fill(compte.email);
    await page.locator('input[type="password"]').fill("un-mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();

    // Le message vient de lib/authErrors.ts : Supabase renvoie l'anglais
    // technique « Invalid login credentials », traduit avant affichage.
    await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/connexion/);
  });
});
