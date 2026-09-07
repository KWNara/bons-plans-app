import Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Un abonnement past_due reste actif : Stripe relance la carte pendant environ
// trois semaines avant d'abandonner. Couper l'accès dès le premier échec
// dégraderait un commerçant qui a payé, pour un incident bancaire temporaire.
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ["active", "trialing", "past_due"];

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const raw =
    subscription.items?.data[0]?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;

  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;

  const date = new Date(raw * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function syncFromSubscription(subscriptionId: string) {
  // On ré-interroge Stripe plutôt que de lire le payload de l'événement : les
  // webhooks sont rendus avec la version d'API de l'endpoint (potentiellement
  // différente de celle du SDK), et Stripe ne garantit pas l'ordre de
  // livraison. Relire l'état courant règle les deux problèmes d'un coup.
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const merchantId = subscription.metadata?.merchant_id;

  const payload = {
    plan: ACTIVE_STATUSES.includes(subscription.status) ? "payant" : "gratuit",
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_current_period_end: periodEndIso(subscription),
  };

  const query = supabaseAdmin.from("merchant_profiles").update(payload).select("id");

  const { data, error } = merchantId
    ? await query.eq("id", merchantId)
    : await query.eq("stripe_customer_id", subscription.customer as string);

  if (error) {
    throw new Error(`Échec de mise à jour du commerçant : ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      `Aucun commerçant trouvé pour l'abonnement ${subscription.id} (merchant_id: ${merchantId ?? "absent"}).`
    );
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide.";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          await syncFromSubscription(session.subscription as string);
        }
        break;
      }

      // Couvre aussi les échecs de paiement : Stripe émet un `updated` à chaque
      // changement de statut (past_due, unpaid, canceled), inutile de traiter
      // `invoice.payment_failed` séparément.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await syncFromSubscription(subscription.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Renvoyer une erreur est essentiel : Stripe rejoue l'événement. Répondre
    // 200 sur un échec d'écriture ferait payer un commerçant sans jamais
    // l'activer, et l'événement serait perdu définitivement.
    Sentry.captureException(err, { extra: { eventId: event.id, eventType: event.type } });
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return new Response(`Webhook handler failed: ${message}`, { status: 500 });
  }

  return Response.json({ received: true });
}
