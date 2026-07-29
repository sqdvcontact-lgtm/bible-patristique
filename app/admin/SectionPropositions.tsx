'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'

type Proposition = {
  id: number; user_id: string; auteur_nom: string; titre: string
  traducteur: string | null; editeur: string | null; collection: string | null
  ville: string | null; date_publication: string | null; siecle: string | null
  langue: string | null; note: string | null; texte: string | null
  statut: string; created_at: string; nb_30j?: number | null
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
  const [erreur, setErreur] = useState<string | null>(null)
  const [ouverte, setOuverte] = useState<number | null>(null)
  const [filtreStatut, setFiltreStatut] = useState('a_traiter')

  const charger = async () => {
    setErreur(null)
    setChargement(true)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/admin/propositions', { headers })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
      setPropositions(await res.json())
    } catch {
      setErreur('Impossible de charger les propositions. Vérifiez la connexion.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { charger() }, [])

  const changerStatut = async (id: number, statut: string) => {
    const avant = propositions.find(p => p.id === id)?.statut
    setPropositions(prev => prev.map(p => p.id === id ? { ...p, statut } : p))
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/admin/propositions', { method: 'PATCH', headers, body: JSON.stringify({ id, statut }) })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
    } catch {
      if (avant !== undefined) setPropositions(prev => prev.map(p => p.id === id ? { ...p, statut: avant } : p))
      alert('Impossible de modifier le statut. Réessayez.')
    }
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer définitivement cette proposition ?')) return
    const sauvegarde = propositions.find(p => p.id === id)
    setPropositions(prev => prev.filter(p => p.id !== id))
    if (ouverte === id) setOuverte(null)
    try {
      const headers = await getHeaders()
      const res = await fetch('/api/admin/propositions', { method: 'DELETE', headers, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error(`Erreur ${res.status}`)
    } catch {
      if (sauvegarde) setPropositions(prev => [...prev, sauvegarde].sort((a, b) => a.id - b.id))
      alert('Impossible de supprimer la proposition. Réessayez.')
    }
  }

  const filtrees = propositions.filter(p =>
    filtreStatut === 'a_traiter'
      ? p.statut === 'en_attente' || p.statut === 'en_cours'
      : p.statut === filtreStatut
  )
  const comptes: Record<string, number> = Object.fromEntries(
    ['en_attente', 'en_cours', 'acceptee', 'refusee'].map(s => [s, propositions.filter(p => p.statut === s).length])
  )
  const compteATraiter = (comptes.en_attente ?? 0) + (comptes.en_cours ?? 0)

  if (chargement) return <p style={{ fontSize: '0.8625rem', color: '#b0a89e', fontStyle: 'italic' }}>Chargement…</p>
  if (erreur) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: '#fdf2ee', border: '1px solid #e4c4b8', borderRadius: '7px', maxWidth: '31.25rem' }}>
      <span style={{ fontSize: '0.8625rem', color: '#c0562a' }}>{erreur}</span>
      <button onClick={charger} style={{ fontSize: '0.79062rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer', whiteSpace: 'nowrap' }}>Réessayer</button>
    </div>
  )

  return (
    <div style={{ maxWidth: '51.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', margin: 0 }}>
          Propositions d'œuvres
        </h2>
        <span style={{ fontSize: '0.79062rem', color: '#b0a89e' }}>{propositions.length} proposition{propositions.length > 1 ? 's' : ''}</span>
      </div>

      {/* Onglets statut */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #344d3e', marginBottom: '20px' }}>
        {([['a_traiter', 'En attente', compteATraiter], ['acceptee', 'Acceptées', comptes.acceptee], ['refusee', 'Refusées', comptes.refusee]] as [string, string, number][]).map(([key, label, count]) => (
          <button key={key} onClick={() => setFiltreStatut(key)} style={{
            padding: '7px 14px', fontSize: '0.79062rem', background: 'none', border: 'none',
            borderBottom: filtreStatut === key ? '2px solid #7aaa8e' : '2px solid transparent',
            color: filtreStatut === key ? '#a8d4b8' : '#6a9080', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', marginBottom: '-1px',
          }}>
            {label}
            {count > 0 && (
              <span style={{ fontSize: '0.68281rem', background: key === 'a_traiter' ? '#c0562a' : '#4a6459', color: '#fff', borderRadius: '10px', padding: '1px 5px' }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {filtrees.length === 0 ? (
        <p style={{ fontSize: '0.89844rem', color: '#9a958d', fontStyle: 'italic' }}>Aucune proposition dans cette catégorie.</p>
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
                      <span style={{ fontSize: '0.97031rem', fontWeight: 600, color: '#2a3d30' }}>{p.titre}</span>
                      <span style={{ fontSize: '0.8625rem', color: '#8a8278' }}>{p.auteur_nom}</span>
                    </div>
                    <div style={{ fontSize: '0.79062rem', color: '#b0a89e', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{[p.traducteur ? `trad. ${p.traducteur}` : null, p.editeur, formaterDateHistorique(p.date_publication)].filter(Boolean).join(' · ')}</span>
                      <span>{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                      {p.nb_30j != null && p.nb_30j > 1 && (
                        <span style={{ fontSize: '0.71875rem', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', background: p.nb_30j >= 3 ? '#fdf2ee' : '#fef5e8', color: p.nb_30j >= 3 ? '#c0562a' : '#9a5a2a' }}>
                          {p.nb_30j} propositions / 30 j
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.71875rem', fontWeight: 600, padding: '3px 9px', borderRadius: '4px', background: s.bg, color: s.couleur, whiteSpace: 'nowrap' }}>
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
                      {([['Auteur', p.auteur_nom], ['Titre', p.titre], ['Traducteur', p.traducteur], ['Éditeur', p.editeur], ['Collection', p.collection], ['Ville', p.ville], ['Publication', formaterDateHistorique(p.date_publication)], ['Siècle', formaterDateHistorique(p.siecle)], ['Langue', p.langue]] as [string, string | null][])
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <span style={{ fontSize: '0.68281rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', display: 'block' }}>{k}</span>
                            <span style={{ fontSize: '0.8625rem', color: '#2a3d30' }}>{v}</span>
                          </div>
                        ))}
                    </div>

                    {p.note && (
                      <div style={{ background: '#f7f4ef', borderRadius: '5px', padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.68281rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', display: 'block', marginBottom: '4px' }}>Note</span>
                        <p style={{ fontSize: '0.8625rem', color: '#3a3530', lineHeight: 1.6, margin: 0 }}>{p.note}</p>
                      </div>
                    )}

                    {p.texte && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.68281rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d' }}>
                            Texte · {p.texte.length.toLocaleString('fr-FR')} caractères
                          </span>
                          <button onClick={() => navigator.clipboard.writeText(p.texte!)}
                            style={{ fontSize: '0.71875rem', color: '#6a9080', background: 'none', border: '1px solid #4a6459', borderRadius: '3px', padding: '2px 8px', cursor: 'pointer' }}>
                            Copier
                          </button>
                        </div>
                        <pre style={{ fontSize: '0.82656rem', lineHeight: 1.65, color: '#2a2520', background: '#faf8f4', border: '1px solid #e4dfd8', borderRadius: '5px', padding: '10px 12px', maxHeight: '280px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                          {p.texte}
                        </pre>
                      </div>
                    )}

                    {/* Actions statut */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid #ede9e2' }}>
                      {(['en_attente', 'en_cours', 'acceptee', 'refusee'] as const).filter(st => st !== p.statut).map(st => (
                        <button key={st} onClick={() => changerStatut(p.id, st)} style={{
                          fontSize: '0.79062rem', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                          background: STATUTS[st].bg, color: STATUTS[st].couleur, fontWeight: 500,
                        }}>
                          → {STATUTS[st].label}
                        </button>
                      ))}
                      <button onClick={() => supprimer(p.id)} style={{ fontSize: '0.79062rem', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', background: 'transparent', color: '#c0562a', border: '1px solid #e4c4b8', marginLeft: 'auto' }}>
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
