import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/authenticatedUser";
import { siteOrigin } from "@/lib/siteOrigin";

const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from("merchant_profiles")
    .select("id, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .single();

  if (merchantError || !merchant) {
    return Response.json({ error: "Profil commerçant introuvable." }, { status: 404 });
  }

  // Garde-fou anti double facturation : après un paiement réussi, le webhook
  // peut n'être pas encore arrivé et la page afficher encore « Passer en Pro ».
  // Sans cette vérification, un second clic crée un deuxième abonnement actif
  // sur le même client — soit 29,80 €/mois prélevés.
  if (merchant.stripe_subscription_id) {
    try {
      const existing = await stripe.subscriptions.retrieve(merchant.stripe_subscription_id);
      if (ACTIVE_STATUSES.includes(existing.status)) {
        return Response.json(
          { error: "Tu as déjà un abonnement Pro actif.", alreadySubscribed: true },
          { status: 409 }
        );
      }
    } catch {
      // Abonnement introuvable côté Stripe (supprimé, ou bascule test → live) :
      // on laisse le nouveau parcours de paiement se poursuivre.
    }
  }

  let customerId = merchant.stripe_customer_id as string | null;

  if (!customerId) {
    // Clé d'idempotence : deux clics simultanés (double tap, deux onglets) ne
    // doivent pas créer deux clients Stripe pour le même commerçant — le
    // portail de facturation pointerait alors vers le mauvais client.
    const customer = await stripe.customers.create(
      {
        email: user.email,
        metadata: { merchant_id: merchant.id },
      },
      { idempotencyKey: `merchant_customer_${merchant.id}` }
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
}
