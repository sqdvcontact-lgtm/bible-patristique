'use client'

import React, { useState } from 'react'
import { Carte, ContexteSegment, dateFormat } from './adminShared'
import type { Commentaire, SegInfo } from './adminTypes'

export default function SectionCommentaires({
  commentaires: init, segMap, actionValider, actionSupprimerCommentaire,
}: {
  commentaires: Commentaire[]
  segMap: Record<number, SegInfo>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
}) {
  const [liste, setListe] = useState<Commentaire[]>(init)
  const [sousOnglet, setSousOnglet] = useState<'versets' | 'segments'>('versets')
  const [action, setAction] = useState<Record<number, 'valide' | 'rejete' | 'loading'>>({})

  const versets  = liste.filter(c => c.id_verset !== null)
  const segments = liste.filter(c => c.id_segment !== null)
  const affichés = sousOnglet === 'versets' ? versets : segments

  const valider = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionValider(id)
    setAction(p => ({ ...p, [id]: 'valide' }))
    setListe(p => p.map(c => c.id === id ? { ...c, valide: true } : c))
  }

  const rejeter = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionSupprimerCommentaire(id)
    setAction(p => ({ ...p, [id]: 'rejete' }))
    setTimeout(() => setListe(p => p.filter(c => c.id !== id)), 600)
  }

  return (
    <div>
      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {([['versets', `Versets (${versets.length})`], ['segments', `Œuvres (${segments.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSousOnglet(k)}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: sousOnglet === k ? '#3d6b4f' : '#e4dfd8', color: sousOnglet === k ? '#fff' : '#6b6560', fontWeight: sousOnglet === k ? 600 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {affichés.length === 0 ? (
          <Carte><p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>Aucun commentaire en attente.</p></Carte>
        ) : affichés.map(c => {
          const statut = action[c.id]
          return (
            <Carte key={c.id}>
              {/* Contexte */}
              {c.id_segment && <ContexteSegment segId={c.id_segment} segMap={segMap} />}
              {c.id_verset && (
                <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '0 0 6px' }}>
                  Verset <code style={{ background: '#f0ece6', padding: '1px 5px', borderRadius: '3px' }}>{c.id_verset}</code>
                </p>
              )}

              {/* Texte */}
              <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 8px' }}>{c.texte}</p>

              {/* Méta */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#6b6560', fontWeight: 500 }}>{c.auteur_nom}</span>
                <span style={{ fontSize: '11px', color: '#b0a89e' }}>{c.auteur_mail}</span>
                <span style={{ fontSize: '11px', color: '#b0a89e', marginLeft: 'auto' }}>{dateFormat(c.created_at)}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {statut === 'loading' ? (
                  <span style={{ fontSize: '11.5px', color: '#9a958d' }}>…</span>
                ) : statut === 'valide' ? (
                  <span style={{ fontSize: '11.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Publié</span>
                ) : statut === 'rejete' ? (
                  <span style={{ fontSize: '11.5px', color: '#c0562a' }}>✗ Rejeté</span>
                ) : (
                  <>
                    <button onClick={() => rejeter(c.id)} className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Rejeter</button>
                    <button onClick={() => valider(c.id)} className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Valider ✓</button>
                  </>
                )}
              </div>
            </Carte>
          )
        })}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────