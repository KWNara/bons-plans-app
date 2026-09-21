-- Abonnements aux notifications push (Web Push / VAPID).
--
-- Une ligne par navigateur, pas par utilisateur : quelqu'un qui consulte
-- Chiner sur son téléphone et sur son ordinateur a deux abonnements distincts,
-- et révoquer l'un ne doit pas couper l'autre.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  -- L'endpoint est fourni par le service de push du navigateur et identifie
  -- l'abonnement de façon unique : c'est la bonne clé de déduplication, un
  -- même appareil pouvant se réabonner après une révocation.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  derniere_erreur_at timestamptz
);

create index push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "push_select_own" on push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_insert_own" on push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_delete_own" on push_subscriptions for delete
  using (auth.uid() = user_id);

-- Un abonnement ne se modifie pas : le navigateur en crée un nouveau.
revoke update on push_subscriptions from authenticated;

-- ---------------------------------------------------------------------------
-- Relais des notifications du fil vers le push
-- ---------------------------------------------------------------------------
--
-- NON APPLIQUÉ TEL QUEL : ce déclencheur a besoin de deux secrets dans le Vault
-- Supabase, que seul le propriétaire du projet peut poser.
--
--   select vault.create_secret('https://bons-plans-app.vercel.app', 'app_base_url');
--   select vault.create_secret('<valeur de PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
--
-- Une fois les deux secrets créés, exécuter le bloc ci-dessous. Il suit le même
-- schéma que l'envoi d'e-mails par Resend (cf. 20260728120000) : `pg_net` pour
-- ne pas bloquer la transaction d'écriture sur un appel réseau.

/*
create or replace function relayer_alerte_en_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_url text;
  secret text;
  titre text;
  pseudo text;
begin
  select decrypted_secret into base_url from vault.decrypted_secrets where name = 'app_base_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';

  -- Sans configuration, on ne fait rien : l'application doit rester utilisable
  -- même quand le push n'est pas branché.
  if base_url is null or secret is null then
    return new;
  end if;

  select u.pseudo into pseudo from users u where u.id = new.actor_id;

  titre := case new.type
    when 'message' then coalesce(pseudo, 'Quelqu''un') || ' t''a écrit'
    when 'demande_ami' then coalesce(pseudo, 'Quelqu''un') || ' veut t''ajouter'
    when 'ami_accepte' then coalesce(pseudo, 'Quelqu''un') || ' a accepté ta demande'
    when 'ami_participe' then coalesce(pseudo, 'Quelqu''un') || ' y va aussi'
    when 'mention' then coalesce(pseudo, 'Quelqu''un') || ' t''a cité'
    else 'Chiner'
  end;

  perform net.http_post(
    url := base_url || '/api/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object(
      'user_id', new.user_id,
      'titre', titre,
      'corps', coalesce(new.message, ''),
      'url', case
        when new.type = 'message' then '/messages/' || new.actor_id
        when new.type in ('demande_ami', 'ami_accepte') then '/amis'
        when new.deal_id is not null then '/bons-plans/' || new.deal_id
        else '/notifications'
      end,
      -- Un tag par expéditeur : dix messages d'affilée remplacent la bannière
      -- précédente au lieu d'en empiler dix.
      'tag', new.type || ':' || coalesce(new.actor_id::text, 'systeme')
    )
  );

  return new;
end;
$$;

create trigger alerts_relayer_push
  after insert on alerts
  for each row execute function relayer_alerte_en_push();
*/
