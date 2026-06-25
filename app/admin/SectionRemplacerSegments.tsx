'use client'

import React, { useState } from 'react'
import { supabase } from './adminShared'
import type { Auteur } from './adminTypes'

export default function SectionRemplacerSegments({ auteurs }: { auteurs: Auteur[] }) {
  const [fichier, setFichier] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[] | null>(null)
  const [statut, setStatut] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [msg, setMsg] = useState('')
  const [confirme, setConfirme] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const chargerCSV = async (f: File) => {
    setFichier(f); setConfirme(false); setMsg(''); setPreview(null)
    const texte = await f.text()
    const lignes = texte.trim().split('\n')
    const entetes = lignes[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lignes.slice(1).map(l => {
      // Gestion des virgules dans les champs entre guillemets
      const cols: string[] = []
      let inQuote = false, cur = ''
      for (const ch of l) {
        if (ch === '"') { inQuote = !inQuote }
        else if (ch === ',' && !inQuote) { cols.push(cur); cur = '' }
        else cur += ch
      }
      cols.push(cur)
      const row: Record<string, string> = {}
      entetes.forEach((h, i) => { row[h] = (cols[i] ?? '').trim() })
      return row
    }).filter(r => r.segment_texte || r.id_oeuvre)
    setPreview(rows)
    const oeuvres = new Set(rows.map(r => r.id_oeuvre).filter(Boolean))
    setMsg(`${rows.length} segments chargés — ${oeuvres.size} œuvre${oeuvres.size > 1 ? 's' : ''} concernée${oeuvres.size > 1 ? 's' : ''}.`)
  }

  const remplacer = async () => {
    if (!preview || preview.length === 0) return

    // Vérifier les œuvres présentes dans le CSV
    const oeuvresCSV = [...new Set(preview.map((r: any) => r.id_oeuvre).filter(Boolean))]

    // Vérifier si des segments existent déjà pour ces œuvres
    const { data: existing } = await supabase
      .from('segments')
      .select('id_oeuvre')
      .in('id_oeuvre', oeuvresCSV)
      .limit(1)

    if (existing && existing.length > 0) {
      // Demander confirmation supplémentaire si des données existent déjà
      const ok = window.confirm(
        `⚠ Des segments existent déjà pour ces œuvres en base.\n\nContinuer supprimera tous les segments non vérifiés avant réimport.\n\nVoulez-vous continuer ?`
      )
      if (!ok) return
    }

    setStatut('loading'); setMsg('')

    // Supprimer tous les segments sauf ceux marqués vérifié
    // neq() ne supprime pas les NULL — on doit exclure explicitement 'vérifié'
    const { error: delErr } = await supabase
      .from('segments')
      .delete()
      .or('fiabilite.is.null,fiabilite.neq.vérifié')

    if (delErr) { setStatut('err'); setMsg('Erreur suppression : ' + delErr.message); return }

    // 2. Réimporter par batch de 500
    const rows = preview.map((s, i) => ({
      id_oeuvre: s.id_oeuvre,
      segment_numero: parseInt(s.segment_numero) || i + 1,
      segment_texte: s.segment_texte ?? '',
      ref_niv1: s.ref_niv1 || null,
      ref_niv2: s.ref_niv2 || null,
      ref_niv3: s.ref_niv3 || null,
      ref_niv4: s.ref_niv4 || null,
      ref_niv5: s.ref_niv5 || null,
      lien_1: s.lien_1 || null,
      lien_2: s.lien_2 || null,
      lien_3: s.lien_3 || null,
      lien_4: s.lien_4 || null,
      fiabilite: s.fiabilite || null,
      nature: s.nature || 'texte',
    }))

    let errSeg = null
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabase.from('segments').insert(rows.slice(i, i + 500))
      if (error) { errSeg = error; break }
    }

    if (errSeg) {
      setStatut('err')
      setMsg('Erreur import : ' + errSeg.message)
    } else {
      setStatut('ok')
      setMsg(`✓ Table segments remplacée — ${rows.length} segments importés. Les segments « vérifié » ont été conservés.`)
      setPreview(null); setFichier(null); setConfirme(false); setStatut('ok')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#f9f7f4', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ background: '#fff8f0', border: '1px solid #e4c4a0', borderRadius: '8px', padding: '14px 18px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12.5px', color: '#8a4a1a', margin: 0, fontWeight: 500 }}>
          ⚠ Opération irréversible — remplace l'intégralité de la table segments.
        </p>
        <p style={{ fontSize: '11.5px', color: '#9a6a3a', margin: '4px 0 0' }}>
          Les segments avec <code>fiabilite = vérifié</code> sont conservés. Le CSV doit contenir une colonne <code>id_oeuvre</code>.
        </p>
      </div>

      {/* Upload CSV */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px' }}>FICHIER CSV (table segments complète)</label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button onClick={() => fileRef.current?.click()}
            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer' }}>
            ↑ Choisir un CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) chargerCSV(f) }} />
          {fichier && <span style={{ fontSize: '11px', color: '#6b6560' }}>{fichier.name}</span>}
        </div>
      </div>

      {msg && (
        <p style={{ fontSize: '12px', color: statut === 'err' ? '#c0562a' : statut === 'ok' ? '#3d6b4f' : '#6b6560', marginBottom: '16px' }}>
          {msg}
        </p>
      )}

      {/* Aperçu */}
      {preview && preview.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11.5px', color: '#6b6560', marginBottom: '10px' }}>Aperçu des 3 premiers segments :</p>
          {preview.slice(0, 3).map((s, i) => (
            <div key={i} style={{ padding: '8px 12px', background: '#faf8f4', border: '1px solid #ede9e2', borderRadius: '4px', marginBottom: '6px', fontSize: '11.5px', color: '#2a2520' }}>
              <span style={{ color: '#9a958d', marginRight: '8px' }}>{s.id_oeuvre}</span>
              <span style={{ color: '#3d6b4f', marginRight: '8px' }}>#{s.segment_numero}</span>
              <span style={{ color: '#b0a89e', marginRight: '8px' }}>{s.ref_niv1}{s.ref_niv2 ? ` ${s.ref_niv2}` : ''}</span>
              {s.segment_texte?.slice(0, 70)}{s.segment_texte?.length > 70 ? '…' : ''}
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
            <input type="checkbox" id="confirme-remplace" checked={confirme} onChange={e => setConfirme(e.target.checked)} />
            <label htmlFor="confirme-remplace" style={{ fontSize: '12px', color: '#3a3530', cursor: 'pointer' }}>
              Je confirme vouloir remplacer l'intégralité de la table segments
            </label>
          </div>
        </div>
      )}

      {confirme && preview && (
        <button onClick={remplacer} disabled={statut === 'loading'}
          style={{ fontSize: '13px', padding: '8px 20px', borderRadius: '6px', border: 'none', background: statut === 'loading' ? '#a0b8aa' : '#c0562a', color: '#fff', cursor: statut === 'loading' ? 'default' : 'pointer', fontWeight: 600 }}>
          {statut === 'loading' ? 'Remplacement en cours…' : '↺ Remplacer la table segments'}
        </button>
      )}
    </div>
  )
}
