-- Vue de recomposition du texte des versets canoniques de TR0009 (Bible 899).
-- Appliquée en base le 2026-08-07 (migrations Supabase :
--   v_bible899_verse_recomposed, puis v_bible899_verse_recomposed_definer).
-- Fichier de référence versionné ; la source de vérité reste la migration Supabase.
--
-- Rôle : alimenter les pages Bible (mode « Versets ») et Polyglotte avec le texte
-- des versets canoniques de TR0009, recomposé EN DIRECT des tables éditoriales
-- Bible 899 (offsets Unicode + join_before), aligné sur `canon_id`. Aucune copie
-- vers versets_v2 : toute nouvelle passe d'alignement importée apparaît d'elle-même.
--
-- SECURITY DEFINER (security_invoker = false) VOULU : les RLS des tables de base
-- filtrent is_public / status='validated' / verification_status='verified'. Les
-- segmentations « verse » de TR0009 sont NON PUBLIQUES (Ruth/1 Samuel… ; 1 Samuel
-- en `draft`). Le site étant privé, on doit les afficher : la vue contourne donc le
-- RLS et n'est accordée qu'à `authenticated` (l'anonyme reste bloqué par le proxy).
-- ⛔ NE PAS repasser en security_invoker : la vue se viderait pour TR0009.
--
-- Une ligne = un alignement. `canon_id` NULL => MANUSCRIPT_EXTRA (rubrique propre au
-- manuscrit : incipit/explicit/argument) — à NE JAMAIS présenter comme un verset
-- canonique. Statuts exposés : verification_status (verified/review), alignment_status
-- (MATCH/OFFSET/UNCERTAIN/CANONICAL_GAP/MANUSCRIPT_EXTRA).

create or replace view public.v_bible899_verse_recomposed
with (security_invoker = false) as
with seg_text as (
  select
    es.segment_id,
    t.layer_code,
    string_agg(
      case when es.join_before = 'space' and es.unit_sequence > 1 then ' ' else '' end
      || case
           when es.start_offset is not null
             then substring(t.text_content from es.start_offset + 1 for (es.end_offset - es.start_offset))
           else t.text_content
         end,
      '' order by es.unit_sequence
    ) as texte
  from public.bible_editorial_segment_sources es
  join public.bible_source_unit_texts t
    on t.source_id = es.source_id and t.unit_id = es.unit_id
  group by es.segment_id, t.layer_code
)
select
  s.trad_id,
  s.id                                                                          as source_id,
  g.id                                                                          as segmentation_id,
  g.segmentation_code,
  g.status                                                                      as segmentation_status,
  g.is_public                                                                   as segmentation_public,
  a.id                                                                          as alignment_id,
  a.alignment_order,
  a.canon_id,
  a.canon_id_fin,
  case when a.canon_id is not null then split_part(a.canon_id, '.', 1) end       as livre,
  case when a.canon_id is not null then nullif(split_part(a.canon_id, '.', 2), '')::int end as chapitre,
  case when a.canon_id is not null then nullif(split_part(a.canon_id, '.', 3), '')::int end as verset,
  a.alignment_status,
  a.verification_status,
  a.confidence,
  e.segment_key,
  sd.texte                                                                      as texte_diplomatic,
  se.texte                                                                      as texte_expanded
from public.bible_text_sources s
join public.bible_editorial_segmentations g
  on g.source_id = s.id and g.segmentation_kind = 'verse'
join public.bible_canonical_alignments a
  on a.source_id = s.id and a.segmentation_id = g.id
left join public.bible_editorial_segments e on e.id = a.segment_id
left join seg_text sd on sd.segment_id = a.segment_id and sd.layer_code = 'diplomatic'
left join seg_text se on se.segment_id = a.segment_id and se.layer_code = 'expanded'
where s.status = 'published';

revoke select on public.v_bible899_verse_recomposed from anon;
grant select on public.v_bible899_verse_recomposed to authenticated;

notify pgrst, 'reload schema';
