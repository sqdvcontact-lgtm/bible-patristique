-- La fiche « À propos de cette traduction » compose la référence des volumes
-- servis CHAMP PAR CHAMP (charte § 35.6.1). Trois champs d'`editions_sources`
-- lui manquaient, et elle allait donc chercher ce qu'ils disent dans la notice
-- rédigée `traductions.source_edition` : la mention d'édition (« Édition
-- révisée »), et — pour un témoin manuscrit — son dépôt et sa cote.
--
-- ⚠️ Les trois colonnes s'ajoutent EN FIN de vue : `create or replace` n'admet
-- pas d'en insérer une au milieu. Les GRANT et les options sont conservés.
create or replace view public.v_traductions_page as
 SELECT t.trad_id,
    t.nom,
    t.type_objet,
    t.auteur,
    t.responsable_edition,
    t.dates,
    t.bio_courte,
    t.date_publication,
    t.confession,
    t.langue,
    t.commentaire_editorial,
    t.photo,
    t.photo_position,
    t.schema_numerotation,
    t.source_edition AS edition_reference_affichee,
    t.source_url AS edition_reference_url,
    t.licence AS licence_traduction,
    t.mention_obligatoire,
    t.est_referent,
    t.statut_corpus_public,
    t.lacunes_publiques,
    es.id AS edition_source_id,
    es.titre_edition,
    es.sous_titre_edition,
    es.traducteur AS credit_edition,
    es.editeur,
    es.annee_edition,
    es.lieu_edition,
    es.source_type,
    es.source_nom AS source_numerique_nom,
    es.source_url AS source_numerique_url,
    es.licence AS licence_source_numerique,
    es.graphie,
    es.date_extraction,
    es.particularites,
    es.integrite_verifiee,
    es.nombre_tomes,
    es.numero_edition,
    t.photo_encart,
    es.mention_edition,
    es.depot_manuscrit,
    es.cote_manuscrit
   FROM traductions t
     LEFT JOIN editions_sources es ON es.trad_id = t.trad_id;
