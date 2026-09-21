import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Position officielle d'une commune, redemandée à l'API Adresse.
 *
 * Les coordonnées étaient auparavant celles envoyées par le client. Or cette
 * route s'exécute avec la clé de service, sans authentification, et écrit sur
 * une ligne partagée par tout le site : n'importe qui pouvait déplacer une
 * commune sur la carte de tous les visiteurs. La validation de bornes ne
 * vérifiait que la plausibilité, jamais la correspondance avec le code INSEE.
 *
 * Un échec ici n'est pas bloquant : la ville s'enregistre sans position, et la
 * carte se recentre sur son premier repère.
 */
async function positionDeLaCommune(
  codeInsee: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(codeInsee)}&type=municipality&citycode=${encodeURIComponent(codeInsee)}&limit=1`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const paire = data.features?.[0]?.geometry?.coordinates;

    if (!Array.isArray(paire) || paire.length !== 2) return null;

    const [longitude, latitude] = paire;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return null;
    }

    return { latitude, longitude };
  } catch {
    return null;
  }
}

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
    .select("id, nom, code_postal, latitude")
    .eq("code_insee", code_insee!)
    .maybeSingle();

  if (lookupError) {
    return Response.json({ error: "Impossible d'enregistrer cette ville." }, { status: 500 });
  }

  if (existing) {
    // Les villes enregistrées avant l'ajout des coordonnées n'en ont pas : on
    // complète au passage, sans jamais écraser une position déjà connue. Le
    // géocodage n'est donc déclenché que dans ce cas, pas à chaque sélection.
    if (existing.latitude === null) {
      const position = await positionDeLaCommune(code_insee!);

      if (position) {
        await supabaseAdmin.from("cities").update(position).eq("id", existing.id);
      }
    }

    return Response.json({
      city: { id: existing.id, nom: existing.nom, code_postal: existing.code_postal },
    });
  }

  const position = await positionDeLaCommune(code_insee!);

  const { data, error } = await supabaseAdmin
    .from("cities")
    .insert({
      nom: nomPropre,
      code_postal,
      code_insee,
      region: region?.trim().slice(0, 80) || null,
      latitude: position?.latitude ?? null,
      longitude: position?.longitude ?? null,
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
