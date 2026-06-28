'use client'

import React, { useState } from 'react'
import { Carte, ContexteSegment, dateFormat, refFrVer } from './adminShared'
import type { Commentaire, SegInfo } from './adminTypes'

export default function SectionCertification({
  demandesCertification: init, segMap, versetMap, actionCertifier, actionRetirerDemandeCertification,
}: {
  demandesCertification: Commentaire[]
  segMap: Record<number, SegInfo>
  versetMap: Record<string, string>
  actionCertifier: (id: number) => Promise<void>
  actionRetirerDemandeCertification: (id: number) => Promise<void>
}) {
  const [liste, setListe] = useState<Commentaire[]>(init)
  const [sousOnglet, setSousOnglet] = useState<'bible' | 'patristique'>('bible')
  const [action, setAction] = useState<Record<number, 'certifie' | 'valide' | 'loading'>>({})

  const bible = liste.filter(c => c.id_verset !== null)
  const patristique = liste.filter(c => c.id_segment !== null)
  const affiches = sousOnglet === 'bible' ? bible : patristique

  const certifier = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionCertifier(id)
    setAction(p => ({ ...p, [id]: 'certifie' }))
    setTimeout(() => setListe(p => p.filter(c => c.id !== id)), 700)
  }

  const accepterSansCertifier = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionRetirerDemandeCertification(id)
    setAction(p => ({ ...p, [id]: 'valide' }))
    setTimeout(() => setListe(p => p.filter(c => c.id !== id)), 700)
  }

  return (
    <div>
      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {([['bible', `Bible (${bible.length})`], ['patristique', `Patristique (${patristique.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSousOnglet(k)}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: sousOnglet === k ? '#3d6b4f' : '#e4dfd8', color: sousOnglet === k ? '#fff' : '#6b6560', fontWeight: sousOnglet === k ? 600 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {affiches.length === 0 ? (
          <Carte><p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>Aucune demande de certification en attente.</p></Carte>
        ) : affiches.map(c => {
          const statut = action[c.id]
          return (
            <Carte key={c.id}>
              {/* Contexte */}
              {c.id_segment != null && <ContexteSegment segId={c.id_segment} segMap={segMap} />}
              {c.id_verset && (
                <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '0 0 6px' }}>
                  Verset <code style={{ background: '#f0ece6', padding: '1px 5px', borderRadius: '3px' }}>
                    {versetMap[c.id_verset] ? refFrVer(versetMap[c.id_verset]) : c.id_verset}
                  </code>
                </p>
              )}

              <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 8px' }}>{c.texte}</p>

              <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#6b6560', fontWeight: 500 }}>{c.auteur_nom}</span>
                {!c.valide && (
                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#b0392b', background: 'rgba(176,58,42,0.08)', padding: '1px 6px', borderRadius: '3px' }}>NON VALIDÉ</span>
                )}
                <span style={{ fontSize: '11px', color: '#b0a89e', marginLeft: 'auto' }}>{dateFormat(c.created_at)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {statut === 'loading' ? (
                  <span style={{ fontSize: '11.5px', color: '#9a958d' }}>…</span>
                ) : statut === 'certifie' ? (
                  <span style={{ fontSize: '11.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Certifié</span>
                ) : statut === 'valide' ? (
                  <span style={{ fontSize: '11.5px', color: '#3d6b4f', fontWeight: 600 }}>Validé sans certification</span>
                ) : (
                  <>
                    <button onClick={() => accepterSansCertifier(c.id)} className="btn-gris" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>
                      Accepter sans certifier
                    </button>
                    <button onClick={() => certifier(c.id)}
                      style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: '#3d6b4f', color: '#fff', fontWeight: 600 }}>
                      Certifier ✓
                    </button>
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
