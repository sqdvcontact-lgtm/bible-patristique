'use client'

import { useState } from 'react'
import Link from 'next/link'

type EssaiPublie = { id: number; titre: string; sous_titre: string | null; auteur: string; created_at: string }

export default function SectionEssaisPublies({ essais: init }: { essais: EssaiPublie[] }) {
  const [essais, setEssais] = useState(init)
  const [action, setAction] = useState<Record<number, 'loading' | 'ok'>>({})

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer définitivement cet essai et ses commentaires ?')) return
    setAction(p => ({ ...p, [id]: 'loading' }))
    const res = await fetch('/api/admin/essai-supprimer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setEssais(prev => prev.filter(e => e.id !== id))
    else setAction(p => { const c = { ...p }; delete c[id]; return c })
  }

  const demanderModification = async (id: number) => {
    const note = window.prompt('Note pour l\u2019auteur — expliquez ce qui doit être corrigé avant republication :')
    if (note === null) return
    setAction(p => ({ ...p, [id]: 'loading' }))
    const res = await fetch('/api/admin/essai-demander-modification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, note }) })
    if (res.ok) { setAction(p => ({ ...p, [id]: 'ok' })); setTimeout(() => setEssais(prev => prev.filter(e => e.id !== id)), 800) }
    else setAction(p => { const c = { ...p }; delete c[id]; return c })
  }

  const parAuteur = new Map<string, EssaiPublie[]>()
  essais.forEach(e => { const l = parAuteur.get(e.auteur) ?? []; l.push(e); parAuteur.set(e.auteur, l) })
  const auteurs = [...parAuteur.keys()].sort((a, b) => a.localeCompare(b, 'fr'))

  if (essais.length === 0) {
    return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun essai publié pour l'instant.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {auteurs.map(auteur => (
        <div key={auteur} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px' }}>
            <h3 style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: '13px', fontWeight: 700, color: '#3d6b4f', letterSpacing: '0.04em', textTransform: 'uppercase', margin: 0 }}>{auteur}</h3>
          </div>
          {parAuteur.get(auteur)!.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '9px 16px', borderTop: '1px solid #f0ece6', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#1e2e24', textDecoration: 'none' }}>{e.titre} ↗</Link>
                {e.sous_titre && <span style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', marginLeft: '8px' }}>{e.sous_titre}</span>}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {action[e.id] === 'ok' ? (
                  <span style={{ fontSize: '11px', color: '#3d6b4f', fontWeight: 600 }}>✓ Renvoyé à l'auteur</span>
                ) : (
                  <>
                    <Link href={`/essais/${e.id}/modifier`} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', textDecoration: 'none' }}>
                      Modifier / Comparer
                    </Link>
                    <button onClick={() => demanderModification(e.id)} disabled={action[e.id] === 'loading'}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#9a5a2a', cursor: 'pointer' }}>
                      Demander une modification
                    </button>
                    <button onClick={() => supprimer(e.id)} disabled={action[e.id] === 'loading'}
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer' }}>
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
