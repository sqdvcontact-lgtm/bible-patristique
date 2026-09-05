import type { GroupeData } from './oeuvreTypes'

export type Niveau2NavigationApparat = {
  niv2: string
  anchor: string
}

export type EntreeNavigationApparat = {
  niv1: string
  anchor: string
  niveaux2: Niveau2NavigationApparat[]
}

type GroupeNavigationApparat = Pick<GroupeData, 'niv1' | 'niv2' | 'anchor'>

/**
 * Projette les groupes de l'apparat en navigation hiérarchique sans fabriquer de
 * titres. Un même livre n'apparaît qu'une fois, mais conserve chacun de ses
 * niveaux 2 et l'ancre réelle du premier groupe correspondant.
 */
export function construireNavigationApparat(
  groupes: readonly GroupeNavigationApparat[],
): EntreeNavigationApparat[] {
  const entrees: EntreeNavigationApparat[] = []
  const parNiveau1 = new Map<string, EntreeNavigationApparat>()
  const niveaux2Vus = new Map<string, Set<string>>()

  for (const groupe of groupes) {
    if (!groupe.niv1.trim()) continue

    let entree = parNiveau1.get(groupe.niv1)
    if (!entree) {
      entree = { niv1: groupe.niv1, anchor: groupe.anchor, niveaux2: [] }
      parNiveau1.set(groupe.niv1, entree)
      niveaux2Vus.set(groupe.niv1, new Set())
      entrees.push(entree)
    }

    if (!groupe.niv2.trim()) continue
    const vus = niveaux2Vus.get(groupe.niv1)!
    if (vus.has(groupe.niv2)) continue
    vus.add(groupe.niv2)
    entree.niveaux2.push({ niv2: groupe.niv2, anchor: groupe.anchor })
  }

  return entrees
}
