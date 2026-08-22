'use client'

// Bouton « copier » d'une ligne de lecture — verset ou segment. Un seul dessin pour
// tout le site : la page Bible, le Polyglotte, les péricopes et les œuvres montraient
// le même geste, mais chacune avec sa propre copie du bouton.
//
// Il ne compose pas la citation : il reçoit le texte DÉJÀ prêt. C'est voulu, car la
// forme diffère d'une surface à l'autre — un verset se cite « … » (Gn 1, 1), un segment
// patristique porte son auteur, son titre et son édition. Le bouton ne connaît que le
// presse-papiers ; ce qu'on y met regarde l'appelant.

import { useState } from 'react'

/** Durée de l'accusé de réception, en millisecondes. Assez long pour être vu, assez
 *  court pour ne pas laisser croire que le bouton est resté enfoncé. */
const DUREE_ACCUSE_MS = 1400

export default function BoutonCopierTexte({
  texte,
  style,
  className,
  titre = 'Copier',
}: {
  texte: string
  style?: React.CSSProperties
  className?: string
  titre?: string
}) {
  const [copie, setCopie] = useState(false)

  const copier = (e: React.MouseEvent) => {
    // ⛔ `stopPropagation` : sur toutes les surfaces, la ligne elle-même est cliquable
    // (elle se sélectionne). Sans cela, copier sélectionnerait aussi.
    e.stopPropagation()
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true)
      setTimeout(() => setCopie(false), DUREE_ACCUSE_MS)
    })
  }

  return (
    <button onClick={copier} title={titre} aria-label={titre} className={className}
      style={{ ...style, color: copie ? 'var(--cs-vert)' : (style?.color ?? 'var(--cs-texte-faible)') }}>
      {copie ? '✓' : (
        <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display: 'block' }}>
          <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
    </button>
  )
}
