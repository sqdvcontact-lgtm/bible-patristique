-- Retour arrière du réalignement de la Vulgate clémentine du 2026-09-07.
--
-- Ce que la passe a corrigé, après confrontation du texte de l'édition, de celui de la
-- TOL/AELF et de celui de Sacy (qui traduit la même Vulgate et était, lui, juste) :
--
--   · Lv 15 — la Vulgate était décalée d'un cran sur quatre versets. Son verset 20
--     (« Omnis qui tetigerit eam ») est la queue du verset 19 de l'AELF, non un verset à
--     lui : les versets 20 à 23 descendent d'un créneau, et Lv 15, 23 du canon, que la
--     Vulgate ne porte pas, cesse d'être occupé par un verset qui n'est pas le sien.
--   · Nb 20 — le verset 29 (« Illo mortuo… descendit cum Eleazaro ») appartient au
--     verset 28 du canon, dont l'AELF dit qu'il porte le dévêtement, la mort ET la
--     descente. Le verset 30 répond seul au verset 29.
--
-- ⛔ Aucun texte, aucune coordonnée native (`ch_orig`, `v_orig`, `v_orig_suffixe`) et
-- aucune borne d'empan n'a été touchée : seuls `canon_id`, `ordre_slot` et `notes`.
-- Postcheck : 10 lignes, 0 texte modifié, 0 colonne intouchable modifiée.
--
-- ⚠️ La note portée par Nb 20, 30 de la Vulgate était DEVENUE FAUSSE — elle donnait le
-- verset pour surnuméraire et sans créneau, alors qu'il en a un. Elle est remplacée, non
-- allongée : on n'allonge pas une phrase inexacte.
--
-- Sauvegarde intégrale des dix lignes : internal.backup_versets_realign_vulgate_20260907

update public.versets_v2 v
set canon_id  = b.canon_id,
    ordre_slot = b.ordre_slot,
    notes      = b.notes
from internal.backup_versets_realign_vulgate_20260907 b
where b.id = v.id;

-- Contrôle : doit rendre 0.
select count(*) as lignes_encore_differentes
from public.versets_v2 v
join internal.backup_versets_realign_vulgate_20260907 b on b.id = v.id
where (v.canon_id, v.ordre_slot, v.notes) is distinct from (b.canon_id, b.ordre_slot, b.notes);
