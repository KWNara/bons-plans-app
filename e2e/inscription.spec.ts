import { test, expect } from "@playwright/test";

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

  // Les deux cas suivants simulent le serveur d'authentification. Un vrai
  // appel n'est pas fiable ici : Supabase refuse les adresses en @example.com,
  // une vraie adresse recevrait un vrai e-mail (sur un quota d'envoi minuscule
  // en plan gratuit), et les inscriptions répétées depuis la même machine
  // finissent bridées (« Trop de tentatives ») avant même d'être examinées.
  // Ce qui est testé, c'est la réaction du formulaire.

  test("une adresse refusée par Supabase affiche un message clair", async ({ page }) => {
    // Forme exacte de la réponse réelle de Supabase pour une adresse refusée.
    await page.route("**/auth/v1/signup**", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          code: 400,
          error_code: "email_address_invalid",
          msg: 'Email address "qa-refus@example.com" is invalid',
        }),
      })
    );

    await page.goto("/inscription");

    await page.getByLabel("Pseudo").fill(`QaRefus${Date.now()}`);
    await page.getByLabel("Email").fill(`qa-refus-${Date.now()}@example.com`);
    await page.locator('input[type="password"]').fill("MotDePasseTest!1");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page.getByText("Cette adresse email n'est pas valide.")).toBeVisible();
    await expect(page).toHaveURL(/\/inscription/);
  });

  test("une inscription acceptée mène à l'écran de confirmation", async ({ page }) => {
    const email = "qa-inscription@example.com";
    await page.route("**/auth/v1/signup**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          id: "00000000-0000-4000-8000-000000000000",
          aud: "authenticated",
          email,
          user_metadata: {},
          app_metadata: {},
          created_at: new Date().toISOString(),
        }),
      })
    );

    await page.goto("/inscription");

    await page.getByLabel("Pseudo").fill("QaInscription");
    await page.getByLabel("Email").fill(email);
    await page.locator('input[type="password"]').fill("MotDePasseTest!1");
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page.getByText("Vérifie ta boîte mail")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });
});
