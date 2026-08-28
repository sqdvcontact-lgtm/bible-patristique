import { describe, expect, it } from 'vitest'
import {
  BLANC_ENTRE_VERSETS,
  CLE_NUMERO_VERSET,
  NATURE_VERSET,
  RETRAIT_VERSET,
  RETRAIT_VERSET_ETROIT,
  estBlocVersets,
  numeroVersetLisible,
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

describe('le numéro de verset', () => {
  it('lit la case écrite à la main, chaîne ou nombre', () => {
    expect(numeroVersetLisible('12')).toBe('12')
    expect(numeroVersetLisible(12)).toBe('12')
    expect(numeroVersetLisible('  12  ')).toBe('12')
  })

  it('garde les formes composées que l’édition imprime', () => {
    expect(numeroVersetLisible('12-13')).toBe('12-13')
    expect(numeroVersetLisible('12a')).toBe('12a')
  })

  it('ne rend rien quand la case est vide ou absente', () => {
    expect(numeroVersetLisible(null)).toBeNull()
    expect(numeroVersetLisible(undefined)).toBeNull()
    expect(numeroVersetLisible('')).toBeNull()
    expect(numeroVersetLisible('   ')).toBeNull()
  })

  it('refuse ce qui ne peut pas être un numéro', () => {
    expect(numeroVersetLisible('douzième')).toBeNull()
    expect(numeroVersetLisible('Isaïe 40, 3 — à vérifier')).toBeNull()
    expect(numeroVersetLisible(Number.NaN)).toBeNull()
    expect(numeroVersetLisible({ v: 12 })).toBeNull()
  })

  it('ne se sert PAS de la case des vers de Boèce', () => {
    // `verse_number` porte le rang du VERS dans son poème : mêler les deux mêlerait
    // la numérotation d'un mètre de Boèce à celle d'un chapitre d'Isaïe.
    expect(CLE_NUMERO_VERSET).toBe('biblical_verse_number')
    expect(CLE_NUMERO_VERSET).not.toBe('verse_number')
  })
})
