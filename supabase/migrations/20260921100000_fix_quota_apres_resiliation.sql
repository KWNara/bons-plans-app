-- Un commerçant qui résilie son abonnement Pro en ayant plus de 3 bons plans
-- en ligne se retrouvait totalement bloqué : le déclencheur de quota se
-- déclenchait sur CHAQUE modification d'une annonce déjà publiée, pas seulement
-- au moment d'en publier une nouvelle. Corriger une faute de frappe sur une
-- annonce existante levait « QUOTA_GRATUIT_ATTEINT », sans aucune explication
-- ni porte de sortie autre que dépublier ses propres offres.
--
-- Le quota ne doit s'appliquer qu'aux opérations qui AUGMENTENT réellement le
-- nombre d'annonces actives : une création, ou le passage d'un brouillon (ou
-- d'une annonce expirée) à l'état publié. Une annonce déjà active qui le reste
-- doit toujours pouvoir être modifiée.
--
-- Conséquence assumée côté produit : après une résiliation, les annonces déjà
-- en ligne y restent. On ne dépublie jamais dans le dos du commerçant — ce
-- serait retirer ses offres de la vente sans son accord. Il ne peut simplement
-- plus en publier de nouvelles tant qu'il n'est pas repassé sous la limite.

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
begin
  -- L'annonce n'est pas (ou plus) active : aucun impact sur le quota.
  if new.statut != 'publie' or (new.date_fin is not null and new.date_fin <= now()) then
    return new;
  end if;

  -- Déjà active avant la modification, et toujours active après : le total ne
  -- bouge pas, la modification est donc toujours autorisée.
  etait_active := tg_op = 'UPDATE'
    and old.statut = 'publie'
    and (old.date_fin is null or old.date_fin > now());

  if etait_active then
    return new;
  end if;

  select plan into merchant_plan from merchant_profiles where id = new.merchant_id;

  if merchant_plan is distinct from 'gratuit' then
    return new;
  end if;

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
