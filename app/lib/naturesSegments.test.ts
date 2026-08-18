import { describe, expect, it } from 'vitest'
import { NATURE_VALIDES, normaliserNatureSegment } from './naturesSegments'

describe('vocabulaire des importateurs génériques', () => {
  it('contient exactement les natures autorisées', () => {
    expect(NATURE_VALIDES).toEqual([
      'texte', 'citation', 'lemme', 'vers', 'rubrique', 'dialogue',
      'introduction', 'apparat_critique', 'separateur', 'texte absent',
      'signature',
    ])
  })

  it.each(['vers', 'dialogue', 'rubrique'] as const)('accepte %s sans la modifier', nature => {
    expect(normaliserNatureSegment(nature)).toBe(nature)
  })

  it('rabât une valeur inconnue sur texte', () => {
    expect(normaliserNatureSegment('inconnue')).toBe('texte')
  })
})
