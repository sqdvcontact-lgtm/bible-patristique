export const BIBLE_READING_MODE_ORDER = [
  'verse',
  'native',
  'diplomatic',
  'expanded',
  'paragraph',
  'modernized',
] as const

export type BibleReadingMode = (typeof BIBLE_READING_MODE_ORDER)[number]
export type BibleReadingModeAvailability = 'available' | 'planned' | 'unavailable'

export type BibleReadingModeCapability = {
  mode: BibleReadingMode
  availability: BibleReadingModeAvailability
  /** Identifie le contrat de données, sans imposer une table au composant. */
  /** `versets-v2` : le texte vit dans `versets_v2`, aligné sur `canon_id`, sans colonne
   *  dans `versets_lecture` ni segmentation éditoriale (la traduction moderne de la
   *  Bible du XIIIe siècle, TR0013, est la première). Voir `withCanonicalV2Capability`. */
  source: 'canonical-verses' | 'source-units' | 'native-divisions' | 'editorial-segments' | 'versets-v2'
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
  paragraph: {
    label: 'Paragraphes',
    description: 'Paragraphes issus d’une segmentation éditoriale validée',
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

export function canonicalCapabilities(translationId: string): TranslationReadingCapabilities {
  return {
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

