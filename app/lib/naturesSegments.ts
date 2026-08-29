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
  // Bloc de signatures (approbations, censeurs, souscripteurs) : composé au fer à
  // droite, interligne resserré, sans espace entre lignes de même nature.
  // ⚠️ La base la refusait jusqu’au 29 août 2026 — le rendu existait, la donnée ne
  // pouvait pas l’atteindre. Contrainte élargie : migration 20260829090000.
  'signature',
  // Verset d'une citation biblique longue que l'édition pose verset par verset.
  // Un segment = un verset ; la suite forme le bloc. Voir `compositionVersets.ts`.
  'verset',
] as const

export type NatureSegmentValide = typeof NATURE_VALIDES[number]

export function normaliserNatureSegment(nature: unknown): NatureSegmentValide {
  const valeur = String(nature ?? '')
  return (NATURE_VALIDES as readonly string[]).includes(valeur)
    ? valeur as NatureSegmentValide
    : 'texte'
}

