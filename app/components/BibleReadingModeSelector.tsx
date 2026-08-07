'use client'

import type { BibleReadingMode, BibleReadingModeOption } from '@/app/lib/bibleReadingModes'

type Props = {
  value: BibleReadingMode
  modes: readonly BibleReadingModeOption[]
  onChange: (mode: BibleReadingMode) => void
}

/**
 * Sélecteur volontairement ignorant des identifiants de traduction et des tables.
 * Le parent lui fournit uniquement les modes effectivement lisibles.
 */
export default function BibleReadingModeSelector({ value, modes, onChange }: Props) {
  if (modes.length < 2) return null

  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
      <legend className="sr-only">Mode de lecture</legend>
      <div role="group" aria-label="Mode de lecture" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {modes.map((mode) => (
          <button
            key={mode.value}
            type="button"
            aria-pressed={value === mode.value}
            title={mode.description}
            onClick={() => onChange(mode.value)}
            style={{
              border: '1px solid var(--cs-bord)',
              borderRadius: '999px',
              background: value === mode.value ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-surface)',
              color: value === mode.value ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '0.6875rem',
              padding: '0.25rem 0.625rem',
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

