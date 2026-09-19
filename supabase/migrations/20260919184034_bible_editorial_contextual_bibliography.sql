-- MIGRATION ACTIVE LOCALE — SCHÉMA BIBLIOGRAPHIQUE CONTEXTUEL V7.
-- FICHIER GÉNÉRÉ MAIS JAMAIS EXÉCUTÉ PAR CE LOT.
--
-- Source autoritative :
--   scripts/fillion/proposals/bible-editorial-contextual-bibliography-v7.sql
--   SHA-256 c09989d562c8262c352b3c7fab8d2f6e083496b0629c5c9542c22dd779f466a0
--   50 835 octets.
-- Autorisation indépendante :
--   PASS_INDEPENDENT_BIBLE_EDITORIAL_CONTEXTUAL_BIBLIOGRAPHY_V7_STATIC
--   checker SHA-256 686ac9ee9cd30093f94d3dcb4ac0376c79d1373973ad7749152afb7f99ceacdc
--   audit JSON SHA-256 41155ff8036dd4ef73352152a9fdc80625cf75be27fadc2a510ad093fc1b430e
--
-- Seul cet en-tête diffère de la proposition V7. À partir de BEGIN, le corps
-- transactionnel et toutes ses gardes sont byte-exacts.
-- Prochain gate : test PostgreSQL 17 jetable et audit séparé de l’adaptation
-- applicative. Production fermée.
begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.bible_editorial_bibliography_occurrences (
  id bigint generated always as identity,
  family_id uuid not null,
  source_body_block_id uuid not null,
  occurrence_key text not null,
  global_rank integer not null,
  source_citation text not null,
  source_start_offset_unicode integer not null,
  source_end_offset_unicode integer not null,
  source_surface_length_unicode integer not null,
  source_surface_sha256 text not null,
  offset_unit text not null default 'unicode_code_point',
  identification_status text not null default 'unresolved',
  validation_status text not null default 'draft',
  review_reason text,
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint beb_occ_pkey primary key (id),
  constraint beb_occ_family_id_id_uq unique (family_id, id),
  constraint beb_occ_block_key_uq
    unique (family_id, source_body_block_id, occurrence_key),
  constraint beb_occ_block_rank_uq
    unique (family_id, source_body_block_id, global_rank),
  constraint beb_occ_reader_projection_fk_uq
    unique (
      family_id,
      id,
      source_body_block_id,
      occurrence_key,
      global_rank,
      identification_status,
      validation_status
    ),
  constraint beb_occ_block_fk
    foreign key (family_id, source_body_block_id)
    references public.bible_editorial_body_blocks (family_id, id)
    on update cascade
    on delete cascade,
  constraint beb_occ_key_nonempty_ck check (btrim(occurrence_key) <> ''),
  constraint beb_occ_rank_positive_ck check (global_rank > 0),
  constraint beb_occ_source_nonempty_ck check (btrim(source_citation) <> ''),
  constraint beb_occ_offset_start_ck check (source_start_offset_unicode >= 0),
  constraint beb_occ_offset_order_ck
    check (source_end_offset_unicode > source_start_offset_unicode),
  constraint beb_occ_surface_length_ck check (source_surface_length_unicode > 0),
  constraint beb_occ_offset_bounds_ck
    check (source_end_offset_unicode <= source_surface_length_unicode),
  constraint beb_occ_source_length_ck
    check (
      char_length(source_citation)
      = source_end_offset_unicode - source_start_offset_unicode
    ),
  constraint beb_occ_sha256_ck check (source_surface_sha256 ~ '^[0-9a-f]{64}$'),
  constraint beb_occ_offset_unit_ck check (offset_unit = 'unicode_code_point'),
  constraint beb_occ_identification_status_ck
    check (
      identification_status = any (
        array[
          'unresolved'::text,
          'partially_resolved'::text,
          'resolved'::text,
          'excluded'::text
        ]
      )
    ),
  constraint beb_occ_validation_status_ck
    check (
      validation_status = any (
        array[
          'draft'::text,
          'review'::text,
          'validated'::text,
          'rejected'::text
        ]
      )
    ),
  constraint beb_occ_review_reason_nonempty_ck
    check (review_reason is null or btrim(review_reason) <> ''),
  constraint beb_occ_review_reason_required_ck
    check (identification_status = 'resolved' or review_reason is not null),
  constraint beb_occ_rejected_reason_required_ck
    check (validation_status <> 'rejected' or review_reason is not null),
  constraint beb_occ_provenance_object_ck
    check (jsonb_typeof(provenance) = 'object'),
  constraint beb_occ_metadata_object_ck
    check (jsonb_typeof(metadata) = 'object')
);

create table public.bible_editorial_bibliography_occurrence_works (
  family_id uuid not null,
  occurrence_id bigint not null,
  rank_in_occurrence smallint not null,
  ouvrage_id bigint not null,
  locator text,
  cited_part text,
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint beb_occ_work_pkey
    primary key (family_id, occurrence_id, rank_in_occurrence),
  constraint beb_occ_work_reader_projection_fk_uq
    unique (family_id, occurrence_id, rank_in_occurrence, ouvrage_id),
  constraint beb_occ_work_occurrence_fk
    foreign key (family_id, occurrence_id)
    references public.bible_editorial_bibliography_occurrences (family_id, id)
    on update cascade
    on delete cascade,
  constraint beb_occ_work_ouvrage_fk
    foreign key (ouvrage_id)
    references public.ouvrages_bibliographiques (id)
    on update cascade
    on delete restrict,
  constraint beb_occ_work_rank_positive_ck check (rank_in_occurrence > 0),
  constraint beb_occ_work_locator_nonempty_ck
    check (locator is null or btrim(locator) <> ''),
  constraint beb_occ_work_cited_part_nonempty_ck
    check (cited_part is null or btrim(cited_part) <> ''),
  constraint beb_occ_work_provenance_object_ck
    check (jsonb_typeof(provenance) = 'object'),
  constraint beb_occ_work_metadata_object_ck
    check (jsonb_typeof(metadata) = 'object')
);

create table public.bible_editorial_bibliography_reader_projection (
  family_id uuid not null,
  occurrence_id bigint not null,
  source_body_block_id uuid not null,
  occurrence_key text not null,
  global_rank integer not null,
  identification_status text not null,
  validation_status text not null,
  rank_in_occurrence smallint not null,
  ouvrage_id bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint beb_reader_projection_pkey
    primary key (family_id, occurrence_id, rank_in_occurrence),
  constraint beb_reader_projection_occurrence_fk
    foreign key (
      family_id,
      occurrence_id,
      source_body_block_id,
      occurrence_key,
      global_rank,
      identification_status,
      validation_status
    )
    references public.bible_editorial_bibliography_occurrences (
      family_id,
      id,
      source_body_block_id,
      occurrence_key,
      global_rank,
      identification_status,
      validation_status
    )
    on update cascade
    on delete cascade,
  constraint beb_reader_projection_work_fk
    foreign key (family_id, occurrence_id, rank_in_occurrence, ouvrage_id)
    references public.bible_editorial_bibliography_occurrence_works
      (family_id, occurrence_id, rank_in_occurrence, ouvrage_id)
    on update cascade
    on delete cascade,
  constraint beb_reader_projection_block_fk
    foreign key (family_id, source_body_block_id)
    references public.bible_editorial_body_blocks (family_id, id)
    on update cascade
    on delete cascade,
  constraint beb_reader_projection_ouvrage_fk
    foreign key (ouvrage_id)
    references public.ouvrages_bibliographiques (id)
    on update cascade
    on delete restrict,
  constraint beb_reader_projection_key_nonempty_ck
    check (btrim(occurrence_key) <> ''),
  constraint beb_reader_projection_global_rank_positive_ck
    check (global_rank > 0),
  constraint beb_reader_projection_work_rank_positive_ck
    check (rank_in_occurrence > 0),
  constraint beb_reader_projection_identification_status_ck
    check (
      identification_status = any (
        array[
          'unresolved'::text,
          'partially_resolved'::text,
          'resolved'::text,
          'excluded'::text
        ]
      )
    ),
  constraint beb_reader_projection_validation_status_ck
    check (
      validation_status = any (
        array[
          'draft'::text,
          'review'::text,
          'validated'::text,
          'rejected'::text
        ]
      )
    )
);

create index beb_occ_source_block_idx
  on public.bible_editorial_bibliography_occurrences
  (source_body_block_id, global_rank);

create index beb_occ_work_occurrence_idx
  on public.bible_editorial_bibliography_occurrence_works
  (occurrence_id, rank_in_occurrence);

create index beb_occ_work_ouvrage_idx
  on public.bible_editorial_bibliography_occurrence_works
  (ouvrage_id);

create index beb_reader_projection_block_idx
  on public.bible_editorial_bibliography_reader_projection
  (family_id, source_body_block_id, global_rank, rank_in_occurrence)
  where identification_status in ('partially_resolved', 'resolved')
    and validation_status <> 'rejected';

create index beb_reader_projection_ouvrage_idx
  on public.bible_editorial_bibliography_reader_projection
  (ouvrage_id);

create trigger beb_occ_set_updated_at
  before update on public.bible_editorial_bibliography_occurrences
  for each row execute function public.set_updated_at();

create trigger beb_occ_work_set_updated_at
  before update on public.bible_editorial_bibliography_occurrence_works
  for each row execute function public.set_updated_at();

create trigger beb_reader_projection_set_updated_at
  before update on public.bible_editorial_bibliography_reader_projection
  for each row execute function public.set_updated_at();

alter table public.bible_editorial_bibliography_occurrences
  enable row level security;
alter table public.bible_editorial_bibliography_occurrence_works
  enable row level security;
alter table public.bible_editorial_bibliography_reader_projection
  enable row level security;

revoke all on table public.bible_editorial_bibliography_occurrences
  from public, anon, authenticated;
revoke all on table public.bible_editorial_bibliography_occurrence_works
  from public, anon, authenticated;
revoke all on sequence public.bible_editorial_bibliography_occurrences_id_seq
  from public, anon, authenticated;

grant select, insert, update, delete, truncate, references, trigger
  on table public.bible_editorial_bibliography_occurrences
  to service_role;
grant select, insert, update, delete, truncate, references, trigger
  on table public.bible_editorial_bibliography_occurrence_works
  to service_role;
grant usage, select, update
  on sequence public.bible_editorial_bibliography_occurrences_id_seq
  to service_role;

revoke all on table public.bible_editorial_bibliography_reader_projection
  from public, anon, authenticated;

grant select (
  family_id,
  occurrence_id,
  source_body_block_id,
  occurrence_key,
  global_rank,
  rank_in_occurrence,
  ouvrage_id
) on table public.bible_editorial_bibliography_reader_projection
  to authenticated;

grant select, insert, update, delete, truncate, references, trigger
  on table public.bible_editorial_bibliography_reader_projection
  to service_role;

create policy beb_reader_projection_authenticated_read
  on public.bible_editorial_bibliography_reader_projection
  for select
  to authenticated
  using (
    identification_status in ('partially_resolved', 'resolved')
    and validation_status <> 'rejected'
    and exists (
      select 1
      from public.bible_editorial_body_blocks as body_block
      where body_block.family_id
            = bible_editorial_bibliography_reader_projection.family_id
        and body_block.id
            = bible_editorial_bibliography_reader_projection.source_body_block_id
    )
    and exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.id
            = bible_editorial_bibliography_reader_projection.ouvrage_id
        and coalesce(ouvrage.statut_editorial, '')
            not in ('rejete', 'exclu')
    )
  );

create view public.v_bible_editorial_bibliography_occurrences
with (security_invoker = true, security_barrier = true)
as
select distinct
  reader_projection.occurrence_id as id,
  reader_projection.family_id,
  reader_projection.source_body_block_id,
  body_block.block_key as source_body_block_key,
  body_block.scope_book_code,
  reader_projection.occurrence_key,
  reader_projection.global_rank
from public.bible_editorial_bibliography_reader_projection as reader_projection
join public.bible_editorial_body_blocks as body_block
  on body_block.family_id = reader_projection.family_id
 and body_block.id = reader_projection.source_body_block_id;

create view public.v_bible_editorial_bibliography_occurrence_works
with (security_invoker = true, security_barrier = true)
as
select
  reader_projection.family_id,
  reader_projection.occurrence_id,
  reader_projection.source_body_block_id,
  body_block.block_key as source_body_block_key,
  body_block.scope_book_code,
  reader_projection.occurrence_key,
  reader_projection.global_rank,
  reader_projection.rank_in_occurrence,
  reader_projection.ouvrage_id
from public.bible_editorial_bibliography_reader_projection as reader_projection
join public.bible_editorial_body_blocks as body_block
  on body_block.family_id = reader_projection.family_id
 and body_block.id = reader_projection.source_body_block_id;

revoke all on table public.v_bible_editorial_bibliography_occurrences
  from public, anon, authenticated;
revoke all on table public.v_bible_editorial_bibliography_occurrence_works
  from public, anon, authenticated;

grant select on table public.v_bible_editorial_bibliography_occurrences
  to authenticated, service_role;
grant select on table public.v_bible_editorial_bibliography_occurrence_works
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Durcissement effectif du moteur commun et surfaces administratives dédiées.
-- ---------------------------------------------------------------------------

alter table public.ouvrages_bibliographiques enable row level security;
alter table public.ouvrages_bibliographiques_editeurs enable row level security;
alter table public.ouvrage_contributeurs_scientifiques enable row level security;
alter table public.editeurs_valeur enable row level security;
alter table public.collections_valeur enable row level security;
alter table public.auteurs_valeur enable row level security;

create policy bibliography_engine_work_gate_restrictive
  on public.ouvrages_bibliographiques
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or coalesce(statut_editorial, '') not in ('rejete', 'exclu')
  );

create policy bibliography_engine_work_read_permissive
  on public.ouvrages_bibliographiques
  as permissive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or coalesce(statut_editorial, '') not in ('rejete', 'exclu')
  );

create policy bibliography_engine_editor_link_gate_restrictive
  on public.ouvrages_bibliographiques_editeurs
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.id = ouvrages_bibliographiques_editeurs.ouvrage_id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_editor_link_read_permissive
  on public.ouvrages_bibliographiques_editeurs
  as permissive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.id = ouvrages_bibliographiques_editeurs.ouvrage_id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_contributor_gate_restrictive
  on public.ouvrage_contributeurs_scientifiques
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.id = ouvrage_contributeurs_scientifiques.ouvrage_id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_contributor_read_permissive
  on public.ouvrage_contributeurs_scientifiques
  as permissive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.id = ouvrage_contributeurs_scientifiques.ouvrage_id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_editor_authority_gate_restrictive
  on public.editeurs_valeur
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.editeur_valeur_id = editeurs_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
    or exists (
      select 1
      from public.ouvrages_bibliographiques_editeurs as liaison
      join public.ouvrages_bibliographiques as ouvrage
        on ouvrage.id = liaison.ouvrage_id
      where liaison.editeur_id = editeurs_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_editor_authority_read_permissive
  on public.editeurs_valeur
  as permissive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.editeur_valeur_id = editeurs_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
    or exists (
      select 1
      from public.ouvrages_bibliographiques_editeurs as liaison
      join public.ouvrages_bibliographiques as ouvrage
        on ouvrage.id = liaison.ouvrage_id
      where liaison.editeur_id = editeurs_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_collection_authority_gate_restrictive
  on public.collections_valeur
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.collection_valeur_id = collections_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_collection_authority_read_permissive
  on public.collections_valeur
  as permissive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrages_bibliographiques as ouvrage
      where ouvrage.collection_valeur_id = collections_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_authority_gate_restrictive
  on public.auteurs_valeur
  as restrictive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrage_contributeurs_scientifiques as contribution
      join public.ouvrages_bibliographiques as ouvrage
        on ouvrage.id = contribution.ouvrage_id
      where contribution.auteur_valeur_id = auteurs_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

create policy bibliography_engine_authority_read_permissive
  on public.auteurs_valeur
  as permissive
  for select
  to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1
      from public.ouvrage_contributeurs_scientifiques as contribution
      join public.ouvrages_bibliographiques as ouvrage
        on ouvrage.id = contribution.ouvrage_id
      where contribution.auteur_valeur_id = auteurs_valeur.id
        and coalesce(ouvrage.statut_editorial, '') not in ('rejete', 'exclu')
    )
  );

-- Une policy permissive supplémentaire ne limiterait pas public.auteurs puisque
-- cette table conserve un contrat corpus PUBLIC USING (true). V4 n'en crée pas.
-- La forme commune ne prend un auteur historique qu'au travers d'un contributeur
-- de l'ouvrage déjà retenu par le filtre extérieur.

-- Retrait effectif : les GRANT de colonnes ci-dessous ne sont appliqués qu'après
-- suppression des privilèges directs. Le retrait de ALL déplace les opérations
-- administratives authenticated vers les vues dédiées plus bas.
revoke all on table public.ouvrages_bibliographiques
  from public, anon, authenticated;
revoke all on table public.ouvrages_bibliographiques_editeurs
  from public, anon, authenticated;
revoke all on table public.ouvrage_contributeurs_scientifiques
  from public, anon, authenticated;
revoke all on table public.editeurs_valeur
  from public, anon, authenticated;
revoke all on table public.collections_valeur
  from public, anon, authenticated;
revoke all on table public.auteurs_valeur
  from public, anon, authenticated;

-- Échec fermé si SELECT revient à authenticated par une appartenance à un rôle,
-- par la propriété de l'objet ou par toute autre ACL de table encore effective.
do $acl_guard$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'public.ouvrages_bibliographiques',
    'public.ouvrages_bibliographiques_editeurs',
    'public.ouvrage_contributeurs_scientifiques',
    'public.editeurs_valeur',
    'public.collections_valeur',
    'public.auteurs_valeur'
  ]
  loop
    if has_table_privilege('authenticated', relation_name, 'SELECT') then
      raise exception
        'V7 ACL guard: authenticated retains table-level SELECT on % through ownership, PUBLIC or role membership',
        relation_name;
    end if;
  end loop;
end
$acl_guard$;

grant select (
  id,
  type_ouvrage,
  forme_notice,
  titre,
  sous_titre,
  titre_hote,
  tomaison,
  pages,
  date_affichee,
  annee,
  edition,
  lieu,
  collection,
  numero_collection,
  langue_normalisee,
  langue,
  auteurs,
  directeurs,
  traducteurs,
  editeur,
  isbn,
  editeur_valeur_id,
  collection_valeur_id,
  statut_editorial,
  statut_scientifique,
  garantie_scientifique,
  statut_usage_notice,
  motif_usage_notice,
  note
) on table public.ouvrages_bibliographiques
  to authenticated;

grant select (ouvrage_id, editeur_id, rang, role)
  on table public.ouvrages_bibliographiques_editeurs
  to authenticated;

grant select (
  id,
  ouvrage_id,
  ordre,
  role_contributeur,
  nature_personne,
  nom_affiche,
  auteur_valeur_id,
  auteur_id
) on table public.ouvrage_contributeurs_scientifiques
  to authenticated;

grant select (id, nom)
  on table public.editeurs_valeur
  to authenticated;
grant select (id, nom)
  on table public.collections_valeur
  to authenticated;
grant select (id, prenom, nom_famille, pseudonyme, titre, nom)
  on table public.auteurs_valeur
  to authenticated;

-- Égalité exacte de la surface colonnes après GRANT. Cette garde voit les droits
-- directs, PUBLIC et hérités : toute ancienne colonne supplémentaire fait
-- échouer la transaction, même si elle provient d'un GRANT de colonne distinct.
do $column_acl_guard$
declare
  relation_name text;
  column_name text;
  allowed_columns jsonb := jsonb_build_object(
    'public.ouvrages_bibliographiques', jsonb_build_array(
      'id',
      'type_ouvrage',
      'forme_notice',
      'titre',
      'sous_titre',
      'titre_hote',
      'tomaison',
      'pages',
      'date_affichee',
      'annee',
      'edition',
      'lieu',
      'collection',
      'numero_collection',
      'langue_normalisee',
      'langue',
      'auteurs',
      'directeurs',
      'traducteurs',
      'editeur',
      'isbn',
      'editeur_valeur_id',
      'collection_valeur_id',
      'statut_editorial',
      'statut_scientifique',
      'garantie_scientifique',
      'statut_usage_notice',
      'motif_usage_notice',
      'note'
    ),
    'public.ouvrages_bibliographiques_editeurs', jsonb_build_array(
      'ouvrage_id', 'editeur_id', 'rang', 'role'
    ),
    'public.ouvrage_contributeurs_scientifiques', jsonb_build_array(
      'id',
      'ouvrage_id',
      'ordre',
      'role_contributeur',
      'nature_personne',
      'nom_affiche',
      'auteur_valeur_id',
      'auteur_id'
    ),
    'public.editeurs_valeur', jsonb_build_array('id', 'nom'),
    'public.collections_valeur', jsonb_build_array('id', 'nom'),
    'public.auteurs_valeur', jsonb_build_array(
      'id', 'prenom', 'nom_famille', 'pseudonyme', 'titre', 'nom'
    )
  );
begin
  foreach relation_name in array array[
    'public.ouvrages_bibliographiques',
    'public.ouvrages_bibliographiques_editeurs',
    'public.ouvrage_contributeurs_scientifiques',
    'public.editeurs_valeur',
    'public.collections_valeur',
    'public.auteurs_valeur'
  ]
  loop
    for column_name in
      select attribute.attname
      from pg_catalog.pg_attribute as attribute
      where attribute.attrelid = relation_name::regclass
        and attribute.attnum > 0
        and not attribute.attisdropped
      order by attribute.attnum
    loop
      if has_column_privilege(
           'authenticated',
           relation_name,
           column_name,
           'SELECT'
         ) is distinct from ((allowed_columns -> relation_name) ? column_name)
      then
        raise exception
          'V7 column ACL guard: effective authenticated SELECT mismatch on %.%',
          relation_name,
          column_name;
      end if;
    end loop;
  end loop;
end
$column_acl_guard$;

-- Fermeture exacte du contrat lecteur préexistant. PostgreSQL 17 évalue
-- les tables sous-jacentes des vues security_invoker avec les droits de
-- l’appelant original. Les ensembles ci-dessous proviennent de la preuve
-- SELECT-only fraîche du 2026-09-19 et sont comparés par égalité : toute
-- dépendance ajoutée ou retirée fait échouer la transaction.
do $reader_dependency_guard$
declare
  ouvrage_oid oid := to_regclass('public.ouvrages_bibliographiques');
  notice_oid oid := to_regclass('public.bibliographie_notice_selectionnee');
  complete_oid oid := to_regclass('public.pericope_bibliographie_complete');
  admissible_oid oid := to_regclass('public.bibliographie_admissible');
  current_view_oid oid;
  current_owner text;
  current_kind "char";
  current_options text[];
  required_column text;
  notice_definition text;
  complete_definition text;
  actual_dependencies text[];
  expected_notice_dependencies constant text[] := array[
    'public.ouvrages_bibliographiques#1',
    'public.ouvrages_bibliographiques#2',
    'public.ouvrages_bibliographiques#3',
    'public.ouvrages_bibliographiques#4',
    'public.ouvrages_bibliographiques#7',
    'public.ouvrages_bibliographiques#10',
    'public.ouvrages_bibliographiques#11',
    'public.ouvrages_bibliographiques#14',
    'public.ouvrages_bibliographiques#15',
    'public.ouvrages_bibliographiques#26',
    'public.ouvrages_bibliographiques#34',
    'public.pericope_bibliographie#1',
    'public.pericope_bibliographie#2',
    'public.pericope_bibliographie#3',
    'public.pericope_bibliographie#4',
    'public.pericope_bibliographie#5',
    'public.pericope_bibliographie#6',
    'public.pericope_bibliographie#8',
    'public.pericope_bibliographie#15',
    'public.pericope_bibliographie#16',
    'public.pericope_bibliographie#17'
  ];
  expected_complete_dependencies constant text[] := array[
    'public.ouvrages_bibliographiques#1',
    'public.ouvrages_bibliographiques#2',
    'public.ouvrages_bibliographiques#3',
    'public.ouvrages_bibliographiques#4',
    'public.ouvrages_bibliographiques#5',
    'public.ouvrages_bibliographiques#6',
    'public.ouvrages_bibliographiques#7',
    'public.ouvrages_bibliographiques#8',
    'public.ouvrages_bibliographiques#9',
    'public.ouvrages_bibliographiques#10',
    'public.ouvrages_bibliographiques#11',
    'public.ouvrages_bibliographiques#12',
    'public.ouvrages_bibliographiques#13',
    'public.ouvrages_bibliographiques#14',
    'public.ouvrages_bibliographiques#15',
    'public.ouvrages_bibliographiques#16',
    'public.ouvrages_bibliographiques#18',
    'public.ouvrages_bibliographiques#19',
    'public.ouvrages_bibliographiques#26',
    'public.ouvrages_bibliographiques#33',
    'public.ouvrages_bibliographiques#34',
    'public.ouvrages_bibliographiques#35',
    'public.pericope_bibliographie#1',
    'public.pericope_bibliographie#2',
    'public.pericope_bibliographie#3',
    'public.pericope_bibliographie#4',
    'public.pericope_bibliographie#5',
    'public.pericope_bibliographie#6',
    'public.pericope_bibliographie#7',
    'public.pericope_bibliographie#8',
    'public.pericope_bibliographie#9',
    'public.pericope_bibliographie#10',
    'public.pericope_bibliographie#11',
    'public.pericope_bibliographie#12',
    'public.pericopes#1',
    'public.pericopes#2',
    'public.pericopes#4'
  ];
begin
  if ouvrage_oid is null
     or notice_oid is null
     or complete_oid is null
     or admissible_oid is null
  then
    raise exception
      'V7 reader dependency guard: required base relation or reader view is absent';
  end if;

  foreach current_view_oid in array array[notice_oid, complete_oid, admissible_oid]
  loop
    select class.relkind, pg_get_userbyid(class.relowner), class.reloptions
    into current_kind, current_owner, current_options
    from pg_catalog.pg_class as class
    where class.oid = current_view_oid;

    if current_kind <> 'v'
       or current_owner <> 'postgres'
       or not ('security_invoker=true' = any(coalesce(current_options, array[]::text[])))
       or has_table_privilege('authenticated', current_view_oid, 'SELECT')
            is distinct from true
       or has_table_privilege('anon', current_view_oid, 'SELECT')
            is distinct from false
    then
      raise exception
        'V7 reader dependency guard: owner/options/ACL drifted for %',
        current_view_oid::regclass;
    end if;
  end loop;

  foreach required_column in array array[
    'edition',
    'garantie_scientifique',
    'isbn',
    'motif_usage_notice',
    'note',
    'statut_usage_notice'
  ]
  loop
    if has_column_privilege(
         'authenticated',
         ouvrage_oid,
         required_column,
         'SELECT'
       ) is distinct from true
    then
      raise exception
        'V7 reader dependency guard: authenticated lacks %.%',
        ouvrage_oid::regclass,
        required_column;
    end if;
  end loop;

  notice_definition := pg_get_viewdef(notice_oid, true);
  complete_definition := pg_get_viewdef(complete_oid, true);

  if length(notice_definition) is distinct from 498
     or md5(notice_definition)
          is distinct from '6ebf62596ac4014227e7c0cfbf8bc787'
     or length(complete_definition) is distinct from 891
     or md5(complete_definition)
          is distinct from 'b2694e5cfbc16d95f24f0a33f793faed'
  then
    raise exception
      'V7 reader dependency guard: pg_get_viewdef definition digest or length drifted';
  end if;

  select coalesce(
           array_agg(
             exact_dependency.dependency_key
             order by
               exact_dependency.schema_name,
               exact_dependency.relation_name,
               exact_dependency.attribute_number
           ),
           array[]::text[]
         )
  into actual_dependencies
  from (
    select distinct
      namespace.nspname as schema_name,
      relation.relname as relation_name,
      attribute.attnum as attribute_number,
      format(
        '%I.%I#%s',
        namespace.nspname,
        relation.relname,
        attribute.attnum
      ) as dependency_key
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_rewrite as rewrite
      on rewrite.oid = dependency.objid
     and dependency.classid = 'pg_rewrite'::regclass
    join pg_catalog.pg_class as relation
      on relation.oid = dependency.refobjid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    join pg_catalog.pg_attribute as attribute
      on attribute.attrelid = dependency.refobjid
     and attribute.attnum = dependency.refobjsubid
    where dependency.refclassid = 'pg_class'::regclass
      and dependency.refobjsubid > 0
      and rewrite.ev_class = notice_oid
  ) as exact_dependency;

  if actual_dependencies is distinct from expected_notice_dependencies then
    raise exception
      'V7 reader dependency guard: exact bibliographie_notice_selectionnee dependency set drifted; expected %, actual %',
      expected_notice_dependencies,
      actual_dependencies;
  end if;

  select coalesce(
           array_agg(
             exact_dependency.dependency_key
             order by
               exact_dependency.schema_name,
               exact_dependency.relation_name,
               exact_dependency.attribute_number
           ),
           array[]::text[]
         )
  into actual_dependencies
  from (
    select distinct
      namespace.nspname as schema_name,
      relation.relname as relation_name,
      attribute.attnum as attribute_number,
      format(
        '%I.%I#%s',
        namespace.nspname,
        relation.relname,
        attribute.attnum
      ) as dependency_key
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_rewrite as rewrite
      on rewrite.oid = dependency.objid
     and dependency.classid = 'pg_rewrite'::regclass
    join pg_catalog.pg_class as relation
      on relation.oid = dependency.refobjid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    join pg_catalog.pg_attribute as attribute
      on attribute.attrelid = dependency.refobjid
     and attribute.attnum = dependency.refobjsubid
    where dependency.refclassid = 'pg_class'::regclass
      and dependency.refobjsubid > 0
      and rewrite.ev_class = complete_oid
  ) as exact_dependency;

  if actual_dependencies is distinct from expected_complete_dependencies then
    raise exception
      'V7 reader dependency guard: exact pericope_bibliographie_complete dependency set drifted; expected %, actual %',
      expected_complete_dependencies,
      actual_dependencies;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_rewrite as rewrite
      on rewrite.oid = dependency.objid
     and dependency.classid = 'pg_rewrite'::regclass
    where dependency.refclassid = 'pg_class'::regclass
      and dependency.refobjid = complete_oid
      and rewrite.ev_class = admissible_oid
  ) then
    raise exception
      'V7 reader dependency guard: bibliographie_admissible no longer depends directly on pericope_bibliographie_complete';
  end if;
end
$reader_dependency_guard$;

-- Vues propriétaires d'administration. Leur propriétaire doit rester le rôle
-- de migration de confiance. Elles sont volontairement security_invoker=false :
-- public.is_admin() devient alors le garde unique à auditer, et LOCAL CHECK
-- OPTION interdit toute insertion ou mutation par un non-admin.
create view public.v_bibliography_admin_ouvrages
with (security_barrier = true, security_invoker = false)
as
select base.*
from public.ouvrages_bibliographiques as base
where (select public.is_admin())
with local check option;

create view public.v_bibliography_admin_ouvrage_editeurs
with (security_barrier = true, security_invoker = false)
as
select base.*
from public.ouvrages_bibliographiques_editeurs as base
where (select public.is_admin())
with local check option;

create view public.v_bibliography_admin_contributeurs_scientifiques
with (security_barrier = true, security_invoker = false)
as
select base.*
from public.ouvrage_contributeurs_scientifiques as base
where (select public.is_admin())
with local check option;

create view public.v_bibliography_admin_editeurs_valeur
with (security_barrier = true, security_invoker = false)
as
select base.*
from public.editeurs_valeur as base
where (select public.is_admin())
with local check option;

create view public.v_bibliography_admin_collections_valeur
with (security_barrier = true, security_invoker = false)
as
select base.*
from public.collections_valeur as base
where (select public.is_admin())
with local check option;

create view public.v_bibliography_admin_auteurs_valeur
with (security_barrier = true, security_invoker = false)
as
select base.*
from public.auteurs_valeur as base
where (select public.is_admin())
with local check option;

revoke all on table public.v_bibliography_admin_ouvrages
  from public, anon, authenticated, service_role;
revoke all on table public.v_bibliography_admin_ouvrage_editeurs
  from public, anon, authenticated, service_role;
revoke all on table public.v_bibliography_admin_contributeurs_scientifiques
  from public, anon, authenticated, service_role;
revoke all on table public.v_bibliography_admin_editeurs_valeur
  from public, anon, authenticated, service_role;
revoke all on table public.v_bibliography_admin_collections_valeur
  from public, anon, authenticated, service_role;
revoke all on table public.v_bibliography_admin_auteurs_valeur
  from public, anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.v_bibliography_admin_ouvrages
  to authenticated;
grant select, insert, update, delete
  on table public.v_bibliography_admin_ouvrage_editeurs
  to authenticated;
grant select, insert, update, delete
  on table public.v_bibliography_admin_contributeurs_scientifiques
  to authenticated;
grant select, insert, update, delete
  on table public.v_bibliography_admin_editeurs_valeur
  to authenticated;
grant select, insert, update, delete
  on table public.v_bibliography_admin_collections_valeur
  to authenticated;
grant select, insert, update, delete
  on table public.v_bibliography_admin_auteurs_valeur
  to authenticated;


-- Propriétaires explicites : le modèle owner-rights n’est admissible que si ces
-- vues appartiennent au rôle de migration de confiance déjà attesté à distance.
alter view public.v_bibliography_admin_ouvrages owner to postgres;
alter view public.v_bibliography_admin_ouvrage_editeurs owner to postgres;
alter view public.v_bibliography_admin_contributeurs_scientifiques owner to postgres;
alter view public.v_bibliography_admin_editeurs_valeur owner to postgres;
alter view public.v_bibliography_admin_collections_valeur owner to postgres;
alter view public.v_bibliography_admin_auteurs_valeur owner to postgres;

-- ---------------------------------------------------------------------------
-- Contrat admin de qualité : définition historique clonée, OID public conservé.
-- ---------------------------------------------------------------------------

-- Le compte qui exécuterait un jour cette proposition doit être le propriétaire
-- de confiance. public.is_admin() doit rester un SECURITY DEFINER fermé à anon
-- et PUBLIC, fondé sur admin_users + auth.uid(), jamais sur une métadonnée JWT
-- modifiable par l’utilisateur.
do $admin_guard_contract$
declare
  function_oid oid := to_regprocedure('public.is_admin()');
  function_owner name;
  function_security_definer boolean;
  function_definition text;
begin
  if current_user <> 'postgres' then
    raise exception
      'V7 owner guard: current_user % is not trusted owner postgres',
      current_user;
  end if;

  if function_oid is null then
    raise exception 'V7 admin guard: public.is_admin() is absent';
  end if;

  select
    pg_get_userbyid(proc.proowner),
    proc.prosecdef,
    pg_get_functiondef(proc.oid)
  into
    function_owner,
    function_security_definer,
    function_definition
  from pg_catalog.pg_proc as proc
  where proc.oid = function_oid;

  if function_owner <> 'postgres'
     or function_security_definer is distinct from true
     or position('public.admin_users' in function_definition) = 0
     or position('auth.uid()' in function_definition) = 0
     or has_function_privilege('authenticated', function_oid, 'EXECUTE')
          is distinct from true
     or has_function_privilege('anon', function_oid, 'EXECUTE')
          is distinct from false
  then
    raise exception
      'V7 admin guard: public.is_admin() owner/definition/ACL contract drifted';
  end if;
end
$admin_guard_contract$;

-- CREATE OR REPLACE conserve l’OID de la vue publique et laisse ainsi ses
-- dépendances éventuelles sur la surface désormais gardée. Le clonage dynamique
-- reproduit exactement sa définition historique sans la réinventer. Par
-- sécurité, le candidat refuse néanmoins toute vue dépendante non inventoriée :
-- le contre-audit devra comparer ce pg_depend à une preuve SELECT fraîche.
do $quality_view_clone$
declare
  quality_oid oid := to_regclass('public.v_ouvrages_bibliographiques_qualite');
  quality_definition text;
  quality_owner name;
  quality_kind "char";
  quality_options text[];
begin
  if quality_oid is null then
    raise exception
      'V7 quality guard: public.v_ouvrages_bibliographiques_qualite is absent';
  end if;

  if to_regclass('public.v_bibliography_admin_ouvrages_quality_source') is not null then
    raise exception
      'V7 quality guard: backing public.v_bibliography_admin_ouvrages_quality_source already exists';
  end if;

  select
    pg_get_userbyid(class.relowner),
    class.relkind,
    pg_get_viewdef(class.oid, true),
    class.reloptions
  into
    quality_owner,
    quality_kind,
    quality_definition,
    quality_options
  from pg_catalog.pg_class as class
  where class.oid = quality_oid;

  if quality_kind <> 'v' or quality_owner <> 'postgres'
     or quality_definition is null or btrim(quality_definition) = ''
     or not ('security_invoker=true' = any(coalesce(quality_options, array[]::text[])))
     or has_table_privilege('authenticated', quality_oid, 'SELECT')
          is distinct from true
     or has_table_privilege('anon', quality_oid, 'SELECT')
          is distinct from false
  then
    raise exception
      'V7 quality guard: historical quality view kind/owner/definition drifted';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_depend as dependency
    join pg_catalog.pg_rewrite as rewrite
      on rewrite.oid = dependency.objid
     and dependency.classid = 'pg_rewrite'::regclass
    where dependency.refclassid = 'pg_class'::regclass
      and dependency.refobjid = quality_oid
      and rewrite.ev_class <> quality_oid
  ) then
    raise exception
      'V7 quality guard: unmanaged relation dependency found on public.v_ouvrages_bibliographiques_qualite';
  end if;

  execute format(
    'create view public.v_bibliography_admin_ouvrages_quality_source '
    'with (security_invoker = false, security_barrier = true) as %s',
    quality_definition
  );
end
$quality_view_clone$;

alter view public.v_bibliography_admin_ouvrages_quality_source
  owner to postgres;
revoke all on table public.v_bibliography_admin_ouvrages_quality_source
  from public, anon, authenticated, service_role;

create or replace view public.v_ouvrages_bibliographiques_qualite
with (security_invoker = false, security_barrier = true)
as
select historical_quality.*
from public.v_bibliography_admin_ouvrages_quality_source
  as historical_quality
where (select public.is_admin());

alter view public.v_ouvrages_bibliographiques_qualite owner to postgres;
revoke all on table public.v_ouvrages_bibliographiques_qualite
  from public, anon, authenticated, service_role;
grant select on table public.v_ouvrages_bibliographiques_qualite
  to authenticated;

-- Contrôle effectif de la surface qualité et de son backing. Le backing ne doit
-- avoir qu’un seul consommateur relationnel : la vue publique gardée.
do $quality_view_contract_guard$
declare
  public_oid oid := to_regclass('public.v_ouvrages_bibliographiques_qualite');
  backing_oid oid := to_regclass('public.v_bibliography_admin_ouvrages_quality_source');
  public_options text[];
  backing_options text[];
  public_owner name;
  backing_owner name;
  external_backing_dependents integer;
begin
  select reloptions, pg_get_userbyid(relowner)
  into public_options, public_owner
  from pg_catalog.pg_class
  where oid = public_oid;

  select reloptions, pg_get_userbyid(relowner)
  into backing_options, backing_owner
  from pg_catalog.pg_class
  where oid = backing_oid;

  select count(*)::integer
  into external_backing_dependents
  from pg_catalog.pg_depend as dependency
  join pg_catalog.pg_rewrite as rewrite
    on rewrite.oid = dependency.objid
   and dependency.classid = 'pg_rewrite'::regclass
  where dependency.refclassid = 'pg_class'::regclass
    and dependency.refobjid = backing_oid
    and rewrite.ev_class not in (public_oid, backing_oid);

  if public_owner <> 'postgres'
     or backing_owner <> 'postgres'
     or not ('security_barrier=true' = any(coalesce(public_options, array[]::text[])))
     or ('security_invoker=true' = any(coalesce(public_options, array[]::text[])))
     or not ('security_barrier=true' = any(coalesce(backing_options, array[]::text[])))
     or ('security_invoker=true' = any(coalesce(backing_options, array[]::text[])))
     or external_backing_dependents <> 0
     or has_table_privilege('authenticated', public_oid, 'SELECT')
          is distinct from true
     or has_table_privilege('authenticated', public_oid, 'INSERT')
          is distinct from false
     or has_table_privilege('authenticated', public_oid, 'UPDATE')
          is distinct from false
     or has_table_privilege('authenticated', public_oid, 'DELETE')
          is distinct from false
     or has_table_privilege('anon', public_oid, 'SELECT')
          is distinct from false
     or has_table_privilege('authenticated', backing_oid, 'SELECT')
          is distinct from false
     or has_table_privilege('anon', backing_oid, 'SELECT')
          is distinct from false
     or has_table_privilege('service_role', backing_oid, 'SELECT')
          is distinct from false
  then
    raise exception
      'V7 quality guard: owner/options/dependencies/ACL postcondition failed';
  end if;
end
$quality_view_contract_guard$;

comment on view public.v_bibliography_admin_ouvrages_quality_source is
  'Backing propriétaire fermé : définition historique exacte de la vue qualité ; aucun accès direct client.';
comment on view public.v_ouvrages_bibliographiques_qualite is
  'Surface admin propriétaire SELECT-only, SECURITY BARRIER, gardée par public.is_admin(); forme et valeurs admin historiques préservées.';

create or replace view public.v_references_bibliographiques
with (security_invoker = true, security_barrier = true)
as
select
  o.id as ouvrage_id,
  o.type_ouvrage,
  o.forme_notice,
  o.titre,
  o.sous_titre,
  o.titre_hote,
  o.tomaison,
  o.pages,
  o.date_affichee,
  o.annee,
  o.lieu,
  coalesce(cv.nom, o.collection) as collection,
  o.numero_collection,
  coalesce(o.langue_normalisee, o.langue) as langue,
  o.auteurs as auteurs_texte,
  o.directeurs as directeurs_texte,
  o.traducteurs as traducteurs_texte,
  coalesce(ev.nom, o.editeur) as editeur,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'rang', e.rang,
        'role', e.role,
        'nom', v.nom
      )
      order by e.rang, e.role
    )
    from public.ouvrages_bibliographiques_editeurs as e
    join public.editeurs_valeur as v on v.id = e.editeur_id
    where e.ouvrage_id = o.id
  ), '[]'::jsonb) as editeurs_lies,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'ordre', c.ordre,
        'role', c.role_contributeur,
        'nature', c.nature_personne,
        'nom_affiche', c.nom_affiche,
        'prenom', av.prenom,
        'nom_famille', av.nom_famille,
        'titre', av.titre,
        'pseudonyme', av.pseudonyme,
        'nom_autorite', coalesce(av.nom, a.nom),
        'auteur_id', c.auteur_id
      )
      order by c.ordre, c.id
    )
    from public.ouvrage_contributeurs_scientifiques as c
    left join public.auteurs_valeur as av on av.id = c.auteur_valeur_id
    left join public.auteurs as a on a.id_auteur = c.auteur_id
    where c.ouvrage_id = o.id
  ), '[]'::jsonb) as contributeurs
from public.ouvrages_bibliographiques as o
left join public.editeurs_valeur as ev on ev.id = o.editeur_valeur_id
left join public.collections_valeur as cv on cv.id = o.collection_valeur_id
where coalesce(o.statut_editorial, '') not in ('rejete', 'exclu');

revoke all on table public.v_references_bibliographiques
  from public, anon, authenticated;
grant select on table public.v_references_bibliographiques
  to authenticated, service_role;

comment on table public.bible_editorial_bibliography_occurrences is
  'Preuves administratives des occurrences bibliographiques contextuelles ; aucune preuve source ou provenance n’est accordée à authenticated.';
comment on table public.bible_editorial_bibliography_occurrence_works is
  'Liaison brute administrative occurrence-ouvrage ; aucun SELECT authenticated direct.';
comment on table public.bible_editorial_bibliography_reader_projection is
  'Projection structurelle lecteur sans citation source, locus, provenance, metadata ni rendu composé ; synchronisée atomiquement avec les tables brutes.';
comment on view public.v_references_bibliographiques is
  'Moteur commun SECURITY INVOKER/SECURITY BARRIER ; forme contributeur historique préservée, dont titre avant pseudonyme.';
comment on view public.v_bibliography_admin_ouvrages is
  'Surface propriétaire administrative : accès effectif uniquement si public.is_admin(); adaptation applicative et tests requis.';

commit;
