import type { AlignementDisponible } from './oeuvreTypes'

export type MembreComparable = {
  alignment_id: string
  role: 'reference' | 'aligned'
  member_order: number
  segment_key: string
}

export type GroupeComparable = { status: string | null }
export type FiltreAlignement = 'tous' | 'uncertain'

// Une division alignée = un couple (livre, division canonique). L'ordre de la
// liste est l'ordre de lecture (livre puis division), et sert autant au sommaire
// qu'à la barre de circulation « ‹ Livre — Division › ». `niv1`/`niv2` portent le
// titre EXACT de la traduction de référence (ex. « LIVRE PREMIER » / « I »), pour
// que le sommaire soit identique à celui de la lecture ; à défaut, on retombe sur
// les libellés génériques.
export type DivisionAlignee = { book: number; division: number; niv1?: string; niv2?: string }

// Libellés d'affichage. Partagés entre le sommaire de gauche, la barre de
// circulation et le composant de rendu, pour qu'une seule table fasse foi.
export const LIVRES_COMPARAISON = ['PREMIER', 'DEUXIÈME', 'TROISIÈME', 'QUATRIÈME', 'CINQUIÈME']
export const ROMAINS_COMPARAISON = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV']

export function libelleLivreComparaison(book: number) {
  return LIVRES_COMPARAISON[book - 1] ?? String(book)
}
export function libelleDivisionComparaison(division: number) {
  return ROMAINS_COMPARAISON[division - 1] ?? String(division)
}

// Réduit les lignes de `texte_alignements` à la liste ordonnée et sans doublon
// des divisions alignées (un livre porte plusieurs groupes par division).
export function dedupeDivisions(rows: { book: number; canonical_division_order: number }[]): DivisionAlignee[] {
  const uniques = new Map<string, DivisionAlignee>()
  for (const row of rows) uniques.set(`${row.book}|${row.canonical_division_order}`, { book: row.book, division: row.canonical_division_order })
  return [...uniques.values()]
}

// Division précédente (-1) ou suivante (+1) dans l'ordre de lecture ; null aux
// extrémités. Alimente les flèches « ‹ › » de la barre de circulation.
export function divisionVoisine(divisions: DivisionAlignee[], book: number, division: number, sens: -1 | 1): DivisionAlignee | null {
  const index = divisions.findIndex(item => item.book === book && item.division === division)
  if (index < 0) return null
  return divisions[index + sens] ?? null
}

// Vrai si la division courante figure dans la liste alignée. Sert à recaler la
// navigation sur la première division disponible quand l'entrée est hors liste.
export function divisionPresente(divisions: DivisionAlignee[], book: number, division: number) {
  return divisions.some(item => item.book === book && item.division === division)
}

export function comparaisonDisponible(alignements: AlignementDisponible[]) {
  // La confidentialité repose sur la RLS et sur la liste des versions accessibles
  // construite par le composant serveur. Le mode apparaît seulement si les deux
  // textes de l'alignement sont effectivement visibles pour la session courante.
  return alignements.length > 0
}

export function choisirAlignement(
  alignements: AlignementDisponible[],
  alignmentSetId?: string | null,
) {
  return alignements.find(alignement => alignement.alignmentSetId === alignmentSetId)
    ?? alignements[0]
    ?? null
}

export function groupesSelonFiltre<T extends GroupeComparable>(
  groupes: T[],
  filtre: FiltreAlignement,
) {
  return filtre === 'uncertain'
    ? groupes.filter(groupe => groupe.status === 'uncertain')
    : groupes
}

export function membresOrdonnesParGroupe(membres: MembreComparable[]) {
  const resultat = new Map<string, { reference: MembreComparable[]; aligned: MembreComparable[] }>()
  for (const membre of membres) {
    const groupe = resultat.get(membre.alignment_id) ?? { reference: [], aligned: [] }
    groupe[membre.role].push(membre)
    resultat.set(membre.alignment_id, groupe)
  }
  for (const groupe of resultat.values()) {
    groupe.reference.sort((a, b) => a.member_order - b.member_order)
    groupe.aligned.sort((a, b) => a.member_order - b.member_order)
  }
  return resultat
}
