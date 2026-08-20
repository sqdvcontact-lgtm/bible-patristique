-- Contrôles à exécuter après application de
-- supabase/migrations/20260820093045_bible_fillion_editorial_model.sql.
-- Lecture seule : ce fichier ne crée ni ne modifie aucune donnée.

do $$
declare
  missing_tables text[];
begin
  select array_agg(expected.name order by expected.name)
  into missing_tables
  from (values
    ('bible_edition_families'),
    ('bible_edition_members'),
    ('bible_edition_components'),
    ('bible_edition_member_sources'),
    ('bible_editorial_body_blocks'),
    ('bible_editorial_body_block_notes'),
    ('bible_editorial_body_block_note_blocks'),
    ('bible_verse_notes'),
    ('bible_verse_note_blocks'),
    ('bible_verse_note_relations'),
    ('bible_verse_note_anchors'),
    ('bible_edition_assets'),
    ('bible_edition_asset_files')
  ) as expected(name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public' and t.table_name = expected.name
  );

  if missing_tables is not null then
    raise exception 'Tables publiques manquantes : %', missing_tables;
  end if;
end
$$;

do $$
declare
  missing_internal_tables text[];
begin
  select array_agg(expected.name order by expected.name)
  into missing_internal_tables
  from (values
    ('bible_canonical_spine_versions'),
    ('bible_canonical_spine_entries'),
    ('bible_canonical_spine_mappings')
  ) as expected(name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'internal' and t.table_name = expected.name
  );

  if missing_internal_tables is not null then
    raise exception 'Tables internes AELF manquantes : %', missing_internal_tables;
  end if;
end
$$;

do $$
declare
  missing_views text[];
begin
  select array_agg(expected.name order by expected.name)
  into missing_views
  from (values
    ('v_bible_edition_catalog'),
    ('v_bible_editorial_body_blocks'),
    ('v_bible_editorial_body_block_notes'),
    ('v_bible_verse_notes'),
    ('v_bible_edition_assets'),
    ('v_bible_edition_asset_files')
  ) as expected(name)
  where not exists (
    select 1
    from information_schema.views v
    where v.table_schema = 'public' and v.table_name = expected.name
  );

  if missing_views is not null then
    raise exception 'Vues publiques manquantes : %', missing_views;
  end if;
end
$$;

do $$
declare
  without_rls text[];
begin
  select array_agg(c.relname order by c.relname)
  into without_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'bible_edition_families',
      'bible_edition_members',
      'bible_edition_components',
      'bible_edition_member_sources',
      'bible_editorial_body_blocks',
      'bible_editorial_body_block_notes',
      'bible_editorial_body_block_note_blocks',
      'bible_verse_notes',
      'bible_verse_note_blocks',
      'bible_verse_note_relations',
      'bible_verse_note_anchors',
      'bible_edition_assets',
      'bible_edition_asset_files'
    ])
    and not c.relrowsecurity;

  if without_rls is not null then
    raise exception 'RLS absente : %', without_rls;
  end if;
end
$$;

do $$
declare
  unsafe_views text[];
begin
  select array_agg(c.relname order by c.relname)
  into unsafe_views
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'v_bible_edition_catalog',
      'v_bible_editorial_body_blocks',
      'v_bible_editorial_body_block_notes',
      'v_bible_verse_notes',
      'v_bible_edition_assets',
      'v_bible_edition_asset_files'
    ])
    and not coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true'];

  if unsafe_views is not null then
    raise exception 'Vues sans security_invoker=true : %', unsafe_views;
  end if;
end
$$;

do $$
declare
  forbidden_write_grants text[];
begin
  select array_agg(
    g.grantee || ':' || g.table_name || ':' || g.privilege_type
    order by g.grantee, g.table_name, g.privilege_type
  )
  into forbidden_write_grants
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and g.table_name = any(array[
      'bible_edition_families',
      'bible_edition_members',
      'bible_edition_components',
      'bible_edition_member_sources',
      'bible_editorial_body_blocks',
      'bible_editorial_body_block_notes',
      'bible_editorial_body_block_note_blocks',
      'bible_verse_notes',
      'bible_verse_note_blocks',
      'bible_verse_note_relations',
      'bible_verse_note_anchors',
      'bible_edition_assets',
      'bible_edition_asset_files'
    ])
    and g.grantee in ('anon', 'authenticated')
    and g.privilege_type <> 'SELECT';

  if forbidden_write_grants is not null then
    raise exception 'Droits clients trop larges : %', forbidden_write_grants;
  end if;
end
$$;

do $$
declare
  missing_select_grants text[];
begin
  select array_agg(role_name || ':' || object_name order by role_name, object_name)
  into missing_select_grants
  from unnest(array['anon', 'authenticated']) as role_names(role_name)
  cross join unnest(array[
    'v_bible_edition_catalog',
    'v_bible_editorial_body_blocks',
    'v_bible_editorial_body_block_notes',
    'v_bible_verse_notes',
    'v_bible_edition_assets',
    'v_bible_edition_asset_files'
  ]) as object_names(object_name)
  where not has_table_privilege(role_name, 'public.' || object_name, 'SELECT');

  if missing_select_grants is not null then
    raise exception 'Droits SELECT manquants sur les vues : %', missing_select_grants;
  end if;
end
$$;

do $$
begin
  if has_schema_privilege('anon', 'internal', 'USAGE')
     or has_schema_privilege('authenticated', 'internal', 'USAGE') then
    raise exception 'Le schéma internal est accessible à un rôle client.';
  end if;

  if has_table_privilege('anon', 'internal.bible_canonical_spine_versions', 'SELECT')
     or has_table_privilege('authenticated', 'internal.bible_canonical_spine_versions', 'SELECT') then
    raise exception 'Les instantanés structurels internes sont accessibles aux clients.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'bible_edition_assets'
      and t.tgname = 'bible_edition_assets_publication_guard'
      and not t.tgisinternal
  ) then
    raise exception 'Garde de publication des illustrations absente.';
  end if;
end
$$;

select
  'bible_fillion_editorial_model' as verification,
  'ok' as status;
