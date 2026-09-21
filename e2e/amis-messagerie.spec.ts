import { test, expect } from "@playwright/test";
import { creerCompte, supprimerComptes, type CompteTest } from "./fixtures/donnees";

// Le parcours central construit cette session : demande d'ami, acceptation,
// puis message — chacune de ces étapes pilotée par la vraie personne
// concernée, dans son propre contexte de navigateur, comme deux téléphones
// distincts.
test.describe("Amis et messagerie", () => {
  let alice: CompteTest;
  let bob: CompteTest;

  test.beforeAll(async () => {
    [alice, bob] = await Promise.all([creerCompte("Alice"), creerCompte("Bob")]);
  });

  test.afterAll(async () => {
    await supprimerComptes(alice?.id, bob?.id);
  });

  test("demande, acceptation, puis premier message", async ({ browser }) => {
    const contexteAlice = await browser.newContext({ storageState: alice.storageState });
    const contexteBob = await browser.newContext({ storageState: bob.storageState });
    const pageAlice = await contexteAlice.newPage();
    const pageBob = await contexteBob.newPage();

    await test.step("Alice envoie une demande à Bob", async () => {
      await pageAlice.goto(`/profil/${bob.id}`);
      await pageAlice.getByRole("button", { name: "Ajouter en ami" }).click();
      await expect(pageAlice.getByText("Demande envoyée")).toBeVisible();
    });

    await test.step("Bob voit la demande et l'accepte", async () => {
      await pageBob.goto("/amis");
      await expect(pageBob.getByText("Demandes reçues (1)")).toBeVisible();
      await expect(pageBob.getByText(alice.pseudo)).toBeVisible();

      await pageBob
        .getByRole("button", { name: `Accepter la demande de ${alice.pseudo}` })
        .click();

      await expect(pageBob.getByText("Demandes reçues")).toHaveCount(0);
    });

    await test.step("Alice voit maintenant Bob comme ami, et lui écrit", async () => {
      await pageAlice.goto(`/profil/${bob.id}`);
      await expect(pageAlice.getByText("Amis", { exact: true })).toBeVisible();

      await pageAlice.getByRole("link", { name: "Écrire" }).click();
      await expect(pageAlice).toHaveURL(new RegExp(`/messages/${bob.id}`));

      // `exact: true` : sans lui, "Message" matche aussi "Retour aux
      // messages" (recherche insensible à la casse et par sous-chaîne).
      const champMessage = pageAlice.getByLabel("Message", { exact: true });
      await champMessage.fill("On y va samedi ?");
      await pageAlice.getByRole("button", { name: "Envoyer" }).click();

      await expect(pageAlice.getByText("On y va samedi ?")).toBeVisible();
    });

    await test.step("Bob reçoit le message en temps réel", async () => {
      await pageBob.goto(`/messages/${alice.id}`);
      await expect(pageBob.getByText("On y va samedi ?")).toBeVisible();
    });

    await contexteAlice.close();
    await contexteBob.close();
  });
});
