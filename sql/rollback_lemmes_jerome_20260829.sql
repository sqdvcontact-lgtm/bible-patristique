-- RETOUR EN ARRIÈRE — les 21 lemmes de Jérôme marqués le 29 août 2026.
--
-- L'audit des natures a relevé que le *Commentaire sur Jonas* marque ses 47 lemmes
-- — le verset biblique posé en tête du paragraphe qu'il commente — tandis que le
-- *Commentaire sur Joël* et le *Commentaire sur Abdias*, du même auteur, dans la même
-- édition (Bareille 1879) et du même genre, n'en marquent aucun.
--
-- ⚠️ Le partage n'est pas net des deux côtés, et seule la moitié était marquable :
--
--   · 21 segments portent le lemme SEUL — ils ouvrent sur un guillemet, se ferment
--     sur le guillemet fermant (suivi au plus de la référence imprimée), tiennent le
--     rang 1 de leur paragraphe, et sont suivis du commentaire dans ce paragraphe.
--     C'est exactement la forme des 45 lemmes purs du Jonas. Ceux-là sont marqués.
--
--   · 21 autres (Joël 13, Abdias 8) portent le lemme COLLÉ à son commentaire dans un
--     seul segment — « Vision d'Abdias. » Les Hébreux prétendent que ce Prophète… Les
--     marquer `lemme` ferait passer pour un lemme une moitié de commentaire : il leur
--     faut une RE-SEGMENTATION, qui est un travail de transcription.
--
-- ⛔ Rien ne bouge à l'écran. `lemme` n'a pas de composition propre — un lemme se lit
-- au fil du texte, décision de l'auteur du 20 août 2026 — et aucun des 21 n'atteint
-- les 400 signes à partir desquels une citation quitterait le fil.
--
-- Sauvegarde : internal.backup_lemmes_jerome_20260829.

begin;

update segments s
   set nature = b.nature
  from internal.backup_lemmes_jerome_20260829 b
 where b.id = s.id;

-- Contrôle : le Joël et l'Abdias doivent retomber à zéro lemme, le Jonas garder ses 47.
select ot.id_texte, count(*) filter (where s.nature = 'lemme') as lemmes
  from segments s
  join oeuvre_textes ot on ot.id_texte = s.id_texte
 where s.id_texte in ('TXT_A0051O0022_FR_1879_BAREILLE',
                      'TXT_A0051O0043_FR_1879_BAREILLE',
                      'TXT_A0051O0045_FR_1879_BAREILLE')
 group by 1 order by 1;

commit;
