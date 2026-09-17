-- LES NOTES BIBLIQUES DISENT QUI PARLE (charte § 13.21, 17 septembre 2026)
--
-- Demande de l'auteur : nommer « qui parle » dans la fenêtre d'une note biblique, comme
-- sur la page d'une œuvre. La donnée le porte déjà, et les deux vues le TAISAIENT :
--   - `metadata.editorial_role` d'une NOTE de bloc éditorial (153 notes au 17 septembre
--     2026, toutes `source_editorial_note`) ;
--   - `metadata.editorial_role` d'un BLOC de ces notes (40 blocs, dans 28 notes dont
--     tous les blocs le déclarent) ;
--   - rien encore sur les notes de verset, que les deux vues exposeront dès que la donnée
--     le posera.
--
-- ⛔ LES VUES RENDENT LA DONNÉE BRUTE, ELLES NE DÉCIDENT RIEN. La règle qui fait hériter un
-- bloc muet de la voix que sa note déclare vit dans le code (`roleDuBlocDeNote`,
-- `app/lib/noteBiblique.ts`), où elle se teste.
--
-- ⚠️ `create or replace view` efface les options d'une vue : `security_invoker` se redit
-- ici, et le contrôle le relit. La nouvelle colonne vient EN FIN de vue, la seule place
-- qu'un remplacement admette ; l'expression de `blocks` ne change que par une clé de plus.
--
-- ⚠️ Aucune vue ne dépend de celles-ci (relevé par `pg_depend` le 17 septembre 2026).

set local lock_timeout = '5s';

create or replace view public.v_bible_verse_notes
with (security_invoker = true) as
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
        'text', coalesce((b.metadata -> 'editorial_normalization') ->> 'reading_text', b.text_content),
        'rendering', b.rendering,
        'needs_review', b.needs_review,
        'editorial_role', b.metadata ->> 'editorial_role'
      ) order by b.rank
    ) filter (where b.block_id is not null),
    '[]'::jsonb
  ) as blocks,
  n.metadata ->> 'editorial_role' as editorial_role
from public.bible_verse_notes n
left join public.bible_verse_note_blocks b on b.note_id = n.id
group by n.id;

create or replace view public.v_bible_editorial_body_block_notes
with (security_invoker = true) as
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
        'text', coalesce((b.metadata -> 'editorial_normalization') ->> 'reading_text', b.text_content),
        'rendering', b.rendering,
        'needs_review', b.needs_review,
        'presentation', b.metadata -> 'presentation',
        'editorial_role', b.metadata ->> 'editorial_role'
      ) order by b.rank
    ) filter (where b.block_id is not null),
    '[]'::jsonb
  ) as blocks,
  n.metadata ->> 'editorial_role' as editorial_role
from public.bible_editorial_body_block_notes n
left join public.bible_editorial_body_block_note_blocks b on b.note_id = n.id
group by n.id;
