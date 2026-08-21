alter table public.oeuvres
  add column if not exists lecture_texte_entier boolean not null default false;

comment on column public.oeuvres.lecture_texte_entier is
  'Charge et pagine le corps complet sans utiliser les niveaux 1 comme unités de lecture.';

update public.oeuvres
set lecture_texte_entier = true
where id_oeuvre = 'A0418O0003';

notify pgrst, 'reload schema';
