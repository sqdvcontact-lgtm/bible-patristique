-- Le rôle `postgres` n'avait AUCUN garde-fou de session (2026-08-29).
--
-- Le 29 août 2026, une série de transactions `begin; … commit;` envoyées par le
-- connecteur MCP a échoué en cours de route (violations d'unicité, `RAISE` des
-- déclencheurs de fusion d'éditeurs, colonne ambiguë, écriture dans une colonne
-- générée). Chaque instruction partant en aller-retour séparé, une transaction qui
-- échoue reste OUVERTE, verrous compris, jusqu'à ce que quelqu'un la ferme. Personne
-- ne l'a fermée : le site est resté indisponible vingt-huit minutes.
--
-- Rien ne pouvait l'interrompre. Voici l'état des rôles avant ce jour :
--
--   anon                  statement_timeout 3 s
--   authenticated         statement_timeout 8 s
--   authenticator         statement_timeout 8 s · lock_timeout 8 s
--   service_role          statement_timeout 8 s · lock_timeout 8 s
--   supabase_auth_admin   idle_in_transaction_session_timeout 60 s
--   postgres              — RIEN —
--
-- Supabase pose lui-même un délai d'inactivité sur son propre rôle d'administration.
-- Le rôle par lequel passent le connecteur MCP, l'éditeur SQL et nos scripts n'en avait
-- aucun.
--
-- ⚠️ CE RÉGLAGE NE COUPE AUCUN TRAVAIL EN COURS. Il ne compte que le temps passé
-- INACTIF à l'intérieur d'une transaction ouverte — jamais la durée d'un ordre qui
-- s'exécute. Un import de trois heures n'est pas concerné ; une transaction oubliée
-- après une erreur l'est. Cinq minutes laissent le temps d'une reprise manuelle entre
-- deux instructions, et bornent les dégâts à cinq minutes au lieu de l'infini.
--
-- ⛔ On NE POSE PAS de `lock_timeout` sur `postgres`, sciemment. Il ferait échouer un
-- import légitime qui attend un verrou un peu longtemps, c'est-à-dire qu'il
-- déplacerait le risque sur le travail éditorial au lieu de le retirer. Le délai
-- d'inactivité, lui, ne peut rien casser qui ne soit déjà abandonné.
--
-- ⚠️ Prend effet aux NOUVELLES sessions : les connexions déjà ouvertes gardent
-- l'ancien réglage jusqu'à leur reconnexion.

begin;

alter role postgres set idle_in_transaction_session_timeout = '5min';

commit;
