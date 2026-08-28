-- La fiche « À propos de cette traduction » (volet de lecture de la Bible) est
-- refaite sur le modèle de la fiche d'auteur, qui s'ouvre sur un PORTRAIT. Or la
-- vue de présentation ne portait que `photo`, le bandeau horizontal : une image
-- couchée serrée dans un cadre debout ne montre pas ce qu'un portrait montre.
-- `photo_encart`, posée sur `traductions` le 2026-08-27 pour la page publique des
-- traductions, entre donc aussi dans la vue.
--
-- ⚠️ `create or replace view` n'admet d'ajouter une colonne qu'À LA FIN : la
-- nouvelle ne se range donc pas à côté de `photo`, où elle serait à sa place.
-- C'est le prix d'une migration qui n'a ni à révoquer ni à reposer les droits
-- déjà accordés sur la vue.
--
-- ⛔ Aucune donnée n'est modifiée, aucun droit n'est élargi : la vue reste en
-- `security_invoker`, donc soumise aux politiques de `traductions` (lecture
-- publique des lignes non privées).

begin;

create or replace view public.v_traductions_page as
  select
    t.trad_id,
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
    t.source_edition as edition_reference_affichee,
    t.source_url as edition_reference_url,
    t.licence as licence_traduction,
    t.mention_obligatoire,
    t.est_referent,
    t.statut_corpus_public,
    t.lacunes_publiques,
    es.id as edition_source_id,
    es.titre_edition,
    es.sous_titre_edition,
    es.traducteur as credit_edition,
    es.editeur,
    es.annee_edition,
    es.lieu_edition,
    es.source_type,
    es.source_nom as source_numerique_nom,
    es.source_url as source_numerique_url,
    es.licence as licence_source_numerique,
    es.graphie,
    es.date_extraction,
    es.particularites,
    es.integrite_verifiee,
    es.nombre_tomes,
    es.numero_edition,
    t.photo_encart
  from public.traductions t
  left join public.editions_sources es on es.trad_id = t.trad_id;

alter view public.v_traductions_page set (security_invoker = true);

commit;
