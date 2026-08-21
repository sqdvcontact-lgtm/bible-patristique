alter table public.oeuvres_personnelles_segments
  add column if not exists ref_niv1 text,
  add column if not exists ref_niv2 text,
  add column if not exists ref_niv3 text,
  add column if not exists ref_niv4 text,
  add column if not exists nature text not null default 'texte';
