-- Les CHAPITRES d'un livre viennent de l'OSSATURE, non d'une table recopiée (2026-09-04)
--
-- ⛔ `NB_CHAPITRES` (app/components/NavLivres.tsx) était une table écrite à la main, et
-- elle ne portait que les 66 livres protocanoniques : tout deutérocanonique y retombait
-- sur « || 1 », c'est-à-dire UN chapitre. Le Siracide en a 51, la Sagesse 19, les deux
-- livres des Maccabées 16 et 15, Tobie 14, Judith 16, Baruch 6 : quelque 22 000 versets
-- que le volet n'offrait pas d'ouvrir. Relevé par l'auteur (« Le Siracide ne contient
-- qu'un chapitre ; c'est normal ? »).
--
-- ⚠️ Et la table avait DÉJÀ DÉRIVÉ sur ce qu'elle prétendait couvrir : Joël y valait 3
-- chapitres pour 4 dans l'ossature (le quatrième était donc inatteignable), Daniel 14
-- pour 12 (les deux derniers s'offraient et ne rendaient rien). C'est le défaut consigné
-- pour `NATURES_CORPS` et `get_niv1_texte`, pris par un troisième bout : une liste
-- recopiée finit toujours par coûter du texte au lecteur.
--
-- La vue rend le compte tel que `versets_canon` le porte. ⚠️ `chapitres` est le PLUS
-- GRAND numéro, non le nombre de valeurs distinctes : c'est ce que le volet demande pour
-- composer sa grille de 1 à N, et l'ossature est continue.
-- ⚠️ Un livre qui n'a AUCUNE ligne d'ossature n'a pas de rang ici : le volet le tient
-- alors pour non ouvrable et ne le liste pas (Esther grec, Lettre de Jérémie, les écrits
-- non canoniques encore à charger).
-- ⚠️ `security_invoker` : `versets_canon` se lit sans session, la vue ne rend donc rien
-- de plus que ce que l'appelant pouvait déjà lire.

create or replace view public.livres_canon
with (security_invoker = true) as
  select livre as code,
         max(ch_canon)::int as chapitres,
         count(*)::int      as versets
  from public.versets_canon
  group by livre;

comment on view public.livres_canon is
  'Chapitres et versets de chaque livre, tels que l''ossature canonique les porte. Source unique du nombre de chapitres offert par le volet de navigation (2026-09-04).';

grant select on public.livres_canon to anon, authenticated, service_role;

notify pgrst, 'reload schema';
