-- RETOUR EN ARRIÈRE — l'arbitrage des 24 rangs contradictoires du 29 août 2026.
--
-- La normalisation des noms avait laissé 24 blocs dont le rang ÉCRIT contredisait
-- celui que portait leur nom de style, toujours d'un cran plus profond. Le nom
-- l'avait emporté par prudence — c'est lui que le rendu a toujours lu —, et les 24
-- avaient été relevés dans `internal.styles_rangs_ecartes_20260829` pour relecture.
--
-- Ils ont été arbitrés un par un, sur la preuve STRUCTURELLE : ce que le bloc couvre,
-- la portée qu'il déclare, et surtout ce que portent ses FRÈRES — les blocs de même
-- fonction, de même étendue, à la même place. ⛔ Aucun n'a été tranché à l'intuition.
--
--   ① CINQ TITRES de la Genèse, corrigés dans leur NOM.
--      « Le sujet et le but », « Plan et division », « Beauté, utilité », « Les sources
--      de la Genèse », « Commentaires » divisent l'INTRODUCTION du livre. Le
--      transcripteur les marquait T4 quand il marquait T3 « Le Divin Prélude » et les
--      dix « Livre N » du corps : il distinguait donc bien, et c'est le nom qui était
--      faux. ⚠️ Confirmé par le corpus entier : SEPT livres ont leur introduction
--      subdivisée, et les six autres — ACT, DEU, EXO, LEV, MAT, NUM — la marquaient
--      déjà `titre_sous_section`. La Genèse était seule à s'en écarter.
--      ⚠️ C'est le seul changement VISIBLE : ces cinq titres passent de T3 à T4, donc
--      du centre au fer, et d'un cran plus petit.
--
--   ② DEUX commentaires du Deutéronome, corrigés dans leur RANG (I1 → I2).
--      Le livre a quatre discours, chacun avec son `titre_partie_livre` suivi de son
--      commentaire, sur exactement la même étendue canonique. Deux de ces quatre
--      commentaires portaient I2 ; les deux autres, I1. Les frères ont tranché.
--
--   ③ QUATRE commentaires de la Genèse, corrigés dans leur RANG.
--      GEN.14.1-24 et GEN.18.1-8 couvrent une péricope et suivent un titre de péricope
--      ou de paragraphe → I5. GEN.38 et GEN.39 couvrent un chapitre entier, et un seul,
--      et déclarent la portée `chapter` → I4.
--
--   ⑬ TREIZE blocs ont été CONFIRMÉS justes, et n'ont pas bougé.
--      · Onze introductions de Matthieu, écrites I4 : elles introduisent une
--        SOUS-SECTION, mais l'échelle I n'a aucun rang pour cela — I3 couvre la section
--        ET la sous-section, par décision du registre. Le I4 écrit visait un rang qui
--        n'existe pas, et il signifie « chapitre », ce que ces blocs ne sont pas.
--      · GEN.24.62-67, écrit I6 : il suit un titre de péricope et en couvre l'étendue,
--        six versets. C'est une péricope, donc I5.
--      · GEN.28.10-35.29, écrit I4 : son JUMEAU — même nom d'origine, même étendue,
--        même place après « Section II » — porte I3.
--
-- Sauvegarde : internal.backup_styles_arbitrage_20260829 (les 24 blocs, métadonnée
-- entière, telle qu'elle était APRÈS la normalisation des noms et AVANT cet arbitrage).
-- ⛔ Pour revenir avant la normalisation elle-même, c'est l'autre fichier :
-- `sql/rollback_normalisation_styles_20260829.sql`.

begin;

update bible_editorial_body_blocks b
   set metadata = s.metadata
  from internal.backup_styles_arbitrage_20260829 s
 where s.id = b.id;

-- Contrôle : on doit retrouver les cinq titres en `titre_section_livre`, les deux
-- commentaires du Deutéronome en I1, et les quatre de la Genèse en I3.
select count(*) filter (where metadata->>'semantic_style' = 'titre_section_livre') as titres_rendus,
       count(*) filter (where metadata->>'semantic_level' = 'I1')                   as deu_en_i1,
       count(*) filter (where metadata->>'semantic_level' = 'I3')                   as gen_en_i3
  from bible_editorial_body_blocks
 where id in (select id from internal.styles_rangs_ecartes_20260829);

commit;
