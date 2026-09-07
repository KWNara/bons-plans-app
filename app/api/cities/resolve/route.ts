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

  const nomPropre = nom?.trim();

  if (
    !nomPropre ||
    nomPropre.length > 80 ||
    !/^\d{5}$/.test(code_postal ?? "") ||
    !/^\d[a-zA-Z0-9]{4}$/.test(code_insee ?? "")
  ) {
    return Response.json({ error: "Données de ville invalides." }, { status: 400 });
  }

  // Cette route s'exécute avec la clé de service (RLS contournée) et sans
  // authentification : un upsert écraserait le nom d'une ville existante pour
  // tout le site. On ne crée donc que ce qui n'existe pas encore.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("cities")
    .select("id, nom, code_postal")
    .eq("code_insee", code_insee!)
    .maybeSingle();

  if (lookupError) {
    return Response.json({ error: "Impossible d'enregistrer cette ville." }, { status: 500 });
  }

  if (existing) {
    return Response.json({ city: existing });
  }

  const { data, error } = await supabaseAdmin
    .from("cities")
    .insert({
      nom: nomPropre,
      code_postal,
      code_insee,
      region: region?.trim().slice(0, 80) || null,
    })
    .select("id, nom, code_postal")
    .single();

  if (error) {
    // 23505 = violation d'unicité : un autre visiteur vient d'insérer la même
    // ville entre notre lecture et notre écriture. La ligne existe, c'est le
    // résultat attendu — on la relit plutôt que de renvoyer une erreur.
    if (error.code === "23505") {
      const { data: raced } = await supabaseAdmin
        .from("cities")
        .select("id, nom, code_postal")
        .eq("code_insee", code_insee!)
        .single();

      if (raced) return Response.json({ city: raced });
    }

    return Response.json({ error: "Impossible d'enregistrer cette ville." }, { status: 500 });
  }

  return Response.json({ city: data });
}
