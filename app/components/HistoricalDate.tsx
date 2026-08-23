import type { CSSProperties, ReactNode } from 'react'
import { decouperSiecles } from '../lib/siecles'
import { espacerIntervallesHistoriques } from '../lib/datesHistoriques'

export type HistoricalDateVariant = 'long' | 'short'

type HistoricalDateProps = {
  value: string | null | undefined
  variant: HistoricalDateVariant
}

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

// L'espacement d'un intervalle vit désormais dans `datesHistoriques`, auprès du
// formateur qui l'écrit : une seule règle pour la date qu'on compose et pour celle
// qu'on lit telle quelle en base. Réexporté ici, où les appelants l'ont toujours
// trouvé.
export { espacerIntervallesHistoriques }

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
