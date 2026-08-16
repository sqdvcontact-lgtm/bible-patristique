-- Index de couverture des clés étrangères du modèle multiversion.

create index oeuvre_textes_notice_idx
  on public.oeuvre_textes(catalogue_notice_id_ligne)
  where catalogue_notice_id_ligne is not null;

create index segments_texte_oeuvre_idx
  on public.segments(id_texte, id_oeuvre);
create index segments_texte_source_unit_idx
  on public.segments(id_texte, source_unit_id)
  where source_unit_id is not null;
create index prelevements_segment_texte_idx
  on public.prelevements(segment_id, id_texte)
  where segment_id is not null;

create index texte_groupe_membres_source_unit_idx
  on public.texte_groupe_membres(id_texte, source_unit_id);

create index texte_note_ancres_note_idx
  on public.texte_note_ancres(id_texte, note_key);
create index texte_note_ancres_segment_idx
  on public.texte_note_ancres(id_texte, segment_key);
create index texte_note_ancres_source_unit_idx
  on public.texte_note_ancres(id_texte, source_unit_id);

create index texte_note_relations_source_idx
  on public.texte_note_relations(id_texte, note_key, source_block_id);
create index texte_note_relations_target_idx
  on public.texte_note_relations(id_texte, note_key, target_block_id);

create index texte_relations_logiques_source_idx
  on public.texte_relations_logiques(id_texte, source_segment_key);
create index texte_relations_logiques_target_idx
  on public.texte_relations_logiques(id_texte, target_segment_key);
create index texte_relations_logiques_unit_idx
  on public.texte_relations_logiques(id_texte, target_unit_id);
