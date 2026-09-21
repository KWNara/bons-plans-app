import { test, expect } from "@playwright/test";
import { creerCompte, creerAmitie, supprimerComptes, type CompteTest } from "./fixtures/donnees";

test.describe("Blocage d'un compte", () => {
  let alice: CompteTest;
  let bob: CompteTest;

  test.beforeAll(async () => {
    [alice, bob] = await Promise.all([creerCompte("Alice"), creerCompte("Bob")]);
    await creerAmitie(alice.id, bob.id);
  });

  test.afterAll(async () => {
    await supprimerComptes(alice?.id, bob?.id);
  });

  test("bloquer rompt l'amitié, débloquer restitue les actions sociales", async ({ browser }) => {
    const contexte = await browser.newContext({ storageState: alice.storageState });
    const page = await contexte.newPage();

    // window.confirm() protège le blocage : sans le gérer, le clic
    // n'aboutirait jamais et le test resterait bloqué en attente.
    page.on("dialog", (dialog) => dialog.accept());

    await test.step("bloquer un ami rompt l'amitié", async () => {
      await page.goto(`/profil/${bob.id}`);
      await expect(page.getByText("Amis", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "Bloquer ce compte" }).click();

      await expect(page.getByText("Tu as bloqué ce compte.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Débloquer" })).toBeVisible();

      // L'amitié rompue par le trigger côté base : plus de bouton « Écrire »,
      // ni aucune autre action sociale tant que le blocage tient.
      await expect(page.getByRole("link", { name: "Écrire" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ajouter en ami" })).toHaveCount(0);
    });

    await test.step("débloquer restitue le bouton d'ajout en ami", async () => {
      await page.getByRole("button", { name: "Débloquer" }).click();

      await expect(page.getByText("Tu as bloqué ce compte.")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Ajouter en ami" })).toBeVisible();
    });

    await contexte.close();
  });
});
