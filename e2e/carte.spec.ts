import { test, expect } from "@playwright/test";
import {
  creerCompte,
  creerMerchant,
  creerDealPublie,
  placerCommerce,
  supprimerComptes,
  supprimerCommercesParPrefixe,
  type CompteTest,
} from "./fixtures/donnees";

const PREFIXE = "Carte Playwright";

// La carte est publique : ces tests tournent sans compte connecté, comme un
// visiteur qui découvre les partenaires.
test.describe("Carte des partenaires", () => {
  let proche: CompteTest;
  let loin: CompteTest;
  let merchantId: string;
  const nom = `${PREFIXE} ${Date.now()}`;
  const nomLoin = `${PREFIXE} Brest ${Date.now()}`;
  const titreOffre = `Offre carte ${Date.now()}`;

  test.beforeAll(async () => {
    // Un reste d'un passage interrompu, placé aux mêmes coordonnées, serait
    // regroupé avec le commerce de test et rendrait son repère introuvable.
    await supprimerCommercesParPrefixe(PREFIXE);

    [proche, loin] = await Promise.all([creerCompte("CarteProche"), creerCompte("CarteLoin")]);
    merchantId = await creerMerchant(proche.id, nom);
    const merchantLoinId = await creerMerchant(loin.id, nomLoin);
    await Promise.all([
      placerCommerce(merchantId, 47.2378, 6.0241, "1 rue du Test, 25000 Besançon"),
      placerCommerce(merchantLoinId, 48.3904, -4.4861, "1 rue du Test, 29200 Brest"),
      creerDealPublie(merchantId, titreOffre),
    ]);
  });

  test.afterAll(async () => {
    await supprimerComptes(proche?.id, loin?.id);
  });

  test("chercher un commerce, voir ses offres, puis rouvrir sa fiche depuis son repère", async ({ page }) => {
    await page.goto("/carte");

    const recherche = page.getByRole("combobox", { name: "Rechercher une ville ou un commerce" });
    const carteLoin = page.getByRole("link", { name: new RegExp(nomLoin) });

    await test.step("sans ville choisie, la carte montre tous les partenaires", async () => {
      await expect(carteLoin).toBeVisible();
    });

    await test.step("la recherche trouve le commerce et y envoie la carte", async () => {
      await recherche.fill(nom);
      await expect(page.getByRole("option", { name: nom })).toBeVisible();
      await recherche.press("Enter");

      const fiche = page.getByRole("dialog", { name: nom });
      await expect(fiche.getByRole("link", { name: titreOffre })).toBeVisible();
      await expect(fiche.getByRole("link", { name: "Voir la boutique →" })).toHaveAttribute(
        "href",
        `/commercant/${merchantId}`
      );
    });

    await test.step("la liste suit la zone affichée", async () => {
      await expect(page.getByRole("link", { name: new RegExp(`^${nom}`) }).first()).toBeVisible();
      // Brest est sorti du cadre : s'il restait listé, le filtrage par zone
      // serait cassé.
      await expect(carteLoin).toHaveCount(0);
    });

    await test.step("Échap ferme la fiche, le repère la rouvre", async () => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: nom })).toHaveCount(0);

      // Leaflet reporte le `title` du repère sur son icône, qui fait 0 × 0 :
      // on clique la pastille visible à l'intérieur, comme un utilisateur.
      await page.getByTitle(nom).getByText("1 offre").click();
      await expect(page.getByRole("dialog", { name: nom })).toBeVisible();
    });
  });
});
