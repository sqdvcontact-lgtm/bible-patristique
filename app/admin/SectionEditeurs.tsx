'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

// Écran de curation des éditeurs : liste, ajout/édition, et repérage des éditeurs
// « à normaliser » (présents dans oeuvres.editeur mais pas encore répertoriés). Les
// données brutes des œuvres ne sont jamais modifiées.

type Editeur = {
  id: number
  nom_complet: string
  variantes: string[]
  ville: string | null
  annee_debut: number | null
  annee_fin: number | null
  notes: string | null
}

type Brouillon = {
  id?: number
  nom_complet: string
  variantes: string
  ville: string
  annee_debut: string
  annee_fin: string
  notes: string
}

const VIDE: Brouillon = { nom_complet: '', variantes: '', ville: '', annee_debut: '', annee_fin: '', notes: '' }

function cle(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export default function SectionEditeurs() {
  const [editeurs, setEditeurs] = useState<Editeur[] | null>(null)
  const [aNormaliser, setANormaliser] = useState<string[]>([])
  const [brouillon, setBrouillon] = useState<Brouillon>(VIDE)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'err'>('idle')
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    const [{ data: eds }, { data: oeuvres }] = await Promise.all([
      supabase.from('editeurs').select('*').order('nom_complet'),
      supabase.from('oeuvres').select('editeur').not('editeur', 'is', null),
    ])
    const liste = (eds ?? []) as Editeur[]
    setEditeurs(liste)
    // Clés couvertes (noms complets + variantes).
    const couvertes = new Set<string>()
    liste.forEach(e => { couvertes.add(cle(e.nom_complet)); (e.variantes ?? []).forEach(v => couvertes.add(cle(v))) })
    // Formes brutes rencontrées (chaque co-éditeur séparément), non couvertes.
    const brutes = new Set<string>()
    ;((oeuvres ?? []) as { editeur: string | null }[]).forEach(o => String(o.editeur ?? '').split(/\s*[;/]\s*/).forEach((p: string) => {
      const t = p.trim()
      if (t && !couvertes.has(cle(t))) brutes.add(t)
    }))
    setANormaliser([...brutes].sort((a, b) => a.localeCompare(b, 'fr')))
  }, [])

  useEffect(() => { let a = false; (async () => { if (!a) await charger() })(); return () => { a = true } }, [charger])

  const editer = (e: Editeur) => setBrouillon({
    id: e.id, nom_complet: e.nom_complet, variantes: (e.variantes ?? []).join(', '),
    ville: e.ville ?? '', annee_debut: e.annee_debut?.toString() ?? '', annee_fin: e.annee_fin?.toString() ?? '', notes: e.notes ?? '',
  })

  const enregistrer = async () => {
    if (!brouillon.nom_complet.trim()) { setErreur('Le nom complet est requis.'); setStatut('err'); return }
    setStatut('envoi'); setErreur('')
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/editeurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id: brouillon.id,
        nom_complet: brouillon.nom_complet.trim(),
        variantes: brouillon.variantes.split(',').map(v => v.trim()).filter(Boolean),
        ville: brouillon.ville.trim() || null,
        annee_debut: brouillon.annee_debut.trim() || null,
        annee_fin: brouillon.annee_fin.trim() || null,
        notes: brouillon.notes.trim() || null,
      }),
    })
    if (!res.ok) { const d = await res.json().catch(() => null); setErreur(d?.error ?? 'Erreur.'); setStatut('err'); return }
    setBrouillon(VIDE); setStatut('idle')
    await charger()
  }

  const supprimer = async (id: number) => {
    if (!window.confirm('Supprimer cet éditeur de la table de référence ? (les œuvres ne sont pas touchées)')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    await fetch('/api/admin/editeurs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (brouillon.id === id) setBrouillon(VIDE)
    await charger()
  }

  const champ: React.CSSProperties = { width: '100%', fontSize: '0.8rem', padding: '5px 8px', border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: '0.64rem', fontWeight: 700, letterSpacing: '0.05em', color: '#8a8278', textTransform: 'uppercase', margin: '0 0 2px' }
  const entete: React.CSSProperties = { fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px' }

  return (
    <div>
      <style>{`
        .ed-grid { display: grid; grid-template-columns: 20.5rem 1fr; gap: 22px; align-items: start; }
        .ed-aside { position: sticky; top: 4.75rem; }
        .ed-row:hover { border-color: rgba(var(--cs-vert-rgb),0.5) !important; }
        .ed-lien:hover { text-decoration: underline; }
        @media (max-width: 760px) {
          .ed-grid { grid-template-columns: 1fr; }
          .ed-aside { position: static; }
        }
      `}</style>

      <p style={{ fontSize: '0.84rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: '0 0 16px', maxWidth: '52rem' }}>
        Table de référence des maisons d’édition. Le <strong>nom complet</strong> s’affiche partout où l’éditeur est répertorié ; les <strong>variantes</strong> (abréviations, graphies) le résolvent. Les données des œuvres restent intactes.
      </p>

      <div className="ed-grid">
        {/* ── Colonne gauche : formulaire + à normaliser (collante) ── */}
        <div className="ed-aside">
          <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '9px', padding: '13px 14px' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>{brouillon.id ? 'Modifier un éditeur' : 'Ajouter un éditeur'}</p>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '11px' }}>
              <div>
                <label style={label}>Nom complet *</label>
                <input style={champ} value={brouillon.nom_complet} onChange={e => setBrouillon(b => ({ ...b, nom_complet: e.target.value }))} placeholder="Louis Guérin" />
              </div>
              <div>
                <label style={label}>Variantes (séparées par des virgules)</label>
                <input style={champ} value={brouillon.variantes} onChange={e => setBrouillon(b => ({ ...b, variantes: e.target.value }))} placeholder="L. Guérin, Guérin" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '7px' }}>
                <div>
                  <label style={label}>Ville</label>
                  <input style={champ} value={brouillon.ville} onChange={e => setBrouillon(b => ({ ...b, ville: e.target.value }))} placeholder="Paris" />
                </div>
                <div>
                  <label style={label}>Depuis</label>
                  <input style={champ} value={brouillon.annee_debut} onChange={e => setBrouillon(b => ({ ...b, annee_debut: e.target.value }))} placeholder="1840" />
                </div>
                <div>
                  <label style={label}>Jusqu’à</label>
                  <input style={champ} value={brouillon.annee_fin} onChange={e => setBrouillon(b => ({ ...b, annee_fin: e.target.value }))} placeholder="1884" />
                </div>
              </div>
              <div>
                <label style={label}>Notes</label>
                <input style={champ} value={brouillon.notes} onChange={e => setBrouillon(b => ({ ...b, notes: e.target.value }))} placeholder="Facultatif" />
              </div>
            </div>
            {statut === 'err' && <p style={{ fontSize: '0.76rem', color: 'var(--cs-danger)', margin: '0 0 8px' }}>{erreur}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              {brouillon.id && <button onClick={() => { setBrouillon(VIDE); setStatut('idle') }} style={{ fontSize: '0.79rem', padding: '5px 12px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>}
              <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize: '0.79rem', padding: '5px 15px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {statut === 'envoi' ? 'Enregistrement…' : brouillon.id ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>

          {/* À normaliser */}
          {aNormaliser.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ ...entete, color: '#9a5a2a' }}>À normaliser ({aNormaliser.length})</p>
              <p style={{ fontSize: '0.74rem', color: '#8a8278', lineHeight: 1.45, margin: '0 0 9px' }}>Formes rencontrées dans le catalogue, pas encore répertoriées. Cliquez pour préremplir le formulaire.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {aNormaliser.map(nom => (
                  <button key={nom} onClick={() => setBrouillon({ ...VIDE, nom_complet: nom })}
                    style={{ fontSize: '0.76rem', padding: '3px 10px', borderRadius: '999px', border: '1px solid #e3cdb0', background: '#fdf6ef', color: '#9a5a2a', cursor: 'pointer' }}>
                    {nom}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Colonne droite : liste des éditeurs répertoriés ── */}
        <div>
          <p style={{ ...entete, color: '#8a8278' }}>Répertoriés ({editeurs?.length ?? 0})</p>
          {editeurs === null ? (
            <p style={{ fontSize: '0.84rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
          ) : editeurs.length === 0 ? (
            <p style={{ fontSize: '0.84rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun éditeur répertorié pour l’instant.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {editeurs.map(e => (
                <div key={e.id} className="ed-row" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '7px', padding: '7px 11px', transition: 'border-color 0.12s' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9rem', color: 'var(--cs-encre-fonce)' }}>{e.nom_complet}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--cs-texte-faible)', marginTop: '1px' }}>
                      {e.variantes?.length > 0 && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>≈ {e.variantes.join(', ')}</span>}
                      {(e.ville || e.annee_debut || e.annee_fin) && <span>{[e.ville, [e.annee_debut, e.annee_fin].filter(Boolean).join('–')].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '9px', flexShrink: 0 }}>
                    <button className="ed-lien" onClick={() => editer(e)} style={{ fontSize: '0.72rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Modifier</button>
                    <button className="ed-lien" onClick={() => supprimer(e.id)} style={{ fontSize: '0.72rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
