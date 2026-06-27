'use client'

import React, { useState } from 'react'
import { supabase } from './adminShared'
import type { Traduction } from './adminTypes'

const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px' }

// ── Éditeur rich-text ────────────────────────────────────────────────────────
function parseCSV(texte: string): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let champ = ''
  let dansGuillemets = false

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    const suivant = texte[i + 1]

    if (c === '"') {
      if (dansGuillemets && suivant === '"') {
        champ += '"'
        i++
      } else {
        dansGuillemets = !dansGuillemets
      }
    } else if (c === ',' && !dansGuillemets) {
      ligne.push(champ)
      champ = ''
    } else if ((c === '\n' || c === '\r') && !dansGuillemets) {
      if (c === '\r' && suivant === '\n') i++
      ligne.push(champ)
      if (ligne.some(v => v.trim() !== '')) lignes.push(ligne)
      ligne = []
      champ = ''
    } else {
      champ += c
    }
  }

  ligne.push(champ)
  if (ligne.some(v => v.trim() !== '')) lignes.push(ligne)
  return lignes
}

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
export default function SectionTraductions({ traductions: init }: { traductions: Traduction[] }) {
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
    { key: 'dates', label: 'Dates (ex. 1826-1894)' },
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
    const lignesCSV = parseCSV(texte)
    const entetes = (lignesCSV[0] ?? []).map(h => h.trim())
    const idxId = entetes.findIndex(h => h === 'id_verset')
    const idxTexte = entetes.findIndex(h => h !== 'id_verset')
    if (idxId === -1) { setImportMsg('Colonne id_verset manquante.'); return }
    const parsed = lignesCSV.slice(1).map(l => {
      return { id_verset: (l[idxId] ?? '').trim(), texte: l[idxTexte] ?? '' }
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
      setImportMsg(`✓ Traduction ${json.trad_id} créée — ${json.inseres} versets importés${json.ignores ? `, ${json.ignores} ignorés` : ''}.`)
      const { data } = await supabase.from('traductions').select('*').order('ordre')
      setLignes(data ?? [])
      setAjout(false)
      setNouveau({})
      setCsvLignes([])
      setCsvNom('')
      setTimeout(() => { setImportStatut('idle'); setImportMsg('') }, 4000)
    } catch (e: unknown) {
      setImportStatut('err')
      setImportMsg(e instanceof Error ? e.message : 'Erreur réseau.')
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
                  <span style={{ fontSize: '11.5px', color: statut?.ok ? '#3d6b4f' : '#c0562a' }}>{statut?.ok ? '✓' : '✗'} {statut?.msg}</span>
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
