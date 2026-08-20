'use client'

// Enveloppe de la lecture « Latin-français » : même châssis que la lecture
// ordinaire — en-tête, navigation de chapitre, zone de défilement — pour que le
// passage d'un mode à l'autre ne déplace rien à l'écran. Le corps est rendu par
// `BibleBilingue`, et la logique d'appariement par `bibleEditionBilingue.ts`.

import { useRouter } from 'next/navigation'

import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import BibleBilingue, { type LectureBilingueProps } from './BibleBilingue'

export type LectureBilingueBibleProps = LectureBilingueProps & {
  livreActif: string
  chapitreActif: number
  nomLivre: string
  tradCode: string
}

export default function LectureBilingueBible({
  livreActif,
  chapitreActif,
  nomLivre,
  tradCode,
  mobile = false,
  ...contenu
}: LectureBilingueBibleProps) {
  const router = useRouter()
  const allerAuChapitre = (chapitre: number) => {
    router.push(`/?livre=${livreActif}&chapitre=${chapitre}&trad=${tradCode}&mode=verse&bilingue=1`)
  }
  const quitterLeBilingue = () => {
    router.push(`/?livre=${livreActif}&chapitre=${chapitreActif}&trad=${tradCode}&mode=verse`)
  }
  const fleche = {
    color: 'var(--cs-texte-faible)', fontSize: '1.25rem', lineHeight: 1, background: 'none',
    border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s',
  } as const

  return (
    <div
      className={mobile ? 'flex flex-col' : 'flex-1 flex flex-col h-full overflow-hidden'}
      style={{
        background: 'var(--cs-fond)',
        ...(mobile
          ? { width: '100%', paddingTop: '2.875rem', paddingBottom: `calc(0.75rem + ${BANDEAU_NAV_MOBILE})` }
          : {}),
      }}
    >
      <div style={{ borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', padding: '14px 32px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          {chapitreActif > 1 ? (
            <button onClick={() => allerAuChapitre(chapitreActif - 1)} className="nav-chap-arrow" style={fleche} title="Chapitre précédent">‹</button>
          ) : (
            <span style={{ color: 'var(--cs-bord)', fontSize: '1.25rem', lineHeight: 1 }}>‹</span>
          )}
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>{nomLivre}</span>
            <span style={{ color: '#b0a088', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
            <span style={{ fontSize: '1.0625rem', color: '#5a7260', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
          </h1>
          <button onClick={() => allerAuChapitre(chapitreActif + 1)} className="nav-chap-arrow" style={fleche} title="Chapitre suivant">›</button>
        </div>
        <p style={{ margin: '0.5rem 0 0', textAlign: 'center' }}>
          <button
            onClick={quitterLeBilingue}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--cs-texte-gris)', fontSize: '0.6875rem',
              letterSpacing: '0.09em', textTransform: 'uppercase',
            }}
          >
            Revenir à une seule colonne
          </button>
        </p>
      </div>

      <div
        className={mobile ? '' : 'flex-1 overflow-y-auto'}
        style={{ padding: mobile ? '1rem 1.125rem 0' : '1.5rem 2rem 3rem' }}
      >
        <div style={{ maxWidth: mobile ? '100%' : '68rem', margin: '0 auto' }}>
          <BibleBilingue {...contenu} mobile={mobile} />
        </div>
      </div>
    </div>
  )
}
