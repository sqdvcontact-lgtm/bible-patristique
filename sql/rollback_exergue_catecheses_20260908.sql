-- Retour en arrière : les trente-huit exergues des Catéchèses baptismales de Cyrille
-- de Jérusalem (A0044O0003) redeviennent des `lemme`.
--
-- Passe du 8 septembre 2026, sur décision de l'auteur : les dix-neuf catéchèses ouvrent
-- toutes sur un verset latin suivi de sa traduction, c'est-à-dire sur un EXERGUE, non
-- sur le lemme d'un commentaire. Les 220 autres `lemme` du corpus — les commentaires de
-- Jérôme sur Jonas, Joël et Abdias — n'ont pas été touchés : là, le lemme EST la phrase
-- que le commentaire explique, phrase à phrase.
--
-- Sauvegarde : internal.backup_segments_exergue_20260908 (38 lignes, l'état d'avant).
-- Postcheck de la passe : 0 colonne autre que `nature` modifiée.
--
-- ⚠️ La nature `exergue` reste au vocabulaire (migration 20260908131851) : ce retour
-- rend la donnée, il ne défait pas le style.

update segments s
set nature = b.nature
from internal.backup_segments_exergue_20260908 b
where s.id = b.id and s.nature = 'exergue';

-- Contrôle : doit rendre 38, 0.
select
  (select count(*) from segments where id_oeuvre = 'A0044O0003' and nature = 'lemme') as rendus,
  (select count(*) from segments where nature = 'exergue') as exergues_restants;
