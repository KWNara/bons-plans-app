import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/authenticatedUser";
import { siteOrigin } from "@/lib/siteOrigin";
import { STATUTS_EN_COURS, STATUTS_PRO } from "@/lib/abonnement";

/** Le client Stripe enregistré, s'il existe encore dans le mode de la clé
 * actuelle : un identifiant du mode test réutilisé en live, ou un client
 * supprimé depuis le tableau de bord, faisait échouer chaque paiement. */
async function clientValide(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  try {
    const client = await stripe.customers.retrieve(customerId);
    return client.deleted ? null : customerId;
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError && err.code === "resource_missing") return null;
    throw err;
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from("merchant_profiles")
    .select("id, stripe_customer_id, statut_verification, suspendu")
    .eq("user_id", user.id)
    .single();

  if (merchantError || !merchant) {
    return Response.json({ error: "Profil commerçant introuvable." }, { status: 404 });
  }

  // Sans vérification, le commerçant pouvait payer le Pro sans pouvoir publier
  // un seul bon plan : la base refuse toute publication tant que le compte
  // n'est pas vérifié, ou s'il est suspendu.
  if (merchant.statut_verification !== "verifie" || merchant.suspendu) {
    return Response.json(
      { error: "Ton compte commerçant doit être vérifié et actif avant de passer en Pro." },
      { status: 403 }
    );
  }

  try {
    const enregistre = merchant.stripe_customer_id as string | null;
    let customerId = await clientValide(enregistre);

    if (!customerId) {
      // Clé d'idempotence : deux clics simultanés ne créent qu'un client. Elle
      // inclut l'ancien identifiant : recréer un client disparu avec la clé
      // d'origine renverrait, pendant 24 h, ce même client disparu.
      const customer = await stripe.customers.create(
        { email: user.email, metadata: { merchant_id: merchant.id } },
        { idempotencyKey: `merchant_customer_${merchant.id}_${enregistre ?? "premier"}` }
      );
      customerId = customer.id;

      const { error: updateError } = await supabaseAdmin
        .from("merchant_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", merchant.id);

      if (updateError) {
        return Response.json(
          { error: "Impossible d'enregistrer ton profil de paiement. Réessaie." },
          { status: 500 }
        );
      }
    }

    // Garde-fou anti double facturation, posé sur l'état réel chez Stripe et
    // non sur la base : celle-ci n'est mise à jour que par le webhook, qui peut
    // arriver en retard — justement le moment où le commerçant, ne voyant pas
    // son Pro, recliquerait sur « S'abonner ».
    const { data: abonnements } = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });
    const enCours = abonnements.find((a) => STATUTS_EN_COURS.includes(a.status));

    if (enCours) {
      return Response.json(
        {
          error: STATUTS_PRO.includes(enCours.status)
            ? "Tu as déjà un abonnement Pro actif."
            : "Tu as déjà un abonnement en attente de paiement : régularise-le depuis « Mon abonnement ».",
          alreadySubscribed: true,
        },
        { status: 409 }
      );
    }

    // Une session ouverte (autre onglet, retour arrière) reste payable 24 h :
    // deux paiements créeraient deux abonnements. On n'en garde qu'une.
    const { data: ouvertes } = await stripe.checkout.sessions.list({
      customer: customerId,
      status: "open",
      limit: 100,
    });
    await Promise.all(ouvertes.map((s) => stripe.checkout.sessions.expire(s.id)));

    const origin = siteOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO!, quantity: 1 }],
      success_url: `${origin}/mon-abonnement?success=1`,
      cancel_url: `${origin}/tarifs`,
      metadata: { merchant_id: merchant.id },
      subscription_data: { metadata: { merchant_id: merchant.id } },
    });

    return Response.json({ url: session.url });
  } catch (err) {
    // Sans ce filet, une erreur Stripe renvoyait une page 500 vide : le bouton
    // restait bloqué sur « ... » sans aucun message.
    Sentry.captureException(err, { extra: { merchantId: merchant.id } });
    return Response.json(
      { error: "Le paiement est momentanément indisponible. Réessaie dans quelques minutes." },
      { status: 502 }
    );
  }
}
