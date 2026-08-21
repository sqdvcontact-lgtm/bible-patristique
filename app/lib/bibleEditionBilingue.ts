// Lecture bilingue d'une édition biblique : deux membres d'une même famille
// éditoriale lus en regard, synchronisés par l'axe canonique.
//
// Le principe est celui des traductions parallèles des œuvres, transposé à la
// Bible : l'axe d'alignement est le créneau canonique, jamais la numérotation
// native, que chaque colonne conserve telle que son édition l'imprime.
//
// Module pur : aucune requête, aucun rendu. Testé par bibleEditionBilingue.test.ts.

import {
  ordonnerMembresBilingues,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
  type BibleEditionDisplayNote,
  type BibleEditionMember,
} from './bibleEdition'

export type MembreBilingue = BibleEditionMember & {
  label: string
  memberRole: string
}

/** Un verset tel qu'une colonne le porte, avec la référence de SON édition. */
export type CelluleBilingue = {
  canonId: string
  texte: string
  /** Référence imprimée par cette édition, jamais recomposée depuis le canon. */
  referenceNative: string | null
}

export type ColonneBilingue = {
  membre: MembreBilingue
  cellules: readonly CelluleBilingue[]
}

export type RangeeBilingue = {
  canonId: string
  /** Une entrée par colonne, dans l'ordre des colonnes. `null` = créneau absent. */
  cellules: (CelluleBilingue | null)[]
}

export type ApparatBilingue<T> = {
  /** Communs à l'édition : rendus pleine largeur, une seule fois. */
  communs: T[]
  /** Propres à un membre : rendus dans sa colonne. */
  parMembre: Map<string, T[]>
}

type Appartenance = { appliesTo: 'family' | 'member'; appliesToMemberId: string | null }

/**
 * Ordonne les colonnes : à l'écran large, le membre placé à gauche d'abord ;
 * sur mobile, l'ordre déclaré par l'édition. Pour Fillion, le latin précède le
 * français dans les deux cas.
 */
export function colonnesBilingues(
  membres: readonly MembreBilingue[],
  surface: 'desktop' | 'mobile',
): MembreBilingue[] {
  const ordonnes = ordonnerMembresBilingues(membres)
  return (surface === 'mobile' ? ordonnes.mobile : ordonnes.desktop) as MembreBilingue[]
}

/**
 * Apparie les colonnes sur l'axe canonique fourni. Un créneau qu'une édition ne
 * porte pas laisse une cellule vide : on ne comble jamais un manque avec le
 * texte de l'autre colonne, ni avec une traduction de fortune.
 */
export function apparierRangees(
  axeCanonique: readonly string[],
  colonnes: readonly ColonneBilingue[],
): RangeeBilingue[] {
  const index = colonnes.map((colonne) => {
    const parCanon = new Map<string, CelluleBilingue>()
    for (const cellule of colonne.cellules) {
      if (!parCanon.has(cellule.canonId)) parCanon.set(cellule.canonId, cellule)
    }
    return parCanon
  })
  return axeCanonique.map((canonId) => ({
    canonId,
    cellules: index.map((parCanon) => parCanon.get(canonId) ?? null),
  }))
}

/**
 * Un créneau que AUCUNE colonne ne porte n'a pas à occuper une rangée vide.
 * Le cas se produit quand l'axe canonique vient du chapitre entier tandis que
 * l'édition s'arrête plus tôt.
 */
export function rangeesNonVides(rangees: readonly RangeeBilingue[]): RangeeBilingue[] {
  return rangees.filter((rangee) => rangee.cellules.some((cellule) => cellule !== null))
}

function repartir<T extends Appartenance>(
  elements: readonly T[],
  membres: readonly MembreBilingue[],
): ApparatBilingue<T> {
  const identifiants = new Set(membres.map((membre) => membre.id))
  const parMembre = new Map<string, T[]>()
  for (const membre of membres) parMembre.set(membre.id, [])
  const communs: T[] = []
  for (const element of elements) {
    if (element.appliesTo === 'family') {
      communs.push(element)
      continue
    }
    const cible = element.appliesToMemberId
    // Un contenu propre à un membre absent de la lecture n'est rendu nulle part :
    // le prêter à la famille le ferait paraître dans les deux colonnes.
    if (cible === null || !identifiants.has(cible)) continue
    parMembre.get(cible)?.push(element)
  }
  return { communs, parMembre }
}

/**
 * Sépare ce qui appartient à l'ensemble éditorial de ce qui appartient à une
 * langue. Les blocs communs se rendent pleine largeur, avant ou après les deux
 * colonnes : jamais dupliqués dans chacune.
 */
export function repartirBlocsDeCorps(
  blocs: readonly (BibleEditionDisplayBodyBlock & Appartenance)[],
  membres: readonly MembreBilingue[],
): ApparatBilingue<BibleEditionDisplayBodyBlock & Appartenance> {
  return repartir(blocs, membres)
}

export function repartirIllustrations(
  illustrations: readonly (BibleEditionDisplayAsset & Appartenance)[],
  membres: readonly MembreBilingue[],
): ApparatBilingue<BibleEditionDisplayAsset & Appartenance> {
  return repartir(illustrations, membres)
}

export type NoteBilingue = BibleEditionDisplayNote & Appartenance

/**
 * Les notes des deux colonnes vont dans une seule série au bas du chapitre :
 * un lecteur qui suit le latin et le français en regard ne doit pas chercher sa
 * note dans deux listes. Une note commune à l'édition n'y figure qu'une fois,
 * et les deux colonnes appellent le même identifiant.
 */
export function notesDuChapitreBilingue(
  notes: readonly NoteBilingue[],
  membres: readonly MembreBilingue[],
): NoteBilingue[] {
  const { communs, parMembre } = repartir(notes, membres)
  const retenues = [...communs]
  for (const membre of membres) retenues.push(...(parMembre.get(membre.id) ?? []))
  const vues = new Set<string>()
  return retenues
    .filter((note) => (vues.has(note.id) ? false : (vues.add(note.id), true)))
    .sort((a, b) => a.displayNumber - b.displayNumber || a.id.localeCompare(b.id))
}

/**
 * Les appels d'un verset, pour une colonne donnée : les notes communes à
 * l'édition sont appelées des DEUX colonnes, avec le même numéro et la même
 * cible, et les notes propres à une langue de la sienne seulement.
 */
export function appelsDuVerset(
  notes: readonly NoteBilingue[],
  canonId: string,
  memberId: string,
): NoteBilingue[] {
  return notes
    .filter((note) => note.canonId === canonId)
    .filter((note) => note.appliesTo === 'family' || note.appliesToMemberId === memberId)
    .sort((a, b) => a.displayNumber - b.displayNumber || a.id.localeCompare(b.id))
}

/**
 * Une famille n'est lisible en bilingue que si deux de ses membres au moins
 * sont présents. Un seul membre se lit comme une traduction ordinaire.
 */
export function lectureBilinguePossible(membres: readonly MembreBilingue[]): boolean {
  return new Set(membres.map((membre) => membre.id)).size >= 2
}

const VALEUR_ROMAINE: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }

/**
 * Fillion imprime le chapitre en chiffres romains : « I, 5 ». Le site lit en
 * chiffres arabes, « 1, 5 ».
 *
 * La conversion est un fait de RENDU, comme la typographie : la référence
 * native reste en base telle que l'édition l'imprime, et c'est elle qui fait
 * foi. Rien d'autre n'est touché — si la tête n'est pas un nombre romain bien
 * formé, la référence est rendue inchangée plutôt que devinée.
 */
export function referenceNativeEnChiffres(reference: string | null): string | null {
  if (reference === null) return null
  const decoupe = reference.match(/^([IVXLCDM]+)(\s*[,.]\s*.*)?$/)
  if (!decoupe) return reference
  const romain = decoupe[1]
  let total = 0
  for (let i = 0; i < romain.length; i += 1) {
    const valeur = VALEUR_ROMAINE[romain[i]]
    const suivante = VALEUR_ROMAINE[romain[i + 1]] ?? 0
    total += valeur < suivante ? -valeur : valeur
  }
  // Un nombre mal formé — « IIII », « VV » — se relit différemment : on ne le
  // corrige pas en silence, on rend la référence telle quelle.
  if (enChiffresRomains(total) !== romain) return reference
  return `${total}${decoupe[2] ?? ''}`
}

const RANGS_ROMAINS: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

function enChiffresRomains(valeur: number): string {
  let reste = valeur
  let sortie = ''
  for (const [poids, signe] of RANGS_ROMAINS) {
    while (reste >= poids) { sortie += signe; reste -= poids }
  }
  return sortie
}
