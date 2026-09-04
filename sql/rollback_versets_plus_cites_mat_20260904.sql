-- Retour en arrière de la migration 20260904200000_versets_plus_cites_materialise.
--
-- ⚠️ Elle n'a RIEN modifié : elle a posé un instantané à côté de la vue, qui demeure
-- telle quelle. Retirer l'instantané rend donc la page à son état d'avant — celui où
-- la requête dépassait les huit secondes du rôle et où le classement paraissait vide.
-- ⛔ La page doit repointer sur `versets_plus_cites` dans le même souffle, sinon elle
-- interroge une vue qui n'existe plus.

begin;

drop function if exists public.rafraichir_versets_plus_cites();
drop materialized view if exists public.versets_plus_cites_mat;

delete from supabase_migrations.schema_migrations where version = '20260904200000';

commit;
