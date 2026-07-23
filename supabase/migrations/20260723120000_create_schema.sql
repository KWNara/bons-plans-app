-- Point 2 — Modèle de données
-- Schéma initial : tables, relations (clés étrangères), et automatisations
-- de base (updated_at, synchro auth.users -> public.users, compteurs sur deals).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum ('particulier', 'commercant', 'admin');
create type deal_status as enum ('brouillon', 'publie', 'expire');
create type report_target as enum ('deal', 'comment');
create type report_status as enum ('en_attente', 'traite', 'rejete');

-- ---------------------------------------------------------------------------
-- cities
-- ---------------------------------------------------------------------------

create table cities (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  code_postal text not null,
  region text,
  created_at timestamptz not null default now(),
  unique (nom, code_postal)
);

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table categories (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  icone text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- users (profil public, miroir de auth.users)
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  pseudo text not null unique,
  avatar_url text,
  bio text,
  city_id uuid references cities (id) on delete set null,
  role user_role not null default 'particulier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crée automatiquement une ligne public.users à chaque inscription (auth.users)
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, pseudo)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'pseudo', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- merchant_profiles
-- ---------------------------------------------------------------------------

create table merchant_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users (id) on delete cascade,
  nom_enseigne text not null,
  siret text,
  description text,
  logo_url text,
  category_id uuid references categories (id) on delete set null,
  ville_principale_id uuid references cities (id) on delete set null,
  verifie boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- deals (annonces)
-- ---------------------------------------------------------------------------

create table deals (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchant_profiles (id) on delete cascade,
  titre text not null,
  description text,
  photos text[] not null default '{}',
  prix_avant numeric(10, 2),
  prix_apres numeric(10, 2),
  category_id uuid references categories (id) on delete set null,
  city_id uuid references cities (id) on delete set null,
  lien_externe text,
  date_debut timestamptz,
  date_fin timestamptz,
  statut deal_status not null default 'brouillon',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  reposts_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deals_city_id_idx on deals (city_id);
create index deals_category_id_idx on deals (category_id);
create index deals_merchant_id_idx on deals (merchant_id);
create index deals_statut_idx on deals (statut);

-- ---------------------------------------------------------------------------
-- likes
-- ---------------------------------------------------------------------------

create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  deal_id uuid not null references deals (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  deal_id uuid not null references deals (id) on delete cascade,
  texte text not null,
  created_at timestamptz not null default now()
);

create index comments_deal_id_idx on comments (deal_id);

-- ---------------------------------------------------------------------------
-- reposts (partages)
-- ---------------------------------------------------------------------------

create table reposts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  deal_id uuid not null references deals (id) on delete cascade,
  commentaire_ajoute text,
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

-- ---------------------------------------------------------------------------
-- favorites (annonces enregistrées, privées, distinctes des reposts publics)
-- ---------------------------------------------------------------------------

create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  deal_id uuid not null references deals (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, deal_id)
);

-- ---------------------------------------------------------------------------
-- follows (suivre une ville ou un commerçant — cf. §3.2 et §3.7)
-- ---------------------------------------------------------------------------

create table follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references users (id) on delete cascade,
  followed_merchant_id uuid references merchant_profiles (id) on delete cascade,
  followed_city_id uuid references cities (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_exactly_one_target check (
    (followed_merchant_id is not null and followed_city_id is null)
    or (followed_merchant_id is null and followed_city_id is not null)
  ),
  unique (follower_id, followed_merchant_id),
  unique (follower_id, followed_city_id)
);

-- ---------------------------------------------------------------------------
-- alerts (notifications — cf. §3.6)
-- ---------------------------------------------------------------------------

create table alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  actor_id uuid references users (id) on delete set null,
  deal_id uuid references deals (id) on delete cascade,
  type text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index alerts_user_id_idx on alerts (user_id, is_read);

-- ---------------------------------------------------------------------------
-- reports (signalements — cf. §8)
-- ---------------------------------------------------------------------------

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users (id) on delete cascade,
  target_type report_target not null,
  deal_id uuid references deals (id) on delete cascade,
  comment_id uuid references comments (id) on delete cascade,
  reason text not null,
  status report_status not null default 'en_attente',
  reviewed_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reports_target_matches_type check (
    (target_type = 'deal' and deal_id is not null and comment_id is null)
    or (target_type = 'comment' and comment_id is not null and deal_id is null)
  )
);

-- ---------------------------------------------------------------------------
-- updated_at automatique
-- ---------------------------------------------------------------------------

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on users
  for each row execute function set_updated_at();
create trigger set_updated_at before update on merchant_profiles
  for each row execute function set_updated_at();
create trigger set_updated_at before update on deals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Compteurs de deals (likes_count, comments_count, reposts_count)
-- ---------------------------------------------------------------------------

create function adjust_deal_counter()
returns trigger
language plpgsql
as $$
declare
  target_deal_id uuid := coalesce(new.deal_id, old.deal_id);
  target_column text := tg_argv[0];
  delta int := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  execute format(
    'update deals set %I = greatest(%I + $1, 0) where id = $2',
    target_column, target_column
  ) using delta, target_deal_id;
  return null;
end;
$$;

create trigger likes_adjust_counter
  after insert or delete on likes
  for each row execute function adjust_deal_counter('likes_count');

create trigger comments_adjust_counter
  after insert or delete on comments
  for each row execute function adjust_deal_counter('comments_count');

create trigger reposts_adjust_counter
  after insert or delete on reposts
  for each row execute function adjust_deal_counter('reposts_count');
