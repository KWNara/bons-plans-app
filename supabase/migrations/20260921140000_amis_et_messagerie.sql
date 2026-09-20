-- Amis et messagerie privée.
--
-- Choix de conception : la messagerie n'est pas ouverte à tout le monde. On ne
-- peut écrire qu'à quelqu'un dont on est ami (demande envoyée ET acceptée).
-- C'est ce qui distingue cette fonctionnalité d'une messagerie publique, avec
-- la charge de modération et les dérives que ça implique.

-- ---------------------------------------------------------------------------
-- Demandes d'amitié
-- ---------------------------------------------------------------------------
-- Une seule ligne par relation, orientée demandeur -> destinataire. Le couple
-- est normalisé (plus petit identifiant d'abord) pour qu'une même paire ne
-- puisse pas exister deux fois, y compris si chacun invite l'autre.

create table friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references users (id) on delete cascade,
  user_b uuid not null references users (id) on delete cascade,
  demandeur uuid not null references users (id) on delete cascade,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'acceptee', 'refusee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_paire_ordonnee check (user_a < user_b),
  constraint friendships_pas_soi_meme check (user_a != user_b),
  unique (user_a, user_b)
);

create index friendships_user_a_idx on friendships (user_a, statut);
create index friendships_user_b_idx on friendships (user_b, statut);

create trigger friendships_updated_at
  before update on friendships
  for each row execute function set_updated_at();

-- Vérifie que deux utilisateurs sont amis. `stable` et `security definer` :
-- la fonction est appelée depuis les politiques RLS de la messagerie, et doit
-- pouvoir lire friendships sans être filtrée par ces mêmes politiques.
create function sont_amis(un uuid, deux uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from friendships
    where statut = 'acceptee'
      and user_a = least(un, deux)
      and user_b = greatest(un, deux)
  );
$$;

alter table friendships enable row level security;

-- On ne voit que les relations qui nous concernent.
create policy "friendships_select_own" on friendships for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- On ne peut créer qu'une demande dont on est soi-même le demandeur, et dont
-- on fait partie : sans ça, n'importe qui pourrait fabriquer une amitié entre
-- deux tiers.
create policy "friendships_insert_own" on friendships for insert
  with check (
    auth.uid() = demandeur
    and (auth.uid() = user_a or auth.uid() = user_b)
    and statut = 'en_attente'
  );

-- Seul le destinataire peut accepter ou refuser ; le demandeur ne peut pas
-- valider sa propre demande.
create policy "friendships_update_destinataire" on friendships for update
  using ((auth.uid() = user_a or auth.uid() = user_b) and auth.uid() != demandeur)
  with check ((auth.uid() = user_a or auth.uid() = user_b) and auth.uid() != demandeur);

-- Chacun peut rompre l'amitié ou annuler sa demande.
create policy "friendships_delete_own" on friendships for delete
  using (auth.uid() = user_a or auth.uid() = user_b);

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
-- Pas de table « conversation » séparée : une conversation est simplement
-- l'ensemble des messages échangés entre deux personnes. Ça évite une table
-- d'état à maintenir synchronisée pour une messagerie strictement à deux.

create table messages (
  id uuid primary key default gen_random_uuid(),
  expediteur uuid not null references users (id) on delete cascade,
  destinataire uuid not null references users (id) on delete cascade,
  texte text,
  -- Un message peut porter un bon plan : c'est le « partager à un ami »
  -- directement dans l'app, qui s'affiche comme une carte dans la discussion.
  deal_id uuid references deals (id) on delete set null,
  lu boolean not null default false,
  created_at timestamptz not null default now(),
  constraint messages_pas_vide check (
    (texte is not null and length(trim(texte)) > 0) or deal_id is not null
  ),
  constraint messages_pas_soi_meme check (expediteur != destinataire)
);

create index messages_conversation_idx on messages (expediteur, destinataire, created_at desc);
create index messages_destinataire_non_lus_idx on messages (destinataire, lu);

alter table messages enable row level security;

create policy "messages_select_participant" on messages for select
  using (auth.uid() = expediteur or auth.uid() = destinataire);

-- L'amitié est vérifiée à l'écriture : on ne peut pas écrire à un inconnu,
-- même en forgeant la requête.
create policy "messages_insert_ami" on messages for insert
  with check (auth.uid() = expediteur and sont_amis(auth.uid(), destinataire));

-- Le destinataire marque comme lu ; l'expéditeur n'a rien à modifier.
create policy "messages_update_destinataire" on messages for update
  using (auth.uid() = destinataire)
  with check (auth.uid() = destinataire);

create policy "messages_delete_expediteur" on messages for delete
  using (auth.uid() = expediteur);

-- Les colonnes d'un message ne doivent pas pouvoir être réécrites par le
-- destinataire : seul le marquage comme lu l'intéresse.
revoke update on messages from authenticated;
grant update (lu) on messages to authenticated;
