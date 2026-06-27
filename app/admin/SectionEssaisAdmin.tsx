'use client'

import { useState } from 'react'
import SectionEssais from './SectionEssais'
import SectionEssaisPublies from './SectionEssaisPublies'
import type { Essai, EssaiPublie } from './adminTypes'

type SousOnglet = 'validation' | 'modification' | 'publies' | 'brouillons'

export default function SectionEssaisAdmin({
  essaisEnAttente, essaisModification, essaisPublies, essaisBrouillons, actionPublierEssai, actionRenvoyerBrouillonEssai,
}: {
  essaisEnAttente: Essai[]
  essaisModification: Essai[]
  essaisPublies: EssaiPublie[]
  essaisBrouillons: EssaiPublie[]
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number, note: string, refus?: boolean) => Promise<void>
}) {
  const [sous, setSous] = useState<SousOnglet>('validation')
  const onglets = [
    { key: 'validation' as const, label: 'Demandes de validation', badge: essaisEnAttente.length },
    { key: 'modification' as const, label: 'Demandes de modification', badge: essaisModification.length },
    { key: 'publies' as const, label: 'Liste des essais publiés', badge: 0, separateur: true },
    { key: 'brouillons' as const, label: 'Liste des brouillons', badge: 0 },
  ]

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', marginBottom: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        {onglets.map(o => (
          <div key={o.key} style={{ display: 'flex', alignItems: 'flex-end' }}>
            {o.separateur && (
              <span style={{ padding: '0 3px 10px', color: '#c8c2bc', fontSize: '20px', fontWeight: 100, lineHeight: 1, transform: 'rotate(15deg)', userSelect: 'none' }}>/</span>
            )}
            <button onClick={() => setSous(o.key)}
              style={{ padding: '9px 14px', fontSize: '12px', fontWeight: sous === o.key ? 600 : 400, color: sous === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: sous === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
              {o.label}
              {(o.key === 'validation' || o.key === 'modification') && o.badge > 0 && <span style={{ fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600 }}>{o.badge}</span>}
            </button>
          </div>
        ))}
      </div>

      {sous === 'validation' && (
        <SectionEssais
          essaisEnAttente={essaisEnAttente}
          actionPublierEssai={actionPublierEssai}
          actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
        />
      )}
      {sous === 'modification' && (
        <SectionEssais
          essaisEnAttente={essaisModification}
          actionPublierEssai={actionPublierEssai}
          actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
        />
      )}
      {sous === 'publies' && <SectionEssaisPublies essais={essaisPublies} />}
      {sous === 'brouillons' && <SectionEssaisPublies essais={essaisBrouillons} variante="brouillons" />}
    </div>
  )
}
