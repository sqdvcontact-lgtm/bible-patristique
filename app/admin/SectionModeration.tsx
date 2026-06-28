'use client'

import React, { useState } from 'react'
import { Carte, ContexteSegment, ContexteVerset, dateFormat } from './adminShared'
import SectionCommentaires from './SectionCommentaires'
import SectionCertification from './SectionCertification'
import type { Commentaire, Signalement, SegInfo } from './adminTypes'

type SousOnglet = 'commentaires' | 'signalements' | 'certification'

export default function SectionModeration({
  commentaires, signalements, demandesCertification, segMap, versetMap,
  actionValider, actionSupprimerCommentaire, actionMarquerTraite, actionSupprimerSignalement,
  actionCertifier, actionRetirerDemandeCertification,
}: {
  commentaires: Commentaire[]
  signalements: Signalement[]
  demandesCertification: Commentaire[]
  segMap: Record<number, SegInfo>
  versetMap: Record<string, string>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionMarquerTraite: (id: number | string) => Promise<void>
  actionSupprimerSignalement: (id: number | string) => Promise<void>
  actionCertifier: (id: number) => Promise<void>
  actionRetirerDemandeCertification: (id: number) => Promise<void>
}) {
  const [sous, setSous] = useState<SousOnglet>('commentaires')
  const nbSignal = signalements.length

  const SOUS_ONGLETS: { key: SousOnglet; label: string; badge: number }[] = [
    { key: 'commentaires', label: 'Commentaires', badge: commentaires.length },
    { key: 'signalements', label: 'Signalements', badge: signalements.length },
    { key: 'certification', label: 'Demandes de certification', badge: demandesCertification.length },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {SOUS_ONGLETS.map(o => (
          <button key={o.key} onClick={() => setSous(o.key)}
            style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: sous === o.key ? '#3d6b4f' : '#e4dfd8', color: sous === o.key ? '#fff' : '#6b6560', fontWeight: sous === o.key ? 600 : 400 }}>
            {o.label}
            {o.badge > 0 && <span style={{ fontSize: '10px', background: sous === o.key ? 'rgba(255,255,255,0.25)' : '#c0562a', color: sous === o.key ? '#fff' : '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600 }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {sous === 'commentaires' && (
        <SectionCommentaires
          commentaires={commentaires}
          segMap={segMap}
          actionValider={actionValider}
          actionSupprimerCommentaire={actionSupprimerCommentaire}
        />
      )}

      {sous === 'signalements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {nbSignal === 0 ? <Carte><p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>Aucun signalement en attente.</p></Carte>
          : signalements.map(s => (
            <Carte key={s.id}>
              <ContexteSegment segId={s.id_segment} segMap={segMap} />
              {!s.id_segment && <ContexteVerset versetId={s.id_verset} versetMap={versetMap} />}
              <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 10px' }}>{s.message}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#b0a89e' }}>{dateFormat(s.created_at)}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <form action={actionSupprimerSignalement.bind(null, s.id)}><button type="submit" className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Supprimer</button></form>
                  <form action={actionMarquerTraite.bind(null, s.id)}><button type="submit" className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Traité ✓</button></form>
                </div>
              </div>
            </Carte>
          ))}
        </div>
      )}

      {sous === 'certification' && (
        <SectionCertification
          demandesCertification={demandesCertification}
          segMap={segMap}
          versetMap={versetMap}
          actionCertifier={actionCertifier}
          actionRetirerDemandeCertification={actionRetirerDemandeCertification}
        />
      )}
    </div>
  )
}
