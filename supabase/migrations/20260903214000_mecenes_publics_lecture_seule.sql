-- `mecenes_publics`, créée le matin même, portait INSERT, UPDATE et DELETE pour
-- `authenticated` : les droits par défaut du schéma, jamais retirés. Or c'est une
-- vue DEFINER posée sur une seule table, donc AUTO-MODIFIABLE : une écriture qui la
-- traverse s'exécute avec les droits du propriétaire (postgres), que la RLS de
-- `profils` ne borne pas. N'importe quel compte pouvait donc effacer les profils
-- des mécènes par un DELETE sur la vue. Trouvé le 2026-09-03 en auditant les essais.
--
-- Une vue de lecture ne porte pas de droit d'écriture (AGENTS.md, « Schéma public »),
-- et la règle vaut le jour même où l'on crée la vue.
revoke insert, update, delete, truncate, references, trigger
  on public.mecenes_publics from anon, authenticated;
