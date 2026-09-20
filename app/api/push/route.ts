import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Envoie une notification push à tous les appareils d'un utilisateur.
 *
 * La route s'exécute avec la clé de service et peut donc écrire à n'importe qui :
 * elle est protégée par un secret partagé, sans lequel n'importe quel visiteur
 * pourrait faire sonner le téléphone de n'importe quel compte.
 */

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const CLE_PRIVEE = process.env.VAPID_PRIVATE_KEY;
const SUJET = process.env.VAPID_SUBJECT ?? "mailto:contact@deniche.app";
const SECRET = process.env.PUSH_WEBHOOK_SECRET;

type Corps = {
  user_id?: string;
  titre?: string;
  corps?: string;
  url?: string;
  tag?: string;
};

export async function POST(req: Request) {
  if (!CLE_PUBLIQUE || !CLE_PRIVEE) {
    return Response.json({ error: "Notifications push non configurées." }, { status: 503 });
  }

  // Comparaison en longueur constante : une comparaison naïve laisse fuiter le
  // secret caractère par caractère à qui mesure le temps de réponse.
  const fourni = req.headers.get("x-push-secret") ?? "";
  if (!SECRET || !secretsEgaux(fourni, SECRET)) {
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }

  const { user_id, titre, corps, url, tag } = (await req.json()) as Corps;

  if (!user_id || !titre) {
    return Response.json({ error: "user_id et titre sont requis." }, { status: 400 });
  }

  webpush.setVapidDetails(SUJET, CLE_PUBLIQUE, CLE_PRIVEE);

  const { data: abonnements, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (error) {
    return Response.json({ error: "Abonnements illisibles." }, { status: 500 });
  }

  const charge = JSON.stringify({
    titre: titre.slice(0, 80),
    corps: (corps ?? "").slice(0, 200),
    url: url ?? "/",
    tag,
  });

  let envoyes = 0;
  const perimes: string[] = [];

  await Promise.all(
    (abonnements ?? []).map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          charge
        );
        envoyes += 1;
      } catch (e) {
        const statut = (e as { statusCode?: number }).statusCode;

        // 404 et 410 signifient que l'abonnement est mort côté navigateur
        // (application désinstallée, données effacées). Le garder ferait
        // échouer tous les envois suivants pour rien.
        if (statut === 404 || statut === 410) perimes.push(a.id);
      }
    })
  );

  if (perimes.length > 0) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", perimes);
  }

  return Response.json({ envoyes, supprimes: perimes.length });
}

function secretsEgaux(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let different = 0;
  for (let i = 0; i < a.length; i += 1) different |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return different === 0;
}
