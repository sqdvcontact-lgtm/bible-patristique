-- Rétablit la politique d'avant le 31 août 2026, exigence de « test_only » comprise.
drop policy if exists bible_canonical_alignments_public_read on public.bible_canonical_alignments;
create policy bible_canonical_alignments_public_read
on public.bible_canonical_alignments for select
using (
  exists (
    select 1
    from public.bible_editorial_segmentations x
    join public.bible_text_sources s on s.id = x.source_id
    where x.id = bible_canonical_alignments.segmentation_id
      and x.is_public and x.status = 'validated' and s.status = 'published'
      and (
        bible_canonical_alignments.verification_status = 'verified'
        or (
          bible_canonical_alignments.verification_status = 'review'
          and s.trad_id = any (array['TR0010', 'TR0011'])
          and coalesce(s.metadata ->> 'test_only', 'false') = 'true'
          and coalesce(s.metadata ->> 'technical_publication_override', 'false') = 'true'
          and coalesce(s.metadata ->> 'editorial_validation_claimed', 'false') = 'false'
        )
      )
  )
);
