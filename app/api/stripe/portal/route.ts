import * as Sentry from "@sentry/nextjs";
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

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: merchant.stripe_customer_id,
      return_url: `${siteOrigin(req)}/mon-abonnement`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    Sentry.captureException(err);
    return Response.json(
      { error: "La gestion de l'abonnement est momentanément indisponible. Réessaie dans quelques minutes." },
      { status: 502 }
    );
  }
}
