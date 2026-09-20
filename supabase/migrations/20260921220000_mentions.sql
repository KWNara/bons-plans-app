-- Mentions « @pseudo » dans les commentaires.
--
-- La mention est détectée côté base plutôt qu'envoyée par le client : une
-- notification fabriquée à la main permettrait de faire sonner le téléphone de
-- n'importe qui, en prétendant l'avoir cité.

create or replace function notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cite record;
  proprietaire uuid;
begin
  select m.user_id into proprietaire
  from deals d
  join merchant_profiles m on m.id = d.merchant_id
  where d.id = new.deal_id;

  -- Le motif reprend celui du client (lib/mentions.ts) : l'arobase doit ouvrir
  -- un mot, sinon « contact@exemple.fr » citerait « exemple.fr ».
  for cite in
    select distinct u.id
    from regexp_matches(
           new.texte,
           '(^|[[:space:](])@([[:alnum:]][[:alnum:]_.-]{1,29})',
           'g'
         ) as trouve
    join users u on lower(u.pseudo) = lower(trouve[2])
    where u.id <> new.user_id
      -- Le commerçant reçoit déjà une alerte « commentaire » pour ce même
      -- message : deux notifications pour un seul commentaire font redondance.
      and u.id is distinct from proprietaire
  loop
    insert into alerts (user_id, actor_id, deal_id, type, message)
    values (cite.id, new.user_id, new.deal_id, 'mention', left(new.texte, 140));
  end loop;

  return new;
end;
$$;

create trigger comments_notify_mentions
  after insert on comments
  for each row execute function notify_mentions();
