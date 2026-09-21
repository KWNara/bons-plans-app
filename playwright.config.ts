import { defineConfig, devices } from "@playwright/test";

// `workers: 1` — les tests créent et suppriment de vrais comptes contre le
// projet Supabase réel (pas d'instance de test séparée) : la parallélisation
// n'apporterait rien ici, et resterait plus prudente tant que rien ne garantit
// l'isolation entre deux suites qui touchent les mêmes tables.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }]],
  // 60s : le serveur de dev Next.js compile chaque route à la volée à la
  // première visite — un spec qui navigue vers plusieurs routes jamais
  // encore compilées peut à lui seul y passer 15-20s avant même d'interagir.
  timeout: 60_000,
  // Le serveur de dev compile encore à la volée à la première visite d'une
  // route : le délai par défaut de 5s sur les assertions suffit rarement
  // pour une redirection post-connexion ou un premier appel réseau.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Réutilise un serveur déjà démarré (cas courant en développement) plutôt
  // que d'en lancer un second sur le même port.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
