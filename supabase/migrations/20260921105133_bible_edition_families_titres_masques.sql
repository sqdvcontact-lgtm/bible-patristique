-- Rangs de titre qu'une édition biblique ne rend pas (réglage d'administration,
-- demande de l'auteur du 2026-09-21 : « trop de niveaux de titre dans la Fillion »).
-- null = tous les rangs rendus. La page lit la colonne sous la RLS du lecteur ;
-- l'écriture passe par /api/admin/bible-titres-masques, clé de service.
set local lock_timeout = '5s';
alter table public.bible_edition_families
  add column if not exists titres_masques text[] default null;
alter table public.bible_edition_families
  add constraint bible_edition_families_titres_masques_forme
  check (titres_masques is null or titres_masques <@ array['T1','T2','T3','T4','T5','T6']::text[]);
comment on column public.bible_edition_families.titres_masques is
  'Rangs de titre (T1-T6) que la page Bible ne rend pas pour cette édition. Réglage d''administration ; null = tous rendus.';
