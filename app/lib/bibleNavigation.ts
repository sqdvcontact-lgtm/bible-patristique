/**
 * L'URL de lecture de la page Bible, en un seul endroit.
 *
 * Elle était composée à la main en six endroits, dans trois fichiers. C'est
 * ainsi que la lecture « Latin-français » se perdait : le volet des livres
 * reconstruisait l'adresse sans reporter le mode, et changer de chapitre
 * ramenait le lecteur à une colonne sans qu'il l'ait demandé.
 *
 * Règle : ce qui décrit la MANIÈRE de lire voyage avec le chapitre — le mode,
 * la graphie, la lecture en regard. Ce qui décrit une CIBLE ponctuelle ne
 * voyage pas : viser un verset suppose de pouvoir le désigner, ce que la
 * lecture en regard ne fait pas.
 *
 * Module pur, testé par bibleNavigation.test.ts.
 */

export type CibleLectureBible = {
  livre: string
  chapitre: number
  trad: string
  /** Mode de lecture (`verse`, `paragraph`…) ; omis, la page choisit le premier disponible. */
  mode?: string
  /** Graphie de Bible 899 ; omise, la page reprend la couche par défaut. */
  couche?: string
  /** Verset à désigner. Sa présence exclut la lecture en regard. */
  verset?: number
  /** Lecture « Latin-français » de l'édition. */
  bilingue?: boolean
}

export function urlLectureBible(cible: CibleLectureBible): string {
  const parametres = new URLSearchParams()
  parametres.set('livre', cible.livre)
  parametres.set('chapitre', String(cible.chapitre))
  parametres.set('trad', cible.trad)
  if (cible.mode) parametres.set('mode', cible.mode)
  if (cible.couche) parametres.set('couche', cible.couche)
  if (cible.verset !== undefined) parametres.set('verset', String(cible.verset))
  // Une cible ponctuelle l'emporte sur la manière de lire : on ne reste pas en
  // regard pour montrer un verset qu'on ne saurait pas y désigner.
  if (cible.bilingue && cible.verset === undefined) parametres.set('bilingue', '1')
  return `/?${parametres.toString()}`
}
