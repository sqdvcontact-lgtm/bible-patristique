-- Modèle biblique multimode générique (11 tables, 3 vues).
-- Migration locale officielle, préparée pour application ultérieure par apply_migration.
-- Cette migration est strictement additive : elle ne modifie ni versets_v2,
-- ni versets_canon, ni les données des traductions existantes.

begin;

create table public.bible_text_sources (
  id uuid primary key default gen_random_uuid(),
  trad_id text not null references public.traductions(trad_id) on update cascade on delete restrict,
  source_code text not null,
  title text not null,
  source_kind text not null check (source_kind in ('manuscript', 'printed_edition', 'digital_edition', 'other')),
  version_label text not null,
  source_uri text,
  source_sha256 text,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'retired')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trad_id, source_code, version_label),
  unique (id, trad_id),
  check (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$')
);

create table public.bible_source_units (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bible_text_sources(id) on update cascade on delete restrict,
  source_unit_key text not null,
  unit_kind text not null default 'line' check (unit_kind in ('line', 'block', 'surface', 'other')),
  material_order bigint not null check (material_order > 0),
  surface_key text,
  material_leaf_sequence integer check (material_leaf_sequence is null or material_leaf_sequence > 0),
  side text check (side is null or side in ('r', 'v')),
  column_id text,
  column_label text,
  line_no integer check (line_no is null or line_no > 0),
  native_folio_raw text,
  native_folio_number integer check (native_folio_number is null or native_folio_number > 0),
  native_folio_status text not null default 'UNCERTAIN'
    check (native_folio_status in ('VISIBLE', 'INFERRED', 'OMITTED_IN_SOURCE', 'UNNUMBERED', 'UNCERTAIN')),
  break_no boolean not null default false,
  has_unclear boolean not null default false,
  has_gap boolean not null default false,
  material_features jsonb not null default '{}'::jsonb check (jsonb_typeof(material_features) = 'object'),
  created_at timestamptz not null default now(),
  unique (source_id, source_unit_key),
  unique (source_id, material_order),
  unique (source_id, id),
  check (unit_kind <> 'line' or (surface_key is not null and material_leaf_sequence is not null and side is not null and column_id is not null and line_no is not null)),
  check (native_folio_status not in ('UNNUMBERED', 'OMITTED_IN_SOURCE') or native_folio_number is null)
);

create table public.bible_text_layers (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bible_text_sources(id) on update cascade on delete restrict,
  layer_code text not null,
  label text not null,
  layer_kind text not null check (layer_kind in ('diplomatic', 'expanded', 'modernized', 'translation', 'other')),
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'legacy-unverified', 'review', 'validated', 'retired')),
  is_public boolean not null default false,
  transformation_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(transformation_rules) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, layer_code),
  unique (source_id, id),
  unique (source_id, id, layer_code),
  check (not is_public or validation_status = 'validated')
);

create table public.bible_source_unit_texts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  unit_id uuid not null,
  layer_id uuid not null,
  layer_code text not null,
  text_content text not null,
  source_markup text,
  text_features jsonb not null default '{}'::jsonb check (jsonb_typeof(text_features) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_id, unit_id)
    references public.bible_source_units(source_id, id) on update cascade on delete cascade,
  foreign key (source_id, layer_id, layer_code)
    references public.bible_text_layers(source_id, id, layer_code) on update cascade on delete restrict,
  unique (source_id, unit_id, layer_id),
  check (length(text_content) > 0 or source_markup is not null)
);

create table public.bible_native_divisions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bible_text_sources(id) on update cascade on delete restrict,
  parent_id uuid,
  division_kind text not null check (division_kind in ('book', 'chapter', 'prologue', 'intermediate_text', 'addition', 'rubric', 'other')),
  sequence_no bigint not null check (sequence_no > 0),
  sequence_in_parent integer check (sequence_in_parent is null or sequence_in_parent > 0),
  stable_key text not null,
  label_diplomatic text,
  proposed_book_code text,
  manuscript_number_raw text,
  manuscript_number integer check (manuscript_number is null or manuscript_number > 0),
  expected_sequence integer check (expected_sequence is null or expected_sequence > 0),
  marker_type text,
  marker_status text check (marker_status is null or marker_status in
    ('NUMBER_AND_INITIAL', 'NUMBER_ONLY', 'INITIAL_OR_RUBRIC', 'OTHER_MATERIAL_MARK', 'TEXTUAL_ALIGNMENT_ONLY', 'UNCERTAIN')),
  number_status text check (number_status is null or number_status in
    ('READ', 'ABSENT', 'ILLEGIBLE', 'NOT_VISIBLE_IN_AVAILABLE_IMAGE')),
  confidence text not null default 'uncertain' check (confidence in ('high', 'medium', 'low', 'uncertain')),
  requires_review boolean not null default false,
  start_unit_id uuid not null,
  end_unit_id uuid not null,
  validation_status text not null default 'draft' check (validation_status in ('draft', 'review', 'validated', 'retired')),
  is_public boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, stable_key),
  unique (source_id, sequence_no),
  unique (source_id, id),
  foreign key (source_id, parent_id)
    references public.bible_native_divisions(source_id, id) on update cascade on delete restrict,
  foreign key (source_id, start_unit_id)
    references public.bible_source_units(source_id, id) on update cascade on delete restrict,
  foreign key (source_id, end_unit_id)
    references public.bible_source_units(source_id, id) on update cascade on delete restrict,
  check (not is_public or validation_status = 'validated'),
  check (number_status <> 'READ' or manuscript_number_raw is not null),
  check (manuscript_number is null or number_status = 'READ')
);

create table public.bible_editorial_segmentations (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bible_text_sources(id) on update cascade on delete restrict,
  segmentation_code text not null,
  segmentation_kind text not null check (segmentation_kind in ('paragraph', 'verse', 'reading_unit', 'other')),
  version_label text not null,
  base_layer_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'validated', 'retired')),
  is_public boolean not null default false,
  method_note text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_id, base_layer_id)
    references public.bible_text_layers(source_id, id) on update cascade on delete restrict,
  unique (source_id, segmentation_code, version_label),
  unique (source_id, id),
  check (not is_public or status = 'validated')
);

create table public.bible_editorial_segments (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  segmentation_id uuid not null,
  segment_key text not null,
  editorial_sequence bigint not null check (editorial_sequence > 0),
  native_division_id uuid,
  editorial_label text,
  editorial_number integer check (editorial_number is null or editorial_number > 0),
  has_unclear boolean not null default false,
  has_gap boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (segmentation_id, segment_key),
  unique (segmentation_id, editorial_sequence),
  unique (source_id, id),
  unique (segmentation_id, id),
  foreign key (source_id, segmentation_id)
    references public.bible_editorial_segmentations(source_id, id) on update cascade on delete cascade,
  foreign key (source_id, native_division_id)
    references public.bible_native_divisions(source_id, id) on update cascade on delete restrict
);

create table public.bible_editorial_segment_sources (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  segmentation_id uuid not null,
  segment_id uuid not null,
  unit_id uuid not null,
  unit_sequence integer not null check (unit_sequence > 0),
  start_offset integer check (start_offset is null or start_offset >= 0),
  end_offset integer check (end_offset is null or end_offset >= 0),
  join_before text not null default 'space' check (join_before in ('none', 'space', 'line_break', 'paragraph_break')),
  created_at timestamptz not null default now(),
  unique (segment_id, unit_sequence),
  unique (segment_id, unit_id, start_offset, end_offset),
  foreign key (segmentation_id, segment_id)
    references public.bible_editorial_segments(segmentation_id, id) on update cascade on delete cascade,
  foreign key (source_id, segment_id)
    references public.bible_editorial_segments(source_id, id) on update cascade on delete cascade,
  foreign key (source_id, unit_id)
    references public.bible_source_units(source_id, id) on update cascade on delete restrict,
  check (end_offset is null or start_offset is not null),
  check (end_offset is null or end_offset > start_offset)
);

create table public.bible_canonical_alignments (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  segmentation_id uuid not null,
  segment_id uuid,
  alignment_order integer not null default 1 check (alignment_order > 0),
  canon_id text references public.versets_canon(id) on update cascade on delete restrict,
  canon_id_fin text references public.versets_canon(id) on update cascade on delete restrict,
  alignment_status text not null check (alignment_status in
    ('MATCH', 'SPLIT', 'MERGED', 'OFFSET', 'MANUSCRIPT_EXTRA', 'CANONICAL_GAP', 'UNCERTAIN')),
  confidence text not null check (confidence in ('high', 'medium', 'low', 'uncertain')),
  verification_status text not null default 'proposed'
    check (verification_status in ('proposed', 'review', 'verified', 'rejected')),
  justification text,
  witnesses_used text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, id),
  foreign key (source_id, segmentation_id)
    references public.bible_editorial_segmentations(source_id, id) on update cascade on delete cascade,
  foreign key (segmentation_id, segment_id)
    references public.bible_editorial_segments(segmentation_id, id) on update cascade on delete cascade,
  check (canon_id_fin is null or canon_id is not null),
  check (
    (alignment_status = 'MANUSCRIPT_EXTRA' and segment_id is not null and canon_id is null and canon_id_fin is null)
    or (alignment_status = 'CANONICAL_GAP' and segment_id is null and canon_id is not null)
    or (alignment_status not in ('MANUSCRIPT_EXTRA', 'CANONICAL_GAP') and segment_id is not null and canon_id is not null)
  )
);

create table public.bible_provenance_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.bible_text_sources(id) on update cascade on delete restrict,
  provenance_key text not null,
  provenance_kind text not null check (provenance_kind in
    ('tei', 'facsimile', 'editorial_decision', 'algorithm', 'secondary_witness', 'other')),
  citation text not null,
  locator text,
  uri text,
  file_path text,
  sha256 text,
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  asset_role text check (asset_role is null or asset_role in ('PRIMARY', 'ALTERNATIVE')),
  agent text,
  recorded_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  unique (source_id, provenance_key),
  unique (source_id, id),
  check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  check (asset_role is null or provenance_kind = 'facsimile')
);

create table public.bible_provenance_links (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  provenance_id uuid not null,
  role text not null default 'evidence' check (role in ('source', 'evidence', 'decision', 'validation')),
  unit_id uuid,
  division_id uuid,
  segment_id uuid,
  alignment_id uuid,
  created_at timestamptz not null default now(),
  foreign key (source_id, provenance_id)
    references public.bible_provenance_records(source_id, id) on update cascade on delete restrict,
  foreign key (source_id, unit_id)
    references public.bible_source_units(source_id, id) on update cascade on delete cascade,
  foreign key (source_id, division_id)
    references public.bible_native_divisions(source_id, id) on update cascade on delete cascade,
  foreign key (source_id, segment_id)
    references public.bible_editorial_segments(source_id, id) on update cascade on delete cascade,
  foreign key (source_id, alignment_id)
    references public.bible_canonical_alignments(source_id, id) on update cascade on delete cascade,
  check (num_nonnulls(unit_id, division_id, segment_id, alignment_id) = 1)
);

-- Un seul objet public par rôle fonctionnel évite les capacités contradictoires.
create unique index bible_text_sources_one_published_idx
  on public.bible_text_sources (trad_id, source_code) where status = 'published';
create unique index bible_text_layers_one_public_kind_idx
  on public.bible_text_layers (source_id, layer_kind) where is_public;

-- Index de parcours et index de toutes les clés étrangères non couverts par une unicité.
create index bible_text_sources_trad_idx on public.bible_text_sources (trad_id);
create index bible_source_units_material_idx on public.bible_source_units (source_id, material_order);
create index bible_source_units_surface_idx on public.bible_source_units (source_id, material_leaf_sequence, side, column_label, line_no);
create index bible_source_units_native_folio_idx on public.bible_source_units (source_id, native_folio_number, side);
create index bible_text_layers_source_idx on public.bible_text_layers (source_id, layer_kind);
create index bible_source_unit_texts_layer_unit_idx on public.bible_source_unit_texts (source_id, layer_code, unit_id);
create index bible_source_unit_texts_unit_idx on public.bible_source_unit_texts (source_id, unit_id);
create index bible_source_unit_texts_layer_id_idx on public.bible_source_unit_texts (source_id, layer_id, layer_code);
create index bible_native_divisions_parent_idx on public.bible_native_divisions (source_id, parent_id, sequence_in_parent);
create index bible_native_divisions_start_idx on public.bible_native_divisions (source_id, start_unit_id);
create index bible_native_divisions_end_idx on public.bible_native_divisions (source_id, end_unit_id);
create index bible_native_divisions_public_idx on public.bible_native_divisions (source_id, division_kind, sequence_no) where is_public;
create unique index bible_native_divisions_root_order_idx
  on public.bible_native_divisions (source_id, sequence_in_parent) where parent_id is null and sequence_in_parent is not null;
create unique index bible_native_divisions_child_order_idx
  on public.bible_native_divisions (source_id, parent_id, sequence_in_parent) where parent_id is not null and sequence_in_parent is not null;
create index bible_editorial_segmentations_source_idx on public.bible_editorial_segmentations (source_id, segmentation_kind);
create index bible_editorial_segmentations_layer_idx on public.bible_editorial_segmentations (source_id, base_layer_id);
create index bible_editorial_segments_native_idx on public.bible_editorial_segments (source_id, native_division_id, editorial_sequence);
create index bible_editorial_segments_segmentation_idx on public.bible_editorial_segments (source_id, segmentation_id);
create index bible_editorial_segment_sources_unit_idx on public.bible_editorial_segment_sources (source_id, unit_id, segment_id);
create index bible_editorial_segment_sources_segmentation_idx on public.bible_editorial_segment_sources (segmentation_id, segment_id);
create index bible_editorial_segment_sources_source_segment_idx on public.bible_editorial_segment_sources (source_id, segment_id);
create index bible_canonical_alignments_segmentation_idx on public.bible_canonical_alignments (source_id, segmentation_id);
create index bible_canonical_alignments_segment_idx on public.bible_canonical_alignments (segmentation_id, segment_id, alignment_order);
create index bible_canonical_alignments_canon_idx on public.bible_canonical_alignments (canon_id, canon_id_fin, alignment_status);
create index bible_canonical_alignments_canon_fin_idx on public.bible_canonical_alignments (canon_id_fin) where canon_id_fin is not null;
create unique index bible_canonical_alignment_segment_order_idx
  on public.bible_canonical_alignments (segmentation_id, segment_id, alignment_order) where segment_id is not null;
create unique index bible_canonical_gap_order_idx
  on public.bible_canonical_alignments (segmentation_id, canon_id, alignment_order)
  where segment_id is null and alignment_status = 'CANONICAL_GAP';
create index bible_provenance_records_source_idx on public.bible_provenance_records (source_id, provenance_kind);
create index bible_provenance_links_provenance_idx on public.bible_provenance_links (source_id, provenance_id);
create index bible_provenance_links_unit_idx on public.bible_provenance_links (source_id, unit_id) where unit_id is not null;
create index bible_provenance_links_division_idx on public.bible_provenance_links (source_id, division_id) where division_id is not null;
create index bible_provenance_links_segment_idx on public.bible_provenance_links (source_id, segment_id) where segment_id is not null;
create index bible_provenance_links_alignment_idx on public.bible_provenance_links (source_id, alignment_id) where alignment_id is not null;
create unique index bible_provenance_links_unit_unique_idx
  on public.bible_provenance_links (source_id, provenance_id, role, unit_id) where unit_id is not null;
create unique index bible_provenance_links_division_unique_idx
  on public.bible_provenance_links (source_id, provenance_id, role, division_id) where division_id is not null;
create unique index bible_provenance_links_segment_unique_idx
  on public.bible_provenance_links (source_id, provenance_id, role, segment_id) where segment_id is not null;
create unique index bible_provenance_links_alignment_unique_idx
  on public.bible_provenance_links (source_id, provenance_id, role, alignment_id) where alignment_id is not null;

alter table public.bible_text_sources enable row level security;
alter table public.bible_source_units enable row level security;
alter table public.bible_text_layers enable row level security;
alter table public.bible_source_unit_texts enable row level security;
alter table public.bible_native_divisions enable row level security;
alter table public.bible_editorial_segmentations enable row level security;
alter table public.bible_editorial_segments enable row level security;
alter table public.bible_editorial_segment_sources enable row level security;
alter table public.bible_canonical_alignments enable row level security;
alter table public.bible_provenance_records enable row level security;
alter table public.bible_provenance_links enable row level security;

create policy bible_text_sources_public_read on public.bible_text_sources
  for select to anon, authenticated using (status = 'published');
create policy bible_source_units_public_read on public.bible_source_units
  for select to anon, authenticated using (exists (
    select 1 from public.bible_text_sources s
    where s.id = bible_source_units.source_id and s.status = 'published'
  ));
create policy bible_text_layers_public_read on public.bible_text_layers
  for select to anon, authenticated using (is_public and validation_status = 'validated' and exists (
    select 1 from public.bible_text_sources s
    where s.id = bible_text_layers.source_id and s.status = 'published'
  ));
create policy bible_source_unit_texts_public_read on public.bible_source_unit_texts
  for select to anon, authenticated using (exists (
    select 1 from public.bible_text_layers l
    join public.bible_text_sources s on s.id = l.source_id
    where l.source_id = bible_source_unit_texts.source_id
      and l.id = bible_source_unit_texts.layer_id
      and l.layer_code = bible_source_unit_texts.layer_code
      and l.is_public and l.validation_status = 'validated' and s.status = 'published'
  ));
create policy bible_native_divisions_public_read on public.bible_native_divisions
  for select to anon, authenticated using (is_public and validation_status = 'validated' and exists (
    select 1 from public.bible_text_sources s
    where s.id = bible_native_divisions.source_id and s.status = 'published'
  ));
create policy bible_editorial_segmentations_public_read on public.bible_editorial_segmentations
  for select to anon, authenticated using (is_public and status = 'validated' and exists (
    select 1 from public.bible_text_sources s
    where s.id = bible_editorial_segmentations.source_id and s.status = 'published'
  ));
create policy bible_editorial_segments_public_read on public.bible_editorial_segments
  for select to anon, authenticated using (exists (
    select 1 from public.bible_editorial_segmentations x
    join public.bible_text_sources s on s.id = x.source_id
    where x.id = bible_editorial_segments.segmentation_id
      and x.is_public and x.status = 'validated' and s.status = 'published'
  ));
create policy bible_editorial_segment_sources_public_read on public.bible_editorial_segment_sources
  for select to anon, authenticated using (exists (
    select 1 from public.bible_editorial_segmentations x
    join public.bible_text_sources s on s.id = x.source_id
    where x.id = bible_editorial_segment_sources.segmentation_id
      and x.is_public and x.status = 'validated' and s.status = 'published'
  ));
create policy bible_canonical_alignments_public_read on public.bible_canonical_alignments
  for select to anon, authenticated using (verification_status in ('review', 'verified') and exists (
    select 1 from public.bible_editorial_segmentations x
    join public.bible_text_sources s on s.id = x.source_id
    where x.id = bible_canonical_alignments.segmentation_id
      and x.is_public and x.status = 'validated' and s.status = 'published'
  ));

create view public.v_bible_source_unit_texts
with (security_invoker = true)
as
select
  s.id as source_id,
  s.trad_id,
  s.source_code,
  s.version_label,
  u.id as unit_id,
  u.source_unit_key,
  u.material_order,
  u.surface_key,
  u.material_leaf_sequence,
  u.side,
  u.column_id,
  u.column_label,
  u.line_no,
  u.native_folio_raw,
  u.native_folio_number,
  u.native_folio_status,
  u.break_no,
  u.has_unclear,
  u.has_gap,
  l.id as layer_id,
  l.layer_code,
  l.layer_kind,
  t.text_content,
  t.source_markup,
  t.text_features
from public.bible_text_sources s
join public.bible_source_units u on u.source_id = s.id
join public.bible_source_unit_texts t on t.source_id = u.source_id and t.unit_id = u.id
join public.bible_text_layers l on l.source_id = t.source_id and l.id = t.layer_id and l.layer_code = t.layer_code
where s.status = 'published' and l.is_public and l.validation_status = 'validated';

create view public.v_bible_reading_capabilities
with (security_invoker = true)
as
select
  s.id as source_id,
  s.trad_id,
  s.source_code,
  s.version_label,
  m.mode_code,
  m.label,
  m.display_order,
  case
    when m.mode_code in ('diplomatic', 'expanded', 'modernized') then exists (
      select 1 from public.bible_text_layers l
      where l.source_id = s.id and l.layer_kind = m.mode_code
        and l.is_public and l.validation_status = 'validated'
        and exists (
          select 1 from public.bible_source_unit_texts t
          where t.source_id = l.source_id and t.layer_id = l.id
        )
    )
    when m.mode_code = 'native' then exists (
      select 1 from public.bible_native_divisions d
      where d.source_id = s.id and d.is_public and d.validation_status = 'validated'
    )
    when m.mode_code in ('paragraph', 'verse') then exists (
      select 1 from public.bible_editorial_segmentations g
      where g.source_id = s.id and g.segmentation_kind = m.mode_code
        and g.is_public and g.status = 'validated'
    )
    else false
  end as is_available,
  case
    when case
      when m.mode_code in ('diplomatic', 'expanded', 'modernized') then exists (
        select 1 from public.bible_text_layers l
        where l.source_id = s.id and l.layer_kind = m.mode_code
          and l.is_public and l.validation_status = 'validated'
          and exists (
            select 1 from public.bible_source_unit_texts t
            where t.source_id = l.source_id and t.layer_id = l.id
          )
      )
      when m.mode_code = 'native' then exists (
        select 1 from public.bible_native_divisions d
        where d.source_id = s.id and d.is_public and d.validation_status = 'validated'
      )
      when m.mode_code in ('paragraph', 'verse') then exists (
        select 1 from public.bible_editorial_segmentations g
        where g.source_id = s.id and g.segmentation_kind = m.mode_code
          and g.is_public and g.status = 'validated'
      )
      else false
    end then 'available' else 'unavailable'
  end as availability_status
from public.bible_text_sources s
cross join (values
  ('diplomatic'::text, 'Transcription diplomatique'::text, 10),
  ('expanded', 'Abréviations développées', 20),
  ('native', 'Structure native', 30),
  ('paragraph', 'Paragraphes', 40),
  ('verse', 'Versets', 50),
  ('modernized', 'Graphie modernisée', 60)
) as m(mode_code, label, display_order)
where s.status = 'published';

create view public.v_bible_canonical_lookup
with (security_invoker = true)
as
select
  s.id as source_id,
  s.trad_id,
  s.source_code,
  s.version_label,
  g.id as segmentation_id,
  g.segmentation_code,
  g.segmentation_kind,
  e.id as segment_id,
  e.segment_key,
  e.editorial_sequence,
  u.id as unit_id,
  u.source_unit_key,
  u.material_order,
  a.id as alignment_id,
  a.alignment_order,
  a.canon_id,
  a.canon_id_fin,
  a.alignment_status,
  a.confidence,
  a.verification_status
from public.bible_text_sources s
join public.bible_editorial_segmentations g on g.source_id = s.id
join public.bible_canonical_alignments a on a.source_id = s.id and a.segmentation_id = g.id
left join public.bible_editorial_segments e on e.segmentation_id = a.segmentation_id and e.id = a.segment_id
left join public.bible_editorial_segment_sources es on es.segment_id = e.id
left join public.bible_source_units u on u.source_id = es.source_id and u.id = es.unit_id
where s.status = 'published'
  and g.is_public and g.status = 'validated'
  and a.verification_status in ('review', 'verified');

-- Les rôles clients ne reçoivent que SELECT sur les objets utiles au lecteur.
revoke all on table
  public.bible_text_sources,
  public.bible_source_units,
  public.bible_text_layers,
  public.bible_source_unit_texts,
  public.bible_native_divisions,
  public.bible_editorial_segmentations,
  public.bible_editorial_segments,
  public.bible_editorial_segment_sources,
  public.bible_canonical_alignments,
  public.bible_provenance_records,
  public.bible_provenance_links,
  public.v_bible_source_unit_texts,
  public.v_bible_reading_capabilities,
  public.v_bible_canonical_lookup
from public, anon, authenticated;

grant select on table
  public.bible_text_sources,
  public.bible_source_units,
  public.bible_text_layers,
  public.bible_source_unit_texts,
  public.bible_native_divisions,
  public.bible_editorial_segmentations,
  public.bible_editorial_segments,
  public.bible_editorial_segment_sources,
  public.bible_canonical_alignments,
  public.v_bible_source_unit_texts,
  public.v_bible_reading_capabilities,
  public.v_bible_canonical_lookup
to anon, authenticated;

grant select, insert, update, delete on table
  public.bible_text_sources,
  public.bible_source_units,
  public.bible_text_layers,
  public.bible_source_unit_texts,
  public.bible_native_divisions,
  public.bible_editorial_segmentations,
  public.bible_editorial_segments,
  public.bible_editorial_segment_sources,
  public.bible_canonical_alignments,
  public.bible_provenance_records,
  public.bible_provenance_links
to service_role;
grant select on table
  public.v_bible_source_unit_texts,
  public.v_bible_reading_capabilities,
  public.v_bible_canonical_lookup
to service_role;

comment on table public.bible_text_sources is 'Sources bibliques multimodes versionnées, indépendantes de versets_v2.';
comment on table public.bible_source_units is 'Unités matérielles stables et ordonnées ; une ligne TEI peut constituer une unité.';
comment on column public.bible_source_units.material_leaf_sequence is 'Ordre matériel continu, indépendant du foliotage natif affiché.';
comment on column public.bible_source_units.native_folio_number is 'Numéro porté ou inféré de la source ; ne jamais le fabriquer depuis material_leaf_sequence.';
comment on table public.bible_source_unit_texts is 'Représentations textuelles multiples d une même unité source.';
comment on table public.bible_native_divisions is 'Structure native du témoin, indépendante de versets_canon.';
comment on table public.bible_editorial_segment_sources is 'Offsets exprimés en points de code Unicode, jamais en octets.';
comment on table public.bible_canonical_alignments is 'Alignements éditoriaux facultatifs ; ne créent aucune numérotation native.';
comment on table public.bible_provenance_links is 'Polymorphisme borné : exactement une cible parmi unité, division, segment et alignement.';

notify pgrst, 'reload schema';
commit;
