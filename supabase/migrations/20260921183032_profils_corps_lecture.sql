-- LA TAILLE DU TEXTE BIBLIQUE SUIT LE LECTEUR, NON SON NAVIGATEUR.
--
-- Demande de l'auteur, 2026-09-21. Le réglage « Taille du texte » (trois crans, commit
-- 85b98299) ne vivait que dans `localStorage` (clé `cs-corps`). C'est le parti déjà pris
-- pour le THÈME DE LECTURE (`profils.theme_lecture`, 2026-08-24) : la préférence vit sur
-- le COMPTE, le stockage local n'en est que le miroir de ce poste, et lui seul répond
-- avant la première peinture. Le rapprochement se fait dans `ProvisionCompte`
-- (app/lib/contexteCompte.tsx) : le compte l'emporte, et un poste qui porte un choix que
-- le compte ignore encore le lui remonte.
--
-- Nullable : null veut dire « aucune préférence enregistrée ». Le cran normal s'écrit
-- quand le lecteur le choisit, comme `clair` pour le thème.
--
-- Droits : aucune politique nouvelle. Les quatre politiques de `profils` portent sur la
-- LIGNE (auth.uid() = id), et la colonne reçoit les mêmes droits que `theme_lecture`
-- (select, insert, update pour authenticated, rien pour anon), relus après application.
-- Les trois vues qui lisent `profils` nomment leurs colonnes et ne sont pas touchées.
alter table public.profils add column if not exists corps_lecture text;

alter table public.profils drop constraint if exists profils_corps_lecture_valeurs;
alter table public.profils add constraint profils_corps_lecture_valeurs
  check (corps_lecture is null or corps_lecture in ('petit', 'normal', 'grand'));

comment on column public.profils.corps_lecture is
  'Taille du texte biblique choisie par le compte : « petit » (15 px), « normal » (16 px), « grand » (18 px), ou null si aucune préférence enregistrée. Miroir local dans localStorage cs-corps, qui sert l''application avant peinture. Même parti que theme_lecture.';

-- RETOUR EN ARRIÈRE, sans perte pour le site (le miroir local reste) :
--   alter table public.profils drop column corps_lecture;
