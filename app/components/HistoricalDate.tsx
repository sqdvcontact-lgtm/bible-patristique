import type { CSSProperties, ReactNode } from 'react'
import { decouperSiecles, STYLE_ORDINAL } from '../lib/siecles'

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

// ⛔ Ne pas redéfinir l'exposant ici : `STYLE_ORDINAL` fait foi pour tout le
// site, et `vertical-align: super` relève l'ordinal du double de ce qu'il faut
// (voir la mesure en tête de `siecles.tsx`). Le corps était de surcroît à
// 0,68 em quand le reste du site compose à 0,6 em.
export const STYLE_DATE_ORDINAL: CSSProperties = STYLE_ORDINAL

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
