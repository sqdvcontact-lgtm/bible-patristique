-- LA PURGE PASSE CHAQUE NUIT, COMME CELLE DE `parametres`.
--
-- La base fait déjà ce geste pour les sauvegardes déposées dans `parametres`
-- (travail `purger_sauvegardes`, chaque nuit à 3 h 20). Les tables de travail
-- d'`internal`, elles, n'avaient personne : c'est ainsi qu'on est arrivé à
-- 10 735 tables et 4 465 Mo.
--
-- ⚠️ Une règle de rétention qu'il faut penser à lancer n'est pas une règle : c'est
-- une corvée, et une corvée s'oublie. Elle se pose donc là où le reste de
-- l'entretien vit déjà, dans `cron.job`, à 3 h 25 — juste après sa sœur.
--
-- `p_max` à 2000 : on en crée entre 200 et 630 par jour aux jours chargés, et un
-- passage doit pouvoir rattraper plusieurs jours sans se traîner.

select cron.schedule(
  'purger_sauvegardes_internes',
  '25 3 * * *',
  $$select internal.purger_sauvegardes(15, 2000, false);$$
);
