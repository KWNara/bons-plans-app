import { test, expect } from "@playwright/test";
import {
  STRIPE_EN_MODE_TEST,
  clientStripeDe,
  creerCompte,
  creerMerchant,
  stripeTest,
  supprimerComptes,
  type CompteTest,
} from "./fixtures/donnees";

test("« Mon abonnement » affiche le plan du commerçant", async ({ browser }) => {
  // Lu via mon_abonnement() : les colonnes de paiement ne sont plus lisibles
  // directement, le statut d'un commerçant ne regardant que lui.
  const commercant = await creerCompte("AboPage");
  await creerMerchant(commercant.id, `Boutique page abonnement ${Date.now()}`);
  const contexte = await browser.newContext({ storageState: commercant.storageState });
  const page = await contexte.newPage();

  try {
    await page.goto("/mon-abonnement");
    await expect(page.getByText("Gratuit", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Passer en Pro" })).toBeVisible();
  } finally {
    await contexte.close();
    await supprimerComptes(commercant.id);
  }
});

// Ces tests appellent la vraie route de paiement, qui parle à Stripe : ils ne
// tournent qu'avec une clé du mode TEST (aucun argent réel), et suppriment le
// client Stripe qu'ils ont fait créer.
test.describe("Paiement de l'abonnement Pro", () => {
  test.skip(!STRIPE_EN_MODE_TEST, "Clé Stripe absente ou du mode live : rien n'est créé chez Stripe.");

  let verifie: CompteTest;
  let nonVerifie: CompteTest;
  let merchantId: string;

  test.beforeAll(async () => {
    [verifie, nonVerifie] = await Promise.all([creerCompte("AboVerifie"), creerCompte("AboNonVerifie")]);
    merchantId = await creerMerchant(verifie.id, `Boutique abonnement ${Date.now()}`);
    await creerMerchant(nonVerifie.id, `Boutique en attente ${Date.now()}`, "en_attente_verification");
  });

  test.afterAll(async () => {
    const client = merchantId ? await clientStripeDe(merchantId) : null;
    if (client) await stripeTest(`customers/${client}`, "DELETE");
    await supprimerComptes(verifie?.id, nonVerifie?.id);
  });

  const payer = (request: import("@playwright/test").APIRequestContext, compte: CompteTest) =>
    request.post("/api/stripe/checkout", { headers: { Authorization: `Bearer ${compte.accessToken}` } });

  // L'URL de Checkout porte l'identifiant de session : …/c/pay/cs_test_…#…
  const sessionDe = (url: string) => url.match(/(cs_test_[A-Za-z0-9]+)/)![1];

  test("un commerçant non vérifié ne peut pas payer un Pro inutilisable", async ({ request }) => {
    const res = await payer(request, nonVerifie);
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toContain("vérifié");
  });

  test("une seule session de paiement reste ouverte à la fois", async ({ request }) => {
    const premiere = await payer(request, verifie);
    expect(premiere.status()).toBe(200);
    const url1 = (await premiere.json()).url as string;
    expect(url1).toContain("checkout.stripe.com");

    // Second clic (autre onglet, retour arrière) : la première session doit
    // être expirée, sinon les deux restaient payables et créaient deux
    // abonnements.
    const seconde = await payer(request, verifie);
    expect(seconde.status()).toBe(200);
    const url2 = (await seconde.json()).url as string;

    expect((await stripeTest(`checkout/sessions/${sessionDe(url1)}`)).status).toBe("expired");
    expect((await stripeTest(`checkout/sessions/${sessionDe(url2)}`)).status).toBe("open");
  });
});
