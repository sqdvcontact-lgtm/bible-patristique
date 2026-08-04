'use client'

// Colonne d'actions d'un verset biblique (signaler · prélever · copier), reprise du
// système de la page Bible (TexteBible) mais autonome : utilisable partout où l'on
// affiche des versets (page péricope, etc.). Les boutons sont masqués au repos et
// révélés au survol de la ligne parente (`.bouton-action-verset`, cf. le CSS de la
// page hôte) ; toujours visibles au tactile.

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import IconeSignet from '@/app/components/IconeSignet'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import ModalSignalement from '@/app/components/ModalSignalement'

const BTN: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px',
  borderRadius: '3px', width: '18px', height: '18px', display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
  lineHeight: 1, flexShrink: 0, transition: 'color 0.15s',
}

export type ActionsVersetProps = {
  idVerset: string
  refAffichee: string        // « Gn 3, 1 » — titre de la modale de signalement
  nomLivre: string
  refLivreAbr: string
  chapitre: number
  verset: number
  texte: string
  tradLabel: string
  userId: string | null
  prelevementId: string | null
  onPreleve: (cle: string, id: string) => void
  onRetire: (cle: string) => void
}

export default function ActionsVerset({
  idVerset, refAffichee, nomLivre, refLivreAbr, chapitre, verset, texte,
  tradLabel, userId, prelevementId, onPreleve, onRetire,
}: ActionsVersetProps) {
  const cle = `${refLivreAbr}|${chapitre}|${verset}`
  const [copie, setCopie] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [signalOuvert, setSignalOuvert] = useState(false)

  const copier = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(texte).then(() => {
      setCopie(true); setTimeout(() => setCopie(false), 1400)
    }).catch(() => {})
  }

  const signaler = async (msg: string, importance?: string) => {
    const { data } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/signalements', {
      method: 'POST', headers,
      body: JSON.stringify({ id_verset: idVerset, message: msg, importance, url_source: window.location.href }),
    })
    if (!res.ok) {
      const details = await res.json().catch(() => null)
      throw new Error(details?.error ?? "Erreur d'envoi du signalement")
    }
  }

  const preleve = !!prelevementId

  const basculerPrelevement = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!userId || chargement) return
    setChargement(true)
    if (preleve) {
      await supabase.from('prelevements').delete().eq('id', prelevementId)
      onRetire(cle)
    } else {
      const { data, error } = await supabase.from('prelevements').insert({
        user_id: userId, type: 'biblique',
        ref_livre: nomLivre, ref_livre_abr: refLivreAbr,
        ref_chapitre: chapitre, ref_verset: verset,
        texte, traduction: tradLabel,
      }).select('id').single()
      if (!error && data) onPreleve(cle, data.id)
    }
    setChargement(false)
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {/* Même ordre que la page Bible (TexteBible) : prélever · copier · signaler. */}
      {userId && (
        <button onClick={basculerPrelevement} disabled={chargement}
          className="bouton-action-verset"
          title={preleve ? 'Retirer des prélèvements' : 'Enregistrer dans mes prélèvements'}
          aria-label={preleve ? 'Retirer des prélèvements' : 'Enregistrer'}
          style={{ ...BTN, opacity: preleve ? 1 : 0, color: preleve ? 'var(--cs-vert)' : 'var(--cs-bord)' }}>
          {chargement ? '…' : <IconeSignet plein={preleve} />}
        </button>
      )}

      <button onClick={copier} className="bouton-action-verset" title="Copier ce verset" aria-label="Copier"
        style={{ ...BTN, opacity: 0, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }}>
        {copie ? '✓' : (
          <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display: 'block' }}>
            <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </button>

      <button onClick={e => { e.stopPropagation(); setSignalOuvert(true) }}
        className="bouton-action-verset" title="Signaler une erreur" aria-label="Signaler"
        style={{ ...BTN, opacity: 0, color: 'var(--cs-bord)' }}>
        <IconeDrapeau />
      </button>

      {signalOuvert && (
        <ModalSignalement titre={refAffichee} texteObjet={texte} avecNiveauImportance
          onClose={() => setSignalOuvert(false)} onEnvoyer={signaler} />
      )}
    </span>
  )
}
