import "server-only";
import Stripe from "stripe";

// Version épinglée : les webhooks sont rendus avec la version configurée sur
// l'endpoint Stripe, qui peut différer de celle du SDK. On ne lit donc jamais
// la forme d'un payload d'événement directement (cf. app/api/stripe/webhook),
// on ré-interroge Stripe avec cette version-ci.
export const STRIPE_API_VERSION = "2026-06-24.dahlia" as const;

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});
