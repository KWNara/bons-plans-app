// Fixtures partagées par les specs Playwright.
//
// Les comptes, commerçants et bons plans créés ici sont des VRAIES lignes
// dans le projet Supabase de développement — il n'existe pas d'instance de
// test séparée. Chaque fonction de création enregistre ce qu'elle a produit
// afin qu'une seule fonction de nettoyage, en fin de test, supprime
// exactement ce qui a été créé — jamais plus.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// `@playwright/test` n'exporte pas de nom pour ce type : browser.newContext()
// l'attend en ligne. Ce type local reprend exactement la même forme.
type EtatStockage = {
  cookies: never[];
  origins: { origin: string; localStorage: { name: string; value: string }[] }[];
};

function chargerEnvLocal(): Record<string, string> {
  const chemin = resolve(__dirname, "../../.env.local");
  const contenu = readFileSync(chemin, "utf-8");
  const valeurs: Record<string, string> = {};

  for (const ligne of contenu.split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) valeurs[m[1]] = m[2].trim();
  }

  return valeurs;
}

const env = chargerEnvLocal();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error("Variables Supabase manquantes dans .env.local.");
}

// La clé de stockage du client Supabase JS encode la référence du projet :
// sans le bon nom, une session injectée directement en `localStorage` est
// silencieusement ignorée au chargement de la page.
const REF_PROJET = new URL(SUPABASE_URL).hostname.split(".")[0];
const CLE_STOCKAGE = `sb-${REF_PROJET}-auth-token`;

const hs = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function suffixeUnique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export type CompteTest = {
  id: string;
  email: string;
  password: string;
  pseudo: string;
  storageState: EtatStockage;
};

/**
 * Crée un compte confirmé par l'API d'administration — jamais par
 * l'inscription publique, qui exige une confirmation par courriel et refuse
 * le domaine `example.com`. `storageState` peut être injecté directement dans
 * un contexte Playwright pour démarrer un test déjà connecté, sans repasser
 * par le formulaire à chaque fois.
 */
export async function creerCompte(prefixePseudo: string): Promise<CompteTest> {
  const suffixe = suffixeUnique();
  const pseudo = `${prefixePseudo}${suffixe}`;
  const email = `qa-${prefixePseudo.toLowerCase()}-${suffixe}@example.com`;
  const password = `Qa-${suffixe}Test!`;

  const resInscription = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: hs,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { pseudo } }),
  });

  if (!resInscription.ok) {
    throw new Error(`Création du compte de test échouée : ${await resInscription.text()}`);
  }

  const utilisateur = await resInscription.json();

  const resSession = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const session = await resSession.json();

  const valeurStockage = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  return {
    id: utilisateur.id,
    email,
    password,
    pseudo,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:3000",
          localStorage: [{ name: CLE_STOCKAGE, value: valeurStockage }],
        },
      ],
    },
  };
}

/** Retrouve un compte par son adresse — utile après une inscription pilotée
 * depuis l'UI, où le test ne connaît que l'e-mail qu'il a saisi. */
export async function idCompteParEmail(email: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  const { users } = (await res.json()) as { users: { id: string; email: string }[] };
  return users.find((u) => u.email === email)?.id ?? null;
}

/**
 * Promeut un compte en commerçant vérifié, avec une boutique prête à
 * publier. Contourne délibérément le formulaire d'adhésion (SIRET,
 * vérification) : ce que ces specs testent est ailleurs, cette étape n'est
 * que la mise en place du décor.
 */
export async function creerMerchant(userId: string, nomEnseigne: string): Promise<string> {
  await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: hs,
    body: JSON.stringify({ role: "commercant" }),
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/merchant_profiles`, {
    method: "POST",
    headers: { ...hs, Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: userId,
      nom_enseigne: nomEnseigne,
      statut_verification: "verifie",
    }),
  });

  const lignes = await res.json();
  return lignes[0].id;
}

/** Publie un bon plan directement en base : la publication via le vrai
 * formulaire est son propre sujet, distinct de ce que ces specs vérifient. */
export async function creerDealPublie(merchantId: string, titre: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/deals`, {
    method: "POST",
    headers: { ...hs, Prefer: "return=representation" },
    body: JSON.stringify({
      merchant_id: merchantId,
      titre,
      statut: "publie",
      photos: [],
    }),
  });

  const lignes = await res.json();
  return lignes[0].id;
}

/** Crée directement une amitié acceptée entre deux comptes — la demande puis
 * l'acceptation via l'UI ont leur propre spec (amis-messagerie), ce que
 * blocage.spec teste est en aval de cet état, pas ce chemin lui-même. */
export async function creerAmitie(unId: string, deuxId: string) {
  const [user_a, user_b] = [unId, deuxId].sort();
  await fetch(`${SUPABASE_URL}/rest/v1/friendships`, {
    method: "POST",
    headers: hs,
    body: JSON.stringify({ user_a, user_b, demandeur: unId, statut: "acceptee" }),
  });
}

/** Supprime des comptes par identifiant — la cascade des clés étrangères
 * emporte merchant_profiles, deals, comments, messages, friendships, etc. */
export async function supprimerComptes(...ids: (string | null | undefined)[]) {
  for (const id of ids) {
    if (!id) continue;
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    }).catch(() => {});
  }
}

export async function supprimerCompteParEmail(email: string) {
  const id = await idCompteParEmail(email);
  if (id) await supprimerComptes(id);
}
