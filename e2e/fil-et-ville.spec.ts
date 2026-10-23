import { test, expect } from "@playwright/test";
import {
  creerCompte,
  creerMerchant,
  creerDealPublie,
  diffuserDans,
  etatAvecVille,
  recupererVille,
  supprimerComptes,
  type CompteTest,
} from "./fixtures/donnees";

test.describe("Fil d'une ville", () => {
  let enseigne: CompteTest;
  let ville: { id: string; nom: string; code_postal: string };
  const titreFlash = `Flash Playwright ${Date.now()}`;
  const titreDurable = `Durable Playwright ${Date.now()}`;

  test.beforeAll(async () => {
    enseigne = await creerCompte("FilEnseigne");
    const merchantId = await creerMerchant(enseigne.id, `Boutique fil ${Date.now()}`);
    ville = await recupererVille();

    const [flash, durable] = await Promise.all([
      // Se termine dans 3 h : une offre « flash » (moins de 24 h restantes).
      creerDealPublie(merchantId, titreFlash, {
        date_fin: new Date(Date.now() + 3 * 3_600_000).toISOString(),
        reduction_pourcentage: 20,
      }),
      creerDealPublie(merchantId, titreDurable),
    ]);
    await Promise.all([diffuserDans(flash, ville.id), diffuserDans(durable, ville.id)]);
  });

  test.afterAll(async () => {
    await supprimerComptes(enseigne?.id);
  });

  test("le filtre flash ne garde que les offres qui se terminent dans les 24 h", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: etatAvecVille(ville) });
    const page = await contexte.newPage();

    await page.goto("/");
    await expect(page.getByText(titreFlash)).toBeVisible();
    await expect(page.getByText(titreDurable)).toBeVisible();

    const filtreFlash = page.getByRole("button", { name: /^Flash · \d+$/ });
    await filtreFlash.click();

    await expect(filtreFlash).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(titreFlash)).toBeVisible();
    await expect(page.getByText(titreDurable)).toHaveCount(0);

    await contexte.close();
  });
});

test("choisir une ville depuis /ville la place en tête du fil", async ({ page }) => {
  // Besançon existe déjà en base : la sélection ne crée aucune ville.
  await page.goto("/ville");
  await page.getByLabel("Rechercher").fill("Besançon");
  await page.getByRole("button", { name: "Besançon (25000)" }).click();

  await expect(page.getByText("Ville active")).toBeVisible();

  await page.getByRole("link", { name: "Retour au fil" }).click();
  await expect(page.getByRole("link", { name: /Besançon/ }).first()).toBeVisible();
});
