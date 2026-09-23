// CE QU'ON FAIT D'UNE SÉLECTION — la référence, le texte copié, les mots de la barre.
//
// Le lasso (`lasso.ts`, `LassoLecture.tsx`) sélectionne ; ce module dit comment se nomme ce
// qu'on a pris. Il est pur : aucune requête, aucun rendu.

import { MARQUE_ELISION } from './regrouperCitations'
import { recomposerSegments, type SegmentARecomposer } from './jonctionSegments'

/** L'élision posée entre deux morceaux qui ne se suivent pas, espaces comprises. */
const ELISION = ` ${MARQUE_ELISION} `

/** Ce que le lasso compte sur les deux lectures de la page Bible. ⚠️ Les deux unités du
 *  site sont masculines. */
export const UNITE_VERSETS = ['verset', 'versets'] as const

/** Ce que le lasso compte sur la page d'une œuvre. */
export const UNITE_PASSAGES = ['passage', 'passages'] as const

/**
 * La liste des versets d'un chapitre, à la française : « 3 », « 3-5 », « 3-5.7.9-10 ».
 *
 * ⚠️ Le trait simple, sans espaces, entre deux versets d'un même chapitre, comme
 * `formaterPlageCanonique` ; le POINT entre deux versets qui ne se suivent pas, selon
 * l'usage des éditions critiques (« Gn 1, 1-3.5 »). Deux versets voisins s'écrivent en
 * plage : « 3-4 », jamais « 3.4 ».
 */
export function referenceDesVersets(numeros: readonly number[]): string {
  const tries = [...new Set(numeros.filter(n => Number.isFinite(n)))].sort((a, b) => a - b)
  const morceaux: string[] = []
  let debut: number | null = null
  let fin: number | null = null
  const clore = () => {
    if (debut === null || fin === null) return
    morceaux.push(debut === fin ? String(debut) : `${debut}-${fin}`)
  }
  for (const n of tries) {
    if (fin !== null && n === fin + 1) { fin = n; continue }
    clore()
    debut = n
    fin = n
  }
  clore()
  return morceaux.join('.')
}

/**
 * Le texte de plusieurs versets, dans l'ordre : une espace entre deux versets qui se
 * suivent, une élision « […] » là où un verset manque.
 *
 * ⛔ Une élision ne se tait jamais : copier les versets 3 et 7 sans la dire ferait lire une
 * phrase que l'Écriture n'a pas écrite.
 */
export function texteDesVersets(morceaux: readonly { numero: number; texte: string }[]): string {
  const tries = [...morceaux].sort((a, b) => a.numero - b.numero)
  let texte = ''
  let precedent: number | null = null
  for (const { numero, texte: morceau } of tries) {
    const propre = morceau.trim()
    if (!propre) continue
    if (precedent === null) texte = propre
    else texte += (numero === precedent + 1 ? ' ' : ELISION) + propre
    precedent = numero
  }
  return texte
}

/**
 * Le texte de plusieurs SUITES de segments : chaque suite se recompose par ses liants
 * (`join_before`), et deux suites se séparent d'une élision.
 */
export function texteDesSuites(suites: readonly (readonly SegmentARecomposer[])[]): string {
  return suites
    .map(suite => recomposerSegments(suite).trim())
    .filter(Boolean)
    .join(ELISION)
}

/** Le nom d'une unité, accordé : « 1 verset », « 7 versets ». */
export function compter(nombre: number, unite: readonly [string, string]): string {
  return `${nombre} ${nombre > 1 ? unite[1] : unite[0]}`
}

/** « 7 versets sélectionnés ». ⚠️ Les deux unités du site sont masculines. */
export function libelleSelection(nombre: number, unite: readonly [string, string]): string {
  return `${compter(nombre, unite)} sélectionné${nombre > 1 ? 's' : ''}`
}

/** « 7 versets prélevés », « 1 passage retiré ». */
export function libelleResultat(
  nombre: number, unite: readonly [string, string], action: 'enregistre' | 'retire',
): string {
  const participe = action === 'enregistre' ? 'prélevé' : 'retiré'
  return `${compter(nombre, unite)} ${participe}${nombre > 1 ? 's' : ''}`
}
