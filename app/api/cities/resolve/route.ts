import { supabaseAdmin } from "@/lib/supabaseAdmin";

// "Trouve ou crée" une ville à partir d'un résultat de l'API Adresse
// (api-adresse.data.gouv.fr). Public : un visiteur non connecté doit
// pouvoir sélectionner une ville, donc pas d'authentification requise ici.
export async function POST(req: Request) {
  const body = await req.json();
  const { nom, code_postal, code_insee, region } = body as {
    nom?: string;
    code_postal?: string;
    code_insee?: string;
    region?: string;
  };

  if (!nom?.trim() || !/^\d{5}$/.test(code_postal ?? "") || !/^\d[a-zA-Z0-9]{4}$/.test(code_insee ?? "")) {
    return Response.json({ error: "Données de ville invalides." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("cities")
    .upsert(
      { nom: nom.trim(), code_postal, code_insee, region: region || null },
      { onConflict: "code_insee" }
    )
    .select("id, nom, code_postal")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ city: data });
}
