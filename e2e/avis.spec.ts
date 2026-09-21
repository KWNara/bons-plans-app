import { test, expect } from "@playwright/test";
import {
  creerCompte,
  creerMerchant,
  supprimerComptes,
  type CompteTest,
} from "./fixtures/donnees";

test.describe("Avis sur un commerçant", () => {
  let enseigne: CompteTest;
  let client: CompteTest;
  let merchantId: string;

  test.beforeAll(async () => {
    [enseigne, client] = await Promise.all([creerCompte("Enseigne"), creerCompte("Client")]);
    merchantId = await creerMerchant(enseigne.id, "Épicerie de test Playwright");
  });

  test.afterAll(async () => {
    await supprimerComptes(enseigne?.id, client?.id);
  });

  test("déposer, modifier puis retirer un avis met à jour la moyenne", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: client.storageState });
    const page = await contexte.newPage();

    // retirerAvis() protège la suppression par un window.confirm() : sans
    // le gérer, l'étape "retirer" ci-dessous resterait bloquée en attente.
    page.on("dialog", (dialog) => dialog.accept());

    await test.step("déposer un premier avis", async () => {
      await page.goto(`/commercant/${merchantId}`);

      await page.getByRole("radio", { name: "4 étoiles" }).click();
      await page
        .getByPlaceholder("Ton expérience chez ce commerçant (optionnel)")
        .fill("Accueil très sympa, je recommande.");
      await page.getByRole("button", { name: "Envoyer" }).click();

      await expect(page.getByText("Ton avis", { exact: true })).toBeVisible();
      // Le commentaire apparaît deux fois : dans « Ton avis » et dans la
      // liste publique juste en dessous, qui inclut le sien.
      await expect(page.getByText("Accueil très sympa, je recommande.").first()).toBeVisible();
      await expect(page.getByText("Avis (1)")).toBeVisible();
    });

    await test.step("modifier l'avis change la note affichée", async () => {
      await page.getByRole("button", { name: "Modifier" }).click();
      await page.getByRole("radio", { name: "5 étoiles" }).click();
      await page.getByRole("button", { name: "Envoyer" }).click();

      await expect(page.getByText("Ton avis", { exact: true })).toBeVisible();
      await expect(page.getByRole("img", { name: "5 étoiles sur 5" }).first()).toBeVisible();
    });

    await test.step("retirer l'avis fait revenir au formulaire vide", async () => {
      await page.getByRole("button", { name: "Retirer" }).click();

      await expect(page.getByText("Laisser un avis")).toBeVisible();
      await expect(page.getByText("Avis (0)")).toBeVisible();
    });

    await contexte.close();
  });

  test("le propriétaire de l'enseigne ne peut pas se noter lui-même", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: enseigne.storageState });
    const page = await contexte.newPage();

    await page.goto(`/commercant/${merchantId}`);

    await expect(page.getByRole("radiogroup")).toHaveCount(0);
    await expect(page.getByText("Laisser un avis")).toHaveCount(0);

    await contexte.close();
  });
});
