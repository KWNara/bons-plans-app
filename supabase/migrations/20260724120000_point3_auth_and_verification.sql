-- Point 3 — Comptes utilisateurs et authentification
-- Statut de vérification commerçant, verrouillage des colonnes sensibles,
-- stockage des logos, et catégories de base pour le formulaire d'inscription pro.

-- ---------------------------------------------------------------------------
-- Statut de vérification (remplace le simple booléen "verifie")
-- ---------------------------------------------------------------------------

create type merchant_verification_status as enum (
  'verifie',
  'en_attente_verification'
);

alter table merchant_profiles
  add column statut_verification merchant_verification_status
    not null default 'en_attente_verification';

update merchant_profiles
  set statut_verification = (
    case when verifie then 'verifie' else 'en_attente_verification' end
  )::merchant_verification_status;

alter table merchant_profiles drop column verifie;

-- ---------------------------------------------------------------------------
-- Verrouillage des colonnes sensibles : seule la route serveur (clé
-- service_role) peut créer une ligne merchant_profiles ou modifier son
-- statut de vérification / SIRET. Le commerçant peut modifier le reste
-- de sa vitrine (logo, description, catégorie, ville) lui-même.
-- ---------------------------------------------------------------------------

drop policy if exists "merchant_profiles_insert_own" on merchant_profiles;

revoke update on merchant_profiles from authenticated;
grant update (nom_enseigne, description, logo_url, category_id, ville_principale_id)
  on merchant_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Stockage des logos commerçants (bucket public en lecture, écriture
-- restreinte au dossier <user_id>/... du propriétaire)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos_select_public" on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos_insert_own" on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos_update_own" on storage.objects for update
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "logos_delete_own" on storage.objects for delete
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Catégories de base (cf. cahier des charges §3.4)
-- ---------------------------------------------------------------------------

insert into categories (nom, icone) values
  ('Mode & vêtements', 'shirt'),
  ('Restauration', 'utensils'),
  ('Beauté & bien-être', 'sparkles'),
  ('Maison & déco', 'home'),
  ('High-tech', 'cpu'),
  ('Loisirs', 'gamepad-2'),
  ('Services', 'wrench'),
  ('Autre', 'ellipsis')
on conflict (nom) do nothing;
