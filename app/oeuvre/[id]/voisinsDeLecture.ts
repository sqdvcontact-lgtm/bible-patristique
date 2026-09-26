/**
 * LE BAS D'UNE DIVISION : où mènent les flèches ‹ › sous le texte, et les touches ← et →.
 *
 * Sur le modèle du bas de chapitre de la Bible (`chapitreVoisin`, décision de l'auteur,
 * 2026-09-26) : dans une division de plusieurs pages, la flèche tourne la page ; à la
 * dernière page, « › » mène à la division suivante, et à la première, « ‹ » à la
 * précédente. Elle n'est grisée qu'aux bornes de l'œuvre.
 *
 * « N sur M » dit la PAGE dans la division quand elle en a plusieurs. Une division d'une
 * seule page n'a pas de page à dire : elle dit sa place parmi les divisions du sommaire,
 * comme la Bible dit le chapitre parmi ceux du livre.
 *
 * ⛔ En texte entier ou sur un texte sans niveaux, on ne lit pas division par division :
 * les flèches n'y tournent que les pages, comme avant.
 *
 * Module pur, testé par voisinsDeLecture.test.ts.
 */

/** Où mène une flèche : une autre page de la division, ou une autre division (en tête). */
export type PasDeLecture =
  | { genre: 'page'; page: number }
  | { genre: 'division'; niv1: string }

export type EtatDeLecture = {
  /** Les divisions du sommaire, dans l'ordre (`niv1List`). */
  divisions: readonly string[]
  /** La division lue. */
  division: string
  /** La page lue dans la division, à partir de 0. */
  page: number
  nbPages: number
  /** La lecture va division par division (ni texte entier, ni texte sans niveaux). */
  parDivision: boolean
}

export type VoisinsDeLecture = {
  precedent: PasDeLecture | null
  suivant: PasDeLecture | null
  position: { actuel: number; total: number } | null
}

export function voisinsDeLecture({ divisions, division, page, nbPages, parDivision }: EtatDeLecture): VoisinsDeLecture {
  const pages = Math.max(1, nbPages)
  const rang = parDivision ? divisions.indexOf(division) : -1
  const divisionVoisine = (pas: -1 | 1): PasDeLecture | null => {
    if (rang < 0) return null
    const niv1 = divisions[rang + pas]
    return niv1 === undefined ? null : { genre: 'division', niv1 }
  }
  return {
    precedent: page > 0 ? { genre: 'page', page: page - 1 } : divisionVoisine(-1),
    suivant: page < pages - 1 ? { genre: 'page', page: page + 1 } : divisionVoisine(1),
    position: pages > 1 ? { actuel: page + 1, total: pages }
      : rang >= 0 && divisions.length > 1 ? { actuel: rang + 1, total: divisions.length }
      : null,
  }
}
