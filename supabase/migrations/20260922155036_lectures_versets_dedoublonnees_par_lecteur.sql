-- Le compteur de lectures d'un verset ne compte plus qu'UNE lecture par lecteur et par
-- verset sur une fenêtre de vingt-quatre heures. La route serveur exige désormais une
-- session ; le dédoublonnage vit en base, parce que le limiteur en mémoire n'est pas
-- partagé entre les instances. Migration additive : l'ancienne fonction reste en place.

create table if not exists public.lectures_versets_lecteurs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id_verset text not null,
  lu_le timestamptz not null default now(),
  primary key (user_id, id_verset)
);

alter table public.lectures_versets_lecteurs enable row level security;
-- Aucune politique : seule la clé de service (la route) y écrit et y lit.
revoke all on table public.lectures_versets_lecteurs from public, anon, authenticated;

create or replace function public.incrementer_lecture(p_id_verset text, p_user_id uuid)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if p_user_id is null then
    return false;
  end if;
  if not exists (select 1 from versets_lecture where id_verset = p_id_verset) then
    return false;
  end if;
  insert into lectures_versets_lecteurs (user_id, id_verset, lu_le)
  values (p_user_id, p_id_verset, now())
  on conflict (user_id, id_verset) do update set lu_le = now()
    where lectures_versets_lecteurs.lu_le < now() - interval '24 hours';
  if not found then
    return false;
  end if;
  insert into lectures_versets (id_verset, nb_lectures)
  values (p_id_verset, 1)
  on conflict (id_verset) do update set nb_lectures = lectures_versets.nb_lectures + 1;
  return true;
end;
$function$;

revoke execute on function public.incrementer_lecture(text, uuid) from public, anon, authenticated;
grant execute on function public.incrementer_lecture(text, uuid) to service_role;
