'use client'

import { useState } from 'react'
import SectionEssais from './SectionEssais'
import SectionEssaisPublies from './SectionEssaisPublies'
import type { Essai } from './adminTypes'

type SousOnglet = 'en-attente' | 'publies'
type EssaiPublie = { id: number; titre: string; sous_titre: string | null; auteur: string; created_at: string }

export default function SectionEssaisAdmin({
  essaisEnAttente, essaisPublies, actionPublierEssai, actionRenvoyerBrouillonEssai,
}: {
  essaisEnAttente: Essai[]
  essaisPublies: EssaiPublie[]
  actionPublierEssai: (id: number) => Promise<void>
  actionRenvoyerBrouillonEssai: (id: number) => Promise<void>
}) {
  const [sous, setSous] = useState<SousOnglet>('en-attente')

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {([
          { key: 'en-attente' as const, label: 'En attente de validation', badge: essaisEnAttente.length },
          { key: 'publies' as const, label: 'Publiés', badge: essaisPublies.length },
        ]).map(o => (
          <button key={o.key} onClick={() => setSous(o.key)}
            style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', background: sous === o.key ? '#3d6b4f' : '#e4dfd8', color: sous === o.key ? '#fff' : '#6b6560', fontWeight: sous === o.key ? 600 : 400 }}>
            {o.label}
            {o.badge > 0 && <span style={{ fontSize: '10px', background: sous === o.key ? 'rgba(255,255,255,0.25)' : '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600 }}>{o.badge}</span>}
          </button>
        ))}
      </div>

      {sous === 'en-attente' && (
        <SectionEssais
          essaisEnAttente={essaisEnAttente}
          actionPublierEssai={actionPublierEssai}
          actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
        />
      )}
      {sous === 'publies' && <SectionEssaisPublies essais={essaisPublies} />}
    </div>
  )
}
