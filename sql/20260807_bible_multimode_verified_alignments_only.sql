-- Public canonical lookups must expose editorially verified alignments only.
-- Generic rule: no source- or translation-specific condition is introduced.

drop policy if exists bible_canonical_alignments_public_read
  on public.bible_canonical_alignments;

create policy bible_canonical_alignments_public_read
  on public.bible_canonical_alignments
  for select
  to anon, authenticated
  using (
    verification_status = 'verified'
    and exists (
      select 1
      from public.bible_editorial_segmentations x
      join public.bible_text_sources s on s.id = x.source_id
      where x.id = bible_canonical_alignments.segmentation_id
        and x.is_public
        and x.status = 'validated'
        and s.status = 'published'
    )
  );

create or replace view public.v_bible_canonical_lookup
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
join public.bible_canonical_alignments a
  on a.source_id = s.id and a.segmentation_id = g.id
left join public.bible_editorial_segments e
  on e.segmentation_id = a.segmentation_id and e.id = a.segment_id
left join public.bible_editorial_segment_sources es on es.segment_id = e.id
left join public.bible_source_units u
  on u.source_id = es.source_id and u.id = es.unit_id
where s.status = 'published'
  and g.is_public
  and g.status = 'validated'
  and a.verification_status = 'verified';

grant select on public.v_bible_canonical_lookup
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';
