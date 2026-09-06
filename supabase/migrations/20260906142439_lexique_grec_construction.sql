-- La construction du lexique grec. ⛔ Elle DÉRIVE du corpus et ne se corrige jamais à la
-- main, comme `concordance_lexique` que le travail mensuel refait depuis `versets_lecture`.
--
-- ⚠️ CETTE ÉCRITURE NE S'EXÉCUTE PAS : la variable de retour s'appelle « n », comme
-- l'alias de comptage du CTE, et plpgsql rend « column reference "n" is ambiguous ».
-- Elle est corrigée par la migration 20260906142457, et gardée ici pour que le journal
-- dise ce qui a été appliqué.
create or replace function public.rafraichir_lexique_grec()
 returns integer language plpgsql security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare n integer;
begin
  truncate public.concordance_lexique_grec;

  insert into public.concordance_lexique_grec (mot, mot_norm, cle_latine, freq)
  with brut as (
    select regexp_split_to_table(v."TR0005", '[^[:alnum:]]+') as mot
      from public.versets_lecture v
     where coalesce(v."TR0005", '') <> ''
    union all
    select regexp_split_to_table(s.segment_texte, '[^[:alnum:]]+')
      from public.segments s
      join public.oeuvre_textes t on t.id_texte = s.id_texte
     where t.langue ilike '%grec%' and coalesce(s.segment_texte, '') <> ''
    union all
    select regexp_split_to_table(s.texte_original, '[^[:alnum:]]+')
      from public.segments s
     where coalesce(s.texte_original, '') <> ''
  ),
  normes as (
    select mot, public.norm_gr(mot) as norm from brut where length(mot) >= 2
  ),
  grecs as (
    select mot, norm from normes
     where norm ~ '^[αβγδεζηθικλμνξοπρστυφχψω]{2,}$'
  ),
  par_forme as (
    select mot, norm, count(*)::int as n from grecs group by mot, norm
  ),
  par_groupe as (
    select norm,
           (array_agg(mot order by n desc, mot))[1] as forme,
           sum(n)::int as total
      from par_forme group by norm
  )
  select forme, norm, public.cle_grec_latine(forme), total from par_groupe;

  get diagnostics n = row_count;
  analyze public.concordance_lexique_grec;
  return n;
end $$;

revoke all on function public.rafraichir_lexique_grec() from public;
grant execute on function public.rafraichir_lexique_grec() to service_role;
