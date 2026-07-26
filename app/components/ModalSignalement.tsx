'use client'

import { useState } from 'react'

// Modale de signalement UNIQUE, partagée par toutes les pages (Bible, Œuvre,
// Polyglotte, Panneau patristique…). Même mise en forme partout.
// `texteObjet` affiche le texte cité EN ENTIER, sous les yeux du rédacteur, afin
// qu'il garde l'objet du signalement devant lui pendant qu'il écrit.

const NIVEAUX = [
  { val: 'mineur',    label: 'Mineur',    bg: '#fef4f4', bgOn: '#f0a0a0', color: '#a06060', colorOn: '#5a1010' },
  { val: 'important', label: 'Important', bg: '#fbd8d8', bgOn: '#c53030', color: '#8a3030', colorOn: '#fff' },
  { val: 'bloquant',  label: 'Bloquant',  bg: '#f5b8b8', bgOn: '#7b0000', color: '#6b1010', colorOn: '#fff' },
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

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,20,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e4dcd0', width: '100%', maxWidth: '420px', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 40px)' }}>

        {/* En-tête — identique partout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid #f0ece6', flexShrink: 0 }}>
          <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '15px', color: '#3a342e', margin: 0 }}>{titreFenetre}</p>
          <button onClick={onClose} aria-label="Fermer" style={{ fontSize: '15px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {statut === 'ok' ? (
          <p style={{ fontSize: '12.5px', color: '#3d6b4f', fontStyle: 'italic', textAlign: 'center', padding: '26px 20px', margin: 0 }}>Signalement envoyé, merci !</p>
        ) : (
          <div style={{ padding: '14px 20px 18px', overflowY: 'auto' }}>
            {/* Objet du signalement : le texte cité EN ENTIER */}
            {(titre || texteObjet) && (
              <div style={{ marginBottom: '14px' }}>
                <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#b0a89e', marginBottom: '5px' }}>Objet du signalement</span>
                {titre && <p style={{ fontSize: '11px', color: '#9a8a6e', fontStyle: 'italic', margin: '0 0 5px', lineHeight: 1.45 }}>{titre}</p>}
                {texteObjet && (
                  <blockquote style={{ margin: 0, padding: '9px 12px', background: '#faf8f4', border: '1px solid #ece7de', borderLeft: '3px solid #cbb98e', borderRadius: '0 5px 5px 0', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '12.5px', color: '#3a342e', lineHeight: 1.6, maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {texteObjet}
                  </blockquote>
                )}
              </div>
            )}

            {avecNiveauImportance && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '10.5px', color: '#9a958d', flexShrink: 0 }}>Niveau :</span>
                {NIVEAUX.map(n => {
                  const actif = importance === n.val
                  return (
                    <button key={n.val} onClick={() => setImportance(n.val)}
                      style={{ fontSize: '10.5px', padding: '3px 10px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: actif ? 600 : 400, background: actif ? n.bgOn : n.bg, color: actif ? n.colorOn : n.color, transition: 'background 0.15s' }}>
                      {n.label}
                    </button>
                  )
                })}
              </div>
            )}

            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={placeholder} rows={4} autoFocus
              style={{ width: '100%', fontSize: '12px', padding: '8px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && <span style={{ fontSize: '10px', color: '#c0562a', marginRight: 'auto' }}>Erreur d’envoi.</span>}
              <button onClick={onClose} style={{ fontSize: '11.5px', padding: '6px 13px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize: '11.5px', padding: '6px 15px', borderRadius: '5px', border: 'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? '#c0562a' : '#e4dfd8', color: message.trim() ? '#fff' : '#9a958d', fontWeight: 500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
