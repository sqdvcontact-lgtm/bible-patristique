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
 * Un bloc que sa donnée laisse SANS PARENT dans la matière sans ancre.
 *
 * ⛔ Il n'est atteint par aucune fermeture, et n'était donc chargé nulle part :
 * ni dans un chapitre, ni dans une pièce liminaire. Mesuré sur le corpus au 20
 * septembre 2026 : 1 205 blocs dans 35 livres, dont les 326 du second livre des
 * Machabées — l'appareil entier de Fillion sur ce livre, introduction comprise,
 * n'existait pas à l'écran.
 *
 * ⚠️ La portée `book` en est exclue : c'est la RACINE, elle n'a pas de parent à
 * déclarer et elle se rend déjà.
 */
export function blocOrphelinSansAncre(row: {
  canon_order_start: number | null
  semantic_parent_key: string | null
  scope_kind: BibleEditorialScopeKind
}): boolean {
  return row.canon_order_start === null
    && row.semantic_parent_key === null
    && row.scope_kind !== 'book'
}

/**
 * Retient les racines sans ancre demandées par le lecteur, puis tous leurs
 * descendants sans ancre. La fermeture reste strictement bornée à la même
 * source : deux témoins peuvent employer la même `block_key` sans devenir
 * parents l'un de l'autre.
 *
 * ⛔ **ET LES ORPHELINS AVEC EUX** (décision de l'auteur, 20 septembre 2026).
 * Un bloc sans parent ne descend d'aucune racine : la fermeture ne l'atteint
 * jamais, et il disparaissait en silence — voir `blocOrphelinSansAncre`. Le
 * rendu l'ADOPTE donc, dès qu'une racine de sa propre source est retenue, pour
 * la seule durée de l'affichage.
 *
 * ⛔ RIEN N'EST ÉCRIT EN BASE, et rien n'est réparé : le bloc adopté se compose
 * sur fond fluo, avec la mention de son défaut. Une adoption silencieuse ferait
 * passer pour saine une donnée qui ne l'est pas, et le remède — écrire les
 * `semantic_parent_key` manquants — cesserait d'être visible.
 *
 * ⚠️ L'adoption tient à la SOURCE, non à la place : un orphelin de `placement`
 * « after » remonte avec la matière de tête, faute de quoi il resterait invisible
 * (675 des 1 205 en sont). Sa place continue de se lire dans `data-placement`.
 */
export function blocsSansAncreDemandes<T extends BlocSansAncrePourRendu>(
  rows: readonly T[],
  options: { includeBookFrontMatter: boolean; includeBookBackMatter: boolean },
): T[] {
  const retenus = new Set<string>()
  const clesRetenues = new Set<string>()

  const retenir = (row: T) => {
    retenus.add(row.id)
    clesRetenues.add(cleSource(row.source_id, row.block_key))
  }

  for (const row of rows) {
    if (row.canon_order_start !== null) continue
    if (!blocSansAncreVisibleDansChapitre(
      row.scope_kind,
      row.placement,
      options.includeBookFrontMatter,
      options.includeBookBackMatter,
    )) continue
    retenir(row)
  }

  // La fermeture sur les parents DÉCLARÉS, reprise tant qu'elle progresse.
  const fermer = () => {
    let progression = true
    while (progression) {
      progression = false
      for (const row of rows) {
        if (row.canon_order_start !== null || retenus.has(row.id) || !row.semantic_parent_key) continue
        if (!clesRetenues.has(cleSource(row.source_id, row.semantic_parent_key))) continue
        retenir(row)
        progression = true
      }
    }
  }
  fermer()

  // ⚠️ L'ordre des lignes est l'ORDRE MATÉRIEL : il dit quelle racine précède
  // l'orphelin. Un lot mal trié n'adopterait personne avant la première racine.
  if (options.includeBookFrontMatter || options.includeBookBackMatter) {
    let adoption = false
    const sourcesOuvertes = new Set<string>()
    for (const row of rows) {
      if (row.canon_order_start !== null) continue
      if (retenus.has(row.id)) { sourcesOuvertes.add(row.source_id); continue }
      if (!blocOrphelinSansAncre(row) || !sourcesOuvertes.has(row.source_id)) continue
      retenir(row)
      adoption = true
    }
    // Un orphelin peut à son tour être le parent déclaré d'autres blocs.
    if (adoption) fermer()
  }

  return rows.filter((row) => retenus.has(row.id))
}
