-- FERMER LE RÔLE ANONYME — la porte d'à côté.
--
-- Le verrou de bêta vit dans `proxy.ts` : il renvoie tout visiteur sans session
-- vers /chantier en 307, et refuse les robots d'IA déclarés en 403. Il ne protège
-- QUE les pages. L'API de données répond sur un autre domaine
-- (<ref>.supabase.co/rest/v1) et n'a jamais vu ce verrou.
--
-- Or la clé publiable est servie, par construction, dans un bundle de /chantier —
-- la seule page ouverte sans session. Un audit du 8 septembre 2026 l'a tirée du
-- bundle et lu la base avec :
--   v_aelf_bible_search            35 480 versets, colonnes TR0001 à TR0005
--   bible_source_unit_texts       175 501 lignes de texte source
--   bible_editorial_segments       77 412 lignes de segmentation
--   rpc/bible_reading_cells_*      le texte d'un verset, SECURITY DEFINER, donc
--                                  SANS passer par la RLS
--   rpc/suggestions_concordance_fr le vocabulaire du corpus patristique et ses
--                                  fréquences, alors que `segments` est fermé
--
-- ⛔ On ne touche NI aux politiques RLS, NI aux vues. Elles disent ce qui sera
-- public à l'ouverture, et elles le disent bien : c'est une doctrine éditoriale,
-- pas un accident. On retire seulement le DROIT SOUS-JACENT au rôle `anon`, qui
-- est la traduction exacte de « le site est en test ». Une lecture de politique
-- seule induit en erreur : sans GRANT, une politique `{anon}` ne sert à rien.
--
-- ⚠️ Une vue MATÉRIALISÉE ne connaît pas la RLS. Pour `v_aelf_bible_search`,
-- `v_aelf_bible_search_extras` et `versets_plus_cites_mat`, ce `revoke` n'est pas
-- un durcissement : c'est la SEULE protection possible. Aucune ne servait au site,
-- du reste — `grep` ne les trouve nulle part dans `app/`.
--
-- Rien ne casse : aucune page serveur ne lit en anonyme (toutes passent par
-- `creerSupabaseServeur`, donc la session, ou par la clé de service), /chantier
-- n'appelle que `supabase.auth`, et /api/chiffres passe par la clé de service —
-- son propre commentaire annonçait d'ailleurs ce retrait, jamais fait.
--
-- LE JOUR DE L'OUVERTURE, on rouvre en une migration symétrique :
--   grant select on all tables in schema public to anon;
--   grant execute on all functions in schema public to anon;
-- puis on rejoue l'`alter default privileges` en `grant`.

revoke select on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Le geste qui manquait : sans cela, la prochaine table créée dans `public`
-- rouvre la porte toute seule, en silence. C'est ainsi que trois tables
-- `backup_*` s'y sont retrouvées lisibles.
alter default privileges for role postgres in schema public revoke select on tables from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
