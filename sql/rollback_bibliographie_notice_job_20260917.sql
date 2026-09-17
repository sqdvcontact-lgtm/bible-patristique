-- Retour arrière : la bibliographie de la note éditoriale des « Annotations sur le livre
-- de Job » (A0010O0100), marquée le 17 septembre 2026 dans la notation du § 5.6.1
-- (« ## Bibliographie », une ligne « + » par référence, noms en ++petites capitales++,
-- pages « p. » + insécable + tiret demi-cadratin).
--
-- La note d'avant est dans internal.backup_oeuvres_bibliographie_notice_20260917
-- (colonne `ligne`, la ligne entière en jsonb). Seule la note éditoriale est rendue :
-- le passage n'a modifié aucune autre colonne (contrôlé à l'écriture).
update oeuvres o
set note_editoriale_complement = b.ligne ->> 'note_editoriale_complement'
from internal.backup_oeuvres_bibliographie_notice_20260917 b
where o.id_oeuvre = b.id_oeuvre
  and o.id_oeuvre = 'A0010O0100';
