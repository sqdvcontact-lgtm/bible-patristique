-- Vérification non destructive du pilote privé Fillion, Marc I, 1-20.

do $verify_fillion_marc1$
declare
  v_family_id uuid;
  v_note_id uuid;
  v_source_count integer;
  v_row_count integer;
  v_distinct_count integer;
  v_mrk_1_9 text;
begin
  select id into strict v_family_id
  from public.bible_edition_families
  where family_code = 'fillion-bible' and status = 'draft';

  select count(*) into v_source_count
  from public.bible_text_sources
  where source_code = 'fillion-t07-mrk-pilot'
    and trad_id in ('TR0010', 'TR0011')
    and status = 'review';
  if v_source_count <> 2 then
    raise exception 'Deux sources pilotes en revue attendues, obtenu : %', v_source_count;
  end if;

  select count(*) into v_row_count
  from public.bible_text_layers l
  join public.bible_text_sources s on s.id = l.source_id
  where s.source_code = 'fillion-t07-mrk-pilot'
    and l.layer_code = 'lecture-fidele'
    and l.validation_status = 'review'
    and not l.is_public;
  if v_row_count <> 2 then
    raise exception 'Deux couches privées de lecture fidèle attendues, obtenu : %', v_row_count;
  end if;

  select count(*) into v_row_count
  from public.bible_source_units u
  join public.bible_text_sources s on s.id = u.source_id
  where s.source_code = 'fillion-t07-mrk-pilot';
  if v_row_count <> 46 then
    raise exception '46 unités sources attendues, obtenu : %', v_row_count;
  end if;

  select count(*) into v_row_count
  from public.bible_native_divisions d
  join public.bible_text_sources s on s.id = d.source_id
  where s.source_code = 'fillion-t07-mrk-pilot'
    and d.validation_status = 'review'
    and not d.is_public;
  if v_row_count <> 4 then
    raise exception 'Quatre divisions natives privées attendues, obtenu : %', v_row_count;
  end if;

  select count(*) into v_row_count
  from public.bible_editorial_segments e
  join public.bible_text_sources s on s.id = e.source_id
  where s.source_code = 'fillion-t07-mrk-pilot';
  if v_row_count <> 46 then
    raise exception '46 segments éditoriaux attendus, obtenu : %', v_row_count;
  end if;

  select count(*), count(distinct a.canon_id)
  into v_row_count, v_distinct_count
  from public.bible_canonical_alignments a
  join public.bible_text_sources s on s.id = a.source_id
  where s.source_code = 'fillion-t07-mrk-pilot'
    and a.alignment_status = 'MATCH'
    and a.verification_status = 'review';
  if v_row_count <> 40 or v_distinct_count <> 20 then
    raise exception 'Alignements attendus : 40 lignes / 20 créneaux, obtenu : % / %',
      v_row_count, v_distinct_count;
  end if;

  if exists (
    select 1
    from public.bible_editorial_segments e
    join public.bible_text_sources s on s.id = e.source_id
    where s.source_code = 'fillion-t07-mrk-pilot'
      and e.segment_key ~ '^mrk-001-[0-9]{3}$'
      and e.editorial_label <> 'I, ' || e.editorial_number::text
  ) then
    raise exception 'Une référence native I, n a été altérée.';
  end if;

  select count(*) into v_row_count
  from public.v_bible_editorial_body_blocks b
  where b.family_id = v_family_id
    and b.scope_book_code = 'MRK'
    and b.placement = 'before'
    and b.validation_status = 'review'
    and not b.is_public
    and b.semantic_style_code in ('introduction_livre', 'commentaire_pericope');
  if v_row_count <> 6 then
    raise exception 'Six blocs de corps privés avec styles sémantiques attendus, obtenu : %', v_row_count;
  end if;

  select id into strict v_note_id
  from public.bible_verse_notes
  where family_id = v_family_id
    and note_key = 'mrk-001-001-note-01-pilot'
    and validation_status = 'review'
    and not is_public;

  select count(*), count(distinct target_source_id)
  into v_row_count, v_distinct_count
  from public.bible_verse_note_anchors
  where note_id = v_note_id
    and validation_status = 'review';
  if v_row_count <> 2 or v_distinct_count <> 2 then
    raise exception 'La note pilote doit avoir deux ancres sur deux sources distinctes.';
  end if;

  select id into strict v_mrk_1_9
  from public.versets_canon
  where livre = 'MRK' and ch_canon = 1 and v_canon = 9;

  select count(*) into v_row_count
  from public.bible_edition_assets a
  where a.family_id = v_family_id
    and a.asset_key = 'fillion-t07-p0202-i01'
    and a.canon_id_start = v_mrk_1_9
    and a.placement = 'after'
    and a.semantic_scope_kind = 'verse'
    and a.validation_status = 'review'
    and not a.is_public;
  if v_row_count <> 1 then
    raise exception 'L’illustration du Jourdain n’est pas associée en privé après Marc I, 9.';
  end if;

  select count(*) into v_row_count
  from public.bible_edition_asset_files f
  join public.bible_edition_assets a on a.id = f.asset_id and a.family_id = f.family_id
  where a.asset_key = 'fillion-t07-p0202-i01'
    and f.variant_role = 'master'
    and f.storage_bucket = 'bible-illustrations-master'
    and f.sha256 = '4e6cec8d83d15a176dcd438fac73f69cf0d16bd06c7c7f4c580d7ca98e3144ea'
    and f.validation_status = 'review'
    and not f.is_public;
  if v_row_count <> 1 then
    raise exception 'Le master privé de l’illustration est absent ou incohérent.';
  end if;

  if exists (
    select 1
    from public.bible_edition_asset_files f
    join public.bible_edition_assets a on a.id = f.asset_id and a.family_id = f.family_id
    where a.asset_key = 'fillion-t07-p0202-i01' and f.variant_role = 'web'
  ) then
    raise exception 'Le dérivé WebP en revue ne doit pas encore être téléversé.';
  end if;

  if not exists (
    select 1
    from public.bible_source_unit_texts t
    join public.bible_source_units u on u.id = t.unit_id and u.source_id = t.source_id
    join public.bible_text_sources s on s.id = t.source_id
    where s.trad_id = 'TR0010'
      and s.source_code = 'fillion-t07-mrk-pilot'
      and u.source_unit_key = 'mrk-001-013'
      and u.material_features ->> 'split_by_plate' = 'true'
      and t.text_content = 'Il passa dans le désert quarante jours et quarante nuits, et il était tenté par Satan, et il était avec les bêtes sauvages, et les anges le servaient.'
  ) then
    raise exception 'Le verset français I, 13, recomposé autour de la planche, est incohérent.';
  end if;

  if exists (
    select 1 from public.bible_text_sources
    where source_code = 'fillion-t07-mrk-pilot' and status = 'published'
  ) then
    raise exception 'Une source pilote ne doit pas être publiée.';
  end if;
end
$verify_fillion_marc1$;
