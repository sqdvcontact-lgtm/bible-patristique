-- Socle générique pour les éditions bibliques commentées et bilingues.
-- Préparé pour Fillion, sans créer de traduction ni importer de contenu.
-- Migration strictement additive : ne modifie ni versets_v2, ni versets_canon,
-- ni les traductions et sources déjà publiées.

begin;

create table public.bible_edition_families (
  id uuid primary key default gen_random_uuid(),
  family_code text not null unique,
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, status),
  check (family_code ~ '^[a-z0-9][a-z0-9_-]*$')
);

create table public.bible_edition_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.bible_edition_families(id)
    on update cascade on delete cascade,
  trad_id text not null references public.traductions(trad_id)
    on update cascade on delete restrict,
  member_role text not null
    check (member_role in ('source_text', 'translation', 'recension', 'other')),
  language_code text not null,
  label text not null,
  display_order integer not null check (display_order > 0),
  desktop_position text not null default 'auto'
    check (desktop_position in ('left', 'right', 'auto')),
  mobile_order integer not null check (mobile_order > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, trad_id),
  unique (family_id, display_order),
  unique (family_id, mobile_order),
  unique (family_id, id),
  unique (family_id, id, trad_id)
);

create table public.bible_edition_components (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.bible_edition_families(id)
    on update cascade on delete cascade,
  component_code text not null,
  title text not null,
  volume_label text,
  edition_statement text,
  publication_place text,
  publisher text,
  publication_year integer
    check (publication_year is null or publication_year between 1400 and 2200),
  publication_date_text text,
  bibliographic_note text,
  source_uri text,
  source_sha256 text,
  material_order integer not null check (material_order > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, component_code),
  unique (family_id, material_order),
  unique (family_id, id),
  check (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$')
);

create table public.bible_edition_member_sources (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_id uuid not null,
  trad_id text not null,
  component_id uuid not null,
  source_id uuid not null,
  source_role text not null default 'primary'
    check (source_role in ('primary', 'alternative', 'supplement')),
  canon_id_start text references public.versets_canon(id)
    on update cascade on delete restrict,
  canon_id_end text references public.versets_canon(id)
    on update cascade on delete restrict,
  material_order integer not null check (material_order > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (family_id, member_id, trad_id)
    references public.bible_edition_members(family_id, id, trad_id)
    on update cascade on delete cascade,
  foreign key (family_id, component_id)
    references public.bible_edition_components(family_id, id)
    on update cascade on delete cascade,
  foreign key (source_id, trad_id)
    references public.bible_text_sources(id, trad_id)
    on update cascade on delete restrict,
  unique (member_id, component_id, source_id),
  unique (family_id, member_id, material_order),
  unique (family_id, id),
  unique (family_id, id, source_id),
  check (canon_id_end is null or canon_id_start is not null)
);

create table public.bible_editorial_body_blocks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_source_id uuid not null,
  source_id uuid not null,
  segmentation_id uuid not null,
  segment_id uuid not null,
  block_key text not null,
  block_kind text not null check (block_kind in (
    'title', 'introduction', 'commentary', 'notice', 'summary',
    'excursus', 'conclusion', 'transition'
  )),
  scope_kind text not null check (scope_kind in (
    'bible', 'testament', 'book_group', 'book', 'book_part',
    'chapter', 'section', 'pericope'
  )),
  placement text not null check (placement in ('before', 'after', 'inline')),
  applies_to text not null default 'family'
    check (applies_to in ('family', 'member')),
  applies_to_member_id uuid,
  heading text,
  scope_book_code text,
  scope_label text,
  canon_id_start text references public.versets_canon(id)
    on update cascade on delete restrict,
  canon_id_end text references public.versets_canon(id)
    on update cascade on delete restrict,
  native_scope jsonb not null default '{}'::jsonb
    check (jsonb_typeof(native_scope) = 'object'),
  printed_reference text,
  printed_page_start text,
  printed_page_end text,
  material_order bigint not null check (material_order > 0),
  classification_confidence text not null default 'uncertain'
    check (classification_confidence in ('high', 'medium', 'low', 'uncertain')),
  requires_review boolean not null default true,
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'validated', 'rejected')),
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (family_id, member_source_id, source_id)
    references public.bible_edition_member_sources(family_id, id, source_id)
    on update cascade on delete restrict,
  foreign key (family_id, applies_to_member_id)
    references public.bible_edition_members(family_id, id)
    on update cascade on delete restrict,
  foreign key (source_id, segmentation_id)
    references public.bible_editorial_segmentations(source_id, id)
    on update cascade on delete cascade,
  foreign key (segmentation_id, segment_id)
    references public.bible_editorial_segments(segmentation_id, id)
    on update cascade on delete cascade,
  unique (family_id, block_key),
  unique (family_id, id),
  unique (segmentation_id, segment_id),
  check (canon_id_end is null or canon_id_start is not null),
  check (
    (applies_to = 'family' and applies_to_member_id is null)
    or (applies_to = 'member' and applies_to_member_id is not null)
  ),
  check (not is_public or scope_kind in ('bible', 'testament', 'book_group') or scope_book_code is not null),
  check (not is_public or validation_status = 'validated')
);

-- Les introductions et autres blocs du corps peuvent posséder leur propre
-- apparat imprimé. Il reste local au bloc et ne devient jamais une note de verset.
create table public.bible_editorial_body_block_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  body_block_id uuid not null,
  note_key text not null,
  printed_marker text,
  display_number integer not null check (display_number > 0),
  anchor_start_offset_unicode integer
    check (anchor_start_offset_unicode is null or anchor_start_offset_unicode >= 0),
  anchor_end_offset_unicode integer
    check (anchor_end_offset_unicode is null or anchor_end_offset_unicode >= 0),
  anchor_text text,
  printed_page text,
  material_order bigint not null check (material_order > 0),
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'validated', 'rejected')),
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (family_id, body_block_id)
    references public.bible_editorial_body_blocks(family_id, id)
    on update cascade on delete cascade,
  unique (family_id, note_key),
  unique (body_block_id, display_number),
  unique (family_id, id),
  check (anchor_end_offset_unicode is null or anchor_start_offset_unicode is not null),
  check (anchor_end_offset_unicode is null or anchor_end_offset_unicode >= anchor_start_offset_unicode),
  check (not is_public or validation_status = 'validated')
);

create table public.bible_editorial_body_block_note_blocks (
  note_id uuid not null references public.bible_editorial_body_block_notes(id)
    on update cascade on delete cascade,
  block_id text not null,
  rank integer not null check (rank > 0),
  kind text not null check (kind in (
    'commentary', 'quotation', 'translation', 'reference', 'attribution'
  )),
  form text not null default 'prose' check (form in ('prose', 'verse')),
  language text,
  text_content text not null,
  rendering text,
  needs_review boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  primary key (note_id, block_id),
  unique (note_id, rank),
  check (length(text_content) > 0)
);

create table public.bible_verse_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_source_id uuid not null,
  source_id uuid not null,
  note_key text not null,
  applies_to text not null default 'family'
    check (applies_to in ('family', 'member')),
  applies_to_member_id uuid,
  note_subtype text not null default 'exegetical'
    check (note_subtype in (
      'exegetical', 'philological', 'textual', 'historical',
      'translation', 'reference', 'other'
    )),
  canon_id text not null references public.versets_canon(id)
    on update cascade on delete restrict,
  native_reference_raw text,
  printed_marker text,
  display_chapter_key text not null,
  display_number integer not null check (display_number > 0),
  printed_page text,
  material_order bigint not null check (material_order > 0),
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'validated', 'rejected')),
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (family_id, member_source_id, source_id)
    references public.bible_edition_member_sources(family_id, id, source_id)
    on update cascade on delete restrict,
  foreign key (family_id, applies_to_member_id)
    references public.bible_edition_members(family_id, id)
    on update cascade on delete restrict,
  unique (family_id, note_key),
  unique (family_id, display_chapter_key, display_number),
  unique (family_id, id),
  unique (family_id, id, canon_id),
  check (
    (applies_to = 'family' and applies_to_member_id is null)
    or (applies_to = 'member' and applies_to_member_id is not null)
  ),
  check (not is_public or validation_status = 'validated')
);

create table public.bible_verse_note_blocks (
  note_id uuid not null references public.bible_verse_notes(id)
    on update cascade on delete cascade,
  block_id text not null,
  rank integer not null check (rank > 0),
  kind text not null check (kind in (
    'lemma', 'commentary', 'quotation', 'translation', 'reference', 'attribution'
  )),
  form text not null default 'prose' check (form in ('prose', 'verse')),
  language text,
  text_content text not null,
  rendering text,
  needs_review boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  primary key (note_id, block_id),
  unique (note_id, rank),
  check (length(text_content) > 0)
);

create table public.bible_verse_note_relations (
  note_id uuid not null,
  relation_kind text not null
    check (relation_kind in ('translation_of', 'target_block')),
  source_block_id text not null,
  target_block_id text not null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  primary key (note_id, relation_kind, source_block_id, target_block_id),
  foreign key (note_id, source_block_id)
    references public.bible_verse_note_blocks(note_id, block_id)
    on update cascade on delete cascade,
  foreign key (note_id, target_block_id)
    references public.bible_verse_note_blocks(note_id, block_id)
    on update cascade on delete cascade,
  check (source_block_id <> target_block_id)
);

create table public.bible_verse_note_anchors (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  note_id uuid not null,
  canon_id text not null,
  anchor_key text not null,
  target_member_id uuid,
  target_source_id uuid,
  target_segmentation_id uuid,
  target_segment_id uuid,
  native_reference_raw text,
  marker text,
  segment_offset_unicode integer
    check (segment_offset_unicode is null or segment_offset_unicode >= 0),
  anchor_text_left text,
  anchor_text_right text,
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'validated', 'rejected')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (family_id, note_id, canon_id)
    references public.bible_verse_notes(family_id, id, canon_id)
    on update cascade on delete cascade,
  foreign key (family_id, target_member_id)
    references public.bible_edition_members(family_id, id)
    on update cascade on delete restrict,
  foreign key (target_source_id, target_segmentation_id)
    references public.bible_editorial_segmentations(source_id, id)
    on update cascade on delete cascade,
  foreign key (target_segmentation_id, target_segment_id)
    references public.bible_editorial_segments(segmentation_id, id)
    on update cascade on delete cascade,
  unique (note_id, anchor_key),
  check (
    (target_source_id is null and target_segmentation_id is null and target_segment_id is null)
    or (target_source_id is not null and target_segmentation_id is not null and target_segment_id is not null)
  )
);

create table public.bible_edition_assets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  member_source_id uuid not null,
  source_id uuid not null,
  provenance_id uuid not null,
  asset_key text not null,
  asset_kind text not null check (asset_kind in (
    'illustration', 'map', 'plan', 'plate', 'table',
    'ornament', 'initial', 'other'
  )),
  applies_to text not null default 'family'
    check (applies_to in ('family', 'member')),
  applies_to_member_id uuid,
  printed_caption text,
  editorial_caption text,
  alt_text text,
  printed_page text,
  source_page_index integer check (source_page_index is null or source_page_index > 0),
  source_crop_box jsonb check (
    source_crop_box is null or jsonb_typeof(source_crop_box) = 'object'
  ),
  detected_automatically boolean not null default false,
  detection_profile text,
  material_order bigint not null check (material_order > 0),
  placement text not null default 'inline'
    check (placement in ('before', 'after', 'inline')),
  semantic_scope_kind text not null default 'none' check (semantic_scope_kind in (
    'verse', 'pericope', 'chapter', 'book', 'introduction',
    'commentary', 'note', 'none'
  )),
  scope_book_code text,
  canon_id_start text references public.versets_canon(id)
    on update cascade on delete restrict,
  canon_id_end text references public.versets_canon(id)
    on update cascade on delete restrict,
  body_block_id uuid,
  note_id uuid,
  classification_confidence text not null default 'uncertain'
    check (classification_confidence in ('high', 'medium', 'low', 'uncertain')),
  requires_review boolean not null default true,
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'validated', 'rejected')),
  is_public boolean not null default false,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (family_id, member_source_id, source_id)
    references public.bible_edition_member_sources(family_id, id, source_id)
    on update cascade on delete restrict,
  foreign key (source_id, provenance_id)
    references public.bible_provenance_records(source_id, id)
    on update cascade on delete restrict,
  foreign key (family_id, applies_to_member_id)
    references public.bible_edition_members(family_id, id)
    on update cascade on delete restrict,
  foreign key (family_id, body_block_id)
    references public.bible_editorial_body_blocks(family_id, id)
    on update cascade on delete restrict,
  foreign key (family_id, note_id)
    references public.bible_verse_notes(family_id, id)
    on update cascade on delete restrict,
  unique (family_id, asset_key),
  unique (family_id, id),
  check (canon_id_end is null or canon_id_start is not null),
  check (num_nonnulls(body_block_id, note_id) <= 1),
  check (
    (applies_to = 'family' and applies_to_member_id is null)
    or (applies_to = 'member' and applies_to_member_id is not null)
  ),
  check (semantic_scope_kind <> 'note' or note_id is not null),
  check (semantic_scope_kind <> 'verse' or canon_id_start is not null),
  check (semantic_scope_kind <> 'book' or scope_book_code is not null),
  check (semantic_scope_kind not in ('introduction', 'commentary') or body_block_id is not null),
  check (semantic_scope_kind <> 'pericope' or num_nonnulls(canon_id_start, body_block_id) >= 1),
  check (not is_public or semantic_scope_kind = 'none' or scope_book_code is not null),
  check (semantic_scope_kind <> 'none' or num_nonnulls(
    scope_book_code, canon_id_start, canon_id_end, body_block_id, note_id
  ) = 0),
  check (not is_public or (
    validation_status = 'validated'
    and alt_text is not null
  ))
);

create table public.bible_edition_asset_files (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  asset_id uuid not null,
  variant_role text not null check (variant_role in ('master', 'web', 'thumbnail')),
  storage_bucket text not null,
  storage_path text not null,
  public_uri text,
  mime_type text not null,
  width_px integer not null check (width_px > 0),
  height_px integer not null check (height_px > 0),
  byte_size bigint not null check (byte_size > 0),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  source_sha256 text not null check (source_sha256 ~ '^[0-9a-f]{64}$'),
  color_space text not null check (color_space in ('gray', 'srgb')),
  bit_depth smallint not null check (bit_depth in (8, 16)),
  dpi_x numeric check (dpi_x is null or dpi_x > 0),
  dpi_y numeric check (dpi_y is null or dpi_y > 0),
  processing_profile text not null,
  processing_version text not null,
  processing_parameters jsonb not null default '{}'::jsonb
    check (jsonb_typeof(processing_parameters) = 'object'),
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'validated', 'rejected')),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (family_id, asset_id)
    references public.bible_edition_assets(family_id, id)
    on update cascade on delete cascade,
  unique (asset_id, variant_role),
  unique (storage_bucket, storage_path),
  check (
    (variant_role = 'master' and mime_type = 'image/png' and not is_public and public_uri is null)
    or (variant_role in ('web', 'thumbnail') and mime_type = 'image/webp')
  ),
  check (not is_public or (
    variant_role in ('web', 'thumbnail')
    and validation_status = 'validated'
    and public_uri is not null
  ))
);

-- L'instantané AELF reste interne tant que son extraction et sa réutilisation
-- n'ont pas été autorisées. Aucune donnée AELF n'est ajoutée par cette migration.
create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;
grant usage on schema internal to service_role;

create function internal.enforce_bible_edition_asset_publication()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.is_public and not exists (
    select 1
    from public.bible_edition_asset_files f
    where f.family_id = new.family_id
      and f.asset_id = new.id
      and f.variant_role = 'web'
      and f.validation_status = 'validated'
      and f.is_public
  ) then
    raise exception 'Une illustration publique exige un dérivé web validé et public.';
  end if;
  return new;
end
$$;

create trigger bible_edition_assets_publication_guard
before insert or update on public.bible_edition_assets
for each row execute function internal.enforce_bible_edition_asset_publication();

revoke all on function internal.enforce_bible_edition_asset_publication()
from public, anon, authenticated;
grant execute on function internal.enforce_bible_edition_asset_publication()
to service_role;

create table internal.bible_canonical_spine_versions (
  id uuid primary key default gen_random_uuid(),
  authority_code text not null,
  version_code text not null,
  label text not null,
  source_url text not null,
  captured_at timestamptz,
  source_sha256 text,
  rights_status text not null default 'pending_authorization' check (rights_status in (
    'pending_authorization', 'authorized', 'internal_reference_only', 'retired'
  )),
  authorization_reference text,
  status text not null default 'draft'
    check (status in ('draft', 'review', 'verified', 'retired')),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (authority_code, version_code),
  check (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$'),
  check (rights_status <> 'authorized' or authorization_reference is not null)
);

create table internal.bible_canonical_spine_entries (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references internal.bible_canonical_spine_versions(id)
    on update cascade on delete cascade,
  sequence_no bigint not null check (sequence_no > 0),
  book_code text not null,
  chapter_label text not null,
  verse_label text,
  external_reference text not null,
  entry_kind text not null check (entry_kind in (
    'verse', 'superscription', 'prologue', 'subdivision', 'other'
  )),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  unique (version_id, sequence_no),
  unique (version_id, external_reference),
  unique (version_id, id)
);

create table internal.bible_canonical_spine_mappings (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references internal.bible_canonical_spine_versions(id)
    on update cascade on delete cascade,
  entry_id uuid,
  canon_id text references public.versets_canon(id)
    on update cascade on delete restrict,
  mapping_order integer not null default 1 check (mapping_order > 0),
  relation_kind text not null check (relation_kind in (
    'match', 'split', 'merged', 'external_only', 'canonical_only', 'uncertain'
  )),
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'review', 'verified', 'rejected')),
  justification text,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  foreign key (version_id, entry_id)
    references internal.bible_canonical_spine_entries(version_id, id)
    on update cascade on delete cascade,
  unique (version_id, entry_id, canon_id, mapping_order),
  check (num_nonnulls(entry_id, canon_id) >= 1),
  check (relation_kind <> 'external_only' or (entry_id is not null and canon_id is null)),
  check (relation_kind <> 'canonical_only' or (entry_id is null and canon_id is not null))
);

create index bible_edition_members_trad_idx
  on public.bible_edition_members(trad_id, family_id);
create index bible_edition_components_family_idx
  on public.bible_edition_components(family_id, material_order);
create index bible_edition_member_sources_source_idx
  on public.bible_edition_member_sources(source_id, family_id);
create index bible_edition_member_sources_component_idx
  on public.bible_edition_member_sources(component_id, member_id);
create index bible_editorial_body_blocks_scope_idx
  on public.bible_editorial_body_blocks(family_id, scope_book_code, canon_id_start, canon_id_end);
create index bible_editorial_body_blocks_material_idx
  on public.bible_editorial_body_blocks(source_id, material_order);
create index bible_editorial_body_block_notes_block_idx
  on public.bible_editorial_body_block_notes(body_block_id, display_number);
create index bible_editorial_body_block_note_blocks_note_idx
  on public.bible_editorial_body_block_note_blocks(note_id, rank);
create index bible_verse_notes_canon_idx
  on public.bible_verse_notes(family_id, canon_id, display_number);
create index bible_verse_note_blocks_note_idx
  on public.bible_verse_note_blocks(note_id, rank);
create index bible_verse_note_anchors_canon_idx
  on public.bible_verse_note_anchors(canon_id, note_id);
create index bible_verse_note_anchors_segment_idx
  on public.bible_verse_note_anchors(target_segmentation_id, target_segment_id)
  where target_segment_id is not null;
create index bible_edition_assets_scope_idx
  on public.bible_edition_assets(family_id, semantic_scope_kind, canon_id_start, canon_id_end);
create index bible_edition_assets_material_idx
  on public.bible_edition_assets(source_id, material_order);
create index bible_edition_assets_chapter_public_idx
  on public.bible_edition_assets(family_id, scope_book_code, material_order)
  where is_public and validation_status = 'validated';
create index bible_edition_asset_files_asset_idx
  on public.bible_edition_asset_files(family_id, asset_id, variant_role);
create index bible_edition_asset_files_public_web_idx
  on public.bible_edition_asset_files(family_id, asset_id)
  where variant_role = 'web' and is_public and validation_status = 'validated';
create index bible_canonical_spine_entries_book_idx
  on internal.bible_canonical_spine_entries(version_id, book_code, sequence_no);
create index bible_canonical_spine_mappings_canon_idx
  on internal.bible_canonical_spine_mappings(version_id, canon_id)
  where canon_id is not null;
create unique index bible_canonical_spine_mappings_external_only_idx
  on internal.bible_canonical_spine_mappings(version_id, entry_id, mapping_order)
  where entry_id is not null and canon_id is null;
create unique index bible_canonical_spine_mappings_canonical_only_idx
  on internal.bible_canonical_spine_mappings(version_id, canon_id, mapping_order)
  where entry_id is null and canon_id is not null;

alter table public.bible_edition_families enable row level security;
alter table public.bible_edition_members enable row level security;
alter table public.bible_edition_components enable row level security;
alter table public.bible_edition_member_sources enable row level security;
alter table public.bible_editorial_body_blocks enable row level security;
alter table public.bible_editorial_body_block_notes enable row level security;
alter table public.bible_editorial_body_block_note_blocks enable row level security;
alter table public.bible_verse_notes enable row level security;
alter table public.bible_verse_note_blocks enable row level security;
alter table public.bible_verse_note_relations enable row level security;
alter table public.bible_verse_note_anchors enable row level security;
alter table public.bible_edition_assets enable row level security;
alter table public.bible_edition_asset_files enable row level security;
alter table internal.bible_canonical_spine_versions enable row level security;
alter table internal.bible_canonical_spine_entries enable row level security;
alter table internal.bible_canonical_spine_mappings enable row level security;

create policy bible_edition_families_public_read
on public.bible_edition_families for select to anon, authenticated
using (status = 'published');

create policy bible_edition_members_public_read
on public.bible_edition_members for select to anon, authenticated
using (status = 'published' and exists (
  select 1 from public.bible_edition_families f
  where f.id = bible_edition_members.family_id and f.status = 'published'
));

create policy bible_edition_components_public_read
on public.bible_edition_components for select to anon, authenticated
using (status = 'published' and exists (
  select 1 from public.bible_edition_families f
  where f.id = bible_edition_components.family_id and f.status = 'published'
));

create policy bible_edition_member_sources_public_read
on public.bible_edition_member_sources for select to anon, authenticated
using (status = 'published' and exists (
  select 1
  from public.bible_edition_families f
  join public.bible_edition_members m on m.family_id = f.id
  join public.bible_edition_components c on c.family_id = f.id
  join public.bible_text_sources s on s.id = bible_edition_member_sources.source_id
  where f.id = bible_edition_member_sources.family_id
    and m.id = bible_edition_member_sources.member_id
    and c.id = bible_edition_member_sources.component_id
    and f.status = 'published'
    and m.status = 'published'
    and c.status = 'published'
    and s.status = 'published'
));

create policy bible_editorial_body_blocks_public_read
on public.bible_editorial_body_blocks for select to anon, authenticated
using (is_public and validation_status = 'validated' and exists (
  select 1
  from public.bible_edition_families f
  join public.bible_edition_member_sources ms
    on ms.family_id = f.id and ms.id = bible_editorial_body_blocks.member_source_id
  join public.bible_text_sources s on s.id = bible_editorial_body_blocks.source_id
  join public.bible_editorial_segmentations g
    on g.id = bible_editorial_body_blocks.segmentation_id
  where f.id = bible_editorial_body_blocks.family_id
    and f.status = 'published'
    and ms.status = 'published'
    and s.status = 'published'
    and g.is_public and g.status = 'validated'
));

create policy bible_editorial_body_block_notes_public_read
on public.bible_editorial_body_block_notes for select to anon, authenticated
using (is_public and validation_status = 'validated' and exists (
  select 1 from public.bible_editorial_body_blocks b
  where b.id = bible_editorial_body_block_notes.body_block_id
    and b.family_id = bible_editorial_body_block_notes.family_id
    and b.is_public and b.validation_status = 'validated'
));

create policy bible_editorial_body_block_note_blocks_public_read
on public.bible_editorial_body_block_note_blocks for select to anon, authenticated
using (exists (
  select 1 from public.bible_editorial_body_block_notes n
  where n.id = bible_editorial_body_block_note_blocks.note_id
    and n.is_public and n.validation_status = 'validated'
));

create policy bible_verse_notes_public_read
on public.bible_verse_notes for select to anon, authenticated
using (is_public and validation_status = 'validated' and exists (
  select 1
  from public.bible_edition_families f
  join public.bible_edition_member_sources ms
    on ms.family_id = f.id and ms.id = bible_verse_notes.member_source_id
  join public.bible_text_sources s on s.id = bible_verse_notes.source_id
  where f.id = bible_verse_notes.family_id
    and f.status = 'published'
    and ms.status = 'published'
    and s.status = 'published'
));

create policy bible_verse_note_blocks_public_read
on public.bible_verse_note_blocks for select to anon, authenticated
using (exists (
  select 1 from public.bible_verse_notes n
  where n.id = bible_verse_note_blocks.note_id
    and n.is_public and n.validation_status = 'validated'
));

create policy bible_verse_note_relations_public_read
on public.bible_verse_note_relations for select to anon, authenticated
using (exists (
  select 1 from public.bible_verse_notes n
  where n.id = bible_verse_note_relations.note_id
    and n.is_public and n.validation_status = 'validated'
));

create policy bible_verse_note_anchors_public_read
on public.bible_verse_note_anchors for select to anon, authenticated
using (validation_status in ('review', 'validated') and exists (
  select 1 from public.bible_verse_notes n
  where n.id = bible_verse_note_anchors.note_id
    and n.is_public and n.validation_status = 'validated'
));

create policy bible_edition_assets_public_read
on public.bible_edition_assets for select to anon, authenticated
using (is_public and validation_status = 'validated' and exists (
  select 1
  from public.bible_edition_families f
  join public.bible_edition_member_sources ms
    on ms.family_id = f.id and ms.id = bible_edition_assets.member_source_id
  join public.bible_text_sources s on s.id = bible_edition_assets.source_id
  where f.id = bible_edition_assets.family_id
    and f.status = 'published'
    and ms.status = 'published'
    and s.status = 'published'
));

create policy bible_edition_asset_files_public_read
on public.bible_edition_asset_files for select to anon, authenticated
using (is_public and validation_status = 'validated' and exists (
  select 1
  from public.bible_edition_assets a
  where a.family_id = bible_edition_asset_files.family_id
    and a.id = bible_edition_asset_files.asset_id
    and a.is_public
    and a.validation_status = 'validated'
));

create view public.v_bible_edition_catalog
with (security_invoker = true)
as
select
  f.id as family_id,
  f.family_code,
  f.title as family_title,
  m.id as member_id,
  m.trad_id,
  m.member_role,
  m.language_code,
  m.label as member_label,
  m.display_order,
  m.desktop_position,
  m.mobile_order,
  c.id as component_id,
  c.component_code,
  c.title as component_title,
  c.volume_label,
  c.edition_statement,
  c.publication_place,
  c.publisher,
  c.publication_year,
  c.publication_date_text,
  c.bibliographic_note,
  ms.id as member_source_id,
  ms.source_id,
  ms.source_role,
  ms.material_order as source_material_order,
  ms.canon_id_start,
  ms.canon_id_end,
  s.source_code,
  s.version_label
from public.bible_edition_families f
join public.bible_edition_members m on m.family_id = f.id
join public.bible_edition_member_sources ms on ms.family_id = f.id and ms.member_id = m.id
join public.bible_edition_components c on c.family_id = f.id and c.id = ms.component_id
join public.bible_text_sources s on s.id = ms.source_id;

create view public.v_bible_editorial_body_blocks
with (security_invoker = true)
as
select
  b.*,
  canon_start.ordre as canon_order_start,
  coalesce(canon_end.ordre, canon_start.ordre) as canon_order_end,
  (case b.block_kind
    when 'title' then 'titre'
    when 'commentary' then 'commentaire'
    when 'summary' then 'sommaire'
    else b.block_kind
  end) || '_' ||
  (case b.scope_kind
    when 'book_group' then 'groupe_livres'
    when 'book' then 'livre'
    when 'book_part' then 'partie'
    when 'chapter' then 'chapitre'
    else b.scope_kind
  end) as semantic_style_code
from public.bible_editorial_body_blocks b
left join public.versets_canon canon_start on canon_start.id = b.canon_id_start
left join public.versets_canon canon_end on canon_end.id = b.canon_id_end;

create view public.v_bible_verse_notes
with (security_invoker = true)
as
select
  n.id,
  n.family_id,
  n.note_key,
  n.applies_to,
  n.applies_to_member_id,
  n.note_subtype,
  n.canon_id,
  n.native_reference_raw,
  n.printed_marker,
  n.display_chapter_key,
  n.display_number,
  n.printed_page,
  n.material_order,
  n.validation_status,
  n.is_public,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'block_id', b.block_id,
        'rank', b.rank,
        'kind', b.kind,
        'form', b.form,
        'language', b.language,
        'text', b.text_content,
        'rendering', b.rendering,
        'needs_review', b.needs_review
      ) order by b.rank
    ) filter (where b.block_id is not null),
    '[]'::jsonb
  ) as blocks
from public.bible_verse_notes n
left join public.bible_verse_note_blocks b on b.note_id = n.id
group by n.id;

create view public.v_bible_editorial_body_block_notes
with (security_invoker = true)
as
select
  n.id,
  n.family_id,
  n.body_block_id,
  n.note_key,
  n.printed_marker,
  n.display_number,
  n.anchor_start_offset_unicode,
  n.anchor_end_offset_unicode,
  n.anchor_text,
  n.printed_page,
  n.material_order,
  n.validation_status,
  n.is_public,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'block_id', b.block_id,
        'rank', b.rank,
        'kind', b.kind,
        'form', b.form,
        'language', b.language,
        'text', b.text_content,
        'rendering', b.rendering,
        'needs_review', b.needs_review
      ) order by b.rank
    ) filter (where b.block_id is not null),
    '[]'::jsonb
  ) as blocks
from public.bible_editorial_body_block_notes n
left join public.bible_editorial_body_block_note_blocks b on b.note_id = n.id
group by n.id;

create view public.v_bible_edition_assets
with (security_invoker = true)
as
select
  a.id,
  a.family_id,
  a.asset_key,
  a.asset_kind,
  a.applies_to,
  a.applies_to_member_id,
  a.printed_caption,
  a.editorial_caption,
  a.alt_text,
  web.public_uri,
  web.width_px,
  web.height_px,
  web.byte_size,
  web.sha256 as web_sha256,
  web.storage_bucket as web_storage_bucket,
  web.storage_path as web_storage_path,
  a.printed_page,
  a.source_page_index,
  a.source_crop_box,
  a.detected_automatically,
  a.detection_profile,
  a.material_order,
  a.placement,
  a.semantic_scope_kind,
  a.scope_book_code,
  a.canon_id_start,
  a.canon_id_end,
  canon_start.ordre as canon_order_start,
  coalesce(canon_end.ordre, canon_start.ordre) as canon_order_end,
  a.body_block_id,
  a.note_id,
  a.classification_confidence,
  a.requires_review
from public.bible_edition_assets a
left join public.versets_canon canon_start on canon_start.id = a.canon_id_start
left join public.versets_canon canon_end on canon_end.id = a.canon_id_end
left join public.bible_edition_asset_files web
  on web.family_id = a.family_id
  and web.asset_id = a.id
  and web.variant_role = 'web'
  and web.is_public
  and web.validation_status = 'validated';

create view public.v_bible_edition_asset_files
with (security_invoker = true)
as
select
  f.id,
  f.family_id,
  f.asset_id,
  f.variant_role,
  f.storage_bucket,
  f.storage_path,
  f.public_uri,
  f.mime_type,
  f.width_px,
  f.height_px,
  f.byte_size,
  f.sha256,
  f.source_sha256,
  f.color_space,
  f.bit_depth,
  f.dpi_x,
  f.dpi_y,
  f.processing_profile,
  f.processing_version,
  f.processing_parameters,
  f.validation_status,
  f.is_public
from public.bible_edition_asset_files f;

revoke all on table
  public.bible_edition_families,
  public.bible_edition_members,
  public.bible_edition_components,
  public.bible_edition_member_sources,
  public.bible_editorial_body_blocks,
  public.bible_editorial_body_block_notes,
  public.bible_editorial_body_block_note_blocks,
  public.bible_verse_notes,
  public.bible_verse_note_blocks,
  public.bible_verse_note_relations,
  public.bible_verse_note_anchors,
  public.bible_edition_assets,
  public.bible_edition_asset_files,
  public.v_bible_edition_catalog,
  public.v_bible_editorial_body_blocks,
  public.v_bible_editorial_body_block_notes,
  public.v_bible_verse_notes,
  public.v_bible_edition_assets,
  public.v_bible_edition_asset_files
from public, anon, authenticated;

grant select on table
  public.bible_edition_families,
  public.bible_edition_members,
  public.bible_edition_components,
  public.bible_edition_member_sources,
  public.bible_editorial_body_blocks,
  public.bible_editorial_body_block_notes,
  public.bible_editorial_body_block_note_blocks,
  public.bible_verse_notes,
  public.bible_verse_note_blocks,
  public.bible_verse_note_relations,
  public.bible_verse_note_anchors,
  public.bible_edition_assets,
  public.bible_edition_asset_files,
  public.v_bible_edition_catalog,
  public.v_bible_editorial_body_blocks,
  public.v_bible_editorial_body_block_notes,
  public.v_bible_verse_notes,
  public.v_bible_edition_assets,
  public.v_bible_edition_asset_files
to anon, authenticated;

grant select, insert, update, delete on table
  public.bible_edition_families,
  public.bible_edition_members,
  public.bible_edition_components,
  public.bible_edition_member_sources,
  public.bible_editorial_body_blocks,
  public.bible_editorial_body_block_notes,
  public.bible_editorial_body_block_note_blocks,
  public.bible_verse_notes,
  public.bible_verse_note_blocks,
  public.bible_verse_note_relations,
  public.bible_verse_note_anchors,
  public.bible_edition_assets,
  public.bible_edition_asset_files
to service_role;

grant select on table
  public.v_bible_edition_catalog,
  public.v_bible_editorial_body_blocks,
  public.v_bible_editorial_body_block_notes,
  public.v_bible_verse_notes,
  public.v_bible_edition_assets,
  public.v_bible_edition_asset_files
to service_role;

revoke all on table
  internal.bible_canonical_spine_versions,
  internal.bible_canonical_spine_entries,
  internal.bible_canonical_spine_mappings
from public, anon, authenticated;

grant select, insert, update, delete on table
  internal.bible_canonical_spine_versions,
  internal.bible_canonical_spine_entries,
  internal.bible_canonical_spine_mappings
to service_role;

comment on table public.bible_edition_families is
  'Familles éditoriales génériques reliant plusieurs traductions bibliques, par exemple le couple latin-français Fillion.';
comment on table public.bible_edition_components is
  'Volumes ou composants matériels d une famille ; les éditions mélangées restent explicitement distinguées.';
comment on table public.bible_editorial_body_blocks is
  'Développements de portée supérieure au verset, rendus dans le corps selon leur nature, leur portée et leur position.';
comment on table public.bible_editorial_body_block_notes is
  'Apparat propre aux introductions et autres blocs du corps ; ne doit jamais être converti en note de verset.';
comment on table public.bible_verse_notes is
  'Notes strictement rattachées à un verset ; identifiant global stable et numéro visible local au chapitre.';
comment on table public.bible_edition_assets is
  'Illustrations et ornements avec emplacement matériel primaire et ancre sémantique facultative vérifiée.';
comment on table public.bible_edition_asset_files is
  'Fichiers dérivés d une illustration : master PNG sans perte privé et dérivés WebP publics, tous hachés et reproductibles.';
comment on table internal.bible_canonical_spine_versions is
  'Instantanés structurels externes versionnés ; aucune donnée AELF sans autorisation et empreinte documentées.';

notify pgrst, 'reload schema';
commit;
