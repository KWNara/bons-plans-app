-- Notifications pour les amis, la messagerie et « Qui y va ? ».
--
-- Sans ça, tout le volet social était muet : on pouvait recevoir une demande
-- d'ami ou un message sans jamais l'apprendre, à moins d'ouvrir la page au bon
-- moment. Les trois déclencheurs ci-dessous alimentent la table `alerts`, qui
-- sert déjà de fil de notifications à l'application.
--
-- Toutes ces fonctions sont `security definer` : elles écrivent une ligne
-- destinée à quelqu'un d'autre, ce que les politiques RLS de `alerts`
-- interdisent à un utilisateur ordinaire.

-- ---------------------------------------------------------------------------
-- Demande d'ami reçue
-- ---------------------------------------------------------------------------

create function notify_demande_ami()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  destinataire uuid;
begin
  destinataire := case when new.demandeur = new.user_a then new.user_b else new.user_a end;

  insert into alerts (user_id, actor_id, type)
  values (destinataire, new.demandeur, 'demande_ami');

  return new;
end;
$$;

create trigger friendships_notify_demande
  after insert on friendships
  for each row execute function notify_demande_ami();

-- ---------------------------------------------------------------------------
-- Demande acceptée : c'est le demandeur qu'on prévient
-- ---------------------------------------------------------------------------

create function notify_amitie_acceptee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  celui_qui_accepte uuid;
begin
  -- `is distinct from` plutôt que `!=` : la garde doit tenir même si un jour
  -- le statut devient nullable, sinon une ré-acceptation renotifierait.
  if new.statut = 'acceptee' and old.statut is distinct from 'acceptee' then
    celui_qui_accepte := case when new.demandeur = new.user_a then new.user_b else new.user_a end;

    insert into alerts (user_id, actor_id, type)
    values (new.demandeur, celui_qui_accepte, 'ami_accepte');
  end if;

  return new;
end;
$$;

create trigger friendships_notify_acceptation
  after update on friendships
  for each row execute function notify_amitie_acceptee();

-- ---------------------------------------------------------------------------
-- Message reçu
-- ---------------------------------------------------------------------------

create function notify_message_recu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Une conversation animée ne doit produire qu'une seule notification : tant
  -- que la précédente n'a pas été lue, on n'en empile pas d'autres. Le fil de
  -- discussion, lui, garde son compteur de messages non lus.
  if exists (
    select 1 from alerts
    where user_id = new.destinataire
      and actor_id = new.expediteur
      and type = 'message'
      and is_read = false
  ) then
    return new;
  end if;

  insert into alerts (user_id, actor_id, type, message)
  values (
    new.destinataire,
    new.expediteur,
    'message',
    left(coalesce(new.texte, 'a partagé un bon plan avec toi'), 140)
  );

  return new;
end;
$$;

create trigger messages_notify_destinataire
  after insert on messages
  for each row execute function notify_message_recu();

-- ---------------------------------------------------------------------------
-- Un ami rejoint un bon plan où l'on a déjà dit y aller
-- ---------------------------------------------------------------------------

create function notify_ami_participe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ami record;
begin
  -- On ne prévient que les amis déjà inscrits sur CE bon plan. Prévenir tous
  -- ses amis à chaque « j'y vais » noierait le fil pour rien ; là, le message
  -- a une vraie valeur : « on y sera ensemble ».
  for ami in
    select p.user_id
    from deal_participations p
    where p.deal_id = new.deal_id
      and p.user_id != new.user_id
      and sont_amis(p.user_id, new.user_id)
  loop
    insert into alerts (user_id, actor_id, deal_id, type)
    values (ami.user_id, new.user_id, new.deal_id, 'ami_participe');
  end loop;

  return new;
end;
$$;

create trigger participations_notify_amis
  after insert on deal_participations
  for each row execute function notify_ami_participe();
