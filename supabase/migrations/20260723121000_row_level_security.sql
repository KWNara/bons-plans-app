-- Point 2 — Modèle de données
-- Row Level Security : par défaut Supabase bloque tout accès à une table
-- dès que RLS est activé, tant qu'aucune policy ne l'autorise explicitement.

create function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- cities / categories : lecture publique, écriture réservée à l'admin
-- (gérées depuis le back-office / Supabase Studio pour le MVP)
-- ---------------------------------------------------------------------------

alter table cities enable row level security;
create policy "cities_select_public" on cities for select using (true);
create policy "cities_write_admin" on cities for all
  using (is_admin()) with check (is_admin());

alter table categories enable row level security;
create policy "categories_select_public" on categories for select using (true);
create policy "categories_write_admin" on categories for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- users : profils publics en lecture, modification de son propre profil
-- ---------------------------------------------------------------------------

alter table users enable row level security;
create policy "users_select_public" on users for select using (true);
create policy "users_update_own" on users for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- merchant_profiles : vitrine publique, gérée par son propriétaire commerçant
-- ---------------------------------------------------------------------------

alter table merchant_profiles enable row level security;
create policy "merchant_profiles_select_public" on merchant_profiles
  for select using (true);
create policy "merchant_profiles_insert_own" on merchant_profiles
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from users where id = auth.uid() and role = 'commercant')
  );
create policy "merchant_profiles_update_own" on merchant_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "merchant_profiles_delete_own" on merchant_profiles
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- deals : public voit les annonces publiées, le commerçant gère les siennes
-- ---------------------------------------------------------------------------

alter table deals enable row level security;

create policy "deals_select_published_or_own" on deals for select using (
  statut = 'publie'
  or exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

create policy "deals_insert_own" on deals for insert with check (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

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
  )
);

create policy "deals_delete_own" on deals for delete using (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- likes / comments / reposts : contenu social public, géré par son auteur
-- ---------------------------------------------------------------------------

alter table likes enable row level security;
create policy "likes_select_public" on likes for select using (true);
create policy "likes_insert_own" on likes for insert
  with check (auth.uid() = user_id);
create policy "likes_delete_own" on likes for delete
  using (auth.uid() = user_id);

alter table comments enable row level security;
create policy "comments_select_public" on comments for select using (true);
create policy "comments_insert_own" on comments for insert
  with check (auth.uid() = user_id);
create policy "comments_update_own" on comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments_delete_own" on comments for delete
  using (auth.uid() = user_id);

alter table reposts enable row level security;
create policy "reposts_select_public" on reposts for select using (true);
create policy "reposts_insert_own" on reposts for insert
  with check (auth.uid() = user_id);
create policy "reposts_delete_own" on reposts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- favorites / follows : privés, visibles uniquement par leur propriétaire
-- ---------------------------------------------------------------------------

alter table favorites enable row level security;
create policy "favorites_select_own" on favorites for select
  using (auth.uid() = user_id);
create policy "favorites_insert_own" on favorites for insert
  with check (auth.uid() = user_id);
create policy "favorites_delete_own" on favorites for delete
  using (auth.uid() = user_id);

alter table follows enable row level security;
create policy "follows_select_own" on follows for select
  using (auth.uid() = follower_id);
create policy "follows_insert_own" on follows for insert
  with check (auth.uid() = follower_id);
create policy "follows_delete_own" on follows for delete
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- alerts : chaque utilisateur ne voit que ses propres notifications.
-- Aucune policy d'insertion cliente : elles seront créées côté serveur
-- (fonction SECURITY DEFINER ou route API utilisant la clé service_role)
-- lors d'un futur point (notifications), pour éviter qu'un utilisateur
-- ne puisse fabriquer de fausses alertes pour un autre.
-- ---------------------------------------------------------------------------

alter table alerts enable row level security;
create policy "alerts_select_own" on alerts for select
  using (auth.uid() = user_id);
create policy "alerts_update_own" on alerts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reports : l'auteur du signalement voit le sien, l'admin voit tout
-- ---------------------------------------------------------------------------

alter table reports enable row level security;
create policy "reports_select_own_or_admin" on reports for select
  using (auth.uid() = reporter_id or is_admin());
create policy "reports_insert_own" on reports for insert
  with check (auth.uid() = reporter_id);
create policy "reports_update_admin" on reports for update
  using (is_admin()) with check (is_admin());
