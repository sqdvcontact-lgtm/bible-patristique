import { describe, expect, it } from 'vitest'

import {
  analyserReferenceNativeSimple,
  numerotationAlternative,
  referenceNativeDuSegment,
} from './bibleReferenceNative'

describe('références natives des segments bibliques', () => {
  it('préfère la référence structurée au libellé humain du segment', () => {
    expect(referenceNativeDuSegment(
      { native_reference: '50, 25' },
      'Genèse 50,25',
    )).toBe('50, 25')
  })

  it('garde le libellé en repli si la métadonnée native manque', () => {
    expect(referenceNativeDuSegment(null, 'Genèse 50,25')).toBe('Genèse 50,25')
  })

  it('analyse uniquement une référence numérique simple', () => {
    expect(analyserReferenceNativeSimple(' 32, 17 ')).toEqual({ chapitre: 32, verset: 17 })
    expect(analyserReferenceNativeSimple('XXXII, 17')).toBeNull()
    expect(analyserReferenceNativeSimple('32, 17a')).toBeNull()
  })

  it('n’affiche aucune alternative quand le numéro natif égale le canon', () => {
    expect(numerotationAlternative(50, 21, ['50, 21'])).toBeNull()
  })

  it('expose le numéro natif quand il diffère du canon', () => {
    expect(numerotationAlternative(50, 26, ['50, 25'])).toEqual({
      chapitre_alternatif: 50,
      verset_alternatif: 25,
    })
    expect(numerotationAlternative(32, 1, ['31, 55'])).toEqual({
      chapitre_alternatif: 31,
      verset_alternatif: 55,
    })
  })

  it('ne réduit jamais une fusion de références à un faux numéro unique', () => {
    expect(numerotationAlternative(10, 2, ['10, 1', '10, 2'])).toBeNull()
  })
})
