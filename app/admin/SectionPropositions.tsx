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
  en_attente: { label: 'En attente', couleur: 'var(--cs-attente)', bg: 'var(--cs-danger-fond)' },
  acceptee:   { label: 'Acceptée',   couleur: 'var(--cs-vert)', bg: 'var(--cs-fond)' },
  refusee:    { label: 'Refusée',    couleur: 'var(--cs-danger)', bg: 'var(--cs-danger-fond)' },
  en_cours:   { label: 'En cours',   couleur: '#5a6b9a', bg: 'var(--cs-fond)' },
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

  if (chargement) return <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Chargement…</p>
  if (erreur) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', maxWidth: '31.25rem' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--cs-danger)' }}>{erreur}</span>
      <button onClick={charger} style={{ fontSize: '0.78125rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Réessayer</button>
    </div>
  )

  return (
    <div style={{ maxWidth: '51.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: 0 }}>
          Propositions d’œuvres
        </h2>
        <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-faible)' }}>{propositions.length} proposition{propositions.length > 1 ? 's' : ''}</span>
      </div>

      {/* Onglets statut */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--cs-vert-fonce)', marginBottom: '20px' }}>
        {([['a_traiter', 'En attente', compteATraiter], ['acceptee', 'Acceptées', comptes.acceptee], ['refusee', 'Refusées', comptes.refusee]] as [string, string, number][]).map(([key, label, count]) => (
          <button key={key} onClick={() => setFiltreStatut(key)} style={{
            padding: '7px 14px', fontSize: '0.78125rem', background: 'none', border: 'none',
            borderBottom: filtreStatut === key ? '2px solid var(--cs-vert-clair)' : '2px solid transparent',
            color: filtreStatut === key ? 'var(--cs-vert-clair)' : 'var(--cs-vert)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', marginBottom: '-1px',
          }}>
            {label}
            {count > 0 && (
              <span style={{ fontSize: '0.6875rem', background: key === 'a_traiter' ? 'var(--cs-danger)' : 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', padding: '1px 5px' }}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {filtrees.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucune proposition dans cette catégorie.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtrees.map(p => {
            const s = STATUTS[p.statut] ?? { label: p.statut, couleur: 'var(--cs-texte-doux)', bg: 'var(--cs-fond)' }
            const estOuverte = ouverte === p.id
            return (
              <div key={p.id} style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', overflow: 'hidden' }}>
                {/* En-tête */}
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  onClick={() => setOuverte(estOuverte ? null : p.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cs-encre)' }}>{p.titre}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--cs-texte-gris)' }}>{p.auteur_nom}</span>
                    </div>
                    <div style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{[p.traducteur ? `trad. ${p.traducteur}` : null, p.editeur, formaterDateHistorique(p.date_publication)].filter(Boolean).join(' · ')}</span>
                      <span>{new Date(p.created_at).toLocaleDateString('fr-FR')}</span>
                      {p.nb_30j != null && p.nb_30j > 1 && (
                        <span style={{ fontSize: '0.71875rem', fontWeight: 600, padding: '1px 6px', borderRadius: '8px', background: p.nb_30j >= 3 ? 'var(--cs-danger-fond)' : 'var(--cs-danger-fond)', color: p.nb_30j >= 3 ? 'var(--cs-danger)' : 'var(--cs-attente)' }}>
                          {p.nb_30j} propositions / 30 j
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.71875rem', fontWeight: 600, padding: '3px 9px', borderRadius: '4px', background: s.bg, color: s.couleur, whiteSpace: 'nowrap' }}>
                    {s.label}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--cs-encre)', flexShrink: 0, opacity: 0.4, transform: estOuverte ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </div>

                {/* Détail */}
                {estOuverte && (
                  <div style={{ borderTop: '1px solid var(--cs-fond-doux)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
                      {([['Auteur', p.auteur_nom], ['Titre', p.titre], ['Traducteur', p.traducteur], ['Éditeur', p.editeur], ['Collection', p.collection], ['Ville', p.ville], ['Publication', formaterDateHistorique(p.date_publication)], ['Siècle', formaterDateHistorique(p.siecle)], ['Langue', p.langue]] as [string, string | null][])
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k}>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', display: 'block' }}>{k}</span>
                            <span style={{ fontSize: '0.875rem', color: 'var(--cs-encre)' }}>{v}</span>
                          </div>
                        ))}
                    </div>

                    {p.note && (
                      <div style={{ background: 'var(--cs-fond)', borderRadius: '4px', padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', display: 'block', marginBottom: '4px' }}>Note</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte)', lineHeight: 1.6, margin: 0 }}>{p.note}</p>
                      </div>
                    )}

                    {p.texte && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>
                            Texte · {p.texte.length.toLocaleString('fr-FR')} caractères
                          </span>
                          <button onClick={() => navigator.clipboard.writeText(p.texte!)}
                            style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', background: 'none', border: '1px solid var(--cs-vert)', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
                            Copier
                          </button>
                        </div>
                        <pre style={{ fontSize: '0.8125rem', lineHeight: 1.65, color: 'var(--cs-texte-fort)', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-bord-clair)', borderRadius: '4px', padding: '10px 12px', maxHeight: '280px', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontFamily: 'ui-monospace, Consolas, monospace' }}>
                          {p.texte}
                        </pre>
                      </div>
                    )}

                    {/* Actions statut */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--cs-fond-doux)' }}>
                      {(['en_attente', 'en_cours', 'acceptee', 'refusee'] as const).filter(st => st !== p.statut).map(st => (
                        <button key={st} onClick={() => changerStatut(p.id, st)} style={{
                          fontSize: '0.78125rem', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                          background: STATUTS[st].bg, color: STATUTS[st].couleur, fontWeight: 500,
                        }}>
                          → {STATUTS[st].label}
                        </button>
                      ))}
                      <button onClick={() => supprimer(p.id)} style={{ fontSize: '0.78125rem', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', background: 'transparent', color: 'var(--cs-danger)', border: '1px solid var(--cs-danger-bord)', marginLeft: 'auto' }}>
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
