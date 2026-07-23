import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Ce client sera utilisé dès le Point 2 (modèle de données)
// pour lire/écrire dans la base (deals, users, alerts, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
