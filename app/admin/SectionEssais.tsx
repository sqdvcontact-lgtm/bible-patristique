'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Carte, dateFormat } from './adminShared'
import type { Essai } from './adminTypes'

export default function SectionEssais({
  essaisEnAttente: init, actionPublierEssai, actionRenvoyerBrouillonEssai,
}: {
  essaisEnAttente: Essai[]
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number) => Promise<void>
}) {
  const [liste, setListe] = useState<Essai[]>(init)
  const [action, setAction] = useState<Record<number, 'publie' | 'renvoye' | 'loading'>>({})

  const publier = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionPublierEssai(id)
    setAction(p => ({ ...p, [id]: 'publie' }))
    setTimeout(() => setListe(p => p.filter(e => e.id !== id)), 700)
  }
  const renvoyer = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionRenvoyerBrouillonEssai(id)
    setAction(p => ({ ...p, [id]: 'renvoye' }))
    setTimeout(() => setListe(p => p.filter(e => e.id !== id)), 700)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {liste.length === 0 ? (
        <Carte><p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>Aucun essai en attente de validation.</p></Carte>
      ) : liste.map(e => {
        const statut = action[e.id]
        return (
          <Carte key={e.id}>
            <div style={{ display: 'flex', gap: '5px', marginBottom: '6px' }}>
              {e.categories.map(c => (
                <span key={c} style={{ fontSize: '9.5px', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', padding: '1px 8px', borderRadius: '9px', fontWeight: 600 }}>{c}</span>
              ))}
            </div>
            <Link href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: "Georgia, serif", fontSize: '15px', color: '#1e2e24', textDecoration: 'none', display: 'block', marginBottom: '2px' }}>
              {e.titre} ↗
            </Link>
            {e.sous_titre && <p style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic', margin: '0 0 6px' }}>{e.sous_titre}</p>}
            {e.resume && <p style={{ fontSize: '12.5px', color: '#5a5450', lineHeight: 1.55, margin: '0 0 8px' }}>{e.resume}</p>}

            <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#6b6560', fontWeight: 500 }}>{e.auteur_pseudo ?? 'Auteur inconnu'}</span>
              <span style={{ fontSize: '11px', color: '#b0a89e', marginLeft: 'auto' }}>{dateFormat(e.created_at)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {statut === 'loading' ? (
                <span style={{ fontSize: '11.5px', color: '#9a958d' }}>…</span>
              ) : statut === 'publie' ? (
                <span style={{ fontSize: '11.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Publié</span>
              ) : statut === 'renvoye' ? (
                <span style={{ fontSize: '11.5px', color: '#c0562a' }}>Renvoyé en brouillon</span>
              ) : (
                <>
                  <button onClick={() => renvoyer(e.id)} className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>
                    Renvoyer en brouillon
                  </button>
                  <button onClick={() => publier(e.id)} className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>
                    Publier ✓
                  </button>
                </>
              )}
            </div>
          </Carte>
        )
      })}
    </div>
  )
}
