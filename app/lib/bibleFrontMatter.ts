import {
  blocSansAncreVisibleDansChapitre,
  type BibleEditorialPlacement,
  type BibleEditorialScopeKind,
} from './bibleEdition'

/**
 * La matière sans ancre d'un livre forme un ARBRE, pas une liste de blocs
 * indépendants. Le bloc de portée `book` est la racine rendue au début ou à la
 * fin du livre ; ses titres, sections et paragraphes gardent leur portée propre
 * et lui sont rattachés par `semantic_parent_key`.
 *
 * ⛔ Ne jamais élargir ces descendants en `scope_kind = book` ni leur fabriquer
 * une ancre canonique pour les faire passer dans le chargeur : leur donnée est
 * correcte. C'est la sélection du rendu qui doit fermer transitivement l'arbre.
 */
export type BlocSansAncrePourRendu = {
  id: string
  source_id: string
  block_key: string
  semantic_parent_key: string | null
  scope_kind: BibleEditorialScopeKind
  placement: BibleEditorialPlacement
  canon_order_start: number | null
}

function cleSource(sourceId: string, blockKey: string): string {
  return `${sourceId}:${blockKey}`
}

/**
 * Retient les racines sans ancre demandées par le lecteur, puis tous leurs
 * descendants sans ancre. La fermeture reste strictement bornée à la même
 * source : deux témoins peuvent employer la même `block_key` sans devenir
 * parents l'un de l'autre.
 */
export function blocsSansAncreDemandes<T extends BlocSansAncrePourRendu>(
  rows: readonly T[],
  options: { includeBookFrontMatter: boolean; includeBookBackMatter: boolean },
): T[] {
  const retenus = new Set<string>()
  const clesRetenues = new Set<string>()

  for (const row of rows) {
    if (row.canon_order_start !== null) continue
    if (!blocSansAncreVisibleDansChapitre(
      row.scope_kind,
      row.placement,
      options.includeBookFrontMatter,
      options.includeBookBackMatter,
    )) continue
    retenus.add(row.id)
    clesRetenues.add(cleSource(row.source_id, row.block_key))
  }

  let progression = true
  while (progression) {
    progression = false
    for (const row of rows) {
      if (row.canon_order_start !== null || retenus.has(row.id) || !row.semantic_parent_key) continue
      if (!clesRetenues.has(cleSource(row.source_id, row.semantic_parent_key))) continue
      retenus.add(row.id)
      clesRetenues.add(cleSource(row.source_id, row.block_key))
      progression = true
    }
  }

  return rows.filter((row) => retenus.has(row.id))
}
