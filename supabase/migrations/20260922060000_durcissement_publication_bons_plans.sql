-- Durcissement du flux de publication, suite à un audit contradictoire mené
-- en préparation de sa couverture de test (qa-securite.ps1 + e2e). Trois
-- lacunes distinctes, toutes vérifiées par relecture directe du code réel.

-- ---------------------------------------------------------------------------
-- 1. Quota du plan gratuit : la vérification n'était pas protégée contre une
--    course entre deux publications concurrentes.
-- ---------------------------------------------------------------------------
-- `select count(*)` sans verrou, sous l'isolation READ COMMITTED par défaut :
-- deux transactions qui publient chacune une annonce au même instant, alors
-- que le commerçant est déjà à 2 annonces actives, lisent chacune le même
-- compte avant que l'autre ne committe, passent toutes les deux sous la barre
-- de 3, et committent — 4 annonces actives pour un plan qui n'en autorise que
-- 3. Le verrou pose une file d'attente par commerçant (jamais entre deux
-- commerçants différents) : la seconde transaction attend que la première
-- committe avant de recompter, avec un compte alors à jour.

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
  if new.statut != 'publie' or (new.date_fin is not null and new.date_fin <= now()) then
    return new;
  end if;

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

-- ---------------------------------------------------------------------------
-- 2. date_debut n'avait jamais d'effet réel : une annonce programmée pour
--    plus tard était visible publiquement dès l'instant de sa publication.
-- ---------------------------------------------------------------------------

drop policy if exists "deals_select_published_or_own" on deals;
create policy "deals_select_published_or_own" on deals for select using (
  (
    statut = 'publie'
    and (date_fin is null or date_fin > now())
    and (date_debut is null or date_debut <= now())
  )
  or exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- 3. Retirer une ville de diffusion (merchant_cities) ne retirait pas les
--    deal_cities déjà créés pour cette ville : une annonce restait diffusée
--    dans une ville que le commerçant venait explicitement de quitter, sans
--    aucun moyen de l'en retirer depuis le formulaire (qui ne propose plus
--    que les villes encore enregistrées).
-- ---------------------------------------------------------------------------

create function purger_diffusion_ville_retiree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from deal_cities
  where city_id = old.city_id
    and deal_id in (select id from deals where merchant_id = old.merchant_id);
  return old;
end;
$$;

create trigger merchant_cities_purge_deal_cities
  after delete on merchant_cities
  for each row execute function purger_diffusion_ville_retiree();
