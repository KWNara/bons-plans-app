-- Rebranding : Déniche devient Chiner.
--
-- Rien ne change dans le schéma ni les politiques — seul le nom affiché dans
-- les e-mails transactionnels vit en base (les deux fonctions qui envoient un
-- e-mail via Resend). Le reste du renommage (textes d'interface, logo,
-- manifeste, icônes) est fait côté code.

create or replace function notify_deal_published()
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
          'from', 'Chiner <onboarding@resend.dev>',
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

create or replace function notify_alert_rules_for_new_city()
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
          'from', 'Chiner <onboarding@resend.dev>',
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
