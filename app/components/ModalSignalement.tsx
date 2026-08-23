'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

// Modale de signalement UNIQUE, partagée par toutes les pages (Bible, Œuvre,
// Polyglotte, Panneau patristique…). Même mise en forme partout.
// `texteObjet` affiche le texte cité EN ENTIER, sous les yeux du rédacteur, afin
// qu'il garde l'objet du signalement devant lui pendant qu'il écrit.

const NIVEAUX = [
  { val: 'mineur',    label: 'Mineur',    bg: 'var(--cs-danger-fond)', bgOn: '#f0a0a0', color: '#a06060', colorOn: '#5a1010' },
  { val: 'important', label: 'Important', bg: '#fbd8d8', bgOn: '#c53030', color: 'var(--cs-danger-fonce)', colorOn: 'var(--cs-surface)' },
  { val: 'bloquant',  label: 'Bloquant',  bg: '#f5b8b8', bgOn: '#7b0000', color: '#6b1010', colorOn: 'var(--cs-surface)' },
] as const

type Niveau = 'mineur' | 'important' | 'bloquant'

export default function ModalSignalement({ titre, texteObjet, onClose, onEnvoyer, avecNiveauImportance = false, titreFenetre = 'Signaler une erreur', placeholder = "Décrivez l'erreur constatée…" }: {
  titre?: string
  texteObjet?: string
  onClose: () => void
  onEnvoyer: (msg: string, importance?: string) => Promise<void>
  avecNiveauImportance?: boolean
  titreFenetre?: string
  placeholder?: string
}) {
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [importance, setImportance] = useState<Niveau>('important')

  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try {
      await onEnvoyer(message.trim(), avecNiveauImportance ? importance : undefined)
      setStatut('ok')
      setTimeout(onClose, 1800)
    } catch (error) { console.error('Erreur signalement:', error); setStatut('err') }
  }

  // Rendu dans un PORTAIL vers <body> : sans cela, un ancêtre porteur d'un
  // `transform` (cartes au survol) devient le bloc conteneur du `position: fixed`,
  // et la fenêtre se retrouve piégée puis rognée dans le bloc (overflow: hidden).
  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--cs-surface)', borderRadius: '8px', border: '1px solid var(--cs-danger-bord)', width: '100%', maxWidth: '26.25rem', boxShadow: 'var(--cs-ombre-modale)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 40px)', overflow: 'hidden' }}>

        {/* En-tête — teinte chaude (ocre/rouge), liseré d'accent à gauche du titre. */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px 13px', borderBottom: '1px solid var(--cs-bord-clair)', background: 'linear-gradient(180deg, var(--cs-danger-fond) 0%, var(--cs-danger-fond) 100%)', flexShrink: 0 }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '9px', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: '#7a2f18', margin: 0 }}>
            <span aria-hidden="true" style={{ display: 'inline-block', width: '3px', height: '17px', borderRadius: '4px', background: 'var(--cs-danger)' }} />
            {titreFenetre}
          </p>
          <button onClick={onClose} aria-label="Fermer" style={{ fontSize: '0.9375rem', color: '#c09a86', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {statut === 'ok' ? (
          <p style={{ fontSize: '0.78125rem', color: 'var(--cs-vert)', fontStyle: 'italic', textAlign: 'center', padding: '26px 20px', margin: 0 }}>Signalement envoyé, merci !</p>
        ) : (
          <div style={{ padding: '14px 20px 18px', overflowY: 'auto' }}>
            {/* Objet du signalement : le texte cité EN ENTIER */}
            {(titre || texteObjet) && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ display: 'block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#b5764a', marginBottom: '5px' }}>Objet du signalement</span>
                {titre && <p style={{ fontSize: '0.6875rem', color: '#a85c3a', fontStyle: 'italic', margin: '0 0 5px', lineHeight: 1.45 }}>{titre}</p>}
                {texteObjet && (
                  <blockquote style={{ margin: 0, padding: '9px 12px', background: 'var(--cs-danger-fond)', border: '1px solid #efd8c6', borderLeft: '3px solid var(--cs-danger)', borderRadius: '0 4px 4px 0', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.6, maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {rendreTexteEnrichi(texteObjet)}
                  </blockquote>
                )}
              </div>
            )}

            {avecNiveauImportance && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', flexShrink: 0 }}>Niveau :</span>
                {NIVEAUX.map(n => {
                  const actif = importance === n.val
                  return (
                    <button key={n.val} onClick={() => setImportance(n.val)}
                      style={{ fontSize: '0.65625rem', padding: '3px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: actif ? 600 : 400, background: actif ? n.bgOn : n.bg, color: actif ? n.colorOn : n.color, transition: 'background 0.15s' }}>
                      {n.label}
                    </button>
                  )
                })}
              </div>
            )}

            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={placeholder} rows={4} autoFocus
              style={{ width: '100%', fontSize: '0.75rem', padding: '8px 10px', border: '1px solid var(--cs-danger-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && <span style={{ fontSize: '0.625rem', color: 'var(--cs-danger)', marginRight: 'auto' }}>Erreur d’envoi.</span>}
              <button onClick={onClose} style={{ fontSize: '0.71875rem', padding: '6px 13px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize: '0.71875rem', padding: '6px 15px', borderRadius: '4px', border: 'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? 'var(--cs-danger)' : 'var(--cs-bord-clair)', color: message.trim() ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', fontWeight: 500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
