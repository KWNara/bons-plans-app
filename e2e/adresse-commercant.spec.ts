import { test, expect } from "@playwright/test";
import { creerCompte, creerMerchant, placerCommerce, supprimerComptes, type CompteTest } from "./fixtures/donnees";

// Un commerçant sans adresse est absent de la carte des partenaires : il doit
// en être prévenu là où il passe, et le rappel doit disparaître une fois
// l'adresse renseignée.
test.describe("Rappel d'adresse du commerçant", () => {
  let commercant: CompteTest;
  let merchantId: string;

  test.beforeAll(async () => {
    commercant = await creerCompte("AdresseCommercant");
    merchantId = await creerMerchant(commercant.id, `Boutique sans adresse ${Date.now()}`);
  });

  test.afterAll(async () => {
    await supprimerComptes(commercant?.id);
  });

  test("le rappel mène au compte, puis disparaît une fois l'adresse renseignée", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: commercant.storageState });
    const page = await contexte.newPage();
    const rappel = page.getByRole("link", { name: /Tu n'es pas encore sur la carte/ });
    // N'apparaît qu'une fois la page chargée : sert de repère avant de
    // conclure à l'absence du rappel.
    const pageChargee = page.getByText("Aucun bon plan pour l'instant");

    await test.step("sans adresse, Mes bons plans invite à la renseigner", async () => {
      await page.goto("/mes-bons-plans");
      await expect(rappel).toBeVisible();
      await rappel.click();
      await expect(page).toHaveURL(/\/compte/);
      await expect(
        page.getByText("Ajoute l'adresse de ta boutique pour apparaître sur la carte des partenaires.")
      ).toBeVisible();
    });

    await test.step("avec une adresse, le rappel disparaît", async () => {
      await placerCommerce(merchantId, 47.2401, 6.0213, "2 rue du Rappel, 25000 Besançon");
      await page.goto("/mes-bons-plans");
      await expect(pageChargee).toBeVisible();
      await expect(rappel).toHaveCount(0);
    });

    await contexte.close();
  });

  test("le formulaire « Devenir commerçant » propose déjà l'adresse", async ({ browser }) => {
    const particulier = await creerCompte("FuturCommercant");
    const contexte = await browser.newContext({ storageState: particulier.storageState });
    const page = await contexte.newPage();

    try {
      await page.goto("/devenir-commercant");
      await expect(page.getByLabel("Adresse (optionnel)")).toBeVisible();
      await expect(page.getByText("Choisis une suggestion pour apparaître sur la carte.")).toBeVisible();
    } finally {
      await contexte.close();
      await supprimerComptes(particulier.id);
    }
  });
});
