import type { AlignementDisponible } from './oeuvreTypes'

export type MembreComparable = {
  alignment_id: string
  role: 'reference' | 'aligned'
  member_order: number
  segment_key: string
}

export type GroupeComparable = { status: string | null }
export type FiltreAlignement = 'tous' | 'uncertain'

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
