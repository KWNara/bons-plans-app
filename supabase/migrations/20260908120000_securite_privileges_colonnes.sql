-- Durcissement des privilèges au niveau colonne.
--
-- Contexte : les politiques RLS restreignent les LIGNES accessibles, jamais les
-- COLONNES. « users_update_own » autorisait donc un utilisateur à modifier
-- n'importe quelle colonne de sa propre ligne — y compris `role`, ce qui
-- permettait à n'importe quel compte de se promouvoir administrateur via un
-- simple PATCH sur l'API REST (la clé anon étant publique par conception).
-- Même logique côté lecture : « using (true) » exposait l'email de tous les
-- utilisateurs et le SIRET / les identifiants Stripe de tous les commerçants.

-- ---------------------------------------------------------------------------
-- users : écriture limitée aux champs de profil
-- ---------------------------------------------------------------------------

revoke update on users from authenticated;
grant update (pseudo, avatar_url, bio, city_id) on users to authenticated;

-- users : l'email ne doit jamais être lisible par un tiers. Le propriétaire
-- récupère le sien via la session d'authentification, pas via cette table.
revoke select on users from anon, authenticated;
grant select (id, pseudo, avatar_url, bio, city_id, role, created_at, updated_at)
  on users to anon, authenticated;

-- ---------------------------------------------------------------------------
-- merchant_profiles : le SIRET et les identifiants Stripe restent serveur-only
-- ---------------------------------------------------------------------------

revoke select on merchant_profiles from anon, authenticated;
grant select (
  id, user_id, nom_enseigne, description, logo_url, category_id,
  ville_principale_id, statut_verification, suspendu, plan,
  stripe_subscription_status, subscription_current_period_end,
  created_at, updated_at
) on merchant_profiles to anon, authenticated;

-- ---------------------------------------------------------------------------
-- deal_cities : un commerçant ne diffuse que dans ses propres villes
-- ---------------------------------------------------------------------------
-- La politique d'origine vérifiait que le bon plan appartenait bien à l'auteur,
-- mais pas que la ville faisait partie de ses villes de diffusion : une requête
-- forgée pouvait pousser une annonce sur le fil de toutes les villes de France.

drop policy if exists "deal_cities_insert_own" on deal_cities;

create policy "deal_cities_insert_own" on deal_cities for insert
  with check (
    exists (
      select 1
      from deals d
      join merchant_profiles m on m.id = d.merchant_id
      where d.id = deal_cities.deal_id
        and m.user_id = auth.uid()
    )
    and exists (
      select 1
      from merchant_cities mc
      join merchant_profiles m on m.id = mc.merchant_id
      where mc.city_id = deal_cities.city_id
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Stockage : bornes de taille et types de fichiers réellement acceptés
-- ---------------------------------------------------------------------------
-- `accept="image/*"` côté formulaire est purement cosmétique : sans ces bornes,
-- n'importe quel compte pouvait héberger du HTML arbitraire sur le domaine
-- Supabase du projet, ou saturer le quota de stockage.

update storage.buckets
set file_size_limit = 5242880, -- 5 Mo
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id in ('logos', 'deal-photos', 'avatars');
