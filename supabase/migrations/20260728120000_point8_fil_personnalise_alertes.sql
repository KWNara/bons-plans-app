-- Point 8 — Fil personnalisé, suivi et alertes

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- alert_rules : critères de recherche sauvegardés par l'utilisateur
-- (distinct de la table "alerts" du Point 2, qui elle sert de fil de
-- notifications — cf plus bas).
-- ---------------------------------------------------------------------------

create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  city_id uuid not null references cities (id) on delete cascade,
  category_id uuid not null references categories (id) on delete cascade,
  mots_cles text,
  budget_max numeric(10, 2),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

alter table alert_rules enable row level security;

create policy "alert_rules_select_own" on alert_rules for select
  using (auth.uid() = user_id);
create policy "alert_rules_insert_own" on alert_rules for insert
  with check (auth.uid() = user_id);
create policy "alert_rules_update_own" on alert_rules for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "alert_rules_delete_own" on alert_rules for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Notifications "like reçu" / "commentaire reçu" (in-app uniquement,
-- pas d'email — sinon chaque like enverrait un mail).
-- ---------------------------------------------------------------------------

create function notify_like_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select mp.user_id into owner_id
  from deals d
  join merchant_profiles mp on mp.id = d.merchant_id
  where d.id = new.deal_id;

  if owner_id is not null and owner_id != new.user_id then
    insert into alerts (user_id, actor_id, deal_id, type)
    values (owner_id, new.user_id, new.deal_id, 'like');
  end if;

  return new;
end;
$$;

create trigger likes_notify_owner
  after insert on likes
  for each row execute function notify_like_received();

create function notify_comment_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid;
begin
  select mp.user_id into owner_id
  from deals d
  join merchant_profiles mp on mp.id = d.merchant_id
  where d.id = new.deal_id;

  if owner_id is not null and owner_id != new.user_id then
    insert into alerts (user_id, actor_id, deal_id, type, message)
    values (owner_id, new.user_id, new.deal_id, 'commentaire', new.texte);
  end if;

  return new;
end;
$$;

create trigger comments_notify_owner
  after insert on comments
  for each row execute function notify_comment_received();

-- ---------------------------------------------------------------------------
-- Notifications à la publication d'un bon plan :
--  1) tous les abonnés du commerçant (table follows)
--  2) tous les utilisateurs ayant une alerte active qui correspond
-- Envoie aussi un email via Resend (clé lue depuis Supabase Vault, secret
-- nommé "resend_api_key" — voir instructions de configuration).
-- ---------------------------------------------------------------------------

create function notify_deal_published()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  resend_key text;
  merchant_row record;
  follower_rec record;
begin
  if new.statut != 'publie' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.statut = 'publie' then
    return new;
  end if;

  select * into merchant_row from merchant_profiles where id = new.merchant_id;

  select decrypted_secret into resend_key
  from vault.decrypted_secrets where name = 'resend_api_key';

  -- Abonnés du commerçant (le suivi ne dépend que du merchant_id, déjà
  -- disponible dès la création de l'annonce).
  for follower_rec in
    select u.id as user_id, u.email
    from follows f
    join users u on u.id = f.follower_id
    where f.followed_merchant_id = new.merchant_id
  loop
    insert into alerts (user_id, actor_id, deal_id, type, message)
    values (
      follower_rec.user_id, null, new.id, 'nouveau_deal_commercant_suivi',
      merchant_row.nom_enseigne || ' a publié : ' || new.titre
    );

    if resend_key is not null then
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || resend_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'Bons Plans <onboarding@resend.dev>',
          'to', follower_rec.email,
          'subject', merchant_row.nom_enseigne || ' a publié un nouveau bon plan',
          'html', '<p><strong>' || merchant_row.nom_enseigne ||
                  '</strong>, que tu suis, vient de publier : <strong>' ||
                  new.titre || '</strong></p>'
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger deals_notify_on_publish
  after insert or update on deals
  for each row execute function notify_deal_published();

-- ---------------------------------------------------------------------------
-- Alertes personnalisées correspondantes : la ville d'une annonce n'est
-- connue qu'une fois les lignes deal_cities insérées (requête séparée, après
-- la création de l'annonce) — ce déclencheur se place donc sur deal_cities,
-- pas sur deals, pour être sûr que la ville est bien disponible.
-- La condition "not exists" évite de renotifier à chaque modification d'une
-- annonce déjà publiée (deal_cities est entièrement recréée à chaque
-- enregistrement du formulaire d'édition).
-- ---------------------------------------------------------------------------

create function notify_alert_rules_for_new_city()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  deal_row record;
  resend_key text;
  rule_rec record;
begin
  select * into deal_row from deals where id = new.deal_id;

  if deal_row.statut != 'publie' then
    return new;
  end if;

  select decrypted_secret into resend_key
  from vault.decrypted_secrets where name = 'resend_api_key';

  for rule_rec in
    select ar.id, u.id as user_id, u.email
    from alert_rules ar
    join users u on u.id = ar.user_id
    where ar.actif = true
      and ar.city_id = new.city_id
      and ar.category_id = deal_row.category_id
      and (
        ar.mots_cles is null
        or deal_row.titre ilike '%' || ar.mots_cles || '%'
        or deal_row.description ilike '%' || ar.mots_cles || '%'
      )
      and (
        ar.budget_max is null
        or coalesce(deal_row.prix_apres, deal_row.prix_avant) is null
        or coalesce(deal_row.prix_apres, deal_row.prix_avant) <= ar.budget_max
      )
      and not exists (
        select 1 from alerts
        where user_id = u.id and deal_id = deal_row.id and type = 'alerte_declenchee'
      )
  loop
    insert into alerts (user_id, actor_id, deal_id, type, message)
    values (rule_rec.user_id, null, deal_row.id, 'alerte_declenchee', 'Alerte : ' || deal_row.titre);

    if resend_key is not null then
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || resend_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'Bons Plans <onboarding@resend.dev>',
          'to', rule_rec.email,
          'subject', 'Une alerte correspond à un nouveau bon plan',
          'html', '<p>Un bon plan correspond à une de tes alertes : <strong>' ||
                  deal_row.titre || '</strong></p>'
        )
      );
    end if;
  end loop;

  return new;
end;
$$;

create trigger deal_cities_notify_alert_rules
  after insert on deal_cities
  for each row execute function notify_alert_rules_for_new_city();
