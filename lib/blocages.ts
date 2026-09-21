import { supabase } from "@/lib/supabase";

export type Bloque = {
  relationId: string;
  id: string;
  pseudo: string;
  avatar_url: string | null;
};

type LigneBlocage = {
  id: string;
  blocked_id: string;
  profil: { id: string; pseudo: string; avatar_url: string | null } | null;
};

// La politique de lecture ne renvoie que MES blocages (jamais qui m'a
// bloqué) : cette liste est donc déjà le bon périmètre, sans filtrage
// supplémentaire côté client.
export async function chargerBlocages(moi: string): Promise<Bloque[]> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, blocked_id, profil:blocked_id (id, pseudo, avatar_url)")
    .eq("blocker_id", moi)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const lignes = (data as unknown as LigneBlocage[]) ?? [];

  return lignes
    .filter((l) => l.profil !== null)
    .map((l) => ({
      relationId: l.id,
      id: l.profil!.id,
      pseudo: l.profil!.pseudo,
      avatar_url: l.profil!.avatar_url,
    }));
}

/**
 * Est-ce que MOI j'ai bloqué cette personne ?
 *
 * Ne dit rien sur l'inverse — la lecture des blocages d'autrui n'est pas
 * accessible, par conception : un blocage se fait sans confrontation.
 */
export async function aiBloque(moi: string, cible: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("id")
    .eq("blocker_id", moi)
    .eq("blocked_id", cible)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function bloquer(moi: string, cible: string) {
  return supabase.from("blocked_users").insert({ blocker_id: moi, blocked_id: cible });
}

export async function debloquer(relationId: string) {
  return supabase.from("blocked_users").delete().eq("id", relationId);
}
