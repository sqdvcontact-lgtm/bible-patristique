/**
 * Composition d'une note BIBLIOGRAPHIQUE.
 *
 * La donnée déclare le genre du bloc — `presentation.style = "bibliographie"` —
 * et porte sa liste sous forme de lignes ouvertes par un tiret. Ce tiret est un
 * MARQUEUR de la couche de rendu, au même titre que `*italique*` et
 * `++petites capitales++` : il dit « entrée de liste », il ne s'imprime pas.
 * ⛔ On ne devine donc jamais une bibliographie à la forme du texte — sans la
 * métadonnée, le paragraphe reste un paragraphe suivi.
 *
 * Une pièce matérielle peut toutefois porter UNE référence bibliographique par
 * bloc, sans marqueur textuel. Dans ce seul cas, l'appelant doit demander
 * explicitement `entreeAutonome` : le texte entier devient alors une entrée de
 * liste. Rien n'est déduit de sa forme.
 *
 * Module pur, testé par bibleBibliographie.test.ts.
 */

export type BibliographieComposee = {
  /** La phrase qui annonce la liste — « Signalons, comme œuvres spéciales : ». */
  chapeau: string | null
  entrees: string[]
}

export type OptionsBibliographie = {
  /** Le bloc entier est déjà déclaré comme UNE entrée de bibliographie. */
  entreeAutonome?: boolean
}

// Tiret ordinaire, demi-cadratin ou cadratin : les trois ont servi de marqueur
// selon les lots d'import, et aucun n'appartient au texte de l'entrée.
const MARQUEUR_ENTREE = /^[-–—]\s+/

export function composerBibliographie(
  texte: string,
  options: OptionsBibliographie = {},
): BibliographieComposee {
  const chapeau: string[] = []
  const entrees: string[] = []
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.trim()
    if (!ligne) continue
    if (MARQUEUR_ENTREE.test(ligne)) {
      entrees.push(ligne.replace(MARQUEUR_ENTREE, ''))
      continue
    }
    // Avant la première entrée, c'est l'annonce ; après, c'est la suite d'une
    // référence que la transcription a repliée sur deux lignes.
    if (entrees.length === 0) chapeau.push(ligne)
    else entrees[entrees.length - 1] += ` ${ligne}`
  }

  if (options.entreeAutonome && entrees.length === 0 && chapeau.length > 0) {
    return { chapeau: null, entrees: [chapeau.join(' ')] }
  }

  return { chapeau: chapeau.length > 0 ? chapeau.join(' ') : null, entrees }
}
