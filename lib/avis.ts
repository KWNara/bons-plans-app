import { supabase } from "@/lib/supabase";

export type Avis = {
  id: string;
  note: number;
  commentaire: string | null;
  created_at: string;
  user_id: string;
  auteur: { pseudo: string; avatar_url: string | null } | null;
};

export type Resume = { moyenne: number; total: number };

type LigneAvis = Omit<Avis, "auteur"> & {
  users: { pseudo: string; avatar_url: string | null } | null;
};

export async function chargerResume(merchantId: string): Promise<Resume> {
  const { data, error } = await supabase
    .rpc("avis_resume", { p_merchant_id: merchantId })
    .single();

  if (error) throw error;

  const ligne = data as { moyenne: number | string; total: number };
  return { moyenne: Number(ligne.moyenne), total: ligne.total };
}

export async function chargerAvis(merchantId: string): Promise<Avis[]> {
  const { data, error } = await supabase
    .from("merchant_reviews")
    .select("id, note, commentaire, created_at, user_id, users:user_id (pseudo, avatar_url)")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return ((data as unknown as LigneAvis[]) ?? []).map((l) => ({
    id: l.id,
    note: l.note,
    commentaire: l.commentaire,
    created_at: l.created_at,
    user_id: l.user_id,
    auteur: l.users,
  }));
}

export async function monAvis(merchantId: string, userId: string) {
  const { data, error } = await supabase
    .from("merchant_reviews")
    .select("id, note, commentaire")
    .eq("merchant_id", merchantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deposerAvis(
  avisExistantId: string | null,
  merchantId: string,
  userId: string,
  note: number,
  commentaire: string
) {
  const valeurs = { note, commentaire: commentaire.trim() || null };

  if (avisExistantId) {
    return supabase.from("merchant_reviews").update(valeurs).eq("id", avisExistantId);
  }

  return supabase
    .from("merchant_reviews")
    .insert({ merchant_id: merchantId, user_id: userId, ...valeurs });
}

export async function supprimerAvis(avisId: string) {
  return supabase.from("merchant_reviews").delete().eq("id", avisId);
}
