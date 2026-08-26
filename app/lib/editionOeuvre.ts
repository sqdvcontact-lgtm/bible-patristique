// Ligne d'ÉDITION d'une œuvre : ce qui distingue deux exemplaires d'un même titre.
//
// Une même œuvre est servie ici en plusieurs éditions, chacune sa ligne au catalogue
// — « La Cité de Dieu » paraît deux fois, chez Migne en 1845 (le latin) et chez Louis
// Vivès en 1870-1873 (la traduction de H. Barreau et M. Charpentier). Un titre suivi
// de son auteur ne dit donc pas laquelle on ouvre : il faut nommer la responsabilité
// (qui traduit, ou dans quelle langue on va lire) et la provenance (chez qui, où,
// quand).
//
// Module PUR — ni React ni Supabase : il compose une chaîne à partir des colonnes de
// `v_oeuvres_dates` et de l'index des éditeurs. C'est le MÊME modèle que l'étagère de
// la bibliothèque et que la page de titre d'une œuvre : une phrase et des virgules,
// jamais une suite d'abréviations.

import { libelleTrad } from './traducteurs'
import { libelleTexteOriginal } from './langues'
import { normaliserNomEditeur, type IndexEditeurs } from './editeursNormalisation'

/** Les colonnes lues, telles que `v_oeuvres_dates` les nomme — `date` mise à part,
 *  que l'appelant prend dans `date_publication_affichage_courte`. */
export type EditionOeuvre = {
  trad_auteur?: string | null
  editeur?: string | null
  ville?: string | null
  date?: string | null
  langue_trad?: string | null
  langue_originale?: string | null
}

const vide = (s: string | null | undefined) => !(s ?? '').trim()

/** Qui répond du texte qu'on va lire : son traducteur, ou — pour une édition en langue
 *  originale, qui n'en a pas — la langue elle-même. Le libellé de langue est celui de
 *  l'étagère (`libelleTexteOriginal`) : les deux se lisent dans la même liste. */
function responsabilite(o: EditionOeuvre): string {
  const trad = libelleTrad(o.trad_auteur)
  if (trad) return trad
  // Pas de traducteur ET pas de langue de traduction : c'est le texte original.
  return vide(o.langue_trad) && !vide(o.langue_originale) ? libelleTexteOriginal(o.langue_originale) : ''
}

/** Chez qui, où, quand. L'éditeur paraît sous son nom RÉPERTORIÉ quand il l'est
 *  (« L. Guérin & Cie » → « Louis Guérin ») : la donnée brute reste intacte, seule
 *  la lecture change. Sans index chargé, la forme brute est rendue telle quelle. */
function provenance(o: EditionOeuvre, index: IndexEditeurs | null): string {
  return [normaliserNomEditeur(o.editeur, index), (o.ville ?? '').trim(), (o.date ?? '').trim()]
    .filter(Boolean)
    .join(', ')
}

/** « Traduction par H. Barreau et M. Charpentier, Louis Vivès, Paris, 1870-1873 ».
 *  Chaîne vide quand l'œuvre ne porte aucune de ces mentions : l'appelant n'affiche
 *  alors pas de ligne du tout, plutôt qu'une ligne qui ne dirait rien. */
export function ligneEdition(o: EditionOeuvre, index: IndexEditeurs | null = null): string {
  return [responsabilite(o), provenance(o, index)].filter(Boolean).join(', ')
}
