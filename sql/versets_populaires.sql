-- Migration non destructive pour l'onglet "Versets populaires".
-- A executer dans Supabase SQL Editor si les compteurs ne bougent pas.

alter table public.versets
  add column if not exists nb_lectures bigint not null default 0;

create or replace function public.incrementer_lecture(p_id_verset text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.versets
  set nb_lectures = coalesce(nb_lectures, 0) + 1
  where id_verset = p_id_verset;
$$;

grant execute on function public.incrementer_lecture(text) to anon, authenticated;

create or replace view public.versets_plus_lus as
select
  id_verset,
  livre,
  chapitre,
  verset,
  "TR0002",
  nb_lectures
from public.versets
where nb_lectures > 0;

grant select on public.versets_plus_lus to anon, authenticated;
