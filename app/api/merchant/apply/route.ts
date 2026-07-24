import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkSiret, isValidSiretFormat } from "@/lib/siret";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: "Session invalide." }, { status: 401 });
  }

  const body = await req.json();
  const { siret, nom_enseigne, category_id, ville_principale_id, logo_url } = body as {
    siret?: string;
    nom_enseigne?: string;
    category_id?: string;
    ville_principale_id?: string;
    logo_url?: string;
  };

  if (!siret || !isValidSiretFormat(siret)) {
    return Response.json(
      { error: "Le numéro SIRET doit contenir exactement 14 chiffres." },
      { status: 400 }
    );
  }
  if (!nom_enseigne?.trim()) {
    return Response.json({ error: "Le nom d'enseigne est requis." }, { status: 400 });
  }

  const { data: existing } = await supabaseAdmin
    .from("merchant_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return Response.json(
      { error: "Un profil commerçant existe déjà pour ce compte." },
      { status: 409 }
    );
  }

  const result = await checkSiret(siret);

  if (result.status === "introuvable") {
    return Response.json(
      { error: "Ce numéro SIRET est introuvable. Vérifie qu'il est correct." },
      { status: 422 }
    );
  }
  if (result.status === "ferme") {
    return Response.json(
      { error: "Cet établissement est fermé selon le registre Sirene. Inscription refusée." },
      { status: 422 }
    );
  }

  const statut_verification =
    result.status === "valide" ? "verifie" : "en_attente_verification";

  const { error: insertError } = await supabaseAdmin.from("merchant_profiles").insert({
    user_id: user.id,
    nom_enseigne: nom_enseigne.trim(),
    siret,
    category_id: category_id || null,
    ville_principale_id: ville_principale_id || null,
    logo_url: logo_url || null,
    statut_verification,
  });

  if (insertError) {
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const { error: roleError } = await supabaseAdmin
    .from("users")
    .update({ role: "commercant" })
    .eq("id", user.id);

  if (roleError) {
    return Response.json({ error: roleError.message }, { status: 500 });
  }

  return Response.json({ statut_verification });
}
