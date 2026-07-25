-- Point 9 — Modération et signalement
-- ⚠️ Exécuter d'abord 20260729115000_point9_add_merchant_report_target.sql

-- ---------------------------------------------------------------------------
-- Les signalements du Point 2 ne couvraient que "deal" et "comment" ; on
-- ajoute la possibilité de signaler un profil commerçant, et un motif
-- structuré (liste fermée) séparé du texte libre de précision.
-- ---------------------------------------------------------------------------

create type report_motif as enum (
  'contenu_trompeur',
  'arnaque_suspectee',
  'produit_non_conforme',
  'contenu_inapproprie',
  'doublon',
  'autre'
);

alter table reports add column motif report_motif not null default 'autre';
alter table reports alter column reason drop not null;
alter table reports add column merchant_id uuid references merchant_profiles (id) on delete cascade;

alter table reports drop constraint reports_target_matches_type;
alter table reports add constraint reports_target_matches_type check (
  (target_type = 'deal' and deal_id is not null and comment_id is null and merchant_id is null)
  or (target_type = 'comment' and comment_id is not null and deal_id is null and merchant_id is null)
  or (target_type = 'merchant' and merchant_id is not null and deal_id is null and comment_id is null)
);

-- Un même utilisateur ne peut signaler qu'une fois la même annonce, le même
-- commerçant, ou le même commentaire.
create unique index reports_unique_deal_reporter
  on reports (reporter_id, deal_id) where deal_id is not null;
create unique index reports_unique_merchant_reporter
  on reports (reporter_id, merchant_id) where merchant_id is not null;
create unique index reports_unique_comment_reporter
  on reports (reporter_id, comment_id) where comment_id is not null;

-- ---------------------------------------------------------------------------
-- Suspension d'un compte commerçant par un admin. Un déclencheur empêche un
-- commerçant de modifier cette colonne lui-même (même si elle est accessible
-- en écriture pour "authenticated" au niveau des privilèges Postgres — la
-- policy RLS "update_own" ne distingue pas les colonnes, donc c'est ce
-- déclencheur qui garantit que seul un admin peut changer ce statut).
-- ---------------------------------------------------------------------------

alter table merchant_profiles add column suspendu boolean not null default false;

grant update (suspendu) on merchant_profiles to authenticated;

create policy "merchant_profiles_update_admin" on merchant_profiles for update
  using (is_admin()) with check (is_admin());

create function guard_merchant_suspension()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.suspendu is distinct from old.suspendu and not is_admin() then
    raise exception 'Seul un administrateur peut suspendre ou réactiver un compte commerçant.';
  end if;
  return new;
end;
$$;

create trigger merchant_profiles_guard_suspension
  before update on merchant_profiles
  for each row execute function guard_merchant_suspension();

-- Un commerçant suspendu n'apparaît plus publiquement (ses annonces non plus).
drop policy if exists "deals_select_published_or_own" on deals;
create policy "deals_select_published_or_own" on deals for select using (
  (
    statut = 'publie'
    and exists (
      select 1 from merchant_profiles mp
      where mp.id = deals.merchant_id and mp.suspendu = false
    )
  )
  or exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
  )
);

drop policy if exists "deals_insert_own" on deals;
create policy "deals_insert_own" on deals for insert with check (
  exists (
    select 1 from merchant_profiles
    where merchant_profiles.id = deals.merchant_id
      and merchant_profiles.user_id = auth.uid()
      and merchant_profiles.statut_verification = 'verifie'
      and merchant_profiles.suspendu = false
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
      and (
        deals.statut != 'publie'
        or (merchant_profiles.statut_verification = 'verifie' and merchant_profiles.suspendu = false)
      )
  )
);

-- ---------------------------------------------------------------------------
-- Accès admin aux annonces (voir, suspendre = repasser en brouillon,
-- supprimer), en plus des policies existantes réservées au propriétaire.
-- ---------------------------------------------------------------------------

create policy "deals_admin_select" on deals for select using (is_admin());
create policy "deals_admin_update" on deals for update using (is_admin()) with check (is_admin());
create policy "deals_admin_delete" on deals for delete using (is_admin());
