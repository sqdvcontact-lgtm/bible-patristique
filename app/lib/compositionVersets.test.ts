import { describe, expect, it } from 'vitest'
import {
  BLANC_ENTRE_VERSETS,
  NATURE_VERSET,
  RETRAIT_VERSET,
  RETRAIT_VERSET_ETROIT,
  estBlocVersets,
} from './compositionVersets'

describe('le bloc de versets', () => {
  it('reconnaît une suite entièrement composée de versets', () => {
    expect(estBlocVersets(['verset', 'verset', 'verset'])).toBe(true)
  })

  it('refuse une suite qui mêle un verset à de la prose', () => {
    expect(estBlocVersets(['verset', 'texte'])).toBe(false)
    expect(estBlocVersets(['texte', 'verset'])).toBe(false)
  })

  it('ne confond pas le VERSET avec le VERS', () => {
    expect(estBlocVersets(['vers', 'vers'])).toBe(false)
    expect(estBlocVersets(['verset', 'vers'])).toBe(false)
  })

  it('refuse un bloc vide, et une nature absente', () => {
    expect(estBlocVersets([])).toBe(false)
    expect(estBlocVersets([null, undefined])).toBe(false)
    expect(estBlocVersets(['verset', null])).toBe(false)
  })
})

describe('les mesures du style', () => {
  it('nomme la nature en toutes lettres', () => {
    expect(NATURE_VERSET).toBe('verset')
  })

  it('reprend le retrait de la citation sortie, et le resserre sur écran étroit', () => {
    expect(RETRAIT_VERSET).toBe('8mm')
    expect(RETRAIT_VERSET_ETROIT).toBe('5mm')
  })

  it('laisse entre deux versets un blanc bien moindre que celui de la prose', () => {
    // La prose sépare ses paragraphes de 0,72 rem : le blanc du verset en est le tiers.
    expect(Number.parseFloat(BLANC_ENTRE_VERSETS)).toBeLessThan(0.72 / 2)
    expect(Number.parseFloat(BLANC_ENTRE_VERSETS)).toBeGreaterThan(0)
  })
})
