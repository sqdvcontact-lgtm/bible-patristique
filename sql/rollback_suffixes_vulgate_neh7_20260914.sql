-- Retour arrière de la correction du 14 septembre 2026 : Vulgate clémentine (TR0004),
-- Néhémie 7, 44 et 7, 48.
--
-- La correction a retiré les suffixes « a » et « b » que l'import avait inventés pour
-- distinguer les deux fragments de chacun de ces versets, scindés entre deux créneaux du
-- canon. La charte l'interdit : un fragment garde exactement les coordonnées natives du
-- verset dont il vient, et seul l'alignement varie (AGENTS.md, « Numérotation native des
-- éditions »). Quatre lignes, sauvegardées entières avant écriture.
--
-- Ce script leur rend les suffixes d'avant, et ne touche à rien d'autre.

update public.versets_v2 v
set v_orig_suffixe = b.v_orig_suffixe
from internal.backup_versets_v2_suffixes_neh7_20260914 b
where v.id = b.id;

-- Contrôle : quatre lignes, suffixes rendus.
select v.id, v.canon_id, v.ch_orig, v.v_orig, v.v_orig_suffixe
from public.versets_v2 v
join internal.backup_versets_v2_suffixes_neh7_20260914 b on b.id = v.id
order by v.canon_id;
