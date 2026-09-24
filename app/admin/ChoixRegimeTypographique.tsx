'use client'

// Le RÉGIME d'une édition, déclaré au moment de l'importer (charte § 3.2). Une édition
// moderne entre composée : espaces fines, apostrophe typographique, s long et ligatures
// développés. Un témoin médiéval ou une transcription diplomatique entre tel quel. Aucune
// option n'est cochée d'avance : un régime deviné ne vaut pas déclaration, et l'import
// attend qu'on ait choisi.

import type { RegimeTypographique } from '@/app/lib/typographieEdition'
import { STYLE_RUBRIQUE } from '@/app/lib/hierarchieTitres'

const OPTIONS: { valeur: RegimeTypographique; nom: string; glose: string }[] = [
  {
    valeur: 'edition',
    nom: 'Édition moderne',
    glose: 'La typographie du site est posée à l’import. Espaces fines, apostrophe typographique, s long et ligatures développés.',
  },
  {
    valeur: 'diplomatique',
    nom: 'Témoin médiéval ou transcription diplomatique',
    glose: 'Le texte entre tel quel, sans aucune composition.',
  },
]

export default function ChoixRegimeTypographique({
  nom,
  valeur,
  onChange,
  desactive = false,
}: {
  nom: string
  valeur: RegimeTypographique | null
  onChange: (regime: RegimeTypographique) => void
  desactive?: boolean
}) {
  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'grid', gap: '6px' }} disabled={desactive}>
      <legend style={{ ...STYLE_RUBRIQUE, padding: 0, marginBottom: '6px' }}>Régime de l’édition</legend>
      {OPTIONS.map(o => (
        <label key={o.valeur} style={{ display: 'flex', gap: '8px', alignItems: 'baseline', cursor: desactive ? 'default' : 'pointer' }}>
          <input
            type="radio"
            name={nom}
            value={o.valeur}
            checked={valeur === o.valeur}
            onChange={() => onChange(o.valeur)}
            style={{ accentColor: 'var(--cs-vert)', margin: 0, flexShrink: 0 }}
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: 'var(--cs-encre)' }}>{o.nom}</span>
            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--cs-texte-second)' }}>{o.glose}</span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
