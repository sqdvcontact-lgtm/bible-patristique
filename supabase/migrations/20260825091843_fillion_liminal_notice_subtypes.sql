-- Étend le vocabulaire des notices sans modifier les trois axes éditoriaux
-- normalisés (nature, portée, position). Les catégories ajoutées décrivent la
-- matière des liminaires Fillion : elles ne créent ni nouvelle table ni
-- nouvelle revendication de validation éditoriale.

begin;

alter table public.bible_editorial_body_blocks
  drop constraint bible_editorial_body_blocks_notice_subtype_vocabulary;

alter table public.bible_editorial_body_blocks
  add constraint bible_editorial_body_blocks_notice_subtype_vocabulary
  check (notice_subtype is null or notice_subtype in (
    'historical',
    'geographical',
    'literary',
    'doctrinal',
    'chronological',
    'liturgical',
    'critical_apparatus',
    'bibliography',
    'sigla',
    'transcription_table',
    'editorial_matter',
    'other'
  )) not valid;

alter table public.bible_editorial_body_blocks
  validate constraint bible_editorial_body_blocks_notice_subtype_vocabulary;

comment on column public.bible_editorial_body_blocks.notice_subtype is
  'Sous-type facultatif d une notice : catégorie matérielle distincte de sa nature, de sa portée et de sa position.';

notify pgrst, 'reload schema';

commit;
