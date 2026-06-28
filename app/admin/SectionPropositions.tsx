'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Proposition = {
  id: number; user_id: string; auteur_nom: string; titre: string
  traducteur: string | null; editeur: string | null; collection: string | null
  ville: string | null; date_publication: string | null; siecle: string | null
  langue: string | null; note: string | null; texte: string | null
  statut: string; created_at: string
}

const STATUTS: Record<string, { label: string; couleur: string; bg: string }> = {
  en_attente: { label: 'En attente', couleur: '#9a5a2a', bg: '#fdf3ea' },
  acceptee:   { label: 'Acceptée',   couleur: '#3d6b4f', bg: '#edf5f0' },
  refusee:    { label: 'Refusée',    couleur: '#c0562a', bg: '#fdf2ee' },
  en_cours:   { label: 'En cours',   couleur: '#5a6b9a', bg: '#eef0f8' },
}

async function getHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

export default function SectionPropositions() {
  const [propositions, setPropositions] = useState<Proposition[]>([])
  const [chargement, setChargement] = useState(true)
  const [ouverte, setOuverte] = useState<number | null>(null)
  const [filtreStatut, setFiltreStatut] = useState('en_attente')

  const charger = async () => {
    const headers = await getHeaders()
    const res = await fetch('/api/admin/propositions', { headers })
    if (res.ok) setPropositions(await res.json())
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  const changerStatut = async (id: number, statut: string) => {
    const headers = await getHeaders()
    await fetch('/api/admin/propositions', { method: 'PATCH', headers, body: JSON.stringify({ id, statut }) })
    setPropositions(prev => prev.map(p => p.id === id ? { ...p, statut } : p))
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer définitivement cette proposition ?')) return
    const headers = await getHeaders()
    await fetch('/api/admin/propositions', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
    setPropositions(prev => prev.filter(p => p.id !== id))
    if (ouverte === id) setOuverte(null)
  }

  const filtrees = propositions.filter(p => filtreStatut === 'toutes' || p.statut === filtreStatut)
  const comptes: Record<string, number> = Object.fromEntries(
    ['en_attente', 'en_cours', 'acceptee', 'refusee'].map(s => [s, propositions.filter(p => p.statut === s).length])
  )

  if (chargement) return <p style={{ fontSize: '12px', color: '#b0a89e', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div style={{ maxWidth: '820px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', margin: 0 }}>
          Propositions d'œuvres
        </h2>
        <span style={{ fontSize: '11px', color: '#b0a89e' }}>{propositions.length} proposition{propositions.length > 1 ? 's' : ''}</span>
      </div>

      {/* Onglets statut */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #344d3e', marginBottom: '20px' }}>
        {([['toutes', 'Toutes', propositions.length], ['en_attente', 'En attente', comptes.en_attente], ['en_cours', 'En cours', comptes.en_cours], ['acceptee', 'Acceptées', comptes.acceptee], ['refusee', 'Refusées', comptes.refusee]] as [string, string, number][]).map(([key, label, count]) => (
          <button key={key} onClick={() => setFiltreStatut(key)} style={{
            padding: '7px 14px', fontSize: '11px', background: 'none', border: 'none',
            borderBottom: filtreStatut === key ? '2px solid #7aaa8e' : '2px solid transparent',
            color: filtreStatut === key ? '#a8d4b8' : '#6a9080', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', marginBottom: '-1px',
          }}>
            {label}
            {count > 0 && (
              <span style={{ fontSize: '9.5px', background: key === 'en_attente' ? '#c0562a' : '#4a6459', color: '#fff', borderRadius: '10px', padding: '1px 5px' }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {filtrees.length === 0 ? (
        <p style={{ fontSize: '12.5px', color: '#9a958d', fontStyle: 'italic' }}>Aucune proposition dans cette catégorie.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtrees.map(p => {
            const s = STATUTS[p.statut] ?? { label: p.statut, couleur: '#9a958d', bg: '#f5f3ef' }
            const estOuverte = ouverte === p.id
            return (
              <div key={p.id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
                {/* En-tête */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  onClick={() => setOuverte(estOuverte ? null : p.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#2a3d30' }}>{p.titre}</span>
                      <span style={{ fontSize: '12px', color: '#8a8278' }}>{p.auteur_nom}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#b0a89e', marginTop: '2px' }}>
                      {[p.traducteur ? `trad. ${p.traducteur}` : null, p.editeur, p.date_publication].filter(Boolean).join(' · ')}
                      {' · '}
                      {new Date(p.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '4px', background: s.bg, color: s.couleur, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, opacity: 0.4, transform: estOuverte ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M2 3.5l3 3 3-3" stroke="#2a3d30" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Détail */}
                {estOuverte && (
                  <div style={{ borderTop: '1px solid #ede9e2', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                      {([['Auteur', p.auteur_nom], ['Titre', p.titre], ['Traducteur', p.traducteur], ['Éditeur', p.editeur], ['Collection', p.collection], ['Ville', p.ville], ['Publication', p.date_publication], ['Siècle', p.siecle], ['Langue', p.langue]] as [string, string | null][])
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', display: 'block' }}>{k}</span>
                            <span style={{ fontSize: '12px', color: '#2a3d30' }}>{v}</span>
                          </div>
                        ))}
                    </div>

                    {p.note && (
                      <div style={{ background: '#f7f4ef', borderRadius: '5px', padding: '10px 12px' }}>
                        <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', display: 'block', marginBottom: '4px' }}>Note</span>
                        <p style={{ fontSize: '12px', color: '#3a3530', lineHeight: 1.6, margin: 0 }}>{p.note}</p>
                      </div>
                    )}

                    {p.texte && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d' }}>
                            Texte · {p.texte.length.toLocaleString('fr-FR')} caractères
                          </span>
                          <button onClick={() => navigator.clipboard.writeText(p.texte!)}
                            style={{ fontSize: '10px', color: '#6a9080', background: 'none', border: '1px solid #4a6459', borderRadius: '3px', padding: '2px 8px', cursor: 'pointer' }}>
                            Copier
                          </button>
                        </div>
                        <pre style={{ fontSize: '11.5px', lineHeight: 1.65, color: '#2a2520', background: '#faf8f4', border: '1px solid #e4dfd8', borderRadius: '5px', padding: '10px 12px', maxHeight: '280px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                          {p.texte}
                        </pre>
                      </div>
                    )}

                    {/* Actions statut */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #ede9e2' }}>
                      {(['en_attente', 'en_cours', 'acceptee', 'refusee'] as const).filter(st => st !== p.statut).map(st => (
                        <button key={st} onClick={() => changerStatut(p.id, st)} style={{
                          fontSize: '11px', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                          background: STATUTS[st].bg, color: STATUTS[st].couleur, fontWeight: 500,
                        }}>
                          → {STATUTS[st].label}
                        </button>
                      ))}
                      <button onClick={() => supprimer(p.id)} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', background: 'transparent', color: '#c0562a', border: '1px solid #e4c4b8', marginLeft: 'auto' }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
