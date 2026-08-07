import { describe, expect, it } from 'vitest'

import {
  capabilitiesForTranslation,
  selectableReadingModes,
  type TranslationReadingCapabilities,
} from './bibleReadingModes'

describe('capacités des modes de lecture biblique', () => {
  it.each(['TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005'])(
    'conserve le seul mode verset pour %s',
    (translationId) => {
      expect(selectableReadingModes(capabilitiesForTranslation(translationId)).map((mode) => mode.value))
        .toEqual(['verse'])
    },
  )

  it('ne rend aucun mode TR0009 sélectionnable avant la disponibilité de ses projections', () => {
    expect(selectableReadingModes(capabilitiesForTranslation('TR0009'))).toEqual([])
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
})

