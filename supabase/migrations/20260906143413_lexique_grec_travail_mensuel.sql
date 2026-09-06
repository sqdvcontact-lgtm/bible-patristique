-- Le lexique grec se refait tous les mois, comme le français (travail lexique_mensuel,
-- « 0 4 1 * * »). ⚠️ Dix minutes plus tard, pour que les deux ne se disputent pas le
-- corpus : le français parcourt versets_lecture et segments, le grec aussi.
-- ⛔ Douze exécutions par an, sur un corpus qui bouge par lots : c'est le cas où un
-- travail périodique se justifie, à la différence du rafraîchissement d'une vue
-- matérialisée à la minute (charte, cron n° 4).
select cron.schedule('lexique_grec_mensuel', '10 4 1 * *', 'select public.rafraichir_lexique_grec();');

-- La candidate qui a servi à éprouver la normalisation ne survit pas à son épreuve.
drop function if exists internal.norm_fr_candidat(text);
