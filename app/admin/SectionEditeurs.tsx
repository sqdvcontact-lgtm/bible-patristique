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
    ;(oeuvres ?? []).forEach((o: any) => String(o.editeur ?? '').split(/\s*[;/]\s*/).forEach((p: string) => {
      const t = p.trim()
      if (t && !couvertes.has(cle(t))) brutes.add(t)
    }))
    setANormaliser([...brutes].sort((a, b) => a.localeCompare(b, 'fr')))
  }, [])

  useEffect(() => { charger() }, [charger])

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

  const champ: React.CSSProperties = { width: '100%', fontSize: '0.8625rem', padding: '6px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' }
  const label: React.CSSProperties = { display: 'block', fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.04em', color: '#8a8278', textTransform: 'uppercase', margin: '0 0 3px' }

  return (
    <div style={{ maxWidth: '47.5rem', margin: '0 auto' }}>
      <p style={{ fontSize: '0.93437rem', color: '#6b6560', lineHeight: 1.55, margin: '0 0 20px' }}>
        Table de référence des maisons d'édition. Le <strong>nom complet</strong> s'affiche partout où l'éditeur est répertorié ; les <strong>variantes</strong> (abréviations, graphies) le résolvent. Les données des œuvres restent intactes.
      </p>

      {/* Formulaire ajout / édition */}
      <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '9px', padding: '16px 18px', marginBottom: '22px' }}>
        <p style={{ fontSize: '0.8625rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 12px' }}>{brouillon.id ? 'Modifier un éditeur' : 'Ajouter un éditeur'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px', marginBottom: '11px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Nom complet *</label>
            <input style={champ} value={brouillon.nom_complet} onChange={e => setBrouillon(b => ({ ...b, nom_complet: e.target.value }))} placeholder="Louis Guérin" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Variantes (séparées par des virgules)</label>
            <input style={champ} value={brouillon.variantes} onChange={e => setBrouillon(b => ({ ...b, variantes: e.target.value }))} placeholder="L. Guérin, Guérin" />
          </div>
          <div>
            <label style={label}>Ville</label>
            <input style={champ} value={brouillon.ville} onChange={e => setBrouillon(b => ({ ...b, ville: e.target.value }))} placeholder="Paris" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={label}>Actif depuis</label>
              <input style={champ} value={brouillon.annee_debut} onChange={e => setBrouillon(b => ({ ...b, annee_debut: e.target.value }))} placeholder="1840" />
            </div>
            <div>
              <label style={label}>Jusqu'à</label>
              <input style={champ} value={brouillon.annee_fin} onChange={e => setBrouillon(b => ({ ...b, annee_fin: e.target.value }))} placeholder="1884" />
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Notes</label>
            <input style={champ} value={brouillon.notes} onChange={e => setBrouillon(b => ({ ...b, notes: e.target.value }))} placeholder="Facultatif" />
          </div>
        </div>
        {statut === 'err' && <p style={{ fontSize: '0.79062rem', color: '#c0562a', margin: '0 0 8px' }}>{erreur}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {brouillon.id && <button onClick={() => { setBrouillon(VIDE); setStatut('idle') }} style={{ fontSize: '0.82656rem', padding: '6px 13px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>}
          <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize: '0.82656rem', padding: '6px 15px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {statut === 'envoi' ? 'Enregistrement…' : brouillon.id ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* À normaliser */}
      {aNormaliser.length > 0 && (
        <div style={{ marginBottom: '22px' }}>
          <p style={{ fontSize: '0.79062rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9a5a2a', margin: '0 0 8px' }}>À normaliser ({aNormaliser.length})</p>
          <p style={{ fontSize: '0.82656rem', color: '#8a8278', margin: '0 0 10px' }}>Formes rencontrées dans le catalogue, pas encore répertoriées. Cliquez pour préremplir le formulaire.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {aNormaliser.map(nom => (
              <button key={nom} onClick={() => { setBrouillon({ ...VIDE, nom_complet: nom }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                style={{ fontSize: '0.82656rem', padding: '4px 11px', borderRadius: '999px', border: '1px solid #e3cdb0', background: '#fdf6ef', color: '#9a5a2a', cursor: 'pointer' }}>
                {nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste des éditeurs répertoriés */}
      <p style={{ fontSize: '0.79062rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#8a8278', margin: '0 0 8px' }}>Répertoriés ({editeurs?.length ?? 0})</p>
      {editeurs === null ? (
        <p style={{ fontSize: '0.8625rem', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
      ) : editeurs.length === 0 ? (
        <p style={{ fontSize: '0.8625rem', color: '#9a958d', fontStyle: 'italic' }}>Aucun éditeur répertorié pour l'instant.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {editeurs.map(e => (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', background: '#fff', border: '1px solid #e4dfd8', borderRadius: '7px', padding: '9px 13px' }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.97031rem', color: '#1e2e24' }}>{e.nom_complet}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.71875rem', color: '#b0a89e', marginTop: '2px' }}>
                  {e.variantes?.length > 0 && <span>≈ {e.variantes.join(', ')}</span>}
                  {(e.ville || e.annee_debut || e.annee_fin) && <span>{[e.ville, [e.annee_debut, e.annee_fin].filter(Boolean).join('–')].filter(Boolean).join(', ')}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button onClick={() => editer(e)} style={{ fontSize: '0.79062rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Modifier</button>
                <button onClick={() => supprimer(e.id)} style={{ fontSize: '0.79062rem', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
