-- LES CLÉS ÉTRANGÈRES SANS INDEX DE LA COUCHE BIBLE.
--
-- Trente contraintes de clé étrangère n'avaient aucun index en tête de leurs
-- colonnes. Deux conséquences, l'une visible et l'autre pas :
--   • à la LECTURE : les politiques RLS de cette couche ne sont pas de simples
--     comparaisons, ce sont des `exists (… join …)` sur family_id, member_source_id
--     et source_id. Sans index, chaque ligne rendue paye un parcours.
--   • à l'ÉCRITURE : toute suppression dans la table PARENTE doit vérifier qu'aucun
--     enfant ne s'y accroche, et sans index c'est un parcours complet de l'enfant.
--
-- ⚠️ Un index n'est jamais gratuit : il se maintient à chaque insertion. On ne les
-- pose ici que parce que les tables sont petites (41 Mo pour la plus grosse, moins
-- de 2 Mo pour la plupart) et que leurs écritures sont des imports occasionnels,
-- quand leurs lectures sont à chaque page servie. Le compromis serait inverse sur
-- `segments`, et on ne le fait donc pas là-bas.

create index if not exists idx_beb_blocks_canon_end        on public.bible_editorial_body_blocks (canon_id_end);
create index if not exists idx_beb_blocks_canon_start      on public.bible_editorial_body_blocks (canon_id_start);
create index if not exists idx_beb_blocks_fam_applies      on public.bible_editorial_body_blocks (family_id, applies_to_member_id);
create index if not exists idx_beb_blocks_fam_memsrc_src   on public.bible_editorial_body_blocks (family_id, member_source_id, source_id);
create index if not exists idx_beb_blocks_src_segmentation on public.bible_editorial_body_blocks (source_id, segmentation_id);

create index if not exists idx_bvn_canon                   on public.bible_verse_notes (canon_id);
create index if not exists idx_bvn_fam_applies             on public.bible_verse_notes (family_id, applies_to_member_id);
create index if not exists idx_bvn_fam_memsrc_src          on public.bible_verse_notes (family_id, member_source_id, source_id);

create index if not exists idx_bea_canon_start             on public.bible_edition_assets (canon_id_start);
create index if not exists idx_bea_canon_end               on public.bible_edition_assets (canon_id_end);
create index if not exists idx_bea_fam_note                on public.bible_edition_assets (family_id, note_id);
create index if not exists idx_bea_fam_applies             on public.bible_edition_assets (family_id, applies_to_member_id);
create index if not exists idx_bea_fam_body_block          on public.bible_edition_assets (family_id, body_block_id);
create index if not exists idx_bea_fam_memsrc_src          on public.bible_edition_assets (family_id, member_source_id, source_id);
create index if not exists idx_bea_src_provenance          on public.bible_edition_assets (source_id, provenance_id);

create index if not exists idx_bebbn_fam_body_block        on public.bible_editorial_body_block_notes (family_id, body_block_id);

create index if not exists idx_bems_canon_start            on public.bible_edition_member_sources (canon_id_start);
create index if not exists idx_bems_canon_end              on public.bible_edition_member_sources (canon_id_end);
create index if not exists idx_bems_src_trad               on public.bible_edition_member_sources (source_id, trad_id);
create index if not exists idx_bems_fam_component          on public.bible_edition_member_sources (family_id, component_id);
create index if not exists idx_bems_fam_member_trad        on public.bible_edition_member_sources (family_id, member_id, trad_id);

create index if not exists idx_bvna_fam_note_canon         on public.bible_verse_note_anchors (family_id, note_id, canon_id);
create index if not exists idx_bvna_fam_target_member      on public.bible_verse_note_anchors (family_id, target_member_id);
create index if not exists idx_bvna_target_src_seg         on public.bible_verse_note_anchors (target_source_id, target_segmentation_id);

create index if not exists idx_bebe_source_body_block      on public.bible_editorial_bibliography_entries (source_body_block_id);
create index if not exists idx_bebe_ouvrage                on public.bible_editorial_bibliography_entries (ouvrage_id);

create index if not exists idx_bss_alias_de                on public.bible_styles_semantiques (alias_de);

create index if not exists idx_bvnr_note_target_block      on public.bible_verse_note_relations (note_id, target_block_id);
create index if not exists idx_bvnr_note_source_block      on public.bible_verse_note_relations (note_id, source_block_id);

create index if not exists idx_polyglotte_notes_aelf       on public.polyglotte_notes (aelf_version_id, aelf_entry_id);
