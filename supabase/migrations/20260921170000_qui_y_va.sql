-- « Qui y va ? » : présence déclarée, bon plan par bon plan.
--
-- Choix de conception : c'est l'inverse d'une carte de localisation en temps
-- réel. Rien n'est partagé automatiquement, rien n'est continu. On coche
-- soi-même « j'y vais » sur une offre précise, et on décoche quand on veut.
-- Ce que ça expose se limite donc à une intention, sur une soirée, à des gens
-- qu'on a soi-même acceptés en amis.
--
-- Visibilité : seuls les amis voient qui participe nominativement. Le total,
-- lui, est public mais anonyme — c'est ce qui donne envie d'y aller sans
-- révéler qui que ce soit.

create table deal_participations (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

create index deal_participations_deal_idx on deal_participations (deal_id);
create index deal_participations_user_idx on deal_participations (user_id, created_at desc);

alter table deal_participations enable row level security;

-- On voit sa propre participation, et celle de ses amis. Un inconnu qui
-- interroge la table directement ne récupère rien de nominatif.
create policy "participations_select_amis" on deal_participations for select
  using (auth.uid() = user_id or sont_amis(auth.uid(), user_id));

create policy "participations_insert_own" on deal_participations for insert
  with check (auth.uid() = user_id);

create policy "participations_delete_own" on deal_participations for delete
  using (auth.uid() = user_id);

-- Une participation ne se modifie pas : on la crée ou on la retire.
revoke update on deal_participations from authenticated;

-- Le compteur public. `security definer` parce qu'il doit compter au-delà de
-- ce que la politique de lecture laisse voir : sinon un utilisateur sans amis
-- verrait toujours « 0 personne y va » sur une offre pourtant très suivie.
-- Il ne renvoie qu'un nombre, jamais une identité.
create function compte_participants(p_deal_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from deal_participations where deal_id = p_deal_id;
$$;

grant execute on function compte_participants(uuid) to anon, authenticated;
