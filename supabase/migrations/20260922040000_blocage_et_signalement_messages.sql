-- Modération de la messagerie privée.
--
-- La messagerie a été livrée sans aucun garde-fou : ni signalement, ni
-- blocage, seulement « retirer un ami ». Deux mécanismes distincts et
-- complémentaires comblent ce vide :
--   1. Bloquer quelqu'un : ferme la relation des deux côtés, empêche toute
--      nouvelle demande d'ami entre les deux comptes, et donc toute
--      messagerie (qui dépend déjà de l'amitié).
--   2. Signaler un message précis : l'ajoute au même circuit de modération
--      que les bons plans, les commentaires et les profils commerçants.

-- ---------------------------------------------------------------------------
-- 1. Blocage
-- ---------------------------------------------------------------------------

create table blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references users (id) on delete cascade,
  blocked_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocked_users_pas_soi_meme check (blocker_id != blocked_id),
  unique (blocker_id, blocked_id)
);

create index blocked_users_blocker_idx on blocked_users (blocker_id);

alter table blocked_users enable row level security;

-- On ne voit que ses propres blocages, jamais qui vous a bloqué : un blocage
-- se fait sans confrontation, c'est ce qui le rend utilisable.
create policy "blocked_users_select_own" on blocked_users for select
  using (auth.uid() = blocker_id);

create policy "blocked_users_insert_own" on blocked_users for insert
  with check (auth.uid() = blocker_id);

create policy "blocked_users_delete_own" on blocked_users for delete
  using (auth.uid() = blocker_id);

-- Un blocage ne se modifie pas : on le pose ou on le retire.
revoke update on blocked_users from authenticated;

-- Vérifie un blocage dans les DEUX sens : que ce soit moi qui aie bloqué
-- l'autre, ou l'inverse, la relation doit rester fermée pour les deux.
-- `security definer` : la politique de lecture ne renvoie que MES blocages,
-- cette fonction doit pourtant pouvoir vérifier ceux de l'autre partie.
create function est_bloque(un uuid, deux uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from blocked_users
    where (blocker_id = un and blocked_id = deux)
       or (blocker_id = deux and blocked_id = un)
  );
$$;

-- Bloquer quelqu'un rompt l'amitié existante (acceptée ou en attente) : sans
-- ça, une conversation restait ouverte avec la personne qu'on vient de
-- bloquer, ce qui vide le geste de son sens.
create function rompre_amitie_au_blocage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  paire_a uuid;
  paire_b uuid;
begin
  paire_a := least(new.blocker_id, new.blocked_id);
  paire_b := greatest(new.blocker_id, new.blocked_id);

  delete from friendships where user_a = paire_a and user_b = paire_b;

  return new;
end;
$$;

create trigger blocked_users_rompt_amitie
  after insert on blocked_users
  for each row execute function rompre_amitie_au_blocage();

-- Une nouvelle demande d'ami ne doit pas pouvoir rouvrir une relation qu'un
-- blocage a fermée.
drop policy "friendships_insert_own" on friendships;
create policy "friendships_insert_own" on friendships for insert
  with check (
    auth.uid() = demandeur
    and (auth.uid() = user_a or auth.uid() = user_b)
    and statut = 'en_attente'
    and not est_bloque(user_a, user_b)
  );

-- ---------------------------------------------------------------------------
-- 2. Signalement d'un message
-- ---------------------------------------------------------------------------
-- L'ajout d'une valeur d'énumération doit s'exécuter seule, avant tout ce qui
-- s'en sert (colonne, contrainte) : Postgres refuse qu'une valeur tout juste
-- ajoutée soit utilisée dans la même transaction.

alter type report_target add value 'message';
