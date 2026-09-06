-- ⛔ RETRAIT DE L'ANCIENNE CONCORDANCE (décision de l'auteur, 2026-09-06 :
-- « Si elles sont inutiles et inutilisées, supprimer »).
--
-- La page /concordance est une redirection depuis longtemps ; la recherche du site
-- passe par les trois RPC v2 (charte § 43). Il restait en base trois tables et six
-- fonctions que RIEN ne lit — ni le dépôt, ni une vue, ni une autre fonction :
--
--   concordance_lexique_ancien  46 886 lignes  aucun lecteur du tout
--   concordance_versets             30 lignes  concordance(), recherche_concordance()
--   concordance_latina              10 lignes  concordance_latina_rpc(), recherche_concordance_la()
--
-- ⚠️ `concordance_lexique_ancien` a été présentée à l'audit comme un lexique GREC :
-- c'est faux, elle ne porte pas un caractère grec. C'est une copie désaccentuée de
-- l'ancien lexique français, dont les mots absents du lexique en service sont
-- « meme », « etre », « etait », « peche ».
--
-- ⛔ CE QUI RESTE, ET QUI SERT :
--   concordance_lexique        124 204  ← suggestions_concordance_fr (autocomplétion)
--   concordance_lexique_latin   45 483  ← suggestions_concordance_la (autocomplétion)
--   concordance_glaire           32 613  ← RIEN, mais c'est un TEXTE : la Bible de
--     Glaire, canon_id + livre + texte, et le seul exemplaire qu'en porte la base.
--     Une table sans lecteur n'est pas une table sans contenu : elle attend un
--     arbitrage éditorial, elle ne se supprime pas au balayage.
--
-- Les deux fonctions de déclencheur (`maj_concordance_versets`, `maj_concordance_latina`)
-- n'étaient rattachées à AUCUNE table : elles maintenaient depuis longtemps des caches
-- que plus personne ne remplissait — d'où les 30 et 10 lignes.
--
-- Retour en arrière : sql/rollback_retrait_ancienne_concordance_20260906.sql

-- ── Sauvegarde ───────────────────────────────────────────────────────────────
create table if not exists internal.backup_concordance_versets_20260906 as
  select * from public.concordance_versets;
create table if not exists internal.backup_concordance_latina_20260906 as
  select * from public.concordance_latina;
create table if not exists internal.backup_concordance_lexique_ancien_20260906 as
  select * from public.concordance_lexique_ancien;

-- ── Les fonctions d'abord : elles dépendent des tables ───────────────────────
drop function if exists public.concordance(text, text, text, text, integer, integer, integer);
drop function if exists public.recherche_concordance(text, text, text, integer);
drop function if exists public.maj_concordance_versets();
drop function if exists public.concordance_latina_rpc(text, text, text, integer, integer);
drop function if exists public.recherche_concordance_la(text, text, integer);
drop function if exists public.maj_concordance_latina();

-- ── Puis les tables ──────────────────────────────────────────────────────────
drop table if exists public.concordance_versets;
drop table if exists public.concordance_latina;
drop table if exists public.concordance_lexique_ancien;

-- ── Le travail périodique nommait une table qui n'existe plus ────────────────
-- ⚠️ `analyze` sur une table absente fait échouer TOUTE la commande, et un travail
-- cron qui échoue ne prévient personne (charte, sauvegardes GitHub).
select cron.alter_job(
  (select jobid from cron.job where jobname = 'analyze_hebdo'),
  command := 'analyze versets_v2; analyze versets_canon; analyze segments; analyze liens_bibliques; analyze commentaires; analyze essais;'
);

-- ── Les deux lexiques qui SERVENT ne s'écrivent pas depuis un navigateur ─────
-- ⛔ Ils portaient INSERT, UPDATE, DELETE, TRUNCATE et TRIGGER pour `authenticated` :
-- tout titulaire de compte pouvait vider par PostgREST la table qui alimente
-- l'autocomplétion de la recherche. C'est la règle de la charte sur le schéma
-- `public` comme surface d'attaque. La lecture ne bouge pas : `suggestions_concordance_fr`
-- est SECURITY DEFINER, `suggestions_concordance_la` lit sous la politique publique.
revoke insert, update, delete, truncate, references, trigger
  on public.concordance_lexique, public.concordance_lexique_latin, public.concordance_glaire
  from authenticated;

notify pgrst, 'reload schema';
