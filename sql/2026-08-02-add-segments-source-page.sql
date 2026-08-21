alter table public.segments
  add column if not exists page integer;

comment on column public.segments.page is
  'Page de l’édition source où commence le segment ; un changement de page ne crée pas de segment.';

alter table public.segments
  add constraint segments_page_positive_check
  check (page is null or page > 0) not valid;

alter table public.segments
  validate constraint segments_page_positive_check;
