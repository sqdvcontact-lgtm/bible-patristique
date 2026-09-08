-- RETOUR ARRIÈRE — l'étiquette « Référence imprimée : » retirée du texte des blocs
-- de renvoi, le 8 septembre 2026 (décision de l'auteur : « ne pas afficher le titre
-- Référence imprimée »).
--
-- ⛔ Elle nommait ce que le bloc EST, et le bloc le dit déjà par son `kind`. La
-- charte § 13.8 l'interdit : le type ne s'écrit jamais dans le texte d'une note.
--
-- ⚠️ SEULE la forme NUE a été retirée — 5 036 blocs dans 27 textes. Les formes
-- QUALIFIÉES (« Référence imprimée (latin) », « (français) », « divergente »,
-- « conservée », « (Bareille latin) ») n'ont pas bougé : elles disent de quelle
-- colonne vient la coordonnée, ou qu'elle diverge, et `kind` ne le dit pas.
--
-- Sauvegarde : internal.backup_etiquette_reference_20260908 (5 036 lignes).
-- ⚠️ La clé est (id_texte, note_key, block_id) : `block_id` SEUL n'est pas unique —
-- 492 identifiants sont portés par deux blocs, et une jointure sur lui compare
-- n'importe quoi avec n'importe quoi.

begin;

update public.texte_note_blocs b
set text = s.text
from internal.backup_etiquette_reference_20260908 s
where b.id_texte = s.id_texte
  and b.note_key = s.note_key
  and b.block_id = s.block_id;

-- Contrôle : chaque bloc a retrouvé EXACTEMENT son texte d'avant.
-- ⛔ On compare à la SAUVEGARDE, non à un motif : l'étiquette existe en deux formes
-- qui ne diffèrent que par une espace invisible, et un motif écrit à la main la
-- perd au premier copier-coller.
select count(*) as blocs_rendus_identiques
from public.texte_note_blocs b
join internal.backup_etiquette_reference_20260908 s
  on b.id_texte = s.id_texte and b.note_key = s.note_key and b.block_id = s.block_id
where b.text = s.text;

commit;
