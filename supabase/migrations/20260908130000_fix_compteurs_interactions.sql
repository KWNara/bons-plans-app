-- Les compteurs likes_count / comments_count / reposts_count restaient à zéro.
--
-- `adjust_deal_counter` était la seule fonction de trigger du projet sans
-- `security definer` : elle s'exécutait donc avec les droits de l'utilisateur
-- qui like ou commente, et la politique RLS d'UPDATE sur `deals` (réservée au
-- commerçant propriétaire) filtrait la ligne. Postgres ne lève aucune erreur
-- dans ce cas — l'UPDATE touche simplement zéro ligne — d'où un échec
-- totalement silencieux : chaque bon plan affichait 0 like à vie, et le tri
-- « par popularité » ne triait rien.

create or replace function adjust_deal_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_deal_id uuid := coalesce(new.deal_id, old.deal_id);
  target_column text := tg_argv[0];
  delta int := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  execute format(
    'update deals set %I = greatest(%I + $1, 0) where id = $2',
    target_column, target_column
  ) using delta, target_deal_id;
  return null;
end;
$$;

-- Remise à niveau des compteurs à partir des interactions réellement
-- enregistrées depuis le lancement, que les triggers n'ont jamais comptées.
update deals d
set likes_count = coalesce(counts.total, 0)
from (
  select deal_id, count(*) as total from likes group by deal_id
) as counts
where counts.deal_id = d.id and d.likes_count is distinct from counts.total;

update deals d
set comments_count = coalesce(counts.total, 0)
from (
  select deal_id, count(*) as total from comments group by deal_id
) as counts
where counts.deal_id = d.id and d.comments_count is distinct from counts.total;

update deals d
set reposts_count = coalesce(counts.total, 0)
from (
  select deal_id, count(*) as total from reposts group by deal_id
) as counts
where counts.deal_id = d.id and d.reposts_count is distinct from counts.total;
