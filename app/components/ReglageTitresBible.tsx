'use client'

/**
 * LA ROUE CRANTÉE DES NIVEAUX DE TITRE — page Bible, administrateur seulement.
 *
 * Sur le modèle de la roue du volet d'une œuvre (« Niveaux d'affichage ») : elle dit,
 * pour l'édition lue, quels rangs de titre la page rend. Demande de l'auteur,
 * 2026-09-21 : « il y a dans la Bible Fillion trop de niveaux de titre ».
 *
 * ⛔ Le réglage vaut pour TOUS les lecteurs de l'édition : il s'écrit dans
 * `bible_edition_families.titres_masques` (route `/api/admin/bible-titres-masques`).
 * Il se montre à l'instant, et se reprend si la base refuse.
 * ⚠️ Le panneau vit dans un portail : la carte du volet est en `overflow: hidden`, et
 * un panneau posé dedans y serait coupé.
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { Z_MODALE } from '@/app/lib/empilement'
import { OPTION_VOLET, RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { LIBELLES_RANG_TITRE, RANGS_TITRE_BIBLE, type RangTitreBible } from '@/app/lib/titresMasquesBible'
import { SANS } from '@/app/lib/polices'

const ICONE_ROUE = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2.1"/></svg>
)

export default function ReglageTitresBible({ familleId, masques, onChange }: {
  familleId: string
  masques: readonly RangTitreBible[]
  onChange: (masques: RangTitreBible[]) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const panneau = useRef<HTMLDivElement>(null)
  const fermer = useCallback(() => setOuvert(false), [])
  useFermerAEchap(ouvert, fermer)

  // La place se mesure avant la peinture, sous le bouton, bornée à la fenêtre.
  useLayoutEffect(() => {
    if (!ouvert || !bouton.current) return
    const r = bouton.current.getBoundingClientRect()
    const largeur = 15 * parseFloat(getComputedStyle(document.documentElement).fontSize)
    setPlace({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, document.documentElement.clientWidth - largeur - 8)) })
  }, [ouvert])

  // Un clic hors du panneau et du bouton le ferme.
  useLayoutEffect(() => {
    if (!ouvert) return
    const surPointeur = (e: PointerEvent) => {
      const cible = e.target as Node
      if (panneau.current?.contains(cible) || bouton.current?.contains(cible)) return
      setOuvert(false)
    }
    document.addEventListener('pointerdown', surPointeur)
    return () => document.removeEventListener('pointerdown', surPointeur)
  }, [ouvert])

  const basculer = async (rang: RangTitreBible) => {
    const avant = [...masques]
    const apres = RANGS_TITRE_BIBLE.filter((r) => (r === rang ? !avant.includes(r) : avant.includes(r)))
    onChange(apres)
    setErreur(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const reponse = await fetch('/api/admin/bible-titres-masques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ familleId, masques: apres }),
      })
      if (reponse.redirected || !(reponse.headers.get('content-type') ?? '').includes('application/json')) throw new Error('Session non reconnue.')
      const corps = await reponse.json()
      if (!reponse.ok) throw new Error(corps?.error ?? 'Le réglage n’a pas pu être enregistré.')
    } catch (e) {
      onChange(avant)
      setErreur(e instanceof Error ? e.message : 'Le réglage n’a pas pu être enregistré.')
    }
  }

  return (
    <>
      <button ref={bouton} type="button" onClick={() => setOuvert((o) => !o)}
        title="Niveaux de titre affichés (administration)" aria-label="Niveaux de titre affichés"
        aria-haspopup="dialog" aria-expanded={ouvert}
        className="cs-volet-reduire"
        style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', margin: '-2px', display: 'flex', alignItems: 'center' }}>
        {ICONE_ROUE}
      </button>
      {ouvert && place && createPortal(
        <div ref={panneau} role="dialog" aria-label="Niveaux de titre affichés"
          style={{
            position: 'fixed', top: place.top, left: place.left, width: '15rem', zIndex: Z_MODALE,
            background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px',
            boxShadow: 'var(--cs-ombre-flottante)', padding: '0.625rem 0.75rem',
            fontFamily: SANS,
          }}>
          <div style={RUBRIQUE_AXE}>Niveaux de titre affichés</div>
          <div role="group" style={{ display: 'flex', flexDirection: 'column', marginTop: '0.25rem' }}>
            {RANGS_TITRE_BIBLE.map((rang) => {
              const affiche = !masques.includes(rang)
              return (
                <button key={rang} type="button" role="checkbox" aria-checked={affiche}
                  onClick={() => basculer(rang)} className="cs-option-volet" style={OPTION_VOLET(affiche)}>
                  <span style={{ display: 'inline-block', width: '1.75rem', fontVariantNumeric: 'tabular-nums' }}>{rang}</span>
                  {LIBELLES_RANG_TITRE[rang]}
                </button>
              )
            })}
          </div>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.6875rem', lineHeight: 1.35, color: 'var(--cs-texte-second)' }}>
            Réglage de l’édition entière, pour tous les lecteurs. Un titre masqué se tait ; le texte qu’il coiffe paraît toujours.
          </p>
          {erreur && <p role="alert" style={{ margin: '0.375rem 0 0', fontSize: '0.6875rem', color: 'var(--cs-danger-fonce)' }}>{erreur}</p>}
        </div>,
        document.body,
      )}
    </>
  )
}
