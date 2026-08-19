// Colonnes lues par la bibliothèque, en un seul endroit.
//
// La page serveur (`app/bibliotheque/page.tsx`) et le rechargement client
// (`BibliothequeClient`) interrogent les mêmes tables et doivent lire les mêmes
// colonnes. Tant que les deux listes vivaient chacune de son côté, elles ont
// dérivé : `nb_signes` avait été ajouté côté client seulement, si bien que la
// page rendue par le serveur ne portait aucune mesure et que la section
// « Opuscules » ne se déclenchait JAMAIS en ligne (voir `app/lib/opuscules.ts`).
export const SELECT_AUTEURS_BIBLIOTHEQUE =
  'id_auteur, nom, nom_original, titre, dates, date_naissance, date_mort, siecle, langue_principale, traditions, note, note_biographique, note_theologique, photo_position'

// `nb_signes` commande le partage entre œuvres longues et opuscules : ne pas le retirer.
export const SELECT_OEUVRES_BIBLIOTHEQUE =
  'id_oeuvre, id_auteur, titre, sous_titre, titre_original, editeur, trad_auteur, ville, date_publication_affichage_courte, date_publication_precision_affichage, genre, note, langue_originale, nb_signes'
