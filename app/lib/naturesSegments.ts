// Vocabulaire accepté par les deux importateurs génériques. `separateur` est
// conservé uniquement pour la compatibilité avec les anciens exports.
export const NATURE_VALIDES = [
  'texte',
  'citation',
  'lemme',
  'vers',
  'rubrique',
  'dialogue',
  'introduction',
  'apparat_critique',
  'separateur',
  'texte absent',
] as const

export type NatureSegmentValide = typeof NATURE_VALIDES[number]

export function normaliserNatureSegment(nature: unknown): NatureSegmentValide {
  const valeur = String(nature ?? '')
  return (NATURE_VALIDES as readonly string[]).includes(valeur)
    ? valeur as NatureSegmentValide
    : 'texte'
}

