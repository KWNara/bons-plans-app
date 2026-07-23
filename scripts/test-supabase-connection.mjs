// Vérifie que .env.local contient les bonnes clés et que les tables
// du Point 2 sont bien accessibles depuis le client Supabase.
// Usage : npm run db:test

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url)) + "/..";
const envPath = join(rootDir, ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ .env.local introuvable à la racine du projet.");
  console.error("   Copie .env.example vers .env.local et remplis les valeurs Supabase.");
  process.exit(1);
}

for (const line of readFileSync(envPath, "utf-8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant dans .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = ["cities", "categories", "users", "deals"];
let allOk = true;

for (const table of tables) {
  const { error, count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    allOk = false;
    console.error(`❌ Table "${table}" : ${error.message}`);
  } else {
    console.log(`✓ Table "${table}" accessible (${count ?? 0} ligne(s))`);
  }
}

if (allOk) {
  console.log("\n🎉 Connexion Supabase OK, toutes les tables du Point 2 sont accessibles.");
} else {
  console.error("\n⚠️  Certaines tables sont inaccessibles — vérifie que les migrations ont bien été exécutées.");
  process.exit(1);
}
