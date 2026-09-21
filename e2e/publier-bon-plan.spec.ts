import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  creerCompte,
  creerMerchant,
  recupererVille,
  ajouterVilleDiffusion,
  retirerVilleDiffusion,
  compterDealsAvecTitre,
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

  test("une ville de diffusion retirée pendant la saisie n'aboutit pas à une annonce fantôme", async ({
    browser,
  }) => {
    // Reproduit exactement la course trouvée par l'audit : le formulaire a
    // déjà chargé ses villes en mémoire quand un autre onglet en retire une —
    // avant ce correctif, deals.insert() réussissait quand même et laissait
    // une annonce publiée sans aucune ville, invisible partout mais comptant
    // dans le quota.
    const commercant2 = await creerCompte("CommercantCourse");
    const merchant2Id = await creerMerchant(commercant2.id, "Boutique course Playwright");
    const ville2 = await recupererVille();
    await ajouterVilleDiffusion(merchant2Id, ville2.id);

    const contexte = await browser.newContext({ storageState: commercant2.storageState });
    const page = await contexte.newPage();
    const titre = `Annonce fantome ${Date.now()}`;

    try {
      await page.goto("/bons-plans/nouveau");
      await page.getByLabel("Titre").fill(titre);
      await page
        .getByRole("group", { name: "Villes de diffusion" })
        .getByRole("button", { name: new RegExp(ville2.nom) })
        .click();

      // Le formulaire garde la ville cochée en mémoire ; côté base, elle
      // vient d'être retirée par « un autre onglet ».
      await retirerVilleDiffusion(merchant2Id, ville2.id);

      await page.getByRole("button", { name: "Publier" }).click();

      await expect(
        page.getByText("La publication a échoué : villes de diffusion invalides. Réessaie.")
      ).toBeVisible();
      await expect(page).toHaveURL(/\/bons-plans\/nouveau/);

      expect(await compterDealsAvecTitre(merchant2Id, titre)).toBe(0);
    } finally {
      await contexte.close();
      await supprimerComptes(commercant2.id);
    }
  });
});
