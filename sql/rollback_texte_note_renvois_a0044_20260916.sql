-- RETOUR EN ARRIÈRE — renvois de note à note des cinq œuvres A0044
-- (migration supabase/migrations/20260916123226_texte_note_renvois_a0044_donnees.sql)
--
-- Rend à `texte_note_renvois` l'état d'avant la migration : l'unique relation posée à la main
-- le matin du 16 septembre 2026, sauvegardée dans `internal.backup_texte_note_renvois_20260916`.
-- ⚠️ La migration reste inscrite au journal : ce retour défait la DONNÉE, non l'histoire.
-- ⚠️ Le déclencheur de présence de la citation (ZR001) rejoue sur la ligne rendue : il lève si
-- le bloc source a été réécrit depuis, et alors rien n'est défait.

set local lock_timeout = '5s';

delete from public.texte_note_renvois
 where metadata->>'mission' = 'A0044|renvois-notes-stables-20260916';

insert into public.texte_note_renvois
  (source_id_texte, source_note_key, source_block_id, relation_rank,
   target_id_texte, target_note_key, source_citation, render_mode, metadata, created_at, updated_at)
select source_id_texte, source_note_key, source_block_id, relation_rank,
       target_id_texte, target_note_key, source_citation, render_mode, metadata, created_at, updated_at
  from internal.backup_texte_note_renvois_20260916;
