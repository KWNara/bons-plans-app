-- Avis et notes sur les commerçants.
--
-- Jusqu'ici, la confiance ne reposait que sur les commentaires épars laissés
-- sous chaque bon plan. Un avis porte sur l'enseigne elle-même — une note et
-- un commentaire optionnel, un par personne, modifiable dans le temps.

create table merchant_reviews (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchant_profiles (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  note integer not null check (note between 1 and 5),
  commentaire text check (commentaire is null or length(commentaire) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);

create index merchant_reviews_merchant_idx on merchant_reviews (merchant_id, created_at desc);

create trigger merchant_reviews_updated_at
  before update on merchant_reviews
  for each row execute function set_updated_at();

alter table merchant_reviews enable row level security;

-- Public comme les commentaires : un avis n'a de valeur que si tout le monde
-- peut le lire avant de se déplacer.
create policy "merchant_reviews_select_public" on merchant_reviews for select
  using (true);

create policy "merchant_reviews_insert_own" on merchant_reviews for insert
  with check (auth.uid() = user_id);

create policy "merchant_reviews_delete_own" on merchant_reviews for delete
  using (auth.uid() = user_id);

-- Seuls la note et le commentaire se modifient : merchant_id et user_id
-- identifient l'avis, les changer reviendrait à en fabriquer un autre.
revoke update on merchant_reviews from authenticated;
grant update (note, commentaire) on merchant_reviews to authenticated;

create policy "merchant_reviews_update_own" on merchant_reviews for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Un commerçant ne note pas sa propre boutique. Une politique RLS ne peut pas
-- comparer deux tables au moment de l'écriture aussi proprement qu'un
-- déclencheur, qui donne en plus un message clair au lieu d'un 403 muet.
create function empecher_avis_sur_soi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from merchant_profiles
    where id = new.merchant_id and user_id = new.user_id
  ) then
    raise exception 'Tu ne peux pas laisser d''avis sur ton propre établissement.';
  end if;
  return new;
end;
$$;

create trigger merchant_reviews_pas_sur_soi
  before insert on merchant_reviews
  for each row execute function empecher_avis_sur_soi();

-- Résumé public : une moyenne et un total, jamais le détail. Une requête
-- d'agrégation directe depuis le client contournerait la pagination pour rien
-- ici, autant renvoyer le résultat déjà calculé.
create function avis_resume(p_merchant_id uuid)
returns table(moyenne numeric, total integer)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(round(avg(note)::numeric, 1), 0), count(*)::int
  from merchant_reviews
  where merchant_id = p_merchant_id;
$$;

grant execute on function avis_resume(uuid) to anon, authenticated;
