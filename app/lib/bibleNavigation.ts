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
 * Borne terminale explicitement certifiée pendant le chantier en cours.
 *
 * ⛔ Ne pas généraliser cette table depuis `versets_canon` sans audit du modèle de
 * navigation : certains livres ont des additions ou des découpages éditoriaux
 * distincts de l'axe canonique. Ici, seule la Genèse est dans le périmètre et sa
 * borne 50/50 a été vérifiée directement en base le 2026-09-03.
 */
const DERNIER_CHAPITRE_CERTIFIE: Readonly<Record<string, number>> = Object.freeze({ GEN: 50 })

export function dernierChapitreBible(livre: string): number | null {
  return DERNIER_CHAPITRE_CERTIFIE[livre] ?? null
}

export function chapitreSuivantDisponible(livre: string, chapitre: number): boolean {
  const dernier = dernierChapitreBible(livre)
  return dernier === null || chapitre < dernier
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
 * Pour un livre dont la borne a été explicitement certifiée, le même garde-fou
 * borne aussi le maximum : une flèche terminale ne peut donc jamais fabriquer
 * « Gn 51 » même si un appelant oublie de la désactiver visuellement.
 *
 * ⛔ `parseInt` rend `NaN` sur « abc », et un `NaN` ne se contente pas de mal
 * s'afficher : il descend jusqu'au recalage en phase de rendu de `NavLivres`, dont
 * la comparaison est un `!==`. Or NaN n'est jamais égal à lui-même, la condition
 * est donc vraie à chaque rendu et React coupe la page entière. Une adresse tordue
 * ne doit pas pouvoir sortir le lecteur du site : elle se borne ici, à l'entrée.
 */
export function normaliserChapitreBible(
  valeur: string | null | undefined,
  livre?: string | null,
): number {
  const n = Number.parseInt((valeur ?? '').trim(), 10)
  const minimum = Number.isFinite(n) && n >= 1 ? n : 1
  const dernier = livre ? dernierChapitreBible(livre) : null
  return dernier === null ? minimum : Math.min(minimum, dernier)
}

export function urlLectureBible(cible: CibleLectureBible): string {
  const parametres = new URLSearchParams()
  parametres.set('livre', cible.livre)
  parametres.set('chapitre', String(normaliserChapitreBible(String(cible.chapitre), cible.livre)))
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
