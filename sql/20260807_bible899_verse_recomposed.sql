-- Vue de recomposition du texte des versets canoniques de TR0009 (Bible 899).
-- Appliquée en base le 2026-08-07 (migrations Supabase :
--   v_bible899_verse_recomposed, puis v_bible899_verse_recomposed_definer).
-- Réécrite le 2026-08-08 (migration bible899_verse_recomposed_lateral_perf) — voir
-- la note PERF plus bas. Fichier de référence versionné ; la source de vérité reste
-- la migration Supabase.
--
-- ⚡ PERF (2026-08-08) — piège du CTE référencé deux fois. La 1re version recomposait
-- le texte dans un CTE `seg_text` référencé DEUX fois (couche diplomatic + expanded) :
-- un CTE utilisé plus d'une fois est MATÉRIALISÉ par Postgres, donc `string_agg`
-- recomposait TOUT le corpus (~37 000 lignes, tri externe sur disque) à CHAQUE requête,
-- avant même le filtre livre/chapitre — ~1,2 s pour un seul chapitre, et timeout 8s
-- (statement_timeout du rôle `authenticated`) sur un livre entier (Psaumes, mode
-- « livre entier » de la Polyglotte → erreur « canceling statement due to statement
-- timeout »). Corrigé en remplaçant le CTE par une sous-requête LATERAL corrélée sur
-- `segment_id` : le texte n'est recomposé QUE pour les segments retenus par le filtre
-- (Gn 1 : 1226 ms → 12 ms ; Psaumes entiers : timeout → 113 ms). Sortie identique,
-- vérifiée ligne à ligne sur les 18 919 alignements (aucune différence de texte ni de
-- colonne). Les deux couches sont séparées par `string_agg(...) FILTER (WHERE
-- layer_code = …)`. Index déjà en place : `bible_editorial_segment_sources` sur
-- (segment_id, unit_sequence) pour la corrélation, `bible_source_unit_texts` sur
-- (source_id, unit_id) pour le join. ⛔ NE PAS revenir à un CTE référencé plusieurs
-- fois pour les deux couches — cela réintroduit la matérialisation du corpus entier.
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
  st.texte_diplomatic,
  st.texte_expanded
from public.bible_text_sources s
join public.bible_editorial_segmentations g
  on g.source_id = s.id and g.segmentation_kind = 'verse'
join public.bible_canonical_alignments a
  on a.source_id = s.id and a.segmentation_id = g.id
left join public.bible_editorial_segments e on e.id = a.segment_id
-- Recomposition du texte SEULEMENT pour le segment de l'alignement courant (corrélation
-- sur segment_id) : plus de matérialisation du corpus entier. Les deux couches sont
-- séparées par FILTER, ce qui laisse le sous-select référencé une seule fois.
left join lateral (
  select
    string_agg(
      case when es.join_before = 'space' and es.unit_sequence > 1 then ' ' else '' end
      || case
           when es.start_offset is not null
             then substring(t.text_content from es.start_offset + 1 for (es.end_offset - es.start_offset))
           else t.text_content
         end,
      '' order by es.unit_sequence
    ) filter (where t.layer_code = 'diplomatic')                                as texte_diplomatic,
    string_agg(
      case when es.join_before = 'space' and es.unit_sequence > 1 then ' ' else '' end
      || case
           when es.start_offset is not null
             then substring(t.text_content from es.start_offset + 1 for (es.end_offset - es.start_offset))
           else t.text_content
         end,
      '' order by es.unit_sequence
    ) filter (where t.layer_code = 'expanded')                                  as texte_expanded
  from public.bible_editorial_segment_sources es
  join public.bible_source_unit_texts t
    on t.source_id = es.source_id and t.unit_id = es.unit_id
  where es.segment_id = a.segment_id
) st on true
where s.status = 'published';

revoke select on public.v_bible899_verse_recomposed from anon;
grant select on public.v_bible899_verse_recomposed to authenticated;

notify pgrst, 'reload schema';
