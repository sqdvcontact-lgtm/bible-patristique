-- TR0013 — rattacher au rendu les notes textuelles qui portent sur les gloses
-- surnuméraires du témoin 899, sans modifier le canon_id persistant des notes.
--
-- La vue résout d'abord les gloses du témoin vers les lignes TR0013 par rang
-- dans chaque verset hôte. Une note reçoit ensuite une seule cible de rendu :
-- sa dernière glose. Les ancres non-glose sont admises uniquement si elles sont
-- elles aussi des MANUSCRIPT_EXTRA validés et précèdent cette dernière glose.

create or replace view public.v_bible_tr0013_gloss_note_targets
with (security_invoker = true)
as
with source_gloss as (
  select distinct
    v.segment_id,
    v.segment_key,
    v.canonical_context,
    v.alignment_order,
    split_part(v.canonical_context, '.', 1) as livre,
    split_part(v.canonical_context, '.', 2)::integer as chapitre,
    split_part(v.canonical_context, '.', 3)::integer as verset
  from public.v_bible_canonical_lookup v
  where v.trad_id = 'TR0009'
    and v.canon_id is null
    and v.alignment_status = 'MANUSCRIPT_EXTRA'
    and v.manuscript_extra = true
    and v.phenomenon = 'gloss'
    and v.canonical_context ~ '^[A-Z0-9]+[.][0-9]+[.][0-9]+$'
), source_ranked as (
  select s.*,
    count(*) over (partition by s.livre, s.chapitre, s.verset) as required,
    row_number() over (
      partition by s.livre, s.chapitre, s.verset
      order by s.alignment_order, s.segment_id
    ) as rn
  from source_gloss s
), target_all as (
  select
    v.id,
    v.livre,
    v.ch_orig,
    v.v_orig,
    v.ordre_slot,
    coalesce(v.v_orig_suffixe, '') ilike '%gloss%'
      or coalesce(v.note_structure, '') ~* 'MANUSCRIPT_EXTRA[[:space:]]*[–—-][[:space:]]*glose([[:>:]]|$)'
      as explicit_gloss
  from public.versets_v2 v
  where v.trad_id = 'TR0013'
    and v.canon_id is null
), target_stats as (
  select livre, ch_orig, v_orig,
    count(*) as total,
    count(*) filter (where explicit_gloss) as explicit_count
  from target_all
  group by livre, ch_orig, v_orig
), requirements as (
  select livre, chapitre, verset, max(required) as required
  from source_ranked
  group by livre, chapitre, verset
), selected_target as (
  select t.*
  from target_all t
  join target_stats ts
    on ts.livre = t.livre
   and ts.ch_orig = t.ch_orig
   and ts.v_orig = t.v_orig
  join requirements r
    on r.livre = t.livre
   and r.chapitre = t.ch_orig
   and r.verset = t.v_orig
  where (ts.explicit_count = r.required and t.explicit_gloss)
     or (ts.explicit_count < r.required and ts.total = r.required)
), target_ranked as (
  select t.*,
    row_number() over (
      partition by t.livre, t.ch_orig, t.v_orig
      order by t.ordre_slot, t.id
    ) as rn
  from selected_target t
), source_to_target as (
  select
    s.segment_id as source_segment_id,
    s.segment_key as source_segment_key,
    s.canonical_context,
    s.alignment_order as source_alignment_order,
    t.id as target_verse_id,
    t.ordre_slot as target_ordre_slot
  from source_ranked s
  join target_ranked t
    on t.livre = s.livre
   and t.ch_orig = s.chapitre
   and t.v_orig = s.verset
   and t.rn = s.rn
), anchor_facts as (
  select
    a.family_id,
    a.note_id,
    a.canon_id,
    a.target_segment_id,
    a.validation_status,
    ca.alignment_order as anchor_alignment_order,
    ca.alignment_status as anchor_alignment_status
  from public.bible_verse_note_anchors a
  left join lateral (
    select ca.alignment_order, ca.alignment_status
    from public.bible_canonical_alignments ca
    where ca.segment_id = a.target_segment_id
      and ca.verification_status = 'verified'
    order by ca.alignment_order, ca.id
    limit 1
  ) ca on true
), anchored as (
  select
    a.*,
    m.source_segment_id as mapped_gloss_segment_id,
    m.source_segment_key,
    m.source_alignment_order,
    m.target_verse_id,
    m.target_ordre_slot,
    max(m.source_alignment_order) over (
      partition by a.family_id, a.note_id
    ) as last_gloss_order
  from anchor_facts a
  left join source_to_target m
    on m.source_segment_id = a.target_segment_id
), safe_notes as (
  select family_id, note_id
  from anchored
  group by family_id, note_id
  having count(*) > 0
     and bool_and(validation_status = 'validated')
     and count(mapped_gloss_segment_id) > 0
     and bool_and(anchor_alignment_status = 'MANUSCRIPT_EXTRA')
     and bool_and(
       mapped_gloss_segment_id is not null
       or (
         anchor_alignment_order is not null
         and last_gloss_order is not null
         and anchor_alignment_order < last_gloss_order
       )
     )
), ranked_note_targets as (
  select
    a.family_id,
    a.note_id,
    a.canon_id as host_canon_id,
    a.target_segment_id as source_segment_id,
    a.source_segment_key,
    a.source_alignment_order,
    a.target_verse_id,
    a.target_ordre_slot,
    row_number() over (
      partition by a.family_id, a.note_id
      order by a.source_alignment_order desc, a.target_segment_id desc
    ) as rn
  from anchored a
  join safe_notes s
    on s.family_id = a.family_id
   and s.note_id = a.note_id
  where a.mapped_gloss_segment_id is not null
)
select
  family_id,
  note_id,
  host_canon_id,
  target_verse_id,
  source_segment_id,
  source_segment_key,
  source_alignment_order,
  target_ordre_slot
from ranked_note_targets
where rn = 1;

-- Les notes et leurs ancres TR0013 sont encore privées/draft : la lecture du
-- lecteur administrateur doit pouvoir suivre les ancres, sans les rendre publiques.
drop policy if exists bible_verse_note_anchors_admin_read
  on public.bible_verse_note_anchors;
create policy bible_verse_note_anchors_admin_read
  on public.bible_verse_note_anchors
  for select
  to authenticated
  using (public.is_admin());

grant select on public.v_bible_tr0013_gloss_note_targets
  to authenticated, service_role;
