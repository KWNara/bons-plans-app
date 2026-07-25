import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/authenticatedUser";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchant_profiles")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return Response.json({ error: "Profil commerçant introuvable." }, { status: 404 });
  }

  let customerId = merchant.stripe_customer_id as string | null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { merchant_id: merchant.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("merchant_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", merchant.id);
  }

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

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
