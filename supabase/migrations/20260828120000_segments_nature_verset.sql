-- Nouvelle nature de segment : `verset`.
--
-- Un Père cite parfois l'Écriture au long, et l'édition ne coule pas ces citations
-- dans sa prose : elle les pose VERSET PAR VERSET, chacun sur sa ligne. Aucune nature
-- ne savait le dire. `citation` fait l'inverse : sortie du texte, elle réunit tous ses
-- segments en un seul bloc coulant, pour que la segmentation technique reste invisible
-- (charte § 3.8, cinquième règle). Ici la coupure n'est pas technique, elle est VOULUE
-- par l'édition, et l'effacer serait effacer le verset.
--
-- Un segment = un verset ; la suite des segments consécutifs forme la citation. La
-- composition — retrait à gauche, corps réduit, léger blanc entre versets au lieu du
-- blanc de paragraphe — vit dans `app/lib/compositionVersets.ts`, employée par la
-- lecture et par la comparaison des traductions.
--
-- ⚠️ Ne pas confondre `verset` avec `vers` : le premier est une ligne d'Écriture citée
-- en prose, le second une ligne de poésie, et leurs compositions n'ont rien de commun
-- (alinéas poétiques lus dans la source, pas de justification ni de césure pour `vers`).

begin;

alter table public.segments
  drop constraint if exists chk_segments_nature;

alter table public.segments
  add constraint chk_segments_nature
  check (nature = any (array[
    'texte', 'citation', 'verset', 'lemme', 'vers', 'rubrique', 'dialogue',
    'separateur', 'apparat_critique', 'apparat_auteur', 'apparat_editeur',
    'texte absent', 'introduction'
  ]));

commit;
