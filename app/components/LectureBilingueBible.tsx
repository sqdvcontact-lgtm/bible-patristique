'use client'

// Enveloppe de la lecture « Latin & Français » : même châssis que la lecture
// ordinaire — en-tête, navigation de chapitre, zone de défilement — pour que le
// passage d'un mode à l'autre ne déplace rien à l'écran. Le corps est rendu par
// `BibleBilingue`, et la logique d'appariement par `bibleEditionBilingue.ts`.

import { useNaviguer } from '@/app/lib/attenteNavigation'

import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import { urlLectureBible } from '@/app/lib/bibleNavigation'
import BibleBilingue, { type LectureBilingueProps } from './BibleBilingue'
import SelecteurTraductionBible from './SelecteurTraductionBible'

export type LectureBilingueBibleProps = LectureBilingueProps & {
  livreActif: string
  chapitreActif: number
  nomLivre: string
  tradCode: string
  /** Toutes les bibles lisibles, pour que le menu central reste entier ici aussi. */
  traductions: readonly { code: string; label: string }[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
}

export default function LectureBilingueBible({
  livreActif,
  chapitreActif,
  nomLivre,
  tradCode,
  traductions,
  traductionIndex,
  setTraductionIndex,
  mobile = false,
  ...contenu
}: LectureBilingueBibleProps) {
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre de la lecture tant que la page se prépare.
  const naviguer = useNaviguer()
  const allerAuChapitre = (chapitre: number) => {
    naviguer(urlLectureBible({ livre: livreActif, chapitre, trad: tradCode, mode: 'verse', bilingue: true }))
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
      {/* ⛔ Le passage simple ↔ bilingue ne doit déplacer NI le titre NI le menu.
          L'en-tête simple se centre sur le bloc de texte de 500 px et réserve à
          droite la gouttière d'actions de 38 px : centrer ici sur toute la largeur
          décalait « Genèse ❧ Chapitre N » de 19 px au changement de lecture.
          Même gabarit, mêmes teintes, mêmes survols : seul le CORPS devient double. */}
      <div style={{ borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', padding: '14px 32px 10px' }}>
        <style>{`
          .nav-chap-arrow:hover { color: var(--cs-mention) !important; }
        `}</style>

        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: 'minmax(0, var(--mesure-bloc)) 2.375rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            {chapitreActif > 1 ? (
              <button onClick={() => allerAuChapitre(chapitreActif - 1)} className="nav-chap-arrow" style={fleche} title="Chapitre précédent">‹</button>
            ) : (
              <span style={{ color: 'var(--cs-bord)', fontSize: '1.25rem', lineHeight: 1 }}>‹</span>
            )}
            <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>{nomLivre}</span>
              <span style={{ color: '#b0a088', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
              {/* Même voix éditoriale que la lecture simple : le chapitre ne
                  redevient pas vert parce que le texte passe en deux colonnes. */}
              <span style={{ fontSize: '1.0625rem', color: 'var(--cs-mention)', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
            </h1>
            <button onClick={() => allerAuChapitre(chapitreActif + 1)} className="nav-chap-arrow" style={fleche} title="Chapitre suivant">›</button>
          </div>
          <div />
        </div>

        {/* Le MÊME menu central qu'en lecture ordinaire : même axe de 500 px,
            gouttière d'actions exclue. On doit pouvoir changer de bible sans
            quitter d'abord la lecture en regard. Choisir une autre bible en sort
            d'elle-même, la famille éditoriale n'étant pas la même. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0.5rem auto 0', display: mobile ? 'block' : 'grid', gridTemplateColumns: 'minmax(0, var(--mesure-bloc)) 2.375rem', alignItems: 'center' }}>
          <SelecteurTraductionBible
            traductions={traductions}
            traductionIndex={traductionIndex}
            setTraductionIndex={setTraductionIndex}
          />
          <div />
        </div>
      </div>

      {/* Même garde que la lecture simple : la barre de défilement rétrécit la
          boîte de contenu sur certains navigateurs. Sans gouttière réservée des
          DEUX côtés, le corps bilingue glisse d'une demi-largeur de scrollbar
          par rapport à l'en-tête au moment où elle apparaît. */}
      <div
        className={mobile ? '' : 'flex-1 overflow-y-auto'}
        style={{
          padding: mobile ? '1rem 1.125rem 0' : '1.5rem 2rem 3rem',
          ...(mobile ? {} : { scrollbarGutter: 'stable both-edges' }),
        }}
      >
        <div className="cs-lecture-colonne" style={{ maxWidth: mobile ? '100%' : '52rem', margin: '0 auto' }}>
          <BibleBilingue {...contenu} mobile={mobile} />
        </div>
      </div>
    </div>
  )
}
