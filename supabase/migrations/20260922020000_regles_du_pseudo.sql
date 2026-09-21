-- Règles du pseudo, et robustesse de l'inscription.
--
-- Rien ne contraignait le pseudo : ni le formulaire, ni la colonne. Un pseudo
-- contenant une espace passait donc, et devenait incitable — le motif des
-- mentions s'arrête au premier caractère hors jeu, si bien que « @Jean Dupont »
-- ne désignait plus que « Jean ».
--
-- Poser une contrainte ne suffit pas : `handle_new_user` fabrique un pseudo de
-- repli à partir de la partie locale de l'adresse quand l'inscription n'en
-- fournit pas (connexion Google, par exemple). Une adresse comme
-- « prenom+test@exemple.fr » aurait alors produit un pseudo refusé par la
-- contrainte, et le déclencheur aurait fait échouer l'inscription entière.
--
-- Deuxième piège, préexistant celui-là : `pseudo` est unique. Deux personnes
-- dont l'adresse commence pareil — « contact@a.fr » et « contact@b.fr » —
-- entraient en collision, et la seconde inscription échouait sans explication.

-- ---------------------------------------------------------------------------
-- Nettoyage d'un pseudo de repli
-- ---------------------------------------------------------------------------
create or replace function nettoyer_pseudo(brut text)
returns text
language plpgsql
immutable
as $$
declare
  propre text;
begin
  -- Tout ce qui n'appartient pas au jeu autorisé disparaît, puis on rogne les
  -- séparateurs de tête et de queue que la contrainte refuse.
  propre := regexp_replace(coalesce(brut, ''), '[^[:alnum:]_.-]', '', 'g');
  propre := regexp_replace(propre, '^[^[:alnum:]]+', '');
  propre := regexp_replace(propre, '[^[:alnum:]]+$', '');
  propre := left(propre, 30);
  propre := regexp_replace(propre, '[^[:alnum:]]+$', '');

  -- Une adresse entièrement composée de caractères refusés laisserait une
  -- chaîne vide : mieux vaut un pseudo générique qu'une inscription refusée.
  if length(propre) < 2 then
    propre := 'membre';
  end if;

  return propre;
end;
$$;

-- ---------------------------------------------------------------------------
-- Attribution d'un pseudo libre
-- ---------------------------------------------------------------------------
create or replace function pseudo_disponible(souhaite text)
returns text
language plpgsql
stable
as $$
declare
  base text;
  candidat text;
  suffixe int := 1;
begin
  base := nettoyer_pseudo(souhaite);
  candidat := base;

  -- La colonne est unique : sans cette recherche, deux adresses commençant
  -- pareil faisaient échouer la seconde inscription.
  while exists (select 1 from users where lower(pseudo) = lower(candidat)) loop
    suffixe := suffixe + 1;
    -- Le suffixe doit tenir dans les 30 caractères autorisés.
    candidat := left(base, 30 - length(suffixe::text)) || suffixe::text;

    if suffixe > 9999 then
      -- Garde-fou : on ne boucle pas indéfiniment sur une base saturée.
      candidat := left(base, 20) || floor(random() * 1000000)::text;
      exit;
    end if;
  end loop;

  return candidat;
end;
$$;

-- ---------------------------------------------------------------------------
-- La contrainte
-- ---------------------------------------------------------------------------
-- Alignée sur le motif des mentions (lib/mentions.ts) : commence et finit par
-- un caractère alphanumérique, points, tirets et soulignés admis au milieu.
-- Tous les pseudos existants la respectent déjà.
alter table users add constraint users_pseudo_citable check (
  pseudo ~ '^[[:alnum:]][[:alnum:]_.-]{0,28}[[:alnum:]]$'
);

-- ---------------------------------------------------------------------------
-- Le déclencheur, remis à jour
-- ---------------------------------------------------------------------------
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
    pseudo_disponible(
      coalesce(nullif(new.raw_user_meta_data ->> 'pseudo', ''), split_part(new.email, '@', 1))
    ),
    parrain
  );

  -- La demande part du filleul : la poser au nom du parrain permettait de
  -- fabriquer une demande signée d'autrui (cf. 20260922010000).
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
