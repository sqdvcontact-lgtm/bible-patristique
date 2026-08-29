-- RETOUR EN ARRIÈRE — le resserrement de la nature `verset` du 29 août 2026.
--
-- Ce que la passe a fait, sur `TXT_A0014O0089_FR_1865_JEANNIN` (Jean Chrysostome,
-- Commentaire sur les Psaumes, Jeannin 1865, non publié) :
--
--   1. 1 097 segments sont passés de `verset` à `citation`. Ce sont les citations
--      bibliques glissées dans le FIL de la prose — 976 d'entre elles sous 200
--      signes —, que l'édition ne pose pas verset par verset. Elles se composaient
--      déjà comme de la prose : `estBlocVersets` est tout ou rien, et leur
--      paragraphe porte aussi du commentaire. Rien n'a bougé à l'écran, sinon
--      13 citations qui atteignent 400 signes et sortent désormais du fil, comme
--      la charte § 3.8 le prescrit pour toute citation longue.
--
--   2. Les 12 segments restants — psaume CVIII, 2-11 et psaume CXXVI, 1-2 — sont
--      les DEUX seules suites que l'édition pose vraiment verset par verset. Leur
--      numéro imprimé, qui vivait en tête du texte (« 2. O Dieu, ne taisez pas ma
--      louange »), est passé dans `segment_metadata.biblical_verse_number`, la
--      case faite pour lui. ⚠️ Il n'a pas été DEVINÉ : les douze forment deux
--      suites strictement croissantes, 2 à 11 puis 1 et 2, et c'est la suite qui
--      fait la preuve. Le guillemet ouvrant a été conservé à sa place.
--
-- Sauvegarde : internal.backup_verset_jeannin_20260829 (1 109 lignes, l'état
-- exact d'avant la passe).

begin;

update segments s
   set nature           = b.nature,
       segment_texte    = b.segment_texte,
       segment_metadata = b.segment_metadata
  from internal.backup_verset_jeannin_20260829 b
 where s.id = b.id;

-- Contrôle : 1 109 segments doivent redevenir `verset`, et aucun ne doit plus
-- porter la case du numéro.
select count(*) filter (where nature = 'verset')                             as versets,
       count(*) filter (where segment_metadata ? 'biblical_verse_number')    as avec_numero
  from segments
 where id_texte = 'TXT_A0014O0089_FR_1865_JEANNIN';

commit;
