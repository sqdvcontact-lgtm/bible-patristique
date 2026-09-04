-- ⛔ UNE NOTICE D'ÉDITION SE LIT SANS CONNAÎTRE LA BASE (2026-09-04)
--
-- Demande de l'auteur, devant la fiche « En savoir plus sur cette traduction » de la
-- Segond : « Nom divin rendu "l'Éternel". Numérotation hébraïque/protestante (alignée
-- sur versets_canon via ch_heb/v_heb). 66 livres (sans deutérocanoniques). Texte aligné
-- verset par verset sur le vref eBible. » — « C'est en partie illisible pour un lecteur
-- lambda. Hiérarchiser, corriger tout ça. »
--
-- ⛔ CE QUI SORT : les noms d'objets internes (versets_canon, ch_heb/v_heb, le « vref
-- eBible », les « codes techniques dans la base », la balise <i>), et les JOURNAUX DE
-- TRAVAIL — les comptes d'alignement de la Vulgate, la décision datée et le renvoi à la
-- charte de la Septante. Un lecteur ne peut rien en faire, et l'atelier les garde
-- ailleurs.
--
-- ⚠️ CE QUI RESTE, INTÉGRALEMENT : chaque fait éditorial est conservé, y compris les
-- deux recensions de Daniel, Suzanne et Bel, la lacune de l'Ecclésiaste et son motif,
-- les italiques de Sacy relevées sur le fac-similé, et les versets qui restent hors du
-- découpage canonique. On a réécrit la formulation, jamais le fond.
--
-- ⚠️ HIÉRARCHISÉ : le fait le plus utile au lecteur ouvre la notice — la lacune, pour
-- la Septante — et l'ordre suit l'importance, non l'ordre où l'import les a rencontrés.
--
-- ⛔ CE QU'UNE RANGÉE DIT DÉJÀ N'EST PAS REDIT : la Segond annonçait sa numérotation
-- hébraïque juste sous la rangée « Numérotation — Hébraïque ». La notice ne porte plus
-- que ce qui n'a pas de rangée à soi.
--
-- ⚠️ Les ESPACES restent ordinaires (U+0020), comme dans toute la table : la norme
-- française se pose au RENDU (charte § 3.2), et la fiche passe désormais ces champs
-- par « normaliserEspaces ».
--
-- ⚠️ TR0009 n'est pas touchée sur « particularites » : sa notice se lit déjà. TR0010 à
-- TR0013 n'en ont aucune, et celle de TR0012 ne se lit qu'au compte d'administration.
--
-- Retour en arrière : sql/rollback_editions_notices_20260904.sql

begin;

create table if not exists internal.backup_editions_notices_20260904 as
select trad_id, source_nom, particularites, now() as sauvegarde_le
  from public.editions_sources
 where trad_id in ('TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005', 'TR0009');

update public.editions_sources
   set source_nom = 'Gallica, Bibliothèque nationale de France — texte océrisé',
       particularites = 'Elle suit la numérotation de la Vulgate. Les mots que le traducteur ajoute au latin, absents de la Vulgate, sont imprimés en italique dans l’édition : ces italiques ont été relevées sur le fac-similé et sont conservées ici. Les sommaires placés en tête des sections et les titres courants des pages n’ont pas été repris.'
 where trad_id = 'TR0001';

update public.editions_sources
   set source_nom = 'eBible.org — corpus BibleNLP, édition fra-fraLSG',
       particularites = 'Le nom divin y est rendu « l’Éternel ». Le canon et la numérotation sont ceux des Bibles protestantes : soixante-six livres, sans les livres deutérocanoniques.'
 where trad_id = 'TR0002';

update public.editions_sources
   set source_nom = 'Dépôt scrollmapper/bible_databases — texte FreCrampon',
       particularites = 'Le nom divin y est rendu « Yahweh ». Les psaumes suivent le plus souvent la numérotation hébraïque. Le canon catholique de soixante-treize livres est au complet ; Suzanne et Bel s’y lisent à part, et non à la suite de Daniel. Les suscriptions des psaumes comptent pour le premier verset.'
 where trad_id = 'TR0003';

update public.editions_sources
   set source_nom = 'Clementine Vulgate Project — module CrossWire VulgClementine 2.0.1',
       particularites = 'Le texte numérique dérive principalement de l’édition d’A. Colunga et L. Turrado (Madrid, 1946). Deux cent quatre-vingt-trois lignes n’ont pas d’équivalent dans le découpage en versets que suit le site : ce sont, pour l’essentiel, des fragments de suscription du Psautier et des additions propres à la tradition latine. Elles sont conservées telles quelles, hors de ce découpage.'
 where trad_id = 'TR0004';

update public.editions_sources
   set source_nom = 'Dépôt lxx-swete, d’après First1KGreek (Open Greek and Latin Project)',
       particularites = 'L’Ecclésiaste manque : le corpus numérique d’où vient ce texte annonce le livre mais ne l’a jamais transcrit, et on n’a pas voulu le compléter depuis une autre édition. Esdras B, qui réunit Esdras et Néhémie, a été partagé entre les deux livres. Daniel, Suzanne et Bel existent en deux recensions : celle de Théodotion, que l’Église a reçue, est donnée au canon ; le vieux grec se lit parmi les apocryphes. Les versets que le découpage du site ne prévoit pas restent hors de ce découpage, jamais logés chez leur voisin.'
 where trad_id = 'TR0005';

update public.editions_sources
   set source_nom = 'Gallica, Bibliothèque nationale de France — manuscrit Français 899'
 where trad_id = 'TR0009';

-- ⛔ Contrôle : plus aucun nom d'objet interne dans les notices servies.
do $$
declare n int;
begin
  select count(*) into n from public.editions_sources
   where trad_id in ('TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005')
     and (particularites ilike '%versets_canon%' or particularites ilike '%ch_heb%'
          or particularites ilike '%vref%' or particularites ilike '%<i>%'
          or particularites ilike '%codes techniques%');
  if n > 0 then raise exception 'Notice encore technique sur % ligne(s)', n; end if;
  select count(*) into n from internal.backup_editions_notices_20260904;
  if n <> 6 then raise exception 'Sauvegarde incomplète : % ligne(s)', n; end if;
end $$;

commit;
