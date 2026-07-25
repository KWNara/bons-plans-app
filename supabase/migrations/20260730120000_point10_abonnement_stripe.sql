-- Point 10 — Modèle économique (abonnement Stripe)
--
-- Le champ "plan" ('gratuit' / 'payant') et la limite de 3 annonces actives
-- existent déjà depuis le Point 5, et le trigger enforce_deal_quota est déjà
-- conçu pour ignorer la limite dès que plan != 'gratuit'. Il ne manquait
-- qu'un vrai moyen de faire passer ce champ à 'payant' : c'est ce que
-- Stripe apporte ici, sans changer la logique de quota elle-même.

alter table merchant_profiles add column stripe_customer_id text unique;
alter table merchant_profiles add column stripe_subscription_id text unique;
alter table merchant_profiles add column stripe_subscription_status text;
alter table merchant_profiles add column subscription_current_period_end timestamptz;

-- Ces colonnes ne sont accessibles en écriture que par le serveur
-- (service_role, via le webhook Stripe) : elles ne font pas partie des
-- colonnes accordées à "authenticated" par le GRANT du Point 3, donc un
-- commerçant ne peut pas se les auto-attribuer.
