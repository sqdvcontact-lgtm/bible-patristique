-- La page publique des traductions montrait toute traduction portant un schéma de
-- numérotation. Le critère était un PROXY : il dit que le texte est versifié, non
-- qu'on souhaite en publier la notice. L'auteur veut décider ligne à ligne, depuis
-- l'administration, sans avoir à vider une colonne technique pour cacher une fiche.
--
-- ⚠️ Rien à voir avec `est_privee`, qui commande la RLS et réserve la TOL/AELF : une
-- ligne invisible ici reste lisible partout ailleurs — elle garde sa place dans les
-- sélecteurs de lecture. C'est la NOTICE qu'on retire, pas le texte.

begin;

alter table public.traductions
  add column if not exists visible_public boolean not null default true;

-- Les notices patristiques ne paraissent de toute façon jamais sur cette page : on le
-- dit deux fois plutôt qu'une, pour qu'un futur relâchement du filtre `est_biblique`
-- ne les y fasse pas surgir.
update public.traductions set visible_public = false where est_biblique = false;

comment on column public.traductions.visible_public is
  'Commande l''affichage de la NOTICE sur la page publique /traductions, et rien d''autre : une ligne invisible reste lisible dans les sélecteurs de traduction. Se règle depuis l''administration. Ne pas confondre avec est_privee, qui commande la RLS.';

commit;
