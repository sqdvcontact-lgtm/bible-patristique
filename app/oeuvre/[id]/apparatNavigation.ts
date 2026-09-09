import type { SectionApparat } from '@/app/lib/oeuvreSelects'
import type { GroupeData } from './oeuvreTypes'

export type Niveau2NavigationApparat = {
  niv2: string
  anchor: string
}

export type EntreeNavigationApparat = {
  niv1: string
  anchor: string
  niveaux2: Niveau2NavigationApparat[]
  /** La main dont la pièce est : le sommaire coupe là où la vue coupe. */
  section: SectionApparat
}

type GroupeNavigationApparat = Pick<GroupeData, 'niv1' | 'niv2' | 'anchor' | 'section'>

/**
 * Projette les groupes de l'apparat en navigation hiérarchique sans fabriquer de
 * titres. Un même livre n'apparaît qu'une fois, mais conserve chacun de ses
 * niveaux 2 et l'ancre réelle du premier groupe correspondant.
 *
 * ⛔ « Une fois » s'entend PAR MAIN depuis le 9 septembre 2026 : la vue porte les deux
 * apparats, celui de l'auteur et celui de l'éditeur, et un même `ref_niv1` des deux
 * côtés, une « Préface » de chacun, ne donnerait qu'une entrée, qui mènerait à l'une et
 * perdrait l'autre.
 */
export function construireNavigationApparat(
  groupes: readonly GroupeNavigationApparat[],
): EntreeNavigationApparat[] {
  const entrees: EntreeNavigationApparat[] = []
  // ⚠️ Deux tables emboîtées plutôt qu'une clé composée : un titre porte des tirets, des
  // deux-points et des espaces, et tout séparateur qu'on choisirait finirait un jour au
  // milieu d'un intitulé plutôt qu'entre les deux parties de la clé.
  const parSection = new Map<SectionApparat, Map<string, EntreeNavigationApparat>>()
  const niveaux2Vus = new Map<EntreeNavigationApparat, Set<string>>()

  for (const groupe of groupes) {
    if (!groupe.niv1.trim()) continue

    const section: SectionApparat = groupe.section ?? 'editeur'
    const parNiveau1 = parSection.get(section) ?? new Map<string, EntreeNavigationApparat>()
    parSection.set(section, parNiveau1)

    let entree = parNiveau1.get(groupe.niv1)
    if (!entree) {
      entree = { niv1: groupe.niv1, anchor: groupe.anchor, niveaux2: [], section }
      parNiveau1.set(groupe.niv1, entree)
      niveaux2Vus.set(entree, new Set())
      entrees.push(entree)
    }

    if (!groupe.niv2.trim()) continue
    const vus = niveaux2Vus.get(entree)!
    if (vus.has(groupe.niv2)) continue
    vus.add(groupe.niv2)
    entree.niveaux2.push({ niv2: groupe.niv2, anchor: groupe.anchor })
  }

  return entrees
}
