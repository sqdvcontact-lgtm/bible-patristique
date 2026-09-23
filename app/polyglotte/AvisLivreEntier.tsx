'use client'

// ── « Livre entier » : on prévient AVANT de charger ─────────────────────────────
//
// Demande de l'auteur (2026-09-23) : quand on passe en mode « livre entier », dire
// dans une petite fenêtre que ce mode mobilise beaucoup de texte et que la page peut
// perdre en fluidité, et opérer cet avertissement AVANT de charger le texte. La
// fenêtre est donc une question : rien ne se charge tant qu'on n'a pas choisi
// « Afficher le livre entier ».
//
// ⚠️ « Ne plus me prévenir » se retient dans le navigateur (`CLE_AVIS_LIVRE_ENTIER`) :
// une question posée à chaque passage deviendrait un obstacle. C'est une commodité de
// ce poste, non une préférence de compte.
//
// ⛔ Même composition que `ModaleLivreAbsent` : rubrique en capitales espacées, nom en
// sérif, filet, phrase, et un calque qui part sous la barre de navigation.

import { Z_MODALE } from '@/app/lib/empilement'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

const SERIF = 'var(--font-source-serif), Georgia, serif'

export const CLE_AVIS_LIVRE_ENTIER = 'polyglotte-avis-livre-entier'

/** Vrai si le lecteur a demandé, sur ce poste, à ne plus être prévenu. */
export function avisLivreEntierEteint(): boolean {
  try { return window.localStorage.getItem(CLE_AVIS_LIVRE_ENTIER) === 'eteint' } catch { return false }
}

export default function AvisLivreEntier({ nomLivre, onConfirmer, onAnnuler }: {
  nomLivre: string
  onConfirmer: () => void
  onAnnuler: () => void
}) {
  const boite = useRef<HTMLDivElement>(null)
  const [nePlusPrevenir, setNePlusPrevenir] = useState(false)
  useFenetreModale(boite)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onAnnuler() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onAnnuler])

  const confirmer = () => {
    if (nePlusPrevenir) {
      try { window.localStorage.setItem(CLE_AVIS_LIVRE_ENTIER, 'eteint') } catch { /* stockage indisponible */ }
    }
    onConfirmer()
  }

  if (typeof document === 'undefined') return null

  const bouton: React.CSSProperties = {
    padding: '6px 14px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
    fontFamily: 'inherit', lineHeight: 1.2,
  }

  return createPortal(
    <div onClick={onAnnuler}
      /* ⚠️ Le calque est une OMBRE, non un jeton d'encre (charte, § Encre contre aplat). */
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div ref={boite} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cs-livre-entier-titre" aria-describedby="cs-livre-entier-propos"
        style={{ position: 'relative', background: 'var(--cs-surface)', borderRadius: '12px', border: '1px solid var(--cs-bord)', width: '100%', maxWidth: '24rem', maxHeight: '100%', overflowY: 'auto', boxShadow: 'var(--cs-ombre-modale)', padding: '20px 24px 20px' }}>

        <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>
          Livre entier
        </p>
        <h2 id="cs-livre-entier-titre"
          style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.2 }}>
          {nomLivre}
        </h2>
        <div style={{ height: '1px', background: 'var(--cs-bord-clair)', margin: '14px 0 13px' }} />

        <p id="cs-livre-entier-propos" style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.55, margin: 0 }}>
          Ce mode compose le livre d’un bout à l’autre, dans chaque colonne. Cela fait
          beaucoup de texte à la fois : la page peut mettre un moment à s’afficher et perdre
          en fluidité, surtout avec de nombreuses colonnes.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '14px', fontSize: '0.71875rem', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
          <input type="checkbox" checked={nePlusPrevenir} onChange={e => setNePlusPrevenir(e.target.checked)} style={{ accentColor: 'var(--cs-vert)', margin: 0 }} />
          Ne plus me prévenir
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
          <button type="button" onClick={onAnnuler}
            style={{ ...bouton, border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)' }}>
            Rester au chapitre
          </button>
          <button type="button" onClick={confirmer}
            style={{ ...bouton, border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', fontWeight: 500 }}>
            Afficher le livre entier
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
