import { supabase } from "@/lib/supabase";

export type Ami = {
  relationId: string;
  id: string;
  pseudo: string;
  avatar_url: string | null;
};

export type DemandeRecue = Ami;

type LigneAmitie = {
  id: string;
  user_a: string;
  user_b: string;
  demandeur: string;
  statut: "en_attente" | "acceptee" | "refusee";
  profil_a: { id: string; pseudo: string; avatar_url: string | null } | null;
  profil_b: { id: string; pseudo: string; avatar_url: string | null } | null;
};

const SELECTION =
  "id, user_a, user_b, demandeur, statut, profil_a:user_a (id, pseudo, avatar_url), profil_b:user_b (id, pseudo, avatar_url)";

// La paire est stockée ordonnée (plus petit identifiant d'abord) pour qu'une
// même relation ne puisse pas exister en double si chacun invite l'autre.
export function pairOrdonnee(un: string, deux: string) {
  return un < deux ? { user_a: un, user_b: deux } : { user_a: deux, user_b: un };
}

function autreProfil(ligne: LigneAmitie, moi: string): Ami | null {
  const profil = ligne.user_a === moi ? ligne.profil_b : ligne.profil_a;
  if (!profil) return null;
  return {
    relationId: ligne.id,
    id: profil.id,
    pseudo: profil.pseudo,
    avatar_url: profil.avatar_url,
  };
}

export async function chargerRelations(moi: string) {
  const { data, error } = await supabase
    .from("friendships")
    .select(SELECTION)
    .or(`user_a.eq.${moi},user_b.eq.${moi}`);

  if (error) throw error;

  const lignes = (data as unknown as LigneAmitie[]) ?? [];

  return {
    amis: lignes
      .filter((l) => l.statut === "acceptee")
      .map((l) => autreProfil(l, moi))
      .filter((a): a is Ami => a !== null),
    recues: lignes
      .filter((l) => l.statut === "en_attente" && l.demandeur !== moi)
      .map((l) => autreProfil(l, moi))
      .filter((a): a is Ami => a !== null),
    envoyees: lignes
      .filter((l) => l.statut === "en_attente" && l.demandeur === moi)
      .map((l) => autreProfil(l, moi))
      .filter((a): a is Ami => a !== null),
  };
}

export async function envoyerDemande(moi: string, cible: string) {
  return supabase
    .from("friendships")
    .insert({ ...pairOrdonnee(moi, cible), demandeur: moi });
}

export async function repondreDemande(relationId: string, accepte: boolean) {
  if (accepte) {
    return supabase.from("friendships").update({ statut: "acceptee" }).eq("id", relationId);
  }
  // Un refus supprime la ligne plutôt que de la marquer : garder une trace
  // d'un refus n'a aucune utilité et empêcherait une nouvelle demande plus
  // tard, la paire étant unique.
  return supabase.from("friendships").delete().eq("id", relationId);
}

export async function retirerAmi(relationId: string) {
  return supabase.from("friendships").delete().eq("id", relationId);
}

export async function rechercherUtilisateurs(terme: string, moi: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id, pseudo, avatar_url")
    .ilike("pseudo", `%${terme}%`)
    .neq("id", moi)
    .limit(10);

  if (error) throw error;
  return data ?? [];
}
