import { test, expect } from "@playwright/test";
import {
  creerCompte,
  creerMerchant,
  creerDealPublie,
  supprimerComptes,
  type CompteTest,
} from "./fixtures/donnees";

test.describe("Mentions dans les commentaires", () => {
  let auteur: CompteTest;
  let cite: CompteTest;
  let merchantOwner: CompteTest;
  let dealId: string;

  test.beforeAll(async () => {
    [auteur, cite, merchantOwner] = await Promise.all([
      creerCompte("Auteur"),
      creerCompte("Cite"),
      creerCompte("Enseigne"),
    ]);

    const merchantId = await creerMerchant(merchantOwner.id, "Boutique de test Playwright");
    dealId = await creerDealPublie(merchantId, "Bon plan de test pour les mentions");
  });

  test.afterAll(async () => {
    await supprimerComptes(auteur?.id, cite?.id, merchantOwner?.id);
  });

  test("citer un pseudo connu crée un lien vers son profil", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: auteur.storageState });
    const page = await contexte.newPage();

    await page.goto(`/bons-plans/${dealId}`);

    const champ = page.getByLabel("Ajouter un commentaire");
    await champ.fill(`Merci @${cite.pseudo}, ravi de te croiser ici.`);

    // L'autocomplétion se déclenche sur le fragment après @ : on la laisse
    // se refermer d'elle-même plutôt que de cliquer une suggestion, pour
    // vérifier que le texte tapé intégralement produit bien le même résultat.
    await page.keyboard.press("Escape").catch(() => {});
    await page.getByRole("button", { name: "Publier" }).click();

    const lienMention = page.getByRole("link", { name: `@${cite.pseudo}` });
    await expect(lienMention).toBeVisible();
    await expect(lienMention).toHaveAttribute("href", `/profil/${cite.id}`);

    await contexte.close();
  });
});
