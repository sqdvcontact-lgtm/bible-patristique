-- À exécuter en lecture seule après application locale de la migration.
-- Toute divergence fait échouer le script.

do $$
declare
  table_count integer;
  view_count integer;
  rls_count integer;
  security_invoker_count integer;
  security_definer_count integer;
  client_write_grants integer;
  client_write_policies integer;
  unindexed_foreign_keys text[];
begin
  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
    and table_name in (
      'bible_text_sources', 'bible_source_units', 'bible_text_layers',
      'bible_source_unit_texts', 'bible_native_divisions',
      'bible_editorial_segmentations', 'bible_editorial_segments',
      'bible_editorial_segment_sources', 'bible_canonical_alignments',
      'bible_provenance_records', 'bible_provenance_links'
    );
  if table_count <> 11 then
    raise exception 'Modèle incomplet : % tables bible_* sur 11', table_count;
  end if;

  select count(*) into view_count
  from information_schema.views
  where table_schema = 'public'
    and table_name in ('v_bible_source_unit_texts', 'v_bible_reading_capabilities', 'v_bible_canonical_lookup');
  if view_count <> 3 then
    raise exception 'Modèle incomplet : % vues v_bible_* sur 3', view_count;
  end if;

  select count(*) into rls_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relrowsecurity
    and c.relname in (
      'bible_text_sources', 'bible_source_units', 'bible_text_layers',
      'bible_source_unit_texts', 'bible_native_divisions',
      'bible_editorial_segmentations', 'bible_editorial_segments',
      'bible_editorial_segment_sources', 'bible_canonical_alignments',
      'bible_provenance_records', 'bible_provenance_links'
    );
  if rls_count <> 11 then
    raise exception 'RLS incomplet : % tables sur 11', rls_count;
  end if;

  select count(*) into security_invoker_count
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('v_bible_source_unit_texts', 'v_bible_reading_capabilities', 'v_bible_canonical_lookup')
    and 'security_invoker=true' = any(coalesce(c.reloptions, '{}'::text[]));
  if security_invoker_count <> 3 then
    raise exception 'security_invoker incomplet : % vues sur 3', security_invoker_count;
  end if;

  select count(*) into security_definer_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.proname like 'bible_%';
  if security_definer_count <> 0 then
    raise exception '% fonctions bible_* SECURITY DEFINER interdites', security_definer_count;
  end if;

  select count(*) into client_write_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and (left(table_name, 6) = 'bible_' or left(table_name, 8) = 'v_bible_')
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');
  if client_write_grants <> 0 then
    raise exception '% privilèges d écriture client détectés', client_write_grants;
  end if;

  select count(*) into client_write_policies
  from pg_policies
  where schemaname = 'public'
    and left(tablename, 6) = 'bible_'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and (roles && array['anon', 'authenticated', 'public']::name[]);
  if client_write_policies <> 0 then
    raise exception '% policies d écriture client détectées', client_write_policies;
  end if;

  select array_agg(format('%I.%I:%I', n.nspname, c.relname, con.conname))
    into unindexed_foreign_keys
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where con.contype = 'f'
    and n.nspname = 'public'
    and left(c.relname, 6) = 'bible_'
    and not exists (
      select 1
      from pg_index i
      where i.indrelid = con.conrelid
        and i.indisvalid
        and array(
          select (i.indkey::smallint[])[position]
          from generate_series(0, cardinality(con.conkey) - 1) as position
        ) = con.conkey
    );
  if unindexed_foreign_keys is not null then
    raise exception 'FK sans index préfixe : %', array_to_string(unindexed_foreign_keys, ', ');
  end if;
end
$$;

-- Le schéma est générique et aucune donnée n'est créée par la migration.
select count(*) = 0 as no_seeded_sources from public.bible_text_sources;
select count(*) = 0 as no_seeded_alignments from public.bible_canonical_alignments;

-- Vérification manuelle complémentaire : comparer avant/après les comptages et
-- empreintes logiques de versets_v2 et versets_canon. Ce script ne les écrit jamais.
