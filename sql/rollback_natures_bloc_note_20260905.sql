-- RETOUR ARRIÈRE de `sql/20260905_natures_bloc_note.sql` : le vocabulaire des
-- natures revient aux six valeurs d'avant le 5 septembre 2026.
--
-- ⛔ À PASSER SEULEMENT SI AUCUN BLOC NE PORTE ENCORE UNE DES DEUX NATURES NEUVES.
-- La contrainte est vérifiée à la pose : un seul bloc `source_locator` ou
-- `internal_cross_reference` fait échouer l'`alter table`, sans rien casser — mais
-- il faut alors décider ce qu'on fait de ces blocs, et cela ne se décide pas dans
-- un fichier de rollback.
--
-- Le contrôle à passer AVANT (doit rendre 0) :
--
--   select count(*) from public.texte_note_blocs
--    where kind in ('source_locator', 'internal_cross_reference');

begin;

alter table public.texte_note_blocs
  drop constraint texte_note_blocs_kind_check;

alter table public.texte_note_blocs
  add constraint texte_note_blocs_kind_check
  check (kind = any (array[
    'lemma'::text,
    'commentary'::text,
    'quotation'::text,
    'translation'::text,
    'reference'::text,
    'attribution'::text
  ]));

commit;
