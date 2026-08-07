export const BIBLE_READING_MODE_ORDER = [
  'verse',
  'native',
  'diplomatic',
  'expanded',
  'modernized',
] as const

export type BibleReadingMode = (typeof BIBLE_READING_MODE_ORDER)[number]
export type BibleReadingModeAvailability = 'available' | 'planned' | 'unavailable'

export type BibleReadingModeCapability = {
  mode: BibleReadingMode
  availability: BibleReadingModeAvailability
  /** Identifie le contrat de données, sans imposer une table au composant. */
  source: 'canonical-verses' | 'source-units' | 'native-divisions' | 'editorial-segments'
  /** Une modernisation n'est publique que si elle est explicitement validée. */
  validation?: 'validated' | 'legacy-unverified' | 'not-applicable'
}

export type TranslationReadingCapabilities = {
  translationId: string
  modes: readonly BibleReadingModeCapability[]
}

export type BibleReadingModeOption = {
  value: BibleReadingMode
  label: string
  description: string
}

const MODE_DEFINITIONS: Record<BibleReadingMode, Omit<BibleReadingModeOption, 'value'>> = {
  verse: {
    label: 'Versets',
    description: 'Découpage éditorial aligné sur les créneaux canoniques',
  },
  native: {
    label: 'Structure native',
    description: 'Divisions matérielles propres au témoin',
  },
  diplomatic: {
    label: 'Diplomatique',
    description: 'Graphie, abréviations et coupures matérielles de la source',
  },
  expanded: {
    label: 'Abréviations développées',
    description: 'Développements éditoriaux sans modernisation de la langue',
  },
  modernized: {
    label: 'Graphie modernisée',
    description: 'Couche modernisée explicitement validée',
  },
}

export const LEGACY_CANONICAL_CAPABILITIES: readonly BibleReadingModeCapability[] = [
  {
    mode: 'verse',
    availability: 'available',
    source: 'canonical-verses',
    validation: 'not-applicable',
  },
]

/**
 * Déclaration locale transitoire. Elle documente les capacités réelles, pas les
 * capacités souhaitées. Elle pourra être remplacée par des métadonnées de la Data
 * API sans changer le sélecteur.
 */
export const DECLARED_TRANSLATION_READING_CAPABILITIES: Readonly<Record<string, TranslationReadingCapabilities>> = {
  TR0001: { translationId: 'TR0001', modes: LEGACY_CANONICAL_CAPABILITIES },
  TR0002: { translationId: 'TR0002', modes: LEGACY_CANONICAL_CAPABILITIES },
  TR0003: { translationId: 'TR0003', modes: LEGACY_CANONICAL_CAPABILITIES },
  TR0004: { translationId: 'TR0004', modes: LEGACY_CANONICAL_CAPABILITIES },
  TR0005: { translationId: 'TR0005', modes: LEGACY_CANONICAL_CAPABILITIES },
  TR0009: {
    translationId: 'TR0009',
    modes: [
      { mode: 'verse', availability: 'planned', source: 'editorial-segments' },
      { mode: 'native', availability: 'planned', source: 'native-divisions' },
      { mode: 'diplomatic', availability: 'planned', source: 'source-units' },
      { mode: 'expanded', availability: 'planned', source: 'source-units' },
      {
        mode: 'modernized',
        availability: 'unavailable',
        source: 'source-units',
        validation: 'legacy-unverified',
      },
    ],
  },
}

export function capabilitiesForTranslation(translationId: string): TranslationReadingCapabilities {
  return DECLARED_TRANSLATION_READING_CAPABILITIES[translationId] ?? {
    translationId,
    modes: LEGACY_CANONICAL_CAPABILITIES,
  }
}

export function selectableReadingModes(
  capabilities: TranslationReadingCapabilities,
): BibleReadingModeOption[] {
  const byMode = new Map(capabilities.modes.map((capability) => [capability.mode, capability]))

  return BIBLE_READING_MODE_ORDER.flatMap((mode) => {
    const capability = byMode.get(mode)
    if (!capability || capability.availability !== 'available') return []
    if (mode === 'modernized' && capability.validation !== 'validated') return []
    return [{ value: mode, ...MODE_DEFINITIONS[mode] }]
  })
}

