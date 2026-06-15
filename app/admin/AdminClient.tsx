'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Commentaire = { id: number; texte: string; auteur_nom: string; auteur_mail: string; valide: boolean; created_at: string; id_segment: number | null; id_verset: string | null }
type Signalement  = { id: number; message: string; traite: boolean; created_at: string; id_segment: number }
type SegInfo      = { texte: string; numero: number; id_oeuvre: string }
type Oeuvre       = { id_oeuvre: string; titre: string; titre_original: string | null }
type Auteur       = { id_auteur: string; nom: string; dates: string | null; siecle: string | null; oeuvres: Oeuvre[] }

type Traduction = {
  trad_id: string
  nom: string
  auteur: string
  dates: string
  bio_courte: string
  date_publication: string
  confession: string
  langue: string
  commentaire_editorial: string
  ordre: number
}

type LignePreview = {
  id: string; segment_numero: string; segment_texte: string
  ref_niv1: string; ref_niv2: string; ref_niv3: string
  lien_1: string; lien_2: string; lien_3: string; lien_4: string; fiabilite: string
  _lien_1_orig?: string; _fiabilite_orig?: string; _texte_orig?: string; _modifie?: boolean
}

type Props = {
  commentaires: Commentaire[]
  signalements: Signalement[]
  segMap: Record<number, SegInfo>
  auteurs: Auteur[]
  traductions: Traduction[]
  actionDeconnexion: () => Promise<void>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionMarquerTraite: (id: number) => Promise<void>
  actionSupprimerSignalement: (id: number) => Promise<void>
}

type Onglet = 'auteurs' | 'bibliotheque' | 'ajouter-oeuvre' | 'traductions' | 'verifications' | 'commentaires' | 'signalements' | 'remplacer-segments'

function dateFormat(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function Carte({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 20px' }}>{children}</div>
}
function ContexteSegment({ segId, segMap }: { segId: number | null; segMap: Record<number, SegInfo> }) {
  if (!segId || !segMap[segId]) return null
  const s = segMap[segId]
  return (
    <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '4px 0 8px', lineHeight: 1.4 }}>
      Segment §{s.numero} — <a href={`/oeuvre/${s.id_oeuvre}#s${s.numero}`} target="_blank" rel="noopener noreferrer" style={{ color: '#9a958d', textDecoration: 'underline' }}>{s.texte.slice(0, 80)}…</a>
    </p>
  )
}

// ── Parser CSV ────────────────────────────────────────────────────────────────
function parseCSV(texte: string): Record<string, string>[] {
  const lignes = texte.split(/\r?\n/)
  if (lignes.length < 2) return []
  const headers = splitCSVLine(lignes[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lignes.length; i++) {
    if (!lignes[i].trim()) continue
    const cols = splitCSVLine(lignes[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? '' })
    rows.push(row)
  }
  return rows
}
function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = '', inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { if (inQuotes && line[i + 1] === '"') { current += '"'; i++ } else inQuotes = !inQuotes }
    else if (c === ',' && !inQuotes) { result.push(current); current = '' }
    else { current += c }
  }
  result.push(current)
  return result
}
async function exporterOeuvre(idOeuvre: string, titreOeuvre: string) {
  const res = await fetch(`/api/admin/export-segments?id_oeuvre=${idOeuvre}`)
  if (!res.ok) { alert("Erreur lors de l'export."); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `segments_${idOeuvre}_${titreOeuvre.slice(0, 30).replace(/\s/g, '_')}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Modale import ─────────────────────────────────────────────────────────────
function ModaleImport({ lignes, nomFichier, onConfirmer, onAnnuler, importing }: { lignes: LignePreview[]; nomFichier: string; onConfirmer: () => void; onAnnuler: () => void; importing: boolean }) {
  const modifiees = lignes.filter(l => l._modifie)
  const inchangees = lignes.length - modifiees.length
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(30,26,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '860px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e4dfd8', flexShrink: 0 }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: '17px', fontWeight: 'normal', color: '#2a3d30', margin: '0 0 6px' }}>Validation de l'import</h2>
          <p style={{ fontSize: '12px', color: '#9a958d', margin: 0 }}>
            Fichier : <strong style={{ color: '#2a2520' }}>{nomFichier}</strong>{' — '}
            <span style={{ color: '#3d6b4f', fontWeight: 500 }}>{modifiees.length} ligne{modifiees.length > 1 ? 's' : ''} modifiée{modifiees.length > 1 ? 's' : ''}</span>
            {inchangees > 0 && <span style={{ color: '#9a958d' }}> · {inchangees} inchangée{inchangees > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {modifiees.length === 0 ? (
            <p style={{ padding: '24px', fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucune modification détectée.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead><tr style={{ background: '#f7f4ef', position: 'sticky', top: 0 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '60px' }}>§</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '90px' }}>Fiabilité</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8' }}>Texte (début)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8' }}>Liens</th>
              </tr></thead>
              <tbody>
                {modifiees.map((l, i) => (
                  <tr key={l.id || String(i)} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f4', borderBottom: '1px solid #f0ece6' }}>
                    <td style={{ padding: '7px 12px', color: '#3d6b4f', fontWeight: 500 }}>{l.segment_numero}</td>
                    <td style={{ padding: '7px 12px' }}>
                      {l._fiabilite_orig !== l.fiabilite ? (
                        <span><span style={{ color: '#c0562a', textDecoration: 'line-through', marginRight: '4px' }}>{l._fiabilite_orig || '—'}</span><span style={{ color: '#3d6b4f' }}>{l.fiabilite || '—'}</span></span>
                      ) : <span style={{ color: '#6b6560' }}>{l.fiabilite || '—'}</span>}
                    </td>
                    <td style={{ padding: '7px 12px', color: '#2a2520' }}>{l.segment_texte.slice(0, 60)}…</td>
                    <td style={{ padding: '7px 12px', color: '#6b6560', fontFamily: 'monospace', fontSize: '10.5px' }}>{[l.lien_1, l.lien_2, l.lien_3, l.lien_4].filter(Boolean).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e4dfd8', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button onClick={onAnnuler} disabled={importing} style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirmer} disabled={importing || modifiees.length === 0}
            style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', cursor: modifiees.length > 0 ? 'pointer' : 'default', background: modifiees.length > 0 ? '#3d6b4f' : '#e4dfd8', color: modifiees.length > 0 ? '#fff' : '#9a958d', fontWeight: 500 }}>
            {importing ? 'Import en cours…' : `Confirmer l'import (${modifiees.length} ligne${modifiees.length > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section Bibliothèque ──────────────────────────────────────────────────────
function SectionBibliotheque({ auteurs }: { auteurs: Auteur[] }) {
  const [auteurOuvert, setAuteurOuvert] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ lignes: LignePreview[]; nomFichier: string; idOeuvre: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [resultat, setResultat] = useState<{ idOeuvre: string; msg: string; ok: boolean } | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleExport = async (idOeuvre: string, titre: string) => { setExporting(idOeuvre); await exporterOeuvre(idOeuvre, titre); setExporting(null) }

  const handleFichierChoisi = async (idOeuvre: string, fichier: File) => {
    const texte = await fichier.text()
    const lignes = parseCSV(texte)
    if (lignes.length === 0) { alert('Fichier vide ou mal formaté.'); return }
    if (!lignes[0].hasOwnProperty('segment_texte')) { alert('Colonnes manquantes.'); return }
    // Toutes les lignes sont marquées modifiées : on remplace toujours l'intégralité
    const lignesPreview: LignePreview[] = lignes.map(l => ({
      ...l,
      _lien_1_orig: '', _fiabilite_orig: '', _texte_orig: '', _modifie: true,
    } as LignePreview))
    setPreview({ lignes: lignesPreview, nomFichier: fichier.name, idOeuvre })
  }

  const handleConfirmerImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const payload = preview.lignes.map(({ _lien_1_orig, _fiabilite_orig, _texte_orig, _modifie, ...l }) => l)
      const BATCH = 300
      let inserted = 0
      for (let i = 0; i < payload.length; i += BATCH) {
        const batch = payload.slice(i, i + BATCH)
        const res = await fetch('/api/admin/import-segments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lignes: batch, deleteFirst: i === 0 }),
        })
        const json = await res.json()
        if (!res.ok) {
          setResultat({ idOeuvre: preview.idOeuvre, msg: json.error ?? 'Erreur.', ok: false })
          setImporting(false); setPreview(null)
          Object.values(inputRefs.current).forEach(el => { if (el) el.value = '' })
          return
        }
        inserted += json.inserted ?? 0
      }
      setResultat({ idOeuvre: preview.idOeuvre, msg: `${inserted} segment${inserted > 1 ? 's' : ''} importés.`, ok: true })
    } catch {
      setResultat({ idOeuvre: preview.idOeuvre, msg: 'Erreur réseau.', ok: false })
    }
    setImporting(false); setPreview(null)
    Object.values(inputRefs.current).forEach(el => { if (el) el.value = '' })
  }

  
  return (
    <>
      {preview && <ModaleImport lignes={preview.lignes} nomFichier={preview.nomFichier} onConfirmer={handleConfirmerImport} onAnnuler={() => { setPreview(null); Object.values(inputRefs.current).forEach(el => { if (el) el.value = '' }) }} importing={importing} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {auteurs.map(auteur => (
          <div key={auteur.id_auteur} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setAuteurOuvert(auteurOuvert === auteur.id_auteur ? null : auteur.id_auteur)}
              style={{ width: '100%', textAlign: 'left', padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: auteurOuvert === auteur.id_auteur ? '1px solid #e4dfd8' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: '14px', color: '#2a3d30' }}>{auteur.nom}</span>
                {auteur.dates && <span style={{ fontSize: '11px', color: '#9a958d' }}>{auteur.dates}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#b0a89e' }}>{auteur.oeuvres.length} œuvre{auteur.oeuvres.length > 1 ? 's' : ''}</span>
                <span style={{ fontSize: '10px', color: '#b0a89e' }}>{auteurOuvert === auteur.id_auteur ? '▲' : '▼'}</span>
              </div>
            </button>
            {auteurOuvert === auteur.id_auteur && (
              <div style={{ padding: '6px 0' }}>
                {auteur.oeuvres.map(oeuvre => (
                  <div key={oeuvre.id_oeuvre} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: '1px solid #f0ece6' }}>
                    <div>
                      <span style={{ fontSize: '13px', color: '#2a3d30' }}>{oeuvre.titre}</span>
                      {oeuvre.titre_original && <span style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', marginLeft: '8px' }}>{oeuvre.titre_original}</span>}
                      {resultat?.idOeuvre === oeuvre.id_oeuvre && <span style={{ fontSize: '11px', marginLeft: '10px', color: resultat.ok ? '#3d6b4f' : '#c0562a' }}>{resultat.ok ? '✓' : '✗'} {resultat.msg}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '16px', alignItems: 'center' }}>
                      <a href={`/oeuvre/${oeuvre.id_oeuvre}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: '#9a958d', textDecoration: 'none', padding: '4px 10px', border: '1px solid #d6d0c4', borderRadius: '4px' }}>Lire ↗</a>
                      <button onClick={() => handleExport(oeuvre.id_oeuvre, oeuvre.titre)} disabled={exporting === oeuvre.id_oeuvre}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: exporting === oeuvre.id_oeuvre ? '#e4dfd8' : '#3d6b4f', color: exporting === oeuvre.id_oeuvre ? '#9a958d' : '#fff', fontWeight: 500 }}>
                        {exporting === oeuvre.id_oeuvre ? 'Export…' : '↓ CSV'}
                      </button>
                      <button onClick={() => { setResultat(null); inputRefs.current[oeuvre.id_oeuvre]?.click() }}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 500 }}>↑ CSV</button>
                      <input ref={el => { inputRefs.current[oeuvre.id_oeuvre] = el }} type="file" accept=".csv" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFichierChoisi(oeuvre.id_oeuvre, f) }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px' }

// ── Éditeur rich-text ────────────────────────────────────────────────────────
function EditeurRichText({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const ref = React.useRef<HTMLTextAreaElement>(null)

  const entourer = (avant: string, apres: string) => {
    const ta = ref.current
    if (!ta) return
    const debut = ta.selectionStart
    const fin = ta.selectionEnd
    const selection = ta.value.slice(debut, fin)
    const nouveau = ta.value.slice(0, debut) + avant + selection + apres + ta.value.slice(fin)
    onChange(nouveau)
    // Repositionner le curseur après insertion
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(debut + avant.length, fin + avant.length)
    })
  }

  const insererBloc = (balise: string) => {
    const ta = ref.current
    if (!ta) return
    const debut = ta.selectionStart
    const fin = ta.selectionEnd
    const selection = ta.value.slice(debut, fin).trim()
    const nouveau = ta.value.slice(0, debut) + `<${balise}>${selection}</${balise}>` + ta.value.slice(fin)
    onChange(nouveau)
  }

  const btnStyle: React.CSSProperties = {
    padding: '4px 9px', fontSize: '11.5px', border: '1px solid #d6d0c4',
    borderRadius: '3px', background: '#fff', color: '#3a3530', cursor: 'pointer', lineHeight: 1,
  }

  return (
    <div style={{ border: '1px solid #d6d0c4', borderRadius: '5px', overflow: 'hidden' }}>
      {/* Barre d'outils */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: '#f7f4ef', borderBottom: '1px solid #d6d0c4', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onMouseDown={e => { e.preventDefault(); entourer('<strong>', '</strong>') }} style={btnStyle}><strong>G</strong></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); entourer('<em>', '</em>') }} style={btnStyle}><em>I</em></button>
        <div style={{ width: '1px', background: '#d6d0c4', margin: '0 2px', alignSelf: 'stretch' }} />
        <button type="button" onMouseDown={e => { e.preventDefault(); insererBloc('h1') }} style={btnStyle} title="Titre 1">H1</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); insererBloc('h2') }} style={btnStyle} title="Titre 2">H2</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); insererBloc('p') }} style={btnStyle} title="Paragraphe">¶</button>
        <div style={{ width: '1px', background: '#d6d0c4', margin: '0 2px', alignSelf: 'stretch' }} />
        <button type="button" onMouseDown={e => { e.preventDefault(); entourer('<span class="sc" style="font-variant:small-caps">', '</span>') }} style={{ ...btnStyle, fontVariant: 'small-caps' }} title="Petites capitales">sc</button>
        <span style={{ fontSize: '10px', color: '#b0a89e', marginLeft: 'auto' }}>HTML</span>
      </div>
      {/* Textarea HTML direct */}
      <textarea
        ref={ref}
        value={valeur}
        onChange={e => onChange(e.target.value)}
        rows={8}
        style={{
          width: '100%', padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace',
          lineHeight: 1.6, color: '#2a2520', outline: 'none', border: 'none',
          background: '#fff', resize: 'vertical', boxSizing: 'border-box',
        }}
        placeholder="<p>Votre texte…</p>"
      />
      {/* Aperçu rendu */}
      {valeur && (
        <details style={{ borderTop: '1px solid #ede9e2' }}>
          <summary style={{ fontSize: '10px', color: '#b0a89e', padding: '4px 10px', cursor: 'pointer', listStyle: 'none' }}>Aperçu</summary>
          <div
            style={{ padding: '10px 14px', background: '#faf8f4', fontSize: '13px', lineHeight: 1.7, color: '#2a2520' }}
            dangerouslySetInnerHTML={{ __html: valeur }}
          />
        </details>
      )}
    </div>
  )
}

// ── Section Traductions ───────────────────────────────────────────────────────
function SectionTraductions({ traductions: init }: { traductions: Traduction[] }) {
  const [lignes, setLignes] = useState<Traduction[]>(init)
  const [edition, setEdition] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Traduction>>({})
  const [statut, setStatut] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [ajout, setAjout] = useState(false)
  const [nouveau, setNouveau] = useState<Partial<Traduction>>({})
  const [csvLignes, setCsvLignes] = useState<{ id_verset: string; texte: string }[]>([])
  const [csvNom, setCsvNom] = useState('')
  const [importStatut, setImportStatut] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [importMsg, setImportMsg] = useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const CHAMPS_SIMPLES: { key: keyof Traduction; label: string }[] = [
    { key: 'nom', label: 'Nom' },
    { key: 'auteur', label: 'Auteur' },
    { key: 'dates', label: 'Dates' },
    { key: 'date_publication', label: 'Date de publication' },
    { key: 'confession', label: 'Confession' },
    { key: 'langue', label: 'Langue' },
    { key: 'ordre', label: "Ordre d'affichage" },
  ]

  const ouvrir = (t: Traduction) => { setEdition(t.trad_id); setForm({ ...t }); setStatut(null) }
  const fermer = () => { setEdition(null); setForm({}) }

  const sauvegarder = async () => {
    if (!edition) return
    const { error } = await supabase.from('traductions').update(form).eq('trad_id', edition)
    if (error) { setStatut({ id: edition, ok: false, msg: error.message }); return }
    setLignes(prev => prev.map(t => t.trad_id === edition ? { ...t, ...form } as Traduction : t))
    setStatut({ id: edition, ok: true, msg: 'Enregistré.' })
    setTimeout(() => { setStatut(null); fermer() }, 1200)
  }

  const handleCSV = async (fichier: File) => {
    setCsvNom(fichier.name)
    const texte = await fichier.text()
    const lignesCSV = texte.trim().split('\n')
    const entetes = lignesCSV[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const idxId = entetes.findIndex(h => h === 'id_verset')
    const idxTexte = entetes.findIndex(h => h !== 'id_verset')
    if (idxId === -1) { setImportMsg('Colonne id_verset manquante.'); return }
    const parsed = lignesCSV.slice(1).map(l => {
      const cols = l.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      return { id_verset: cols[idxId], texte: cols[idxTexte] ?? '' }
    }).filter(r => r.id_verset)
    setCsvLignes(parsed)
    setImportMsg(`${parsed.length} versets chargés.`)
  }

  const importer = async () => {
    if (!nouveau.nom) { setImportMsg('Le nom est requis.'); return }
    if (csvLignes.length === 0) { setImportMsg('Importez un CSV d\'abord.'); return }
    setImportStatut('loading')
    setImportMsg('')
    try {
      const res = await fetch('/api/admin/ajouter-traduction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nouveau, lignes: csvLignes }),
      })
      const json = await res.json()
      if (!res.ok) { setImportStatut('err'); setImportMsg(json.error ?? 'Erreur.'); return }
      setImportStatut('ok')
      setImportMsg(`✓ Traduction ${json.trad_id} créée — ${json.inseres} versets importés.`)
      const { data } = await supabase.from('traductions').select('*').order('ordre')
      setLignes(data ?? [])
      setAjout(false)
      setNouveau({})
      setCsvLignes([])
      setCsvNom('')
      setTimeout(() => { setImportStatut('idle'); setImportMsg('') }, 4000)
    } catch (e: any) {
      setImportStatut('err')
      setImportMsg(e.message ?? 'Erreur réseau.')
    }
  }

  const supprimer = async (id: string) => {
    if (!confirm(`Supprimer la traduction « ${id} » ? Cette action est irréversible.`)) return
    await supabase.from('traductions').delete().eq('trad_id', id)
    setLignes(prev => prev.filter(t => t.trad_id !== id))
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#f9f7f4', color: '#1e1a16', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Bouton ajouter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button onClick={() => { setAjout(!ajout); setImportStatut('idle'); setImportMsg('') }}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          + Ajouter une traduction
        </button>
      </div>

      {/* Formulaire nouvelle traduction */}
      {ajout && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '18px 20px', marginBottom: '4px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '14px' }}>Nouvelle traduction</p>

          {/* Métadonnées */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>NOM *</label>
              <input value={nouveau.nom ?? ''} onChange={e => setNouveau(p => ({ ...p, nom: e.target.value }))} style={inputStyle} placeholder="Bible Darby" />
            </div>
            <div><label style={labelStyle}>AUTEUR</label><input value={nouveau.auteur ?? ''} onChange={e => setNouveau(p => ({ ...p, auteur: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>DATES</label><input value={nouveau.dates ?? ''} onChange={e => setNouveau(p => ({ ...p, dates: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>DATE PUBLICATION</label><input value={nouveau.date_publication ?? ''} onChange={e => setNouveau(p => ({ ...p, date_publication: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>CONFESSION</label><input value={nouveau.confession ?? ''} onChange={e => setNouveau(p => ({ ...p, confession: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>LANGUE</label><input value={nouveau.langue ?? ''} onChange={e => setNouveau(p => ({ ...p, langue: e.target.value }))} style={inputStyle} /></div>
            <div><label style={labelStyle}>ORDRE</label><input type="number" value={nouveau.ordre ?? ''} onChange={e => setNouveau(p => ({ ...p, ordre: parseInt(e.target.value) || 99 }))} style={inputStyle} /></div>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>BIOGRAPHIE COURTE</label>
            <textarea value={nouveau.bio_courte ?? ''} onChange={e => setNouveau(p => ({ ...p, bio_courte: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>COMMENTAIRE ÉDITORIAL</label>
            <EditeurRichText valeur={nouveau.commentaire_editorial ?? ''} onChange={v => setNouveau(p => ({ ...p, commentaire_editorial: v }))} />
          </div>

          {/* Import CSV */}
          <div style={{ borderTop: '1px solid #ede9e2', paddingTop: '14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#2a3d30', marginBottom: '6px' }}>Fichier CSV des versets *</p>
            <p style={{ fontSize: '10.5px', color: '#9a958d', marginBottom: '10px' }}>
              Le CSV doit contenir deux colonnes : <code style={{ background: '#f0ece6', padding: '1px 5px', borderRadius: '3px' }}>id_verset</code> et le texte de la traduction.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 500 }}>
                ↑ Choisir un CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCSV(f) }} />
              {csvNom && (
                <span style={{ fontSize: '11px', color: '#6b6560' }}>{csvNom}</span>
              )}
            </div>
            {importMsg && (
              <p style={{ fontSize: '11px', marginTop: '8px', color: importStatut === 'err' ? '#c0562a' : importStatut === 'ok' ? '#3d6b4f' : '#6b6560' }}>
                {importMsg}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setAjout(false); setNouveau({}); setCsvLignes([]); setCsvNom(''); setImportMsg('') }}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={importer} disabled={importStatut === 'loading'}
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: importStatut === 'loading' ? '#a0b8aa' : '#3d6b4f', color: '#fff', cursor: importStatut === 'loading' ? 'default' : 'pointer', fontWeight: 500 }}>
              {importStatut === 'loading' ? 'Import en cours…' : 'Créer et importer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des traductions */}
      {lignes.map(t => (
        <div key={t.trad_id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
          {/* En-tête */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: '14px', color: '#2a3d30' }}>{t.nom}</span>
              {t.dates && <span style={{ fontSize: '11px', color: '#9a958d' }}>{t.dates}</span>}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <code style={{ fontSize: '10.5px', background: '#f0ece6', padding: '2px 6px', borderRadius: '3px', color: '#6b6560' }}>{t.trad_id}</code>
              <button onClick={() => edition === t.trad_id ? fermer() : ouvrir(t)}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer' }}>
                {edition === t.trad_id ? 'Fermer' : 'Modifier'}
              </button>
              <button onClick={() => supprimer(t.trad_id)}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>

          {/* Formulaire édition */}
          {edition === t.trad_id && (
            <div style={{ padding: '16px 18px 18px', borderTop: '1px solid #f0ece6', background: '#faf8f4' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                {CHAMPS_SIMPLES.map(c => (
                  <div key={c.key}>
                    <label style={labelStyle}>{c.label.toUpperCase()}</label>
                    <input
                      value={(form[c.key] as string) ?? ''}
                      onChange={e => setForm(p => ({ ...p, [c.key]: c.key === 'ordre' ? parseInt(e.target.value) || 99 : e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>BIOGRAPHIE COURTE</label>
                <textarea value={(form.bio_courte as string) ?? ''} onChange={e => setForm(p => ({ ...p, bio_courte: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>COMMENTAIRE ÉDITORIAL</label>
                <EditeurRichText valeur={(form.commentaire_editorial as string) ?? ''} onChange={v => setForm(p => ({ ...p, commentaire_editorial: v }))} />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                {statut?.id === t.trad_id && (
                  <span style={{ fontSize: '11.5px', color: statut.ok ? '#3d6b4f' : '#c0562a' }}>{statut.ok ? '✓' : '✗'} {statut.msg}</span>
                )}
                <button onClick={fermer} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                <button onClick={sauvegarder} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}


// ── Section Commentaires (admin) ──────────────────────────────────────────────
function SectionCommentaires({
  commentaires: init, segMap, actionValider, actionSupprimerCommentaire,
}: {
  commentaires: Commentaire[]
  segMap: Record<number, SegInfo>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
}) {
  const [liste, setListe] = useState<Commentaire[]>(init)
  const [sousOnglet, setSousOnglet] = useState<'versets' | 'segments'>('versets')
  const [action, setAction] = useState<Record<number, 'valide' | 'rejete' | 'loading'>>({})

  const versets  = liste.filter(c => c.id_verset !== null)
  const segments = liste.filter(c => c.id_segment !== null)
  const affichés = sousOnglet === 'versets' ? versets : segments

  const valider = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionValider(id)
    setAction(p => ({ ...p, [id]: 'valide' }))
    setListe(p => p.map(c => c.id === id ? { ...c, valide: true } : c))
  }

  const rejeter = async (id: number) => {
    setAction(p => ({ ...p, [id]: 'loading' }))
    await actionSupprimerCommentaire(id)
    setAction(p => ({ ...p, [id]: 'rejete' }))
    setTimeout(() => setListe(p => p.filter(c => c.id !== id)), 600)
  }

  return (
    <div>
      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {([['versets', `Versets (${versets.length})`], ['segments', `Œuvres (${segments.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setSousOnglet(k)}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: sousOnglet === k ? '#3d6b4f' : '#e4dfd8', color: sousOnglet === k ? '#fff' : '#6b6560', fontWeight: sousOnglet === k ? 600 : 400 }}>
            {l}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {affichés.length === 0 ? (
          <Carte><p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>Aucun commentaire en attente.</p></Carte>
        ) : affichés.map(c => {
          const statut = action[c.id]
          return (
            <Carte key={c.id}>
              {/* Contexte */}
              {c.id_segment && <ContexteSegment segId={c.id_segment} segMap={segMap} />}
              {c.id_verset && (
                <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '0 0 6px' }}>
                  Verset <code style={{ background: '#f0ece6', padding: '1px 5px', borderRadius: '3px' }}>{c.id_verset}</code>
                </p>
              )}

              {/* Texte */}
              <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 8px' }}>{c.texte}</p>

              {/* Méta */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: '#6b6560', fontWeight: 500 }}>{c.auteur_nom}</span>
                <span style={{ fontSize: '11px', color: '#b0a89e' }}>{c.auteur_mail}</span>
                <span style={{ fontSize: '11px', color: '#b0a89e', marginLeft: 'auto' }}>{dateFormat(c.created_at)}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                {statut === 'loading' ? (
                  <span style={{ fontSize: '11.5px', color: '#9a958d' }}>…</span>
                ) : statut === 'valide' ? (
                  <span style={{ fontSize: '11.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Publié</span>
                ) : statut === 'rejete' ? (
                  <span style={{ fontSize: '11.5px', color: '#c0562a' }}>✗ Rejeté</span>
                ) : (
                  <>
                    <button onClick={() => rejeter(c.id)} className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Rejeter</button>
                    <button onClick={() => valider(c.id)} className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Valider ✓</button>
                  </>
                )}
              </div>
            </Carte>
          )
        })}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function AdminClient({
  commentaires, signalements, segMap, auteurs, traductions,
  actionDeconnexion, actionValider, actionSupprimerCommentaire,
  actionMarquerTraite, actionSupprimerSignalement,
}: Props) {
  const [onglet, setOnglet] = useState<Onglet>('bibliotheque')
  const nbComm   = commentaires.length
  const nbSignal = signalements.length
  const ONGLETS: { key: Onglet; label: string; badge?: number; separateur?: boolean }[] = [
    { key: 'auteurs',        label: 'Auteurs' },
    { key: 'bibliotheque',   label: 'Bibliothèque' },
    { key: 'ajouter-oeuvre', label: '+ Ajouter une œuvre' },
    { key: 'traductions',    label: 'Traductions' },
    { key: 'verifications',       label: 'Vérifications' },
    { key: 'remplacer-segments',  label: '↺ Segments', separateur: true },
    { key: 'commentaires',        label: 'Commentaires', badge: nbComm, separateur: true },
    { key: 'signalements',   label: 'Signalements', badge: nbSignal },
  ]

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', padding: '32px 24px 64px' }}>
      <style>{`
        .btn-vert { background: #3d6b4f !important; color: #fff !important; border: none !important; }
        .btn-vert:hover { background: #2e5440 !important; }
        .btn-rouge { background: #fff !important; color: #c0562a !important; border: 1px solid #e4c4b8 !important; }
        .btn-rouge:hover { background: #fdf2ee !important; }
        .btn-gris { background: #fff !important; color: #6b6560 !important; border: 1px solid #d6d0c4 !important; }
        .btn-gris:hover { background: #f3f0ea !important; }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '28px' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: '24px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>Administration</h1>
          <form action={actionDeconnexion}>
            <button type="submit" className="btn-gris" style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '5px', cursor: 'pointer' }}>Déconnexion</button>
          </form>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', marginBottom: '24px', alignItems: 'flex-end' }}>
          {ONGLETS.map((o) => (
            <React.Fragment key={o.key}>
              {o.separateur && (
                <span style={{ padding: '0 2px 10px', color: '#c8c2bc', fontSize: '20px', fontWeight: 100, lineHeight: 1, display: 'inline-block', transform: 'rotate(15deg)', userSelect: 'none' }}>
                  /
                </span>
              )}
              <button onClick={() => setOnglet(o.key)}
                style={{ padding: '9px 14px', fontSize: '12px', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? '#3d6b4f' : '#9a958d', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                {o.label}
                {o.badge !== undefined && o.badge > 0 && <span style={{ fontSize: '10px', background: '#c0562a', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontWeight: 600 }}>{o.badge}</span>}
              </button>
            </React.Fragment>
          ))}
        </div>

        {onglet === 'auteurs'       && <SectionAuteurs />}
        {onglet === 'bibliotheque'  && <SectionBibliotheque auteurs={auteurs} />}
        {onglet === 'verifications'  && <SectionVerifications />}
        {onglet === 'ajouter-oeuvre' && <SectionAjouterOeuvre auteurs={auteurs} />}
        {onglet === 'traductions'   && <SectionTraductions traductions={traductions} />}

        {onglet === 'remplacer-segments' && <SectionRemplacerSegments auteurs={auteurs} />}

        {onglet === 'commentaires' && (
          <SectionCommentaires
            commentaires={commentaires}
            segMap={segMap}
            actionValider={actionValider}
            actionSupprimerCommentaire={actionSupprimerCommentaire}
          />
        )}

        {onglet === 'signalements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nbSignal === 0 ? <Carte><p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>Aucun signalement en attente.</p></Carte>
            : signalements.map(s => (
              <Carte key={s.id}>
                <ContexteSegment segId={s.id_segment} segMap={segMap} />
                <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 10px' }}>{s.message}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#b0a89e' }}>{dateFormat(s.created_at)}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <form action={actionSupprimerSignalement.bind(null, s.id)}><button type="submit" className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Supprimer</button></form>
                    <form action={actionMarquerTraite.bind(null, s.id)}><button type="submit" className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>Traité ✓</button></form>
                  </div>
                </div>
              </Carte>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
// ── Téléchargement CSV modèle ─────────────────────────────────────────────────
function telechargerCSVModele(idOeuvre: string) {
  const headers = ['segment_numero','segment_texte','ref_niv1','ref_niv2','ref_niv3','ref_niv4','ref_niv5','lien_1','lien_2','lien_3','lien_4','fiabilite']
  const exemple = ['1','Texte du premier segment…','Livre I','Chapitre 1','§ 1','','','','','','','certain']
  const csv = [headers.join(','), exemple.map(v => `"${v}"`).join(',')].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `segments_${idOeuvre || 'modele'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Section Ajouter une œuvre ─────────────────────────────────────────────────
function SectionAjouterOeuvre({ auteurs }: { auteurs: Auteur[] }) {
  const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#f9f7f4', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }

  // ── Étape courante ──
  const [etape, setEtape] = React.useState<'meta' | 'csv' | 'preview' | 'done'>('meta')

  // ── Métadonnées œuvre ──
  const [meta, setMeta] = React.useState({
    id_auteur: '',
    titre: '',
    sous_titre: '',
    titre_original: '',
    trad_auteur: '',
    trad_date: '',
    editeur: '',
    collection: '',
    ville: '',
    date_publication: '',
    url_source: '',
    genre: '',
    langue: '',
  })

  // ── Ajout auteur ──
  const [ajoutAuteur, setAjoutAuteur] = React.useState(false)
  const [nouvelAuteur, setNouvelAuteur] = React.useState({ nom: '', dates: '', siecle: '', tradition: '' })
  const [auteursCourants, setAuteursCourants] = React.useState<Auteur[]>(auteurs)
  const [auteurMsg, setAuteurMsg] = React.useState<string | null>(null)

  // Charger TOUS les auteurs (pas seulement ceux avec des œuvres)
  React.useEffect(() => {
    supabase.from('auteurs').select('id_auteur, nom, dates, siecle, oeuvres(id_oeuvre, titre)')
      .order('nom', { ascending: true })
      .then(({ data }) => { if (data) setAuteursCourants(data as Auteur[]) })
  }, [])

  const creerAuteur = async () => {
    if (!nouvelAuteur.nom.trim()) { setAuteurMsg('Le nom est requis.'); return }

    // Générer id_auteur au format A0006
    const { data: derniers } = await supabase
      .from('auteurs')
      .select('id_auteur')
      .order('id_auteur', { ascending: false })
      .limit(1)

    let prochainNum = 1
    if (derniers && derniers.length > 0) {
      const num = parseInt((derniers[0].id_auteur as string).replace('A', ''), 10)
      if (!isNaN(num)) prochainNum = num + 1
    }
    const idAuteur = `A${String(prochainNum).padStart(4, '0')}`

    const { data, error } = await supabase.from('auteurs').insert({
      id_auteur: idAuteur,
      nom: nouvelAuteur.nom.trim(),
      dates: nouvelAuteur.dates || null,
      siecle: nouvelAuteur.siecle || null,
      tradition: nouvelAuteur.tradition || null,
    }).select().single()
    if (error) { setAuteurMsg('Erreur : ' + error.message); return }
    const nouv = { id_auteur: data.id_auteur, nom: data.nom, dates: data.dates, siecle: data.siecle, oeuvres: [] }
    setAuteursCourants(prev => [...prev, nouv])
    setMeta(m => ({ ...m, id_auteur: data.id_auteur }))
    setAjoutAuteur(false)
    setNouvelAuteur({ nom: '', dates: '', siecle: '', tradition: '' })
    setAuteurMsg(null)
  }

  // ── Import CSV ──
  const [segments, setSegments] = React.useState<Record<string, string>[]>([])
  const [nomFichier, setNomFichier] = React.useState('')
  const [csvErreur, setCsvErreur] = React.useState<string | null>(null)
  const inputCsvRef = React.useRef<HTMLInputElement | null>(null)

  const COLONNES_REQUISES = ['segment_numero', 'segment_texte']

  const lireFichier = async (fichier: File) => {
    setCsvErreur(null)
    const texte = await fichier.text()
    const lignes = parseCSV(texte)
    if (lignes.length === 0) { setCsvErreur('Fichier vide ou non reconnu.'); return }
    const manquantes = COLONNES_REQUISES.filter(c => !Object.keys(lignes[0]).includes(c))
    if (manquantes.length > 0) { setCsvErreur(`Colonnes manquantes : ${manquantes.join(', ')}`); return }
    setSegments(lignes)
    setNomFichier(fichier.name)
  }

  // ── Génération id_oeuvre ──
  const [idOeuvreGenere, setIdOeuvreGenere] = React.useState('')
  const [generationLoading, setGenerationLoading] = React.useState(false)

  const genererIdOeuvre = async () => {
    if (!meta.id_auteur) { setCsvErreur('Choisissez un auteur avant de générer l\'ID.'); return }
    setGenerationLoading(true)
    // Récupérer TOUTES les œuvres de cet auteur pour trouver le vrai max
    const { data } = await supabase
      .from('oeuvres')
      .select('id_oeuvre')
      .eq('id_auteur', meta.id_auteur)
      .order('id_oeuvre', { ascending: false })
    let prochainNum = 1
    if (data && data.length > 0) {
      // Trouver le numéro max parmi toutes les œuvres
      const nums = data.map((d: any) => {
        const match = (d.id_oeuvre as string).match(/O(\d+)$/)
        return match ? parseInt(match[1]) : 0
      })
      prochainNum = Math.max(...nums) + 1
    }
    const id = `${meta.id_auteur}O${String(prochainNum).padStart(4, '0')}`
    setIdOeuvreGenere(id)
    setGenerationLoading(false)
  }

  // ── Import final ──
  const [importing, setImporting] = React.useState(false)
  const [resultat, setResultat] = React.useState<{ ok: boolean; msg: string; idOeuvre?: string } | null>(null)

  const confirmerImport = async () => {
    if (!meta.id_auteur || !meta.titre.trim()) { setCsvErreur('Titre et auteur sont requis.'); return }
    if (!idOeuvreGenere) { setCsvErreur('Générez l\'ID de l\'œuvre avant de continuer.'); return }
    setImporting(true)
    const idOeuvre = idOeuvreGenere

    // 0. Vérifier que l'ID n'existe pas déjà
    const { data: existante } = await supabase.from('oeuvres').select('id_oeuvre').eq('id_oeuvre', idOeuvre).single()
    if (existante) {
      setResultat({ ok: false, msg: `L'ID ${idOeuvre} existe déjà. Régénérez ou modifiez l'ID.` })
      setImporting(false)
      return
    }

    // 1. Créer l'œuvre
    const { error: errOeuvre } = await supabase.from('oeuvres').insert({
      id_oeuvre: idOeuvre,
      id_auteur: meta.id_auteur,
      titre: meta.titre.trim(),
      sous_titre: meta.sous_titre || null,
      titre_original: meta.titre_original || null,
      trad_auteur: meta.trad_auteur || null,
      trad_date: meta.trad_date || null,
      editeur: meta.editeur || null,
      collection: meta.collection || null,
      ville: meta.ville || null,
      date_publication: meta.date_publication || null,
      url_source: meta.url_source || null,
      genre: meta.genre || null,
      langue: meta.langue || null,
    })
    if (errOeuvre) { setResultat({ ok: false, msg: 'Erreur création œuvre : ' + errOeuvre.message }); setImporting(false); return }

    // 2. Insérer les segments par batch de 500
    const rows = segments.map((s, i) => ({
      id_oeuvre: idOeuvre,
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
      nature: (s as any).nature || 'texte',
    }))

    let errSeg = null
    const insertedIds: number[] = []
    for (let i = 0; i < rows.length; i += 500) {
      const { data: inserted, error } = await supabase.from('segments').insert(rows.slice(i, i + 500)).select('id')
      if (error) { errSeg = error; break }
      inserted?.forEach((r: any) => insertedIds.push(r.id))
    }

    if (errSeg) {
      // Rollback : supprimer les segments déjà insérés puis l'œuvre
      if (insertedIds.length > 0) {
        await supabase.from('segments').delete().in('id', insertedIds)
      }
      await supabase.from('oeuvres').delete().eq('id_oeuvre', idOeuvre)
      setResultat({ ok: false, msg: 'Erreur import segments : ' + errSeg.message })
    } else {
      setResultat({ ok: true, msg: `${rows.length} segments importés.`, idOeuvre })
      setEtape('done')
    }
    setImporting(false)
  }

  const reset = () => {
    setEtape('meta')
    setMeta({ id_auteur: '', titre: '', sous_titre: '', titre_original: '', trad_auteur: '', trad_date: '', editeur: '', collection: '', ville: '', date_publication: '', url_source: '', genre: '', langue: '' })
    setSegments([]); setNomFichier(''); setCsvErreur(null); setResultat(null)
    setAjoutAuteur(false); setIdOeuvreGenere('')
  }

  // ── Rendu ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Indicateur d'étapes */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '8px' }}>
        {([['meta', 'Métadonnées'], ['csv', 'Import CSV'], ['preview', 'Prévisualisation']] as const).map(([k, l], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: etape === k ? 600 : 400, color: etape === k ? '#3d6b4f' : (etape === 'done' || ['csv','preview'].indexOf(etape) > ['csv','preview'].indexOf(k as any)) ? '#3d6b4f' : '#b0a89e', padding: '4px 0' }}>
              {i + 1}. {l}
            </span>
            {i < 2 && <span style={{ margin: '0 10px', color: '#d6d0c4', fontSize: '11px' }}>→</span>}
          </div>
        ))}
      </div>

      {/* ── ÉTAPE 1 : Métadonnées ── */}
      {(etape === 'meta' || etape === 'csv') && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '20px 24px' }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: '15px', fontWeight: 'normal', color: '#2a3d30', margin: '0 0 18px' }}>Informations sur l'œuvre</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {/* Auteur */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>AUTEUR</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={meta.id_auteur} onChange={e => setMeta(m => ({ ...m, id_auteur: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">— Choisir un auteur —</option>
                  {auteursCourants.map(a => (
                    <option key={a.id_auteur} value={String(a.id_auteur)}>{a.nom}{a.dates ? ` (${a.dates})` : ''}</option>
                  ))}
                </select>
                <button onClick={() => setAjoutAuteur(!ajoutAuteur)}
                  style={{ fontSize: '11.5px', padding: '7px 12px', borderRadius: '5px', border: '1px solid #d6d0c4', background: ajoutAuteur ? '#3d6b4f' : '#fff', color: ajoutAuteur ? '#fff' : '#3d6b4f', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Nouvel auteur
                </button>
              </div>
            </div>

            {/* Formulaire nouvel auteur */}
            {ajoutAuteur && (
              <div style={{ gridColumn: '1 / -1', background: '#f7f4ef', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', marginBottom: '12px' }}>Nouvel auteur</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={labelStyle}>NOM *</label><input value={nouvelAuteur.nom} onChange={e => setNouvelAuteur(p => ({ ...p, nom: e.target.value }))} style={inputStyle} placeholder="Augustin d'Hippone" /></div>
                  <div><label style={labelStyle}>DATES</label><input value={nouvelAuteur.dates} onChange={e => setNouvelAuteur(p => ({ ...p, dates: e.target.value }))} style={inputStyle} placeholder="354-430" /></div>
                  <div><label style={labelStyle}>SIÈCLE (négatif = av. J.-C.)</label><input type="number" value={nouvelAuteur.siecle} onChange={e => setNouvelAuteur(p => ({ ...p, siecle: e.target.value }))} style={inputStyle} placeholder="4" /></div>
                  <div><label style={labelStyle}>TRADITION</label><input value={nouvelAuteur.tradition} onChange={e => setNouvelAuteur(p => ({ ...p, tradition: e.target.value }))} style={inputStyle} placeholder="Catholique" /></div>
                </div>
                {auteurMsg && <p style={{ fontSize: '11.5px', color: '#c0562a', marginBottom: '8px' }}>{auteurMsg}</p>}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAjoutAuteur(false); setAuteurMsg(null) }} style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={creerAuteur} style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer l'auteur</button>
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>TITRE FRANÇAIS *</label>
              <input value={meta.titre} onChange={e => setMeta(m => ({ ...m, titre: e.target.value }))} style={inputStyle} placeholder="Les Confessions" />
            </div>

            {/* ID de l'œuvre */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>IDENTIFIANT DE L'ŒUVRE</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={idOeuvreGenere}
                  onChange={e => setIdOeuvreGenere(e.target.value)}
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', color: idOeuvreGenere ? '#2a3d30' : '#b0a89e' }}
                  placeholder="Ex. A0011O0003 — cliquez sur Générer"
                  readOnly={false}
                />
                <button
                  onClick={genererIdOeuvre}
                  disabled={generationLoading || !meta.id_auteur}
                  style={{ fontSize: '11.5px', padding: '7px 12px', borderRadius: '5px', border: '1px solid #d6d0c4', background: meta.id_auteur ? '#3d6b4f' : '#e4dfd8', color: meta.id_auteur ? '#fff' : '#9a958d', cursor: meta.id_auteur ? 'pointer' : 'default', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {generationLoading ? '…' : '⟳ Générer'}
                </button>
              </div>
              {idOeuvreGenere && (
                <p style={{ fontSize: '10px', color: '#9a958d', marginTop: '3px' }}>
                  Vous pouvez modifier manuellement si nécessaire.
                </p>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>SOUS-TITRE</label>
              <input value={meta.sous_titre} onChange={e => setMeta(m => ({ ...m, sous_titre: e.target.value }))} style={inputStyle} placeholder="Sous-titre éventuel" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>TITRE ORIGINAL (latin, grec…)</label>
              <input value={meta.titre_original} onChange={e => setMeta(m => ({ ...m, titre_original: e.target.value }))} style={inputStyle} placeholder="Confessiones" />
            </div>
            <div>
              <label style={labelStyle}>TRADUCTEUR (abrégé)</label>
              <input value={meta.trad_auteur} onChange={e => setMeta(m => ({ ...m, trad_auteur: e.target.value }))} style={inputStyle} placeholder="Michel Moreau" />
            </div>
            <div>
              <label style={labelStyle}>DATE DE TRADUCTION</label>
              <input value={meta.trad_date} onChange={e => setMeta(m => ({ ...m, trad_date: e.target.value }))} style={inputStyle} placeholder="1864" />
            </div>
            <div>
              <label style={labelStyle}>ÉDITEUR</label>
              <input value={meta.editeur} onChange={e => setMeta(m => ({ ...m, editeur: e.target.value }))} style={inputStyle} placeholder="Gallimard" />
            </div>
            <div>
              <label style={labelStyle}>COLLECTION</label>
              <input value={meta.collection} onChange={e => setMeta(m => ({ ...m, collection: e.target.value }))} style={inputStyle} placeholder="Bibliothèque de la Pléiade" />
            </div>
            <div>
              <label style={labelStyle}>VILLE</label>
              <input value={meta.ville} onChange={e => setMeta(m => ({ ...m, ville: e.target.value }))} style={inputStyle} placeholder="Paris" />
            </div>
            <div>
              <label style={labelStyle}>DATE DE PUBLICATION</label>
              <input value={meta.date_publication} onChange={e => setMeta(m => ({ ...m, date_publication: e.target.value }))} style={inputStyle} placeholder="1900" />
            </div>
            <div>
              <label style={labelStyle}>URL SOURCE</label>
              <input value={meta.url_source} onChange={e => setMeta(m => ({ ...m, url_source: e.target.value }))} style={inputStyle} placeholder="https://gallica.bnf.fr/…" />
            </div>
            <div>
              <label style={labelStyle}>GENRE</label>
              <input value={meta.genre} onChange={e => setMeta(m => ({ ...m, genre: e.target.value }))} style={inputStyle} placeholder="Autobiographie spirituelle" />
            </div>
            <div>
              <label style={labelStyle}>LANGUE ORIGINALE</label>
              <input value={meta.langue} onChange={e => setMeta(m => ({ ...m, langue: e.target.value }))} style={inputStyle} placeholder="Latin" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { if (!meta.id_auteur || !meta.titre.trim()) { alert('Titre et auteur sont requis.'); return } setEtape('csv') }}
              style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Suivant : import CSV →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : Import CSV ── */}
      {(etape === 'csv' || etape === 'preview') && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: '15px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>Import des segments</h2>
            <button onClick={() => telechargerCSVModele(meta.titre.slice(0,20).replace(/\s/g,'_'))}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>
              ↓ Télécharger le CSV modèle
            </button>
          </div>

          {/* Colonnes attendues */}
          <div style={{ background: '#f7f4ef', borderRadius: '5px', padding: '10px 14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '10.5px', fontWeight: 600, color: '#6b6560', marginBottom: '5px' }}>COLONNES ATTENDUES</p>
            <p style={{ fontSize: '11px', color: '#9a958d', fontFamily: 'monospace', lineHeight: 1.7, margin: 0 }}>
              segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,<br/>
              lien_1, lien_2, lien_3, lien_4, fiabilite
            </p>
          </div>

          {/* Zone drop / sélection */}
          <div
            onClick={() => inputCsvRef.current?.click()}
            style={{ border: '2px dashed #d6d0c4', borderRadius: '8px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: '#faf8f4', transition: 'border-color 0.15s' }}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#3d6b4f' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d6d0c4' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#d6d0c4'; const f = e.dataTransfer.files[0]; if (f) lireFichier(f) }}
          >
            <p style={{ fontSize: '13px', color: '#9a958d', margin: '0 0 6px' }}>
              {nomFichier ? `✓ ${nomFichier} — ${segments.length} segments` : 'Glissez un fichier CSV ou cliquez pour sélectionner'}
            </p>
            <p style={{ fontSize: '11px', color: '#b0a89e', margin: 0 }}>Format .csv, encodage UTF-8</p>
          </div>
          <input ref={inputCsvRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) lireFichier(f) }} />

          {csvErreur && <p style={{ fontSize: '12px', color: '#c0562a', marginTop: '10px' }}>⚠ {csvErreur}</p>}

          {segments.length > 0 && etape === 'csv' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', gap: '8px' }}>
              <button onClick={() => setEtape('meta')} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => setEtape('preview')} style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Prévisualiser →</button>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAPE 3 : Prévisualisation + confirmation ── */}
      {etape === 'preview' && segments.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4dfd8', background: '#f7f4ef' }}>
            <p style={{ fontSize: '12px', color: '#2a3d30', fontWeight: 500, margin: '0 0 4px' }}>
              {auteursCourants.find(a => String(a.id_auteur) === meta.id_auteur)?.nom} — {meta.titre}
            </p>
            <p style={{ fontSize: '11.5px', color: '#9a958d', margin: 0 }}>
              {segments.length} segments · {meta.trad_auteur ? `trad. ${meta.trad_auteur}` : 'traducteur non renseigné'}
            </p>
          </div>

          {/* Aperçu 10 premiers segments */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: '#f7f4ef', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '50px' }}>§</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '120px' }}>Réf.</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8' }}>Texte (début)</th>
                </tr>
              </thead>
              <tbody>
                {segments.slice(0, 10).map((s, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f4', borderBottom: '1px solid #f0ece6' }}>
                    <td style={{ padding: '6px 12px', color: '#3d6b4f', fontWeight: 500 }}>{s.segment_numero}</td>
                    <td style={{ padding: '6px 12px', color: '#9a958d' }}>{[s.ref_niv1, s.ref_niv2].filter(Boolean).join(', ')}</td>
                    <td style={{ padding: '6px 12px', color: '#2a2520' }}>{(s.segment_texte || '').slice(0, 80)}{s.segment_texte?.length > 80 ? '…' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {segments.length > 10 && (
              <p style={{ padding: '8px 12px', fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>… et {segments.length - 10} autres segments</p>
            )}
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid #e4dfd8', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <button onClick={() => setEtape('csv')} disabled={importing} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>← Retour</button>
            <button onClick={confirmerImport} disabled={importing}
              style={{ fontSize: '12px', padding: '7px 20px', borderRadius: '5px', border: 'none', background: importing ? '#8aaa96' : '#3d6b4f', color: '#fff', cursor: importing ? 'default' : 'pointer', fontWeight: 500 }}>
              {importing ? 'Import en cours…' : `Confirmer l'import (${segments.length} segments)`}
            </button>
          </div>
        </div>
      )}

      {/* Erreur import */}
      {resultat && !resultat.ok && (
        <div style={{ background: '#fdf2ee', border: '1px solid #e4c4b8', borderRadius: '6px', padding: '12px 16px' }}>
          <p style={{ fontSize: '12.5px', color: '#c0562a', margin: 0 }}>✗ {resultat.msg}</p>
        </div>
      )}

      {/* ── ÉTAPE 4 : Succès ── */}
      {etape === 'done' && resultat?.ok && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '22px', marginBottom: '10px' }}>✓</p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: '16px', color: '#2a3d30', marginBottom: '8px' }}>{meta.titre}</p>
          <p style={{ fontSize: '12.5px', color: '#5a6b5e', marginBottom: '20px' }}>{resultat.msg}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {resultat.idOeuvre && (
              <a href={`/oeuvre/${resultat.idOeuvre}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', color: '#2a3d30', textDecoration: 'none' }}>
                Lire l'œuvre ↗
              </a>
            )}
            <button onClick={reset}
              style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Ajouter une autre œuvre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
// ── Conversion référence biblique → format français ───────────────────────────
const ABREV_FR_VER: Record<string, string> = {
  GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt',
  '1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',
  EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',
  ISA:'Is',JER:'Jr',LAM:'Lm',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',
  OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',
  MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',
  GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm',
  '2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap',
}
function refFrVer(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const abr = ABREV_FR_VER[p[0]] ?? p[0]
  return cv[1] ? `${abr} ${cv[0]}, ${cv[1]}` : `${abr} ${cv[0]}`
}

// ── Section Vérifications ─────────────────────────────────────────────────────
const PAGE_SIZE = 20

// ── Section Remplacer Segments ────────────────────────────────────────────────
function SectionRemplacerSegments({ auteurs }: { auteurs: Auteur[] }) {
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

function SectionVerifications() {
  const [tousSegments, setTousSegments] = React.useState<any[]>([])
  const [chargement, setChargement] = React.useState(true)
  const [oeuvres, setOeuvres] = React.useState<Record<string, { titre: string; auteur: string }>>({})
  const [versets, setVersets] = React.useState<Record<string, { ref: string; texte: string }>>({})
  const [filtre, setFiltre] = React.useState<'tous' | 'probable'>('tous')
  const [page, setPage] = React.useState(0)
  const [action, setAction] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    const charger = async () => {
      // Segments avec au moins un lien — pagination Supabase par batch
      let segs: any[] = []
      let from = 0
      while (true) {
        const { data: batch } = await supabase
          .from('segments')
          .select('id, id_oeuvre, segment_numero, segment_texte, ref_niv1, ref_niv2, lien_1, lien_2, lien_3, lien_4, fiabilite')
          .or('lien_1.neq.,lien_2.neq.,lien_3.neq.,lien_4.neq.')
          .order('id_oeuvre').order('segment_numero')
          .range(from, from + 999)
        if (!batch || batch.length === 0) break
        segs = segs.concat(batch)
        if (batch.length < 1000) break
        from += 1000
      }
      setTousSegments(segs)

      // Œuvres + auteurs
      const { data: ods } = await supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur')
      const { data: ads } = await supabase.from('auteurs').select('id_auteur, nom')
      const autMap: Record<string, string> = {}
      ads?.forEach((a: any) => { autMap[a.id_auteur] = a.nom })
      const oeuvMap: Record<string, { titre: string; auteur: string }> = {}
      ods?.forEach((o: any) => { oeuvMap[o.id_oeuvre] = { titre: o.titre, auteur: autMap[o.id_auteur] ?? '' } })
      setOeuvres(oeuvMap)

      // Versets — on charge les refs + texte Sacy (pour afficher le verset)
      const ids = new Set<string>()
      segs.forEach((s: any) => {
        ;['lien_1','lien_2','lien_3','lien_4'].forEach(col => {
          if (s[col]) s[col].split(';').forEach((v: string) => { const t = v.trim(); if (t) ids.add(t) })
        })
      })
      if (ids.size > 0) {
        // Batch de 500 max pour .in()
        const idsArr = Array.from(ids)
        let vm: Record<string, { ref: string; texte: string }> = {}
        for (let i = 0; i < idsArr.length; i += 500) {
          const { data: vs } = await supabase
            .from('versets')
            .select('id_verset, ref, TR0001')
            .in('id_verset', idsArr.slice(i, i + 500))
          vs?.forEach((v: any) => { vm[v.id_verset] = { ref: v.ref, texte: v.TR0001 ?? '' } })
        }
        setVersets(vm)
      }

      setChargement(false)
    }
    charger()
  }, [])

  // Reset page quand filtre change
  React.useEffect(() => { setPage(0) }, [filtre])

  const supprimerLien = async (segId: number, col: string, idVerset: string) => {
    const key = `${segId}_${col}_${idVerset}`
    setAction(p => ({ ...p, [key]: 'loading' }))
    const { data } = await supabase.from('segments').select(col).eq('id', segId).single()
    if (!data) return
    const val: string = (data as any)[col] ?? ''
    const nouveau = val.split(';').map((v: string) => v.trim()).filter((v: string) => v && v !== idVerset).join('; ')
    const patch: Record<string, string | null> = {}
    patch[col] = nouveau || null
    await supabase.from('segments').update(patch).eq('id', segId)
    setTousSegments(prev => prev.map(s => s.id === segId ? { ...s, [col]: nouveau || null } : s))
    setAction(p => ({ ...p, [key]: 'done' }))
  }

  const validerLien = async (segId: number, col: string, idVerset: string) => {
    const key = `${segId}_${col}_${idVerset}`
    setAction(p => ({ ...p, [key]: 'loading' }))
    await supabase.from('segments').update({ fiabilite: 'vérifié' }).eq('id', segId)
    setTousSegments(prev => prev.map(s => s.id === segId ? { ...s, fiabilite: 'vérifié' } : s))
    setAction(p => ({ ...p, [key]: 'valide' }))
  }

  const segmentsFiltres = tousSegments.filter(s => {
    if (s.fiabilite === 'vérifié') return false // déjà validés, pas à vérifier
    return filtre === 'tous' || s.fiabilite === filtre
  })
  const nbPages = Math.ceil(segmentsFiltres.length / PAGE_SIZE)
  const pageCourante = segmentsFiltres.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const TYPES_LIEN: Record<string, string> = { lien_2: 'Citation libre', lien_3: 'Doctrine', lien_4: 'Écho' }
  const FIAB_COLOR: Record<string, string> = { certain: '#3d6b4f', probable: '#7a6830', possible: '#9a5a2a' }
  const FIAB_BG: Record<string, string> = { certain: 'rgba(61,107,79,0.08)', probable: 'rgba(122,104,48,0.08)', possible: 'rgba(154,90,42,0.08)' }

  return (
    <div>
      {/* Filtres + compteur + pagination */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11.5px', color: '#9a958d', marginRight: '4px' }}>Fiabilité :</span>
        {(['tous','probable'] as const).map(f => (
          <button key={f} onClick={() => setFiltre(f)}
            style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filtre === f ? '#3d6b4f' : '#e4dfd8', color: filtre === f ? '#fff' : '#6b6560', fontWeight: filtre === f ? 600 : 400 }}>
            {f === 'tous' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: '#9a958d' }}>
          {segmentsFiltres.length} segment{segmentsFiltres.length > 1 ? 's' : ''}
        </span>
      </div>

      {chargement && <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>}
      {!chargement && segmentsFiltres.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Aucun segment avec des liens pour ce filtre.</p>
      )}

      {/* Pagination haut */}
      {nbPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page === 0 ? '#c0bab4' : '#3a3530', cursor: page === 0 ? 'default' : 'pointer' }}>
            ← Préc.
          </button>
          <span style={{ fontSize: '11.5px', color: '#9a958d' }}>
            Plage {page + 1} / {nbPages} &nbsp;·&nbsp; segments {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, segmentsFiltres.length)}
          </span>
          <button onClick={() => setPage(p => Math.min(nbPages - 1, p + 1))} disabled={page >= nbPages - 1}
            style={{ fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page >= nbPages - 1 ? '#c0bab4' : '#3a3530', cursor: page >= nbPages - 1 ? 'default' : 'pointer' }}>
            Suiv. →
          </button>
        </div>
      )}

      {/* Liste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {pageCourante.map(seg => {
          const oeuvre = oeuvres[seg.id_oeuvre] ?? { titre: seg.id_oeuvre, auteur: '' }
          const refs = [seg.ref_niv1, seg.ref_niv2].filter(Boolean).join(', ')
          const fiab = seg.fiabilite ?? ''

          const tousLiens: { col: string; idVerset: string }[] = []
          ;['lien_1','lien_2','lien_3','lien_4'].forEach(col => {
            if (seg[col]) seg[col].split(';').forEach((v: string) => {
              const t = v.trim(); if (t) tousLiens.push({ col, idVerset: t })
            })
          })
          if (tousLiens.length === 0) return null

          return (
            <div key={seg.id} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>

              {/* En-tête */}
              <div style={{ padding: '8px 16px', background: '#faf8f4', borderBottom: '1px solid #ede9e2', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2a3d30' }}>{oeuvre.auteur}</span>
                <span style={{ fontSize: '12px', color: '#8a8278', fontStyle: 'italic' }}>{oeuvre.titre}</span>
                {refs && <span style={{ fontSize: '11px', color: '#b0a89e', background: '#eeebe4', padding: '1px 6px', borderRadius: '3px' }}>{refs}</span>}
                <span style={{ fontSize: '10.5px', fontWeight: 600, color: FIAB_COLOR[fiab] ?? '#6b6560', background: FIAB_BG[fiab] ?? '#eeebe4', padding: '1px 7px', borderRadius: '4px', marginLeft: 'auto' }}>
                  {fiab}
                </span>
              </div>

              {/* Texte du segment */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ece6', background: '#fff' }}>
                <p style={{ fontSize: '12.5px', color: '#1e1a16', lineHeight: 1.65, margin: 0, textAlign: 'justify' }}>
                  {seg.segment_texte}
                </p>
              </div>

              {/* Liens avec verset affiché */}
              <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tousLiens.map(({ col, idVerset }) => {
                  const key = `${seg.id}_${col}_${idVerset}`
                  const statut = action[key]
                  const verset = versets[idVerset]
                  return (
                    <div key={key} style={{
                      display: 'flex', flexDirection: 'column', gap: '5px',
                      padding: '10px 12px', borderRadius: '5px',
                      background: statut === 'valide' ? 'rgba(61,107,79,0.06)' : statut === 'done' ? 'rgba(180,50,40,0.04)' : '#f7f4ef',
                      border: `1px solid ${statut === 'valide' ? 'rgba(61,107,79,0.20)' : statut === 'done' ? 'rgba(180,50,40,0.15)' : '#e8e4dc'}`,
                    }}>
                      {/* Ref verset + type + actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#2a3d30', minWidth: '80px' }}>
                          {verset ? refFrVer(verset.ref) : idVerset}
                        </span>
                        {TYPES_LIEN[col] && (
                          <span style={{ fontSize: '10px', color: '#9a958d', background: '#eeebe4', padding: '1px 6px', borderRadius: '3px' }}>{TYPES_LIEN[col]}</span>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                          {statut === 'valide' ? (
                            <span style={{ fontSize: '11px', color: '#3d6b4f', fontWeight: 600 }}>✓ Validé</span>
                          ) : statut === 'done' ? (
                            <span style={{ fontSize: '11px', color: '#c0562a' }}>✗ Supprimé</span>
                          ) : statut === 'loading' ? (
                            <span style={{ fontSize: '11px', color: '#9a958d' }}>…</span>
                          ) : (
                            <>
                              <button onClick={() => validerLien(seg.id, col, idVerset)}
                                style={{ fontSize: '11.5px', padding: '4px 14px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                                Valider ✓
                              </button>
                              <button onClick={() => supprimerLien(seg.id, col, idVerset)}
                                style={{ fontSize: '11.5px', padding: '4px 12px', borderRadius: '4px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer' }}>
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Texte du verset */}
                      {verset?.texte && (
                        <p style={{ fontSize: '12px', color: '#3a3530', lineHeight: 1.55, margin: 0, fontStyle: 'italic', borderLeft: '2px solid #d6d0c4', paddingLeft: '10px' }}>
                          {verset.texte}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination bas */}
      {nbPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
          <button onClick={() => { setPage(p => Math.max(0, p - 1)); window.scrollTo(0, 0) }} disabled={page === 0}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page === 0 ? '#c0bab4' : '#3a3530', cursor: page === 0 ? 'default' : 'pointer' }}>
            ← Préc.
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: nbPages }, (_, i) => (
              <button key={i} onClick={() => { setPage(i); window.scrollTo(0, 0) }}
                style={{ fontSize: '11px', width: '28px', height: '28px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: page === i ? '#3d6b4f' : '#e4dfd8', color: page === i ? '#fff' : '#6b6560', fontWeight: page === i ? 600 : 400 }}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => { setPage(p => Math.min(nbPages - 1, p + 1)); window.scrollTo(0, 0) }} disabled={page >= nbPages - 1}
            style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: page >= nbPages - 1 ? '#c0bab4' : '#3a3530', cursor: page >= nbPages - 1 ? 'default' : 'pointer' }}>
            Suiv. →
          </button>
        </div>
      )}
    </div>
  )
}
// ── Section Auteurs ───────────────────────────────────────────────────────────
function SectionAuteurs() {
  const [auteurs, setAuteurs] = React.useState<any[]>([])
  const [chargement, setChargement] = React.useState(true)
  const [edition, setEdition] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<Record<string, string>>({})
  const [ajout, setAjout] = React.useState(false)
  const [nouvel, setNouvel] = React.useState({ nom: '', dates: '', siecle: '', tradition: '', note: '', aire_geographique: '', langue_principale: '' })
  const [statut, setStatut] = React.useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [msgAjout, setMsgAjout] = React.useState<string | null>(null)

  React.useEffect(() => {
    supabase.from('auteurs').select('*').order('siecle', { ascending: true, nullsFirst: false })
      .then(({ data }) => { setAuteurs(data ?? []); setChargement(false) })
  }, [])

  const ouvrir = (a: any) => { setEdition(a.id_auteur); setForm({ ...a }); setStatut(null) }
  const fermer = () => { setEdition(null); setForm({}) }

  const sauvegarder = async () => {
    if (!edition) return
    const { error } = await supabase.from('auteurs').update(form).eq('id_auteur', edition)
    if (error) { setStatut({ id: edition, ok: false, msg: error.message }); return }
    setAuteurs(prev => prev.map(a => a.id_auteur === edition ? { ...a, ...form } : a))
    setStatut({ id: edition, ok: true, msg: 'Enregistré.' })
    setTimeout(() => { setStatut(null); fermer() }, 1200)
  }

  const creer = async () => {
    if (!nouvel.nom.trim()) { setMsgAjout('Le nom est requis.'); return }
    const { data: derniers } = await supabase.from('auteurs').select('id_auteur').order('id_auteur', { ascending: false }).limit(1)
    let prochainNum = 1
    if (derniers && derniers.length > 0) {
      const num = parseInt((derniers[0].id_auteur as string).replace('A', ''), 10)
      if (!isNaN(num)) prochainNum = num + 1
    }
    const idAuteur = `A${String(prochainNum).padStart(4, '0')}`
    const { data, error } = await supabase.from('auteurs').insert({
      id_auteur: idAuteur,
      nom: nouvel.nom.trim(),
      dates: nouvel.dates || null,
      siecle: nouvel.siecle || null,
      tradition: nouvel.tradition || null,
      note: nouvel.note || null,
      aire_geographique: nouvel.aire_geographique || null,
      langue_principale: nouvel.langue_principale || null,
    }).select().single()
    if (error) { setMsgAjout('Erreur : ' + error.message); return }
    setAuteurs(prev => [...prev, data])
    setAjout(false)
    setNouvel({ nom: '', dates: '', siecle: '', tradition: '', note: '', aire_geographique: '', langue_principale: '' })
    setMsgAjout(null)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: '12px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#f9f7f4', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '3px' }

  const CHAMPS = [
    { key: 'nom', label: 'Nom *' },
    { key: 'dates', label: 'Dates (ex. 354-430)' },
    { key: 'siecle', label: 'Siècle (ex. 5)' },
    { key: 'tradition', label: 'Tradition' },
    { key: 'aire_geographique', label: 'Aire géographique' },
    { key: 'langue_principale', label: 'Langue principale' },
    { key: 'note', label: 'Note' },
  ]

  if (chargement) return <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

      {/* Bouton nouvel auteur */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button onClick={() => { setAjout(!ajout); setMsgAjout(null) }}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: ajout ? '#2e5440' : '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {ajout ? 'Annuler' : '+ Nouvel auteur'}
        </button>
      </div>

      {/* Formulaire nouvel auteur */}
      {ajout && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '16px 20px', marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '14px' }}>Nouvel auteur</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            {CHAMPS.map(c => (
              <div key={c.key} style={c.key === 'note' ? { gridColumn: '1 / -1' } : {}}>
                <label style={labelStyle}>{c.key === 'note' ? 'NOTE' : c.label.toUpperCase()}</label>
                {c.key === 'note'
                  ? <textarea value={(nouvel as any)[c.key]} onChange={e => setNouvel(p => ({ ...p, [c.key]: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  : <input value={(nouvel as any)[c.key]} onChange={e => setNouvel(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyle} placeholder={c.key === 'nom' ? 'Augustin d\'Hippone' : ''} />
                }
              </div>
            ))}
          </div>
          {msgAjout && <p style={{ fontSize: '11.5px', color: '#c0562a', marginBottom: '8px' }}>{msgAjout}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => { setAjout(false); setMsgAjout(null) }} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
            <button onClick={creer} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer</button>
          </div>
        </div>
      )}

      {/* Liste des auteurs — groupés par siècle, triés alphabétiquement */}
      {(() => {
        const tries = [...auteurs].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
        const groupes = new Map<string, any[]>()
        for (const a of tries) {
          const n = parseInt(a.siecle ?? '0')
          const s = a.siecle ? `${Math.abs(n)}e siècle${n < 0 ? ' av. J.-C.' : ''}` : 'Siècle inconnu'
          if (!groupes.has(s)) groupes.set(s, [])
          groupes.get(s)!.push(a)
        }
        const sieclesTries = Array.from(groupes.entries()).sort(([, ga], [, gb]) => {
          const na = parseInt(ga[0].siecle ?? '999')
          const nb = parseInt(gb[0].siecle ?? '999')
          return na - nb
        })
        return sieclesTries.map(([siecleLabel, auteursGroupe]) => (
          <div key={siecleLabel} style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: '#9a958d', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>
              {siecleLabel}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {auteursGroupe.map((a: any) => (
                <div key={a.id_auteur} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: "Georgia, serif", fontSize: '14px', color: '#2a3d30' }}>{a.nom}</span>
                      {a.dates && <span style={{ fontSize: '11px', color: '#9a958d' }}>{a.dates}</span>}
                      {a.tradition && <span style={{ fontSize: '10.5px', color: '#9a958d', background: '#eeeae4', padding: '1px 6px', borderRadius: '3px' }}>{a.tradition}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                      <code style={{ fontSize: '10px', background: '#f0ece6', padding: '2px 6px', borderRadius: '3px', color: '#6b6560' }}>{a.id_auteur}</code>
                      <button onClick={() => edition === a.id_auteur ? fermer() : ouvrir(a)}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer' }}>
                        {edition === a.id_auteur ? 'Fermer' : 'Modifier'}
                      </button>
                    </div>
                  </div>
                  {edition === a.id_auteur && (
                    <div style={{ padding: '14px 16px 16px', borderTop: '1px solid #f0ece6', background: '#faf8f4' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {CHAMPS.map(c => (
                          <div key={c.key} style={c.key === 'note' ? { gridColumn: '1 / -1' } : {}}>
                            <label style={labelStyle}>{c.label.toUpperCase()}</label>
                            {c.key === 'note'
                              ? <textarea value={form[c.key] ?? ''} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                              : <input value={form[c.key] ?? ''} onChange={e => setForm(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyle} />
                            }
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {statut?.id === a.id_auteur && (
                          <span style={{ fontSize: '11.5px', color: statut.ok ? '#3d6b4f' : '#c0562a' }}>
                            {statut.ok ? '✓' : '✗'} {statut.msg}
                          </span>
                        )}
                        <button onClick={fermer} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                        <button onClick={sauvegarder} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      })()}

      {auteurs.length === 0 && (
        <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>Aucun auteur.</p>
      )}
    </div>
  )
}