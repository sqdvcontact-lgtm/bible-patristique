-- Retour en arrière : le latin des exergues redevient un segment du corps.
--
-- Passe du 8 septembre 2026, sur décision de l'auteur (« mets le latin en note ; la
-- note à la fin de la phrase, selon les règles »). Sur les dix-neuf catéchèses de
-- Cyrille de Jérusalem (A0044O0003TFR-V11), le verset latin a quitté le corps pour
-- devenir le premier bloc de la note que l'exergue français appelle, et l'appel s'est
-- placé avant la ponctuation finale (charte § 13.4).
--
-- Ce que la passe a écrit, et que ce fichier défait :
--   1. le renvoi biblique de chaque note est descendu du rang 1 au rang 2 ;
--   2. dix-neuf blocs `quotation` / `la` ont été créés (`noteblock_exergue_la_*`) ;
--   3. l'exergue français a reçu l'appel matériel avant sa ponctuation finale ;
--   4. l'ancre de chaque note a suivi l'appel sur le segment français ;
--   5. l'ancre de la note 1468 (titre de la Seizième catéchèse) a suivi la section ;
--   6. les dix-neuf segments latins ont été supprimés ;
--   7. l'appel [[38]] en double dans le segment 108, qui n'ouvrait aucune note, a été
--      retiré là où son ancre n'est pas (elle désigne le segment 109, qui le porte).
--
-- Sauvegardes :
--   internal.backup_exergue_segments_20260908  (38 lignes, les deux exergues d'avant)
--   internal.backup_exergue_ancres_20260908    (20 ancres d'avant)
--   internal.plan_exergue_latin_20260908       (le plan appliqué, ligne à ligne)
--
-- ⚠️ La nature `exergue` et sa composition ne sont pas touchées par ce retour : il rend
-- la donnée, il ne défait ni le style (charte § 7.8) ni la migration 20260908131851.

begin;

-- 2. Les blocs latins s'en vont, le renvoi biblique reprend le rang 1.
delete from texte_note_blocs where block_id like 'noteblock_exergue_la_%';

update texte_note_blocs b set rank = b.rank - 1
from internal.plan_exergue_latin_20260908 p
where b.note_key = p.note_key and b.rank > 1;

-- 3 et 7. Les textes français reprennent leur forme d'avant, l'appel [[38]] compris.
update segments s set segment_texte = b.segment_texte
from internal.backup_exergue_segments_20260908 b
where s.id = b.id;

-- 6. Les segments latins reviennent au corps.
insert into segments
select b.* from internal.backup_exergue_segments_20260908 b
where not exists (select 1 from segments s where s.id = b.id);

-- 4 et 5. Les ancres reprennent leurs coordonnées d'avant.
update texte_note_ancres a
set segment_key = b.segment_key,
    segment_numero = b.segment_numero,
    segment_offset_unicode = b.segment_offset_unicode,
    anchor_text_left = b.anchor_text_left,
    anchor_text_right = b.anchor_text_right,
    structured_block_count = b.structured_block_count
from internal.backup_exergue_ancres_20260908 b
where a.anchor_id = b.anchor_id;

commit;

-- ⚠️ `nb_signes` se recalcule après coup : select recalculer_nb_signes();

-- Contrôle : doit rendre 38, 0, 19, 38.
select
  (select count(*) from segments where id_oeuvre='A0044O0003' and nature='exergue') as exergues,
  (select count(*) from texte_note_blocs where block_id like 'noteblock_exergue_la_%') as blocs_latins,
  (select count(*) from texte_note_blocs b join internal.plan_exergue_latin_20260908 p
     on b.note_key = p.note_key where b.kind='reference' and b.rank = 1) as renvois_au_rang_1,
  (select count(*) from segments s join internal.backup_exergue_segments_20260908 b
     on s.id = b.id where s.segment_texte = b.segment_texte) as textes_rendus;
