-- `traductions` tient deux choses que rien ne distinguait : les traductions de la
-- BIBLE, qui portent un texte versifié et se choisissent dans les menus de lecture,
-- et la notice bibliographique de la traduction employée pour une œuvre
-- PATRISTIQUE, à laquelle renvoient `oeuvres.trad_id` et
-- `oeuvre_textes.id_traduction`. Faute de marque, les secondes paraissaient dans les
-- sélecteurs de traduction biblique, à côté de la Sacy et de la Segond — jusque dans
-- le menu de la page d'une œuvre patristique, qui proposait la traduction même dont
-- elle affiche le texte.
--
-- ⛔ On ne les supprime pas : elles sont référencées — vingt œuvres pour la seule
-- traduction Jeannin de Jean Chrysostome, une chacune pour la Cité de Dieu, la
-- Vanité des idoles et l'Histoire ecclésiastique, plus trois notices de catalogue.
-- On les MARQUE.
--
-- ⚠️ Deux discriminants tenaient lieu de règle, et aucun ne disait ce qu'est la
-- ligne : `schema_numerotation`, sur quoi filtre la page publique des traductions,
-- et la FORME de l'identifiant dans app/lib/traductions.ts. Le premier dit si le
-- texte est monté, non ce qu'il est ; la seconde aurait cédé au premier identifiant
-- dérogeant. C'est désormais dit en clair.

begin;

alter table public.traductions
  add column if not exists est_biblique boolean not null default true;

update public.traductions set est_biblique = false
where trad_id in (
  'TR_FR_1865_JEANNIN_CHRYSOSTOME_TOMES_V_VI',
  'TR_FR_1870_1873_BARREAU_CHARPENTIER_AUGUSTIN_CIVITATE_DEI',
  'TR_FR_1837_GUILLON_QUOD_IDOLA',
  'TR_FR_1532_SEYSSEL_EUSEBE_HISTORIA_ECCLESIASTICA'
);

-- Une traduction qui n'est pas biblique ne peut pas porter de schéma de
-- numérotation : le schéma décrit une versification, et il n'y en a pas hors de la
-- Bible. L'invariant interdit la ligne incohérente plutôt que de la surveiller.
alter table public.traductions
  drop constraint if exists traductions_non_biblique_sans_schema;
alter table public.traductions
  add constraint traductions_non_biblique_sans_schema
  check (est_biblique or schema_numerotation is null);

comment on column public.traductions.est_biblique is
  'Vrai pour une traduction de la Bible — celles-là seules paraissent dans les sélecteurs de traduction. Faux pour la notice bibliographique de la traduction employée par une œuvre patristique (Jeannin pour Chrysostome, Barreau et Charpentier pour la Cité de Dieu…), à laquelle renvoient oeuvres.trad_id et oeuvre_textes.id_traduction. Ne pas confondre avec schema_numerotation, qui dit si le TEXTE est monté, ni avec type_objet, qui dit la nature philologique de l''objet (traduction, recension, édition critique).';

commit;
