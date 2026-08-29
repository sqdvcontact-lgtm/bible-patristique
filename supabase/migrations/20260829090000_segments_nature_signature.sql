-- La nature de segment `signature` : le code la promettait, la base la refusait.
--
-- Elle est déclarée dans `NATURE_VALIDES` (le vocabulaire des deux importateurs
-- génériques), dans `NATURES_CORPS` (sans quoi la page ne la chargerait pas), et
-- `OeuvreClient` la compose — au fer à droite, interligne resserré à 1,32, un blanc
-- de 0,3 rem seulement entre lignes de même nature. Mais `chk_segments_nature` ne
-- la contenait pas : toute insertion échouait, et ce rendu était du code mort.
-- Zéro segment la portait au 29 août 2026, et pour cause.
--
-- Elle sert un cas réel des éditions anciennes : le bloc d'approbations, de censeurs
-- et de souscripteurs qui ferme un volume — « Fr. Jean de Sainte-Marie, censeur. »
-- Ce n'est ni de la prose, ni une rubrique : c'est une suite de lignes courtes que
-- l'édition compose au fer à droite, serrées les unes sous les autres.
--
-- ⚠️ Ne pas la confondre avec `apparat_editeur`, qui porte le PARATEXTE de l'éditeur
-- — préface, privilège, approbation rédigée — quand `signature` n'en porte que les
-- noms et les qualités, sous leur forme de liste.

begin;

alter table public.segments
  drop constraint if exists chk_segments_nature;

alter table public.segments
  add constraint chk_segments_nature
  check (nature = any (array[
    'texte', 'citation', 'verset', 'lemme', 'vers', 'rubrique', 'dialogue',
    'signature', 'separateur', 'apparat_critique', 'apparat_auteur',
    'apparat_editeur', 'texte absent', 'introduction'
  ]));

commit;
