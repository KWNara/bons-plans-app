import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client privilégié : ne jamais importer depuis un composant client.
// Utilisé uniquement dans les routes API (app/api/**/route.ts) pour les
// opérations qui doivent contourner les policies RLS (ex: vérification SIRET).
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
