-- La vue v_bible_tr0013_gloss_note_targets cherche, pour chaque ancre de note,
-- le premier alignement d'un segment par segment_id seul. Les index existants
-- commencent tous par segmentation_id : chaque recherche parcourait l'index
-- entier (46 s pour la vue, contre 1,3 s avec cet index, mesuré le 2026-09-21).
create index if not exists bible_canonical_alignments_segment_id_idx
  on public.bible_canonical_alignments (segment_id, alignment_order, id);
