-- ⚠️ La variable s'appelait « n », comme l'alias de comptage du CTE : plpgsql rend alors
-- « column reference "n" is ambiguous » et la fonction ne s'exécute pas une seule fois.
--
-- Trois sources, et il les faut toutes les trois : la Septante (TR0005), les textes dont
-- `oeuvre_textes.langue` dit le grec, et la colonne `segments.texte_original` des œuvres
-- dont l'original n'a pas encore de texte propre (forme héritée, charte § 12.1).
--
-- ⛔ Le filtre porte sur la forme NORMALISÉE, non sur la forme attestée : un mot grec
-- accentué ne s'apparie à aucune classe de caractères simple. Et la classe est écrite en
-- toutes lettres — une plage de α à ω dépend de l'ordre de la collation, non de l'alphabet.
--
-- ⚠️ On garde la forme la PLUS FRÉQUENTE de chaque groupe désaccentué, comme le fait le
-- lexique français : c'est elle qu'on insère dans la requête.
-- Passe du 2026-09-06 : 51 078 formes.
create or replace function public.rafraichir_lexique_grec()
 returns integer language plpgsql security definer
 set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare nb integer;
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
    select mot, norm, count(*)::int as occurrences from grecs group by mot, norm
  ),
  par_groupe as (
    select norm,
           (array_agg(mot order by occurrences desc, mot))[1] as forme,
           sum(occurrences)::int as total
      from par_forme group by norm
  )
  select forme, norm, public.cle_grec_latine(forme), total from par_groupe;

  get diagnostics nb = row_count;
  analyze public.concordance_lexique_grec;
  return nb;
end $$;

revoke all on function public.rafraichir_lexique_grec() from public;
grant execute on function public.rafraichir_lexique_grec() to service_role;
