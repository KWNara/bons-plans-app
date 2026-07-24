-- Point 4 — Villes et localisation

-- Code INSEE : identifiant unique et fiable d'une commune (contrairement au
-- nom, qui peut se répéter dans plusieurs départements). Utilisé comme clé
-- d'upsert quand une ville est enregistrée depuis l'API Adresse.
alter table cities add column code_insee text unique;

-- Villes de diffusion d'un commerçant (distinct de sa ville de siège,
-- cf. cahier des charges §3.3 "ville(s) de diffusion").
create table merchant_cities (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchant_profiles (id) on delete cascade,
  city_id uuid not null references cities (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (merchant_id, city_id)
);

alter table merchant_cities enable row level security;

create policy "merchant_cities_select_public" on merchant_cities for select using (true);

create policy "merchant_cities_insert_own" on merchant_cities for insert with check (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = merchant_cities.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

create policy "merchant_cities_delete_own" on merchant_cities for delete using (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = merchant_cities.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);
