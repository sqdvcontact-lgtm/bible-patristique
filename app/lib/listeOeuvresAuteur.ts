// La liste des œuvres dans la fiche d'un auteur : leur ORDRE, et ce que la COLONNE DES
// DATES en montre. Module PUR, testé dans listeOeuvresAuteur.test.ts. Doctrine : charte
// § 38.33.1.
//
// ⚠️ Le libellé est la date courte que la vue `v_oeuvres_dates` établit
// (`date_composition_affichage_courte`). Il n'est jamais recomposé ici : on ne fait que
// le RANGER, et dire s'il redit celui de la rangée d'au-dessus.

import { anneeDeMention } from './chronologiePatristique'

export type OeuvreDatee = {
  titre: string
  composition_debut_annee: number | null
  date_composition_affichage_courte: string | null
}

export type CelluleDeDate = {
  /** Le libellé à montrer, blancs resserrés ; vide quand l'œuvre n'est pas datée. */
  libelle: string
  /** Vrai quand il redit celui de la rangée précédente : la colonne le tait alors. */
  repete: boolean
}

// Accent et casse ne départagent pas deux titres ; les chiffres se comparent en nombres.
const COLLATEUR = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/** Le libellé de date d'une œuvre, blancs resserrés, ou la chaîne vide. */
export function libelleDeDate(oeuvre: OeuvreDatee): string {
  return (oeuvre.date_composition_affichage_courte ?? '').replace(/\s+/g, ' ').trim()
}

// Le rang d'une œuvre SANS année de début. Une période que la mention nomme
// (« IVe siècle », « Fin du IVe siècle », « Première moitié du IIIe siècle ») se range à
// sa place chronologique ; une mention qui n'en nomme aucune (« Antiquité tardive »,
// « Vendredi saint, année non établie ») vient après ; l'absence de date ferme la liste.
function rangSansAnnee(libelle: string): readonly [groupe: number, annee: number] {
  if (!libelle) return [2, 0]
  const annee = anneeDeMention(libelle)
  return annee === null ? [1, 0] : [0, annee]
}

/**
 * L'ordre de la liste : les œuvres datées d'une année d'abord, dans l'ordre des années ;
 * puis les périodes ; puis les mentions qu'on ne sait pas dater ; puis les œuvres sans date.
 *
 * ⛔ Le LIBELLÉ départage avant le titre. Rangées par le seul titre, les œuvres qui
 * partagent une année ou une période s'entrelaçaient avec leurs voisines : chez Jean
 * Chrysostome, « Vendredi saint, année non établie » tombait au milieu des quinze œuvres
 * du IVe siècle, et coupait leur groupe en deux.
 */
export function comparerOeuvresAuteur(a: OeuvreDatee, b: OeuvreDatee): number {
  const anneeA = a.composition_debut_annee ?? null
  const anneeB = b.composition_debut_annee ?? null
  const libelleA = libelleDeDate(a)
  const libelleB = libelleDeDate(b)
  if (anneeA !== null && anneeB !== null) {
    if (anneeA !== anneeB) return anneeA - anneeB
  } else if (anneeA !== null) {
    return -1
  } else if (anneeB !== null) {
    return 1
  } else {
    const [groupeA, reperesA] = rangSansAnnee(libelleA)
    const [groupeB, reperesB] = rangSansAnnee(libelleB)
    if (groupeA !== groupeB) return groupeA - groupeB
    if (reperesA !== reperesB) return reperesA - reperesB
  }
  const parLibelle = COLLATEUR.compare(libelleA, libelleB)
  if (parLibelle !== 0) return parLibelle
  return COLLATEUR.compare(a.titre, b.titre)
}

/** Les œuvres dans l'ordre de la liste. La liste reçue n'est pas touchée. */
export function ordonnerOeuvresAuteur<T extends OeuvreDatee>(oeuvres: readonly T[]): T[] {
  return [...oeuvres].sort(comparerOeuvresAuteur)
}

/**
 * La colonne des dates, rangée par rangée : une date qui REDIT celle de la rangée
 * précédente se tait. Quinze « IVe siècle » à la suite ne disent rien que le premier ne
 * dise ; le groupe se lit sous lui, comme dans une table chronologique.
 *
 * ⚠️ Les œuvres doivent arriver dans l'ordre de la liste (`ordonnerOeuvresAuteur`) : c'est
 * lui qui rend contigus les libellés qui se répètent.
 */
export function colonneDesDates(oeuvres: readonly OeuvreDatee[]): CelluleDeDate[] {
  return oeuvres.map((oeuvre, rang) => {
    const libelle = libelleDeDate(oeuvre)
    return { libelle, repete: rang > 0 && libelle === libelleDeDate(oeuvres[rang - 1]) }
  })
}
