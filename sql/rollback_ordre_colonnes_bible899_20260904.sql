-- Retour en arrière : l'ordre des colonnes de la famille « bible899-critical-modern-v1 ».
--
-- Le 4 septembre 2026, sur décision de l'auteur (« sur le Français – Ancien français : le
-- français doit toujours être à gauche »), la traduction moderne (TR0013) est passée à
-- gauche et le témoin (TR0009) à droite, comme chez Fillion, dont le français ouvre la
-- page en regard depuis le 20 août.
--
-- ⚠️ `display_order` et `mobile_order` sont sous contrainte d'unicité par famille : on
-- passe par un rang temporaire, sinon la première écriture heurte la seconde.
-- État d'avant conservé : internal.backup_bible_edition_members_20260904.

begin;

update bible_edition_members set display_order = 90, mobile_order = 90, desktop_position = 'auto'
where trad_id = 'TR0013'
  and family_id = (select id from bible_edition_families where family_code = 'bible899-critical-modern-v1');

update bible_edition_members set display_order = 1, mobile_order = 1, desktop_position = 'left'
where trad_id = 'TR0009'
  and family_id = (select id from bible_edition_families where family_code = 'bible899-critical-modern-v1');

update bible_edition_members set display_order = 2, mobile_order = 2, desktop_position = 'right'
where trad_id = 'TR0013'
  and family_id = (select id from bible_edition_families where family_code = 'bible899-critical-modern-v1');

commit;
