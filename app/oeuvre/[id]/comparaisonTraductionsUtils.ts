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

// Libellés d'affichage. Partagés entre la barre de circulation et le sélecteur
// de division, pour qu'une seule table fasse foi.
//
// ⚠️ Ne pas revenir à des tables closes : elles s'arrêtaient au cinquième livre
// et au vingt-quatrième chiffre romain, or La Cité de Dieu compte vingt-deux
// livres et va jusqu'à la cinquante-quatrième division. Tout ce qui dépassait
// retombait sur le chiffre arabe, au milieu d'une série en toutes lettres.
const ORDINAUX = [
  'PREMIER', 'DEUXIÈME', 'TROISIÈME', 'QUATRIÈME', 'CINQUIÈME', 'SIXIÈME', 'SEPTIÈME',
  'HUITIÈME', 'NEUVIÈME', 'DIXIÈME', 'ONZIÈME', 'DOUZIÈME', 'TREIZIÈME', 'QUATORZIÈME',
  'QUINZIÈME', 'SEIZIÈME', 'DIX-SEPTIÈME', 'DIX-HUITIÈME', 'DIX-NEUVIÈME', 'VINGTIÈME',
  'VINGT ET UNIÈME', 'VINGT-DEUXIÈME', 'VINGT-TROISIÈME', 'VINGT-QUATRIÈME',
]

const VALEURS_ROMAINES: [number, string][] = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
]

/** Chiffre romain, calculé et non tabulé : la série n'a pas de fin connue. */
export function chiffreRomain(n: number): string {
  if (!Number.isInteger(n) || n < 1) return String(n)
  let reste = n, sortie = ''
  for (const [valeur, signe] of VALEURS_ROMAINES) {
    while (reste >= valeur) { sortie += signe; reste -= valeur }
  }
  return sortie
}

export function libelleLivreComparaison(book: number) {
  return ORDINAUX[book - 1] ?? String(book)
}
export function libelleDivisionComparaison(division: number) {
  return chiffreRomain(division)
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

// En-tête d'une colonne. Le titre de version ne convient pas : celui de Mirandol
// tient en cent signes (« La Consolation philosophique de Boèce : traduction
// nouvelle en prose et en vers, avec le texte en regard »). Le nom du traducteur,
// lui, dit tout — et la date sépare deux traductions du même texte.
//
// Une mention de responsabilité partagée est ramenée à son premier nom :
// « H. Barreau (livres I–XX) ; M. Charpentier (livres XXI–XXII) » devient
// « H. Barreau ». Le détail se lit sur la page de titre, pas en tête de colonne.
export function libelleColonne(
  titreVersion: string,
  traducteur?: string | null,
  annee?: number | null,
) {
  const nom = String(traducteur ?? '').split(' ; ')[0].split(' (')[0].trim()
  const base = nom || titreVersion
  return annee ? `${base}, ${annee}` : base
}
