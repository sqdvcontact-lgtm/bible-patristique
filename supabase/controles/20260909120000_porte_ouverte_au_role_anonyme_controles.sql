-- CONTRÔLES DE LA PORTE OUVERTE AU RÔLE ANONYME
--
-- ⛔ À jouer APRÈS la migration, et depuis la place d'un ANONYME — jamais depuis le
-- compte de l'auteur, qui est administrateur et ne voit jamais rien manquer. C'est la
-- règle du dépôt : un chemin de lecture qui passe par la session du visiteur s'ÉPROUVE
-- depuis sa place.
--
-- ⚠️ Une lecture refusée par une POLITIQUE rend zéro ligne, sans erreur ; une lecture
-- refusée par un GRANT lève 42501. Les deux se confondent à l'œil et pas ici : le
-- contrôle 1 attend des LIGNES, le contrôle 4 attend une ERREUR.

begin;

set local role anon;

-- 1. La porte porte ses deux blocs. Les comptes sont ceux du 2026-09-09 : 42 œuvres
--    offertes, 1 co-signature (Rufin d'Aquilée sur l'Histoire ecclésiastique).
select 'oeuvres offertes' as controle, count(*) as n, 42 as attendu
from public.oeuvres where acces_public;

select 'co-signatures visibles' as controle, count(*) as n, 1 as attendu
from public.oeuvres_auteurs;

-- 2. L'embed de l'auteur répond : c'est lui qui nourrit la galerie des noms.
select 'galerie des auteurs' as controle, count(distinct a.id_auteur) as n
from public.oeuvres o join public.auteurs a on a.id_auteur = o.id_auteur
where o.acces_public;

-- 3. ⛔ CE QUI DOIT RESTER FERMÉ. Une œuvre retenue ne se lit pas, et la politique le
--    dit sans lever : zéro ligne attendu.
select 'oeuvres retenues (doit valoir 0)' as controle, count(*) as n
from public.oeuvres where not acces_public;

commit;

-- 4. ⛔ LA PROSE D'ATELIER RESTE HORS D'ATTEINTE. Ces trois lectures DOIVENT lever
--    « permission denied for column » (42501). Les jouer UNE PAR UNE : la première qui
--    lève interrompt le lot, et l'on ne saurait rien des suivantes.
--
--    begin; set local role anon;
--      select acces_public_note from public.oeuvres limit 1;            -- attendu : 42501
--    rollback;
--
--    begin; set local role anon;
--      select note_editoriale_complement from public.oeuvres limit 1;   -- attendu : 42501
--    rollback;
--
--    begin; set local role anon;
--      select * from public.oeuvres limit 1;                            -- attendu : 42501
--    rollback;
--
-- ⚠️ Le troisième est le plus important : il atteste que le grant est bien COLONNE PAR
-- COLONNE, et non une ouverture de table qu'on aurait crue étroite.
