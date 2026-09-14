-- Retour arrière de la révision des notes éditoriales de la Polyglotte (14 septembre 2026).
--
-- La révision a réécrit ou vidé `versets_v2.notes` sur 1 921 lignes de la Bible de Sacy
-- (TR0001), de la Segond (TR0002), de la Vulgate clémentine (TR0004) et de la Septante
-- (TR0005) : 753 notes réécrites pour dire ce que le lecteur voit, 62 notes d'atelier
-- vidées, 2 notes fausses vidées (Ac 19, 40a et 40b de la Vulgate) et 1 104 notes de série
-- vidées, l'explication restant sur la première ligne de chaque chapitre. La traduction
-- moderne de la Bible du XIIIe siècle (TR0013) n'a pas été touchée.
--
-- Les lignes ont été sauvegardées entières avant écriture, avec la note d'avant, la note
-- d'après et la raison. Ce script leur rend la note d'avant, et ne touche à rien d'autre.

update public.versets_v2 v
set notes = b.notes
from internal.backup_versets_v2_notes_polyglotte_20260914 b
where v.id = b.id;

-- Contrôle : aucune ligne ne doit différer de la sauvegarde.
select count(*) as ecarts
from public.versets_v2 v
join internal.backup_versets_v2_notes_polyglotte_20260914 b on b.id = v.id
where v.notes is distinct from b.notes;
