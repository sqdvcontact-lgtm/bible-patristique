import { describe, expect, it } from 'vitest'

import {
  canonicalCapabilities,
  selectableReadingModes,
  type TranslationReadingCapabilities,
} from './bibleReadingModes'

describe('capacités des modes de lecture biblique', () => {
  it.each(['TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005'])(
    'conserve le seul mode verset pour %s',
    (translationId) => {
      expect(selectableReadingModes(canonicalCapabilities(translationId)).map((mode) => mode.value))
        .toEqual(['verse'])
    },
  )

  it('ne déduit aucune capacité d’un identifiant de traduction particulier', () => {
    expect(selectableReadingModes(canonicalCapabilities('TEMOIN_FICTIF')).map((mode) => mode.value))
      .toEqual(['verse'])
  })

  it('refuse une modernisation non validée même si elle est annoncée disponible', () => {
    const capabilities: TranslationReadingCapabilities = {
      translationId: 'fixture',
      modes: [{
        mode: 'modernized',
        availability: 'available',
        source: 'source-units',
        validation: 'legacy-unverified',
      }],
    }
    expect(selectableReadingModes(capabilities)).toEqual([])
  })

  it('ordonne les modes disponibles indépendamment de leur ordre de déclaration', () => {
    const capabilities: TranslationReadingCapabilities = {
      translationId: 'fixture',
      modes: [
        { mode: 'expanded', availability: 'available', source: 'source-units' },
        { mode: 'verse', availability: 'available', source: 'canonical-verses' },
        { mode: 'diplomatic', availability: 'available', source: 'source-units' },
      ],
    }
    expect(selectableReadingModes(capabilities).map((mode) => mode.value))
      .toEqual(['verse', 'diplomatic', 'expanded'])
  })

  it('masque les modes annoncés indisponibles', () => {
    const capabilities: TranslationReadingCapabilities = {
      translationId: 'fixture',
      modes: [
        { mode: 'native', availability: 'available', source: 'native-divisions' },
        { mode: 'paragraph', availability: 'unavailable', source: 'editorial-segments' },
        { mode: 'verse', availability: 'unavailable', source: 'editorial-segments' },
      ],
    }
    expect(selectableReadingModes(capabilities).map((mode) => mode.value)).toEqual(['native'])
  })
})

