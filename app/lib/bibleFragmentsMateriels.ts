/**
 * LA RECOMPOSITION D'UN TEXTE À PARTIR DE SES MORCEAUX MATÉRIELS.
 *
 * Un verset d'édition ne vit pas d'un bloc : il vit en unités-source — une ligne, une
 * colonne, un feuillet —, qu'un créneau éditorial découpe et recolle. Trois choses
 * suffisent à le rassembler : la découpe par points de code, le liant entre deux
 * morceaux, et l'ordre.
 *
 * ⛔ CE MODULE EST À PART, ET C'EST DÉLIBÉRÉ. Il vivait dans `bibleEdition.ts`, quarante
 * mille signes qui tirent avec eux le registre des styles sémantiques de Fillion : le
 * volet d'une page Œuvre, qui n'a besoin que de ces vingt lignes, embarquait tout cela
 * dans le paquet du navigateur. `bibleEdition` les réexporte, si bien que rien de ce qui
 * les lisait n'a bougé.
 */

import { liantSymbolique, type JonctionSymbolique } from './jonctionSegments'

export type BibleSourceFragment = {
  text: string
  startOffset: number | null
  endOffset: number | null
  /** Le vocabulaire vit dans `jonctionSegments.ts`, avec sa matérialisation et la
   *  contrainte SQL `bible_editorial_segment_sources_join_before_check` qu'il reflète. */
  joinBefore: JonctionSymbolique
}

export function couperPointsDeCode(
  text: string,
  startOffset: number | null,
  endOffset: number | null,
): string {
  if (startOffset === null) return text
  return Array.from(text).slice(startOffset, endOffset ?? undefined).join('')
}

/** ⛔ La table des jetons n'est PAS recopiée ici : elle vit dans `liantSymbolique`,
 *  partagée avec la recomposition des œuvres, pour qu'un jeton ne puisse jamais être
 *  rendu tel quel d'un côté et matérialisé de l'autre. */
export function recomposerFragmentsMateriels(fragments: readonly BibleSourceFragment[]): string {
  return fragments.map((fragment, index) => {
    const texte = couperPointsDeCode(fragment.text, fragment.startOffset, fragment.endOffset)
    return index === 0 ? texte : liantSymbolique(fragment.joinBefore) + texte
  }).join('')
}
