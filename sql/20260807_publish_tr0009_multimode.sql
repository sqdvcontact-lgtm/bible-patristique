-- One-shot guarded publication of the three validated TR0009 reading modes.
-- This DML is intentionally separate from the generic schema migration.

begin;

do $$
declare
  source_uuid uuid;
  affected integer;
  expected_public_status constant text :=
    'Transcription intégrale du manuscrit. Première campagne de relecture achevée ; certaines lectures demeurent signalées comme incertaines. Les modes diplomatique, abréviations développées et structure native sont disponibles. L’alignement canonique en versets reste à établir.';
begin
  select id into strict source_uuid
  from public.bible_text_sources
  where trad_id = 'TR0009' and status = 'review';

  if (select count(*) from public.bible_source_units where source_id = source_uuid) <> 58314 then
    raise exception 'TR0009 guard: expected 58314 source units';
  end if;
  if (select count(*) from public.bible_text_layers where source_id = source_uuid) <> 2 then
    raise exception 'TR0009 guard: expected exactly two layers';
  end if;
  if exists (
    select 1 from public.bible_text_layers
    where source_id = source_uuid
      and (layer_code not in ('diplomatic', 'expanded')
        or validation_status <> 'validated'
        or is_public)
  ) then
    raise exception 'TR0009 guard: layer state diverged';
  end if;
  if (select count(*) from public.bible_source_unit_texts where source_id = source_uuid) <> 116628 then
    raise exception 'TR0009 guard: expected 116628 texts';
  end if;
  if (select count(*) from public.bible_native_divisions where source_id = source_uuid) <> 696
    or exists (
      select 1 from public.bible_native_divisions
      where source_id = source_uuid
        and (validation_status <> 'validated' or is_public)
    ) then
    raise exception 'TR0009 guard: native division state diverged';
  end if;
  if exists (select 1 from public.bible_canonical_alignments where source_id = source_uuid) then
    raise exception 'TR0009 guard: canonical alignment exists';
  end if;
  if exists (select 1 from public.versets_v2 where trad_id = 'TR0009') then
    raise exception 'TR0009 guard: verse row exists';
  end if;
  if exists (
    select 1 from public.bible_text_layers
    where source_id = source_uuid and layer_code = 'modernized'
  ) then
    raise exception 'TR0009 guard: modernized layer exists';
  end if;
  if exists (select 1 from public.v_bible_reading_capabilities where trad_id = 'TR0009') then
    raise exception 'TR0009 guard: source already publicly exposed';
  end if;

  update public.bible_text_sources
  set status = 'published', updated_at = now()
  where id = source_uuid and status = 'review';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'TR0009 publication: source update affected % rows', affected; end if;

  update public.bible_text_layers
  set is_public = true, updated_at = now()
  where source_id = source_uuid
    and layer_code in ('diplomatic', 'expanded')
    and validation_status = 'validated'
    and not is_public;
  get diagnostics affected = row_count;
  if affected <> 2 then raise exception 'TR0009 publication: layer update affected % rows', affected; end if;

  update public.bible_native_divisions
  set is_public = true, updated_at = now()
  where source_id = source_uuid
    and validation_status = 'validated'
    and not is_public;
  get diagnostics affected = row_count;
  if affected <> 696 then raise exception 'TR0009 publication: division update affected % rows', affected; end if;

  update public.traductions
  set statut_corpus_public = expected_public_status
  where trad_id = 'TR0009'
    and schema_numerotation = 'vulgate'
    and statut_corpus_public =
      'Transcription en cours — 31 feuillets sur 372 matériellement traités (8,3 %) ; LOT_003 en cours de retranscription indépendante';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'TR0009 publication: translation update affected % rows', affected; end if;

  if (select count(*) from public.v_bible_reading_capabilities where trad_id = 'TR0009') <> 6 then
    raise exception 'TR0009 publication: six capability rows were not produced';
  end if;
  if (select count(*) from public.v_bible_reading_capabilities where trad_id = 'TR0009' and is_available) <> 3 then
    raise exception 'TR0009 publication: exactly three modes must be available';
  end if;
  if exists (
    select 1 from public.v_bible_reading_capabilities
    where trad_id = 'TR0009'
      and ((mode_code in ('diplomatic', 'expanded', 'native') and not is_available)
        or (mode_code in ('paragraph', 'verse', 'modernized') and is_available))
  ) then
    raise exception 'TR0009 publication: capability matrix diverged';
  end if;
end
$$;

commit;
