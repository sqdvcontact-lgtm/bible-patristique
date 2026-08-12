import type { CSSProperties, ReactNode } from 'react'
import { decouperSiecles } from '../lib/siecles'

export type HistoricalDateVariant = 'long' | 'short'

type HistoricalDateProps = {
  value: string | null | undefined
  variant: HistoricalDateVariant
}

const ESPACE_INSECABLE = '\u00a0'

export const STYLE_DATE_ROMAIN: CSSProperties = {
  fontVariantCaps: 'all-small-caps',
  fontFeatureSettings: '"smcp" 1, "c2sc" 1',
}

// Décalage maîtrisé plutôt que `vertical-align: super` (qui montait le « e » beaucoup
// trop haut, au-dessus de la casse du chiffre). Accordé au module `siecles.tsx`.
export const STYLE_DATE_ORDINAL: CSSProperties = {
  fontSize: '0.68em',
  lineHeight: 0,
  verticalAlign: 'baseline',
  position: 'relative',
  top: '-0.5em',
}

/** Harmonise seulement l'espacement typographique d'une chaîne établie en base. */
export function espacerIntervallesHistoriques(value: string): string {
  return value.trim().replace(/\s*–\s*/g, `${ESPACE_INSECABLE}–${ESPACE_INSECABLE}`)
}

function rendreFragments(value: string, keyPrefix: string): ReactNode[] {
  return decouperSiecles(value).map((fragment, index) => {
    const key = `${keyPrefix}-${index}`
    if (fragment.t === 'romain') return <span key={key} style={STYLE_DATE_ROMAIN}>{fragment.v}</span>
    if (fragment.t === 'ordinal') return <sup key={key} style={STYLE_DATE_ORDINAL}>{fragment.v}</sup>
    return fragment.v
  })
}

/**
 * Rend une date historique déjà rédigée par la base, sans recalculer ses bornes.
 * La variante courte réserve l'italique au seul préfixe « c. ».
 */
export default function HistoricalDate({ value, variant }: HistoricalDateProps) {
  if (!value) return null
  const date = espacerIntervallesHistoriques(value)
  const circa = variant === 'short' && /^c\.(?=\s|$)/.test(date)

  return (
    <span data-historical-date={variant}>
      {circa ? <><em>c.</em>{rendreFragments(date.slice(2), 'date')}</> : rendreFragments(date, 'date')}
    </span>
  )
}
