-- Contrôles postérieurs à 20260903213000_bible_edition_assets_regime_part_colonne.
-- `exec_sql` ne rend pas les lignes d'un select : chaque garde lève elle-même.
do $controle$
declare
  n integer;
begin
  select count(*) into n from public.bible_edition_assets where regime is null or part_colonne is null;
  if n > 0 then raise exception '% actif(s) sans régime ou sans part', n; end if;

  select count(*) into n
  from public.bible_edition_assets a
  join public.bible_edition_asset_files f on f.asset_id = a.id and f.variant_role = 'web'
  where (a.regime = 'vignette' and f.processing_profile not like '%detouree%')
     or (a.regime = 'au-fil' and f.processing_profile not like '%cadree%')
     or (a.regime = 'hors-texte' and f.processing_profile <> 'fillion-planche-hors-texte');
  if n > 0 then raise exception '% actif(s) dont le régime contredit le fichier servi', n; end if;

  select count(*) into n from public.bible_edition_assets where part_colonne < 0.36 or part_colonne > 0.88;
  if n > 0 then raise exception '% actif(s) hors des deux bornes', n; end if;

  select count(*) into n from public.bible_edition_assets where scope_book_code = '1SA' and asset_kind = 'plate';
  if n > 0 then raise exception '% « planche(s) » subsistent dans 1 Samuel', n; end if;

  select count(*) into n from public.bible_edition_assets where asset_kind = 'plate' and regime <> 'hors-texte';
  if n > 0 then raise exception '% planche(s) composée(s) autrement qu''hors-texte', n; end if;

  select count(*) into n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'v_bible_edition_assets' and column_name in ('regime', 'part_colonne');
  if n <> 2 then raise exception 'la vue v_bible_edition_assets n''expose pas les deux colonnes'; end if;
end
$controle$;
