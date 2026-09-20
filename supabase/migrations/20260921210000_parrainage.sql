-- Parrainage.
--
-- Choix de conception : le parrainage ne donne aucune récompense monétaire. Ce
-- qu'il apporte, c'est le lien — un filleul qui arrive par le lien d'un ami se
-- retrouve avec une demande d'amitié déjà posée, donc avec quelqu'un à qui
-- envoyer un bon plan dès le premier jour. C'est le vide social des premières
-- minutes qui fait partir les nouveaux, pas l'absence de prime.

alter table users add column parrain_id uuid references users (id) on delete set null;

create index users_parrain_idx on users (parrain_id);

-- Le parrain ne peut pas être modifié après coup : `grant update` ne liste pas
-- cette colonne (cf. 20260908120000), elle reste donc en lecture seule côté
-- client. Elle n'est posée qu'ici, à l'inscription.

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
  -- Le lien de parrainage transporte un identifiant arbitraire : on le convertit
  -- prudemment, un lien trafiqué ne doit pas faire échouer l'inscription.
  begin
    parrain := nullif(new.raw_user_meta_data ->> 'parrain', '')::uuid;
  exception when others then
    parrain := null;
  end;

  -- Un parrain inconnu, ou soi-même, ne compte pas.
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

  -- La demande d'amitié est posée au nom du parrain : c'est lui qui a invité,
  -- c'est donc au filleul d'accepter. L'inverse aurait fait accepter au filleul
  -- une relation qu'il n'a pas demandée.
  if parrain is not null then
    paire_a := least(parrain, new.id);
    paire_b := greatest(parrain, new.id);

    insert into friendships (user_a, user_b, demandeur, statut)
    values (paire_a, paire_b, parrain, 'en_attente')
    on conflict (user_a, user_b) do nothing;
  end if;

  return new;
end;
$$;

-- Compte les filleuls d'un parrain. `security definer` : la politique de
-- lecture de `users` est publique, mais compter côté client demanderait de
-- exposer la liste, alors que seul le nombre intéresse le parrain.
create function compte_filleuls(p_parrain uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from users where parrain_id = p_parrain;
$$;

grant execute on function compte_filleuls(uuid) to authenticated;
