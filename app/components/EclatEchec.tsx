'use client'

// ── L'ÉCLAT D'UN ÉCHEC ────────────────────────────────────────────────────────
//
// Le pendant de l'éclat d'une copie (`EclatCopie`) pour un geste qui n'a PAS porté :
// prélever, retirer, copier. Même halo, même durée, même place — seule l'encre change :
// la lumière prend la famille du danger, en redéfinissant localement `--cs-vert-rgb`,
// que la feuille de l'éclat lit (globals.css, § « L'ÉCLAT D'UNE COPIE »). Aucune règle de
// feuille n'est ajoutée : c'est le même objet, dans une autre encre.
//
// ⚠️ Une lumière ne se lit pas à la synthèse vocale : le message part dans une région
// vivante `role="alert"`, toujours rendue (une région qui naît avec son texte n'est pas
// annoncée). Le bouton garde son nom stable.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { DUREE_ECLAT_MS } from '@/app/components/EclatCopie'

/** Le temps pendant lequel le pictogramme garde l'encre du danger : un peu plus long que
 *  celui d'une réussite, pour qu'on ait le temps de lire l'infobulle. */
export const DUREE_ECHEC_MS = Math.max(DUREE_ECLAT_MS * 3, 1200)

/** Redéfinit, sur le bouton, la teinte que l'éclat lit : l'éclat devient rouge. */
export const STYLE_HOTE_ECHEC = { ['--cs-vert-rgb' as string]: 'var(--cs-danger-rgb)' } as CSSProperties

export function useEclatEchec() {
  const [echec, setEchec] = useState<{ rang: number; message: string } | null>(null)
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (minuteur.current) clearTimeout(minuteur.current) }, [])
  const signaler = useCallback((message: string) => {
    if (minuteur.current) clearTimeout(minuteur.current)
    setEchec(prev => ({ rang: (prev?.rang ?? 0) + 1, message }))
    minuteur.current = setTimeout(() => setEchec(null), DUREE_ECHEC_MS)
  }, [])
  return { echec, signaler }
}

/** Le halo rouge et son annonce, posés DANS le bouton (qui porte `cs-eclat-hote`). */
export function EclatEchec({ echec }: { echec: { rang: number; message: string } | null }) {
  return (
    <>
      {echec ? <span key={echec.rang} className="cs-eclat" aria-hidden="true" /> : null}
      <span className="cs-hors-ecran" role="alert">{echec ? echec.message : ''}</span>
    </>
  )
}
