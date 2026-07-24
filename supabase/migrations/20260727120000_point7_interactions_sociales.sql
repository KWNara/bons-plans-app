-- Point 7 — Interactions sociales

-- ---------------------------------------------------------------------------
-- Avatars des utilisateurs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_select_public" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- La vitrine publique d'un commerçant (Point 7 #6) doit pouvoir afficher ses
-- annonces passées (expirées), pas seulement les actives. On ouvre donc la
-- lecture publique à toutes les annonces "publiées", expirées ou non — le
-- fil d'actualité (Point 6), lui, continue de masquer les expirées via son
-- propre filtre applicatif sur date_fin, donc ce changement ne le concerne
-- pas. Seuls les brouillons restent réservés au commerçant propriétaire.
-- ---------------------------------------------------------------------------

drop policy if exists "deals_select_published_or_own" on deals;
create policy "deals_select_published_or_own" on deals for select using (
  statut = 'publie'
  or exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);
