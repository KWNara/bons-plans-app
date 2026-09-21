import { defineConfig } from "vitest/config";

// Sans ce fichier, le glob par défaut de Vitest (`*.spec.ts`) ramasse aussi
// les specs Playwright du dossier e2e/, qui définissent leur propre
// test.describe() incompatible avec le runner Vitest.
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/.next/**", "e2e/**"],
  },
});
