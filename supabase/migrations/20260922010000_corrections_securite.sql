-- Corrections de sécurité, trouvées par relecture adversariale.

-- ---------------------------------------------------------------------------
-- 1. friendships : l'écriture n'était bornée que sur les lignes, pas sur les
--    colonnes
-- ---------------------------------------------------------------------------
-- La politique « friendships_update_destinataire » autorise le destinataire à
-- modifier SA ligne, ce qui était lu comme « il peut accepter ou refuser ».
-- Mais une politique RLS ne restreint jamais les colonnes : le destinataire
-- conservait le privilège UPDATE sur `user_a` et `user_b`.
--
-- Scénario : Bob envoie une demande à Mallory. Mallory réécrit la ligne en
-- remplaçant Bob par Alice et passe le statut à « acceptee ». Les deux
-- contrôles passent — elle reste partie à la ligne, et elle n'est toujours pas
-- la demandeuse. Mallory devient amie d'Alice sans qu'Alice ait rien fait, et
-- peut lui écrire en privé.
--
-- Le même verrou existait déjà pour `messages` (cf. 20260921140000) ; il
-- manquait ici.
revoke update on friendships from authenticated, anon;
grant update (statut) on friendships to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Parrainage : la demande d'amitié partait au nom du parrain
-- ---------------------------------------------------------------------------
-- L'identifiant du parrain vient des métadonnées d'inscription, donc du client,
-- et l'identifiant d'un utilisateur est public (la recherche d'amis le renvoie
-- pour n'importe quel pseudo). Poser la demande AU NOM de cet identifiant
-- permettait donc à n'importe qui de fabriquer une demande signée d'autrui,
-- puis de l'accepter soi-même — la politique d'acceptation exige seulement de
-- ne pas être le demandeur. Résultat : messagerie privée ouverte vers une
-- personne qui n'a jamais rien demandé, et qui n'était même pas notifiée.
--
-- La demande part désormais du filleul. C'est aussi plus juste : le parrain a
-- invité, c'est à lui de confirmer qu'il connaît la personne arrivée.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parrain uuid;
  paire_a uuid;
  paire_b uuid;
begin
  begin
    parrain := nullif(new.raw_user_meta_data ->> 'parrain', '')::uuid;
  exception when others then
    parrain := null;
  end;

  if parrain is not null and (parrain = new.id or not exists (select 1 from users where id = parrain)) then
    parrain := null;
  end if;

  insert into public.users (id, email, pseudo, parrain_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'pseudo', split_part(new.email, '@', 1)),
    parrain
  );

  if parrain is not null then
    paire_a := least(parrain, new.id);
    paire_b := greatest(parrain, new.id);

    insert into friendships (user_a, user_b, demandeur, statut)
    values (paire_a, paire_b, new.id, 'en_attente')
    on conflict (user_a, user_b) do nothing;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Mentions : le point final de phrase était avalé
-- ---------------------------------------------------------------------------
-- « Merci @lea. » extrayait le pseudo « lea. », qui ne correspond à personne :
-- ni notification, ni lien, et aucune erreur nulle part. Le pseudo doit
-- maintenant se terminer par un caractère alphanumérique, ce qui laisse les
-- points internes intacts (« jean.dupont » reste citable).
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

  for cite in
    select distinct u.id
    from regexp_matches(
           new.texte,
           '(^|[[:space:](])@([[:alnum:]][[:alnum:]_.-]{0,28}[[:alnum:]])',
           'g'
         ) as trouve
    join users u on lower(u.pseudo) = lower(trouve[2])
    where u.id <> new.user_id
      and u.id is distinct from proprietaire
  loop
    insert into alerts (user_id, actor_id, deal_id, type, message)
    values (cite.id, new.user_id, new.deal_id, 'mention', left(new.texte, 140));
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Abonnements push : l'upsert du client était condamné d'avance
-- ---------------------------------------------------------------------------
-- « un abonnement ne se modifie pas » avait conduit à révoquer UPDATE. Or le
-- client faisait un upsert sur `endpoint`, qui se traduit par
-- « insert ... on conflict do update » et exige ce privilège : tout
-- réabonnement du même navigateur échouait.
--
-- Le passage par une fonction évite d'ouvrir UPDATE : l'ancienne ligne est
-- supprimée, la nouvelle insérée. C'est aussi ce qui permet de récupérer un
-- endpoint laissé par un autre compte sur le même navigateur — cas réel après
-- une déconnexion, que la politique de suppression rendait autrement
-- insoluble.
create function enregistrer_abonnement_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.';
  end if;

  delete from push_subscriptions where endpoint = p_endpoint;

  insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200));
end;
$$;

grant execute on function enregistrer_abonnement_push(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Coordonnées : le domaine n'était pas borné
-- ---------------------------------------------------------------------------
-- `grant update (adresse, latitude, longitude)` ouvre l'écriture directe par
-- l'API REST : le formulaire n'est pas le seul chemin. La contrainte vérifiait
-- que la paire était complète, jamais qu'elle était plausible.
--
-- Les deux conditions sont réunies dans une seule contrainte : séparées, celle
-- du domaine vaudrait NULL quand une seule des deux colonnes est nulle, et une
-- contrainte qui vaut NULL est réputée satisfaite — la paire incomplète serait
-- redevenue acceptable.
alter table merchant_profiles drop constraint merchant_profiles_coordonnees_completes;
alter table merchant_profiles add constraint merchant_profiles_coordonnees_valides check (
  (latitude is null and longitude is null)
  or (
    latitude is not null and longitude is not null
    and latitude between -90 and 90
    and longitude between -180 and 180
  )
);

alter table cities drop constraint cities_coordonnees_completes;
alter table cities add constraint cities_coordonnees_valides check (
  (latitude is null and longitude is null)
  or (
    latitude is not null and longitude is not null
    and latitude between -90 and 90
    and longitude between -180 and 180
  )
);
