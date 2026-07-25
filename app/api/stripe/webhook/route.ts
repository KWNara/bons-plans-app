import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function periodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items.data[0];
  return item ? new Date(item.current_period_end * 1000).toISOString() : null;
}

async function syncFromSubscription(subscription: Stripe.Subscription) {
  const merchantId = subscription.metadata?.merchant_id;
  const active = subscription.status === "active" || subscription.status === "trialing";

  const payload = {
    plan: active ? "payant" : "gratuit",
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    subscription_current_period_end: periodEndIso(subscription),
  };

  const query = supabaseAdmin.from("merchant_profiles").update(payload);

  if (merchantId) {
    await query.eq("id", merchantId);
  } else {
    await query.eq("stripe_customer_id", subscription.customer as string);
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await syncFromSubscription(subscription);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await syncFromSubscription(subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await supabaseAdmin
        .from("merchant_profiles")
        .update({ plan: "gratuit" })
        .eq("stripe_customer_id", invoice.customer as string);
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true });
}
