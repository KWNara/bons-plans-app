import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  creerCompte,
  creerMerchant,
  recupererVille,
  ajouterVilleDiffusion,
  supprimerComptes,
  type CompteTest,
} from "./fixtures/donnees";

// La sécurité de ce flux (quota, RLS, bornes de stockage) est déjà couverte
// par scripts/qa-securite.ps1 côté REST. Ce qui manquait, c'est la preuve
// que le VRAI formulaire — upload de photo compris — mène bien à une
// annonce publiée et visible.
test.describe("Publier un bon plan", () => {
  let commercant: CompteTest;
  let merchantId: string;
  let ville: { id: string; nom: string };

  test.beforeAll(async () => {
    commercant = await creerCompte("Commercant");
    merchantId = await creerMerchant(commercant.id, "Boutique de test Playwright");
    ville = await recupererVille();
    await ajouterVilleDiffusion(merchantId, ville.id);
  });

  test.afterAll(async () => {
    await supprimerComptes(commercant?.id);
  });

  test("sans ville selectionnee, le formulaire refuse avant tout envoi", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: commercant.storageState });
    const page = await contexte.newPage();

    await page.goto("/bons-plans/nouveau");

    await page.getByLabel("Titre").fill("Annonce sans ville");
    await page.getByRole("button", { name: "Publier" }).click();

    // Contrôle client, avant tout appel réseau : la ville qu'ajoute la
    // fixture n'est jamais cochée par défaut.
    await expect(page.getByText("Choisis au moins une ville de diffusion.")).toBeVisible();
    await expect(page).toHaveURL(/\/bons-plans\/nouveau/);

    await contexte.close();
  });

  test("publier avec une photo et une ville mène à l'annonce en ligne", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: commercant.storageState });
    const page = await contexte.newPage();
    const titre = `Annonce Playwright ${Date.now()}`;

    await page.goto("/bons-plans/nouveau");

    await page.getByLabel("Titre").fill(titre);
    await page.getByLabel("Description").fill("Décrite par un test end-to-end.");

    await page
      .locator('input[type="file"]')
      .setInputFiles(path.resolve(__dirname, "../public/icons/icon-192.png"));
    await expect(page.getByRole("button", { name: /Retirer la photo/ })).toBeVisible();

    await page.getByLabel("Prix avant").fill("20");
    await page.getByLabel("Prix après").fill("14");

    // Fieldset "Villes de diffusion" : un <fieldset> expose un rôle "group"
    // dont le nom accessible vient de sa <legend>.
    await page
      .getByRole("group", { name: "Villes de diffusion" })
      .getByRole("button", { name: new RegExp(ville.nom) })
      .click();

    await page.getByRole("button", { name: "Publier" }).click();

    await expect(page).toHaveURL(/\/mes-bons-plans/);
    await expect(page.getByText(titre)).toBeVisible();

    await contexte.close();
  });
});
