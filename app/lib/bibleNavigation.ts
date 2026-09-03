/**
 * L'URL de lecture de la page Bible, en un seul endroit.
 *
 * Elle était composée à la main en six endroits, dans trois fichiers. C'est
 * ainsi que la lecture « Latin & Français » se perdait : le volet des livres
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
  /** Lecture « Latin & Français » de l'édition. */
  bilingue?: boolean
  /** Lecture « Texte biblique seul » : l'appareil éditorial de l'édition est écarté. */
  texteSeul?: boolean
  /**
   * Pièce LIMINAIRE de l'édition à lire à la place du chapitre : page de titre,
   * dédicace, avant-propos, introduction générale. Sa clé est celle du premier
   * bloc de la pièce (voir `bibleSommaireEdition.ts`).
   *
   * ⛔ Elle ne voyage PAS d'un chapitre à l'autre : c'est une CIBLE, non une
   * manière de lire, et changer de chapitre en sort. Le livre et le chapitre
   * restent pourtant dans l'adresse, pour que fermer la pièce ramène le lecteur
   * là où il lisait.
   */
  piece?: string | null
}

/**
 * Ce qui décrit la MANIÈRE de lire, et voyage donc d'un chapitre à l'autre : la
 * graphie, la lecture en regard, le texte nu. Les surfaces qui composent une
 * adresse (volet des livres, flèches de chapitre) le reçoivent d'un bloc et le
 * reportent tel quel, plutôt que d'énumérer les réglages à ne pas oublier — c'est
 * ainsi qu'ils se perdaient un à un.
 */
export type ManiereDeLireBible = Pick<CibleLectureBible, 'couche' | 'bilingue' | 'texteSeul'>

/**
 * Le numéro de chapitre demandé par l'adresse, ramené à un ENTIER d'au moins 1.
 *
 * ⛔ `parseInt` rend `NaN` sur « abc », et un `NaN` ne se contente pas de mal
 * s'afficher : il descend jusqu'au recalage en phase de rendu de `NavLivres`, dont
 * la comparaison est un `!==`. Or NaN n'est jamais égal à lui-même, la condition
 * est donc vraie à chaque rendu, l'état se repose sans fin, et React coupe la page
 * entière (erreur 301, « Too many re-renders »). Une adresse tordue ne doit pas
 * pouvoir sortir le lecteur du site : elle se borne ici, à l'entrée.
 */
export function normaliserChapitreBible(valeur: string | null | undefined): number {
  const n = Number.parseInt((valeur ?? '').trim(), 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
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
  // L'appareil éditorial est un axe INDÉPENDANT de ce qu'on lit : il s'écarte
  // d'une colonne comme des deux en regard.
  if (cible.texteSeul) parametres.set('texte', 'seul')
  if (cible.piece) parametres.set('piece', cible.piece)
  return `/?${parametres.toString()}`
}
