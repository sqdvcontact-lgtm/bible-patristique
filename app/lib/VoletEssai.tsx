'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ElementPanneau } from './texteEnrichiEssai'

export default function VoletEssai({ element, onFermer, toujoursVisible, enTete }: { element: ElementPanneau | null; onFermer: () => void; toujoursVisible?: boolean; enTete?: ReactNode }) {
  const [contenu, setContenu] = useState<string | null>(null)
  const [chargement, setChargement] = useState(false)

  useEffect(() => {
    if (!element) return
    if (element.type === 'note') { setContenu(element.texte); return }
    setChargement(true); setContenu(null)
    if (element.type === 'verset') {
      supabase.from('versets').select('TR0002').eq('id_verset', element.id).single()
        .then(({ data }) => { setContenu(data?.TR0002 ?? '(verset introuvable)'); setChargement(false) })
    } else {
      supabase.from('segments').select('segment_texte').eq('id', element.id).single()
        .then(({ data }) => { setContenu(data?.segment_texte ?? '(segment introuvable)'); setChargement(false) })
    }
  }, [element])

  if (!element && !toujoursVisible) return null

  return (
    <div style={{
      position: 'fixed', top: '48px', right: 0, width: '320px', height: 'calc(100vh - 48px)',
      background: '#faf8f4', borderLeft: '1px solid #d6d0c4', padding: '20px', overflowY: 'auto',
      zIndex: 50, boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
    }}>
      {enTete && <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #ede9e2' }}>{enTete}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d' }}>
          {!element ? 'Notes et citations' : element.type === 'note' ? 'Note' : element.type === 'verset' ? 'Référence biblique' : 'Référence patristique'}
        </span>
        {element && !toujoursVisible && <button onClick={onFermer} style={{ background: 'none', border: 'none', color: '#b0a89e', cursor: 'pointer', fontSize: '14px' }}>✕</button>}
      </div>
      {!element ? (
        <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', lineHeight: 1.6 }}>
          Cliquez sur une note ou une citation dans le texte pour l'afficher ici.
        </p>
      ) : (
        <>
          {element.type !== 'note' && (
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '10px' }}>{element.label}</p>
          )}
          {chargement ? (
            <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
          ) : (
            <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.65, fontStyle: element.type !== 'note' ? 'italic' : 'normal' }}>
              {contenu}
            </p>
          )}
        </>
      )}
    </div>
  )
}