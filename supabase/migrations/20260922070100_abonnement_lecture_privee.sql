-- Le statut de paiement et l'échéance d'un commerçant ne regardent que lui.
-- À appliquer APRÈS le déploiement du code qui lit son abonnement via
-- mon_abonnement() (cf. 20260922070000) : l'ancienne page lisait ces colonnes
-- directement et cesserait de fonctionner.

revoke select (stripe_subscription_status, subscription_current_period_end)
  on merchant_profiles from anon, authenticated;
