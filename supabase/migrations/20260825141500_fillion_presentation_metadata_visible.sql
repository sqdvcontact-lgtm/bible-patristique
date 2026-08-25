-- Rend lisibles au rendu les métadonnées de présentation que la donnée
-- éditoriale porte déjà. Rien n'est calculé ni deviné ici : les deux vues se
-- contentent d'exposer `metadata -> 'presentation'` et `semantic_parent_key`,
-- restés jusqu'ici invisibles au site alors que la reprise éditoriale de
-- Matthieu s'appuie sur eux.
--
-- ⛔ Aucune donnée n'est modifiée, aucun droit n'est élargi : les deux vues
-- restent en `security_invoker`, et `create or replace` conserve leurs grants.

begin;

create or replace view public.v_bible_editorial_body_blocks
with (security_invoker = true) as
 SELECT b.id,
    b.family_id,
    b.member_source_id,
    b.source_id,
    b.segmentation_id,
    b.segment_id,
    b.block_key,
    b.block_kind,
    b.scope_kind,
    b.placement,
    b.applies_to,
    b.applies_to_member_id,
    b.heading,
    b.scope_book_code,
    b.scope_label,
    b.canon_id_start,
    b.canon_id_end,
    b.native_scope,
    b.printed_reference,
    b.printed_page_start,
    b.printed_page_end,
    b.material_order,
    b.classification_confidence,
    b.requires_review,
    b.validation_status,
    b.is_public,
    b.created_at,
    b.updated_at,
    b.notice_subtype,
    canon_start.ordre AS canon_order_start,
    COALESCE(canon_end.ordre, canon_start.ordre) AS canon_order_end,
    COALESCE(b.metadata ->> 'semantic_style'::text, (
        CASE b.block_kind
            WHEN 'title'::text THEN 'titre'::text
            WHEN 'commentary'::text THEN 'commentaire'::text
            WHEN 'summary'::text THEN 'sommaire'::text
            ELSE b.block_kind
        END || '_'::text) ||
        CASE b.scope_kind
            WHEN 'book_group'::text THEN 'groupe_livres'::text
            WHEN 'book'::text THEN 'livre'::text
            WHEN 'book_part'::text THEN 'partie'::text
            WHEN 'chapter'::text THEN 'chapitre'::text
            ELSE b.scope_kind
        END) AS semantic_style_code,
    b.metadata ->> 'semantic_axis'::text AS semantic_axis,
    b.metadata ->> 'semantic_level'::text AS semantic_level,
    b.metadata ->> 'embedded_title_level'::text AS embedded_title_level,
    COALESCE((b.metadata ->> 'include_in_outline'::text)::boolean, false) AS include_in_outline,
    b.metadata ->> 'collation_status'::text AS collation_status,
    COALESCE((b.metadata ->> 'editorial_validation_claimed'::text)::boolean, false) AS editorial_validation_claimed,
    COALESCE((b.metadata ->> 'technical_publication_override'::text)::boolean, false) AS technical_publication_override,
    b.metadata -> 'presentation'::text AS presentation,
    b.metadata ->> 'semantic_parent_key'::text AS semantic_parent_key
   FROM bible_editorial_body_blocks b
     LEFT JOIN versets_canon canon_start ON canon_start.id = b.canon_id_start
     LEFT JOIN versets_canon canon_end ON canon_end.id = b.canon_id_end;

create or replace view public.v_bible_editorial_body_block_notes
with (security_invoker = true) as
 SELECT n.id,
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
    COALESCE(jsonb_agg(jsonb_build_object(
        'block_id', b.block_id,
        'rank', b.rank,
        'kind', b.kind,
        'form', b.form,
        'language', b.language,
        'text', b.text_content,
        'rendering', b.rendering,
        'needs_review', b.needs_review,
        'presentation', b.metadata -> 'presentation'
      ) ORDER BY b.rank) FILTER (WHERE b.block_id IS NOT NULL), '[]'::jsonb) AS blocks
   FROM bible_editorial_body_block_notes n
     LEFT JOIN bible_editorial_body_block_note_blocks b ON b.note_id = n.id
  GROUP BY n.id;

comment on view public.v_bible_editorial_body_blocks is
  'Blocs de corps d une edition biblique, avec leur style semantique derive, leur presentation declaree et leur parent semantique.';

notify pgrst, 'reload schema';

commit;
