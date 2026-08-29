-- L'ANALYZE hebdomadaire échouait en silence depuis cinq semaines (2026-08-29).
--
-- Le travail cron n° 2 (`analyze_hebdo`, lundi 4 h) commençait par `analyze versets;`.
-- La table `versets` a été remplacée par `versets_v2` ; elle n'existe plus. Le premier
-- ordre échouant, TOUTE la commande s'arrêtait là :
--
--   2026-07-20  succeeded
--   2026-07-27  failed — relation "versets" does not exist
--   2026-08-03  failed
--   2026-08-10  failed
--   2026-08-17  failed
--   2026-08-24  failed
--
-- ⚠️ Ce n'est pas une ligne de journal sans conséquence. `segments`,
-- `concordance_versets`, `commentaires` et `essais` n'ont pas vu passer un `ANALYZE`
-- depuis le 20 juillet : le planificateur travaille sur des statistiques vieilles de
-- cinq semaines, sur des tables qui, elles, ont beaucoup bougé. Des plans mal choisis
-- s'expliquent d'abord par là. `segments` porte 3 154 lignes mortes et
-- `bible_translation_spine_mappings` 40 364 — l'autovacuum passe, mais rien ne
-- rafraîchit les statistiques des tables qu'il ne juge pas prioritaires.
--
-- ⛔ Un travail cron qui échoue ne se voit NULLE PART : ni à l'écran, ni dans le
-- dépôt, ni dans une alerte. Il faut aller lire `cron.job_run_details`, ce que
-- personne ne fait spontanément. La règle est donc de relire ce journal après toute
-- migration qui supprime ou renomme une table.
--
-- `versets_v2` prend la place de `versets`, et l'on ajoute les tables devenues
-- centrales depuis : `versets_canon`, que lit `versets_lecture`, et `liens_bibliques`,
-- que lit chaque division d'une œuvre.

begin;

select cron.alter_job(
  job_id  := (select jobid from cron.job where jobname = 'analyze_hebdo'),
  command := 'analyze versets_v2; analyze versets_canon; analyze segments; analyze liens_bibliques; analyze concordance_versets; analyze commentaires; analyze essais;'
);

commit;
