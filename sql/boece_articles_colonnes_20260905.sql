-- BOÈCE (Mirandol 1861) — trois notices d'ARTICLE reprises dans les colonnes de FORME
-- (mission « moteur centralisé de rendu bibliographique », 5 septembre 2026).
--
-- La migration `20260905150000_references_bibliographiques.sql` a ouvert cinq colonnes
-- nullables sur `ouvrages_bibliographiques` : `forme_notice`, `titre_hote`, `tomaison`,
-- `pages`, `date_affichee`. Trois ouvrages cités par la bibliographie de Mirandol ne sont
-- pas des monographies mais des ARTICLES ou des ENTRÉES DE DICTIONNAIRE ; leur hôte et
-- leur tomaison avaient été rangés, faute de mieux, dans `collection` / `numero_collection`,
-- et une AUTORITÉ de collection (`collection_valeur_id`) portait le titre de l'hôte.
-- Ils passent dans les colonnes qui les nomment, et la collection se vide.
--
-- Rejoué tel qu'exécuté en base ce jour (état final ; la première écriture avait posé la
-- tomaison de Hauréau à « juin 1837 » par repli sur `numero_collection`, corrigé aussitôt :
-- la date est dans `date_affichee`, la tomaison est nulle).
-- Retour en arrière : `sql/rollback_boece_articles_colonnes_20260905.sql`.

begin;

create table if not exists internal.backup_ouvrages_articles_boece_20260905 as
  select * from public.ouvrages_bibliographiques where id in (899, 901, 909);

-- Charles Jourdain, « De l’origine des traditions sur le christianisme de Boèce »,
-- Mémoires présentés par divers savants à l’Académie des inscriptions…, 1re série, t. VI,
-- 1re partie, 1860, p. 330–360.
update public.ouvrages_bibliographiques
   set forme_notice = 'article_periodique',
       titre_hote = 'Mémoires présentés par divers savants à l’Académie des inscriptions et belles-lettres de l’Institut de France',
       tomaison = '1re série, t. VI, 1re partie',
       pages = '330-360',
       collection = null, numero_collection = null,
       collection_valeur_id = null
 where id = 909;

-- Ferdinand Gotthelf Hand, « Boethius (Anicius Manlius Torquatus Severinus) », dans
-- Allgemeine Encyclopädie der Wissenschaften und Künste, 1re section, t. XI, Leipzig,
-- Gleditsch, 1823, p. 282–292.
update public.ouvrages_bibliographiques
   set forme_notice = 'entree_dictionnaire',
       titre_hote = 'Allgemeine Encyclopädie der Wissenschaften und Künste',
       tomaison = '1re section, t. XI',
       pages = '282-292',
       collection = null, numero_collection = null,
       collection_valeur_id = null
 where id = 899;

-- Barthélemy Hauréau, « Histoire de la philosophie scolastique au IXe siècle »,
-- Revue du Nord, juin 1837.
update public.ouvrages_bibliographiques
   set forme_notice = 'article_periodique',
       titre_hote = 'Revue du Nord',
       date_affichee = 'juin 1837',
       tomaison = null,
       collection = null, numero_collection = null,
       collection_valeur_id = null
 where id = 901;

commit;
