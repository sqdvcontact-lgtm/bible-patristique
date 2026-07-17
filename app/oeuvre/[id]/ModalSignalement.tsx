'use client'

import { useState } from 'react'

const NIVEAUX = [
  { val: 'mineur',    label: 'Mineur',    bg: '#fef4f4', bgOn: '#f0a0a0', color: '#a06060', colorOn: '#5a1010' },
  { val: 'important', label: 'Important', bg: '#fbd8d8', bgOn: '#c53030', color: '#8a3030', colorOn: '#fff' },
  { val: 'bloquant',  label: 'Bloquant',  bg: '#f5b8b8', bgOn: '#7b0000', color: '#6b1010', colorOn: '#fff' },
] as const

type Niveau = 'mineur' | 'important' | 'bloquant'

// ── Modale signalement (centrée, overlay) ────────────────────────────────────
export default function ModalSignalement({ titre, onClose, onEnvoyer, avecNiveauImportance = false }: {
  titre: string
  onClose: () => void
  onEnvoyer: (msg: string, importance?: string) => Promise<void>
  avecNiveauImportance?: boolean
}) {
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle'|'sending'|'ok'|'err'>('idle')
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
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'#fff', borderRadius:'8px', padding:'20px 22px', width:'340px', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
          <p style={{ fontSize:'12px', fontWeight:600, color:'#c0562a', margin:0 }}>Signaler une erreur</p>
          <button onClick={onClose} style={{ fontSize:'14px', color:'#b0a89e', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}>✕</button>
        </div>
        {titre && <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', marginBottom:'10px', lineHeight:1.4 }}>{titre}</p>}
        {statut === 'ok' ? (
          <p style={{ fontSize:'11.5px', color:'#3d6b4f', fontStyle:'italic', textAlign:'center', padding:'8px 0' }}>Signalement envoyé, merci !</p>
        ) : (
          <>
            {avecNiveauImportance && (
              <div style={{ display:'flex', gap:'6px', marginBottom:'10px' }}>
                <span style={{ fontSize:'10.5px', color:'#9a958d', alignSelf:'center', flexShrink:0 }}>Niveau :</span>
                {NIVEAUX.map(n => {
                  const actif = importance === n.val
                  return (
                    <button key={n.val} onClick={() => setImportance(n.val)}
                      style={{ fontSize:'10.5px', padding:'3px 10px', borderRadius:'12px', border:'none', cursor:'pointer', fontWeight: actif ? 600 : 400,
                        background: actif ? n.bgOn : n.bg,
                        color: actif ? n.colorOn : n.color,
                        transition:'background 0.15s' }}>
                      {n.label}
                    </button>
                  )
                })}
              </div>
            )}
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Décrivez l'erreur constatée…" rows={4} autoFocus
              style={{ width:'100%', fontSize:'11px', padding:'7px 9px', border:'1px solid #d6d0c4', borderRadius:'5px', background:'#faf8f4', color:'#2a2520', resize:'vertical', outline:'none', lineHeight:1.5, boxSizing:'border-box' }} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px', gap:'8px' }}>
              {statut === 'err' && <span style={{ fontSize:'10px', color:'#c0562a', alignSelf:'center' }}>Erreur d'envoi.</span>}
              <button onClick={onClose} style={{ fontSize:'11px', padding:'5px 12px', borderRadius:'4px', border:'1px solid #d6d0c4', background:'#fff', color:'#6b6560', cursor:'pointer' }}>Annuler</button>
              <button onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                style={{ fontSize:'11px', padding:'5px 14px', borderRadius:'4px', border:'none', cursor: message.trim() ? 'pointer' : 'default', background: message.trim() ? '#c0562a' : '#e4dfd8', color: message.trim() ? '#fff' : '#9a958d', fontWeight:500 }}>
                {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
