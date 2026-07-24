-- Point 5 — Publication et gestion des bons plans

-- Harmonise le libellé de catégorie avec le formulaire de publication.
update categories set nom = 'Loisirs & sorties' where nom = 'Loisirs';

-- Réduction en pourcentage, alternative à prix_avant/prix_apres.
alter table deals add column reduction_pourcentage integer;
alter table deals add constraint deals_reduction_pourcentage_range
  check (reduction_pourcentage is null or (reduction_pourcentage between 1 and 99));

-- Stock limité (nombre d'exemplaires/places restants). NULL = illimité.
alter table deals add column stock_limite integer;
alter table deals add constraint deals_stock_limite_positive
  check (stock_limite is null or stock_limite >= 0);

-- ---------------------------------------------------------------------------
-- Ville(s) de diffusion par annonce : remplace l'unique city_id par une
-- relation N-N (une annonce peut être diffusée dans plusieurs villes parmi
-- celles déjà associées au commerçant, cf. merchant_cities du Point 4).
-- ---------------------------------------------------------------------------

create table deal_cities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  city_id uuid not null references cities (id) on delete cascade,
  unique (deal_id, city_id)
);

alter table deal_cities enable row level security;

create policy "deal_cities_select_public" on deal_cities for select using (true);

create policy "deal_cities_insert_own" on deal_cities for insert with check (
  exists (
    select 1 from deals
    join merchant_profiles on merchant_profiles.id = deals.merchant_id
    where deals.id = deal_cities.deal_id
      and merchant_profiles.user_id = auth.uid()
  )
);

create policy "deal_cities_delete_own" on deal_cities for delete using (
  exists (
    select 1 from deals
    join merchant_profiles on merchant_profiles.id = deals.merchant_id
    where deals.id = deal_cities.deal_id
      and merchant_profiles.user_id = auth.uid()
  )
);

alter table deals drop column city_id;

-- ---------------------------------------------------------------------------
-- Plan tarifaire du commerçant (anticipe le Point 10 — pour l'instant tout
-- le monde est "gratuit", le vrai paiement viendra plus tard).
-- ---------------------------------------------------------------------------

alter table merchant_profiles add column plan text not null default 'gratuit';
alter table merchant_profiles add constraint merchant_profiles_plan_check
  check (plan in ('gratuit', 'payant'));

-- ---------------------------------------------------------------------------
-- Sécurité : seul un commerçant VÉRIFIÉ peut créer/publier une annonce.
-- (Un commerçant qui perdrait sa vérification garde la main pour éditer ou
-- dépublier ses annonces existantes, mais ne peut pas en republier une.)
-- ---------------------------------------------------------------------------

drop policy if exists "deals_insert_own" on deals;
create policy "deals_insert_own" on deals for insert with check (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
      and merchant_profiles.statut_verification = 'verifie'
  )
);

drop policy if exists "deals_update_own" on deals;
create policy "deals_update_own" on deals for update using (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
      and (deals.statut != 'publie' or merchant_profiles.statut_verification = 'verifie')
  )
);

-- ---------------------------------------------------------------------------
-- Expiration : la façon la plus simple et la plus fiable de gérer ça est de
-- filtrer à la lecture (dans la policy RLS elle-même) plutôt que via une
-- tâche planifiée (pg_cron) qui devrait tourner régulièrement et mettre à
-- jour une colonne "statut". Ici, dès que date_fin est dépassée, l'annonce
-- disparaît automatiquement de toute lecture publique, sans job à gérer.
-- Le propriétaire continue de la voir (pour la page "mes bons plans").
-- ---------------------------------------------------------------------------

drop policy if exists "deals_select_published_or_own" on deals;
create policy "deals_select_published_or_own" on deals for select using (
  (statut = 'publie' and (date_fin is null or date_fin > now()))
  or exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Quota : un compte gratuit ne peut pas avoir plus de 3 annonces actives
-- (publiées et non expirées) en même temps.
-- ---------------------------------------------------------------------------

create function enforce_deal_quota()
returns trigger
language plpgsql
as $$
declare
  active_count int;
  merchant_plan text;
begin
  if new.statut != 'publie' then
    return new;
  end if;

  select plan into merchant_plan from merchant_profiles where id = new.merchant_id;

  if merchant_plan != 'gratuit' then
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

create trigger deals_enforce_quota
  before insert or update on deals
  for each row execute function enforce_deal_quota();

-- ---------------------------------------------------------------------------
-- Stockage des photos de bons plans (mêmes règles que les logos commerçants)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('deal-photos', 'deal-photos', true)
on conflict (id) do nothing;

create policy "deal_photos_select_public" on storage.objects for select
  using (bucket_id = 'deal-photos');

create policy "deal_photos_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'deal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "deal_photos_update_own" on storage.objects for update
  using (
    bucket_id = 'deal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "deal_photos_delete_own" on storage.objects for delete
  using (
    bucket_id = 'deal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
