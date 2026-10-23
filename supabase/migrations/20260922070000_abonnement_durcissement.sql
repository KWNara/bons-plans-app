-- Durcissement de l'abonnement Pro, suite à un audit contradictoire du parcours
-- Stripe. À appliquer AVANT de déployer le code qui s'en sert ; la restriction
-- de lecture vient ensuite, dans 20260922070100 (une fois ce code en ligne).

-- ---------------------------------------------------------------------------
-- 1. Résiliation programmée : le portail Stripe résilie en fin de période, le
--    statut reste « active » jusque-là. Sans cette date, « Mon abonnement »
--    annonçait un renouvellement au commerçant qui venait de résilier.
-- ---------------------------------------------------------------------------

alter table merchant_profiles add column subscription_cancel_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Lecture de son propre abonnement, et de lui seul. Le statut de paiement et
--    l'échéance de chaque commerçant étaient lisibles avec la clé publique :
--    n'importe qui pouvait lister les commerçants en défaut de paiement. Ces
--    colonnes ne seront plus lisibles directement (cf. 20260922070100).
-- ---------------------------------------------------------------------------

create function mon_abonnement()
returns table (plan text, statut text, fin_de_periode timestamptz, fin_programmee timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select plan, stripe_subscription_status, subscription_current_period_end, subscription_cancel_at
  from merchant_profiles
  where user_id = auth.uid();
$$;

revoke execute on function mon_abonnement() from public, anon;
grant execute on function mon_abonnement() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Quota après résiliation : une annonce déjà active pouvait être prolongée
--    sans fin (date de fin repoussée, ou retirée). Un seul mois de Pro donnait
--    ainsi des emplacements illimités pour toujours. La modification d'une
--    annonce active reste libre (corriger une faute, on ne dépublie jamais
--    dans le dos du commerçant) ; seule une prolongation repasse par le quota.
--
-- ponytail: une annonce sans date de fin, créée en Pro, reste réécrivable sans
-- limite après résiliation ; borner sa date de fin à la résiliation si l'abus
-- apparaît.
-- ---------------------------------------------------------------------------

create or replace function enforce_deal_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_count int;
  merchant_plan text;
  etait_active boolean;
  prolongee boolean;
begin
  if new.statut != 'publie' or (new.date_fin is not null and new.date_fin <= now()) then
    return new;
  end if;

  etait_active := tg_op = 'UPDATE'
    and old.statut = 'publie'
    and (old.date_fin is null or old.date_fin > now());

  prolongee := tg_op = 'UPDATE'
    and old.date_fin is not null
    and (new.date_fin is null or new.date_fin > old.date_fin);

  if etait_active and not prolongee then
    return new;
  end if;

  select plan into merchant_plan from merchant_profiles where id = new.merchant_id;

  if merchant_plan is distinct from 'gratuit' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(new.merchant_id::text)::bigint);

  select count(*) into active_count
  from deals
  where merchant_id = new.merchant_id
    and statut = 'publie'
    and (date_fin is null or date_fin > now())
    and id != new.id;

  if active_count >= 3 then
    raise exception 'QUOTA_GRATUIT_ATTEINT: Passez à l''offre payante pour publier plus d''annonces.';
  end if;

  return new;
end;
$$;
