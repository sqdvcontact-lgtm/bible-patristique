// Le champ de recherche d'un volet de catalogue — loupe à gauche, croix d'effacement à
// droite —, écrit une seule fois. La bibliographie, le catalogue des péricopes et la
// frise de l'histoire en portaient chacun sa copie, et la troisième avait déjà dérivé
// (loupe à une autre encre, pas de place réservée à la croix).
//
// Composant pur, sans crochet : il se rend aussi hors du navigateur.

import { SERIF } from '@/app/lib/polices'

type Props = {
  valeur: string
  surChangement: (valeur: string) => void
  placeholder: string
  ariaLabel: string
  /** Repère de la visite guidée, quand la page en offre une. */
  dataVisite?: string
}

export default function ChampRechercheVolet({ valeur, surChangement, placeholder, ariaLabel, dataVisite }: Props) {
  return (
    <div data-visite={dataVisite} style={{ position: 'relative', marginTop: '2px' }}>
      <input value={valeur} onChange={e => surChangement(e.target.value)} type="text"
        placeholder={placeholder} aria-label={ariaLabel}
        style={{ width: '100%', boxSizing: 'border-box', fontFamily: SERIF, fontSize: '0.75rem', padding: '7px 24px 7px 28px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', outline: 'none' }} />
      <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden
        style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', stroke: 'var(--cs-texte-second)', opacity: 0.75 }}>
        <circle cx="5.5" cy="5.5" r="4.5" strokeWidth="1.2" />
        <line x1="9" y1="9" x2="12" y2="12" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      {valeur && (
        <button type="button" onClick={() => surChangement('')} aria-label="Effacer la recherche"
          style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-second)', fontSize: '0.8125rem', lineHeight: 1, padding: 0 }}>✕</button>
      )}
    </div>
  )
}
