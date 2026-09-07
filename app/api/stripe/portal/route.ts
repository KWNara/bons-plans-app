import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAuthenticatedUser } from "@/lib/authenticatedUser";
import { siteOrigin } from "@/lib/siteOrigin";

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return Response.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchant_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!merchant?.stripe_customer_id) {
    return Response.json({ error: "Aucun abonnement associé à ce compte." }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: merchant.stripe_customer_id,
    return_url: `${siteOrigin(req)}/mon-abonnement`,
  });

  return Response.json({ url: portalSession.url });
}
