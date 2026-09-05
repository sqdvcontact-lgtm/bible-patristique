-- RETOUR EN ARRIÈRE — les trois notices d'article de Boèce (5 septembre 2026).
--
-- Ce que la passe a fait (`sql/boece_articles_colonnes_20260905.sql`) : sur les ouvrages
-- 899 (Hand), 901 (Hauréau) et 909 (Jourdain), elle a rempli les colonnes de FORME ouvertes
-- par la migration `20260905150000_references_bibliographiques.sql` — `forme_notice`,
-- `titre_hote`, `tomaison`, `pages`, `date_affichee` — et vidé `collection` et
-- `numero_collection`, qui portaient l'hôte et la tomaison faute de colonne propre, et détaché
-- l'autorité de collection (`collection_valeur_id`) qui portait le titre de l'hôte.
--
-- La sauvegarde `internal.backup_ouvrages_articles_boece_20260905` a été prise AVANT la
-- migration : elle ne porte pas les cinq colonnes neuves, qui valaient toutes NULL. Le
-- retour remet donc ces cinq colonnes à NULL et rend à `collection` / `numero_collection`
-- leurs valeurs sauvegardées. Aucune autre colonne n'a bougé.

begin;

update public.ouvrages_bibliographiques o
   set forme_notice = null,
       titre_hote = null,
       tomaison = null,
       pages = null,
       date_affichee = null,
       collection = b.collection,
       numero_collection = b.numero_collection,
       collection_valeur_id = b.collection_valeur_id
  from internal.backup_ouvrages_articles_boece_20260905 b
 where b.id = o.id
   and o.id in (899, 901, 909);

-- Contrôle : trois lignes, collection rendue, colonnes de forme vides.
select id, forme_notice, titre_hote, tomaison, pages, date_affichee, collection, numero_collection, collection_valeur_id
  from public.ouvrages_bibliographiques
 where id in (899, 901, 909)
 order by id;

commit;
