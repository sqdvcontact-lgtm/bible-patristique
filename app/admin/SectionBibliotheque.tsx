'use client'

import React, { useState, useRef } from 'react'
import { supabase, parseCSV, SiecleDisplay, headersAdmin } from './adminShared'
import SectionRemplacerSegments from './SectionRemplacerSegments'
import type { Auteur, LignePreview } from './adminTypes'

async function exporterOeuvre(idOeuvre: string, titreOeuvre: string) {
  const res = await fetch(`/api/admin/export-segments?id_oeuvre=${idOeuvre}`, { headers: await headersAdmin() })
  if (!res.ok) { alert("Erreur lors de l'export."); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url
  a.download = `segments_${idOeuvre}_${titreOeuvre.slice(0, 30).replace(/\s/g, '_')}.csv`
  a.click(); URL.revokeObjectURL(url)
}
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

const inputStyleAuteur: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: '12px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#fff', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: '9px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#b0a89e', display: 'block', marginBottom: '2px' }

type ValeursAuteur = {
  nom: string; nom_original: string; titre: string;
  date_naissance: string; date_mort: string;
  traditions: string[];
  langue_principale: string;
  note_biographique: string; note_theologique: string;
}

const VIDE_AUTEUR: ValeursAuteur = {
  nom: '', nom_original: '', titre: '',
  date_naissance: '', date_mort: '',
  traditions: [],
  langue_principale: '',
  note_biographique: '', note_theologique: '',
}

function TagsInput({ tags, onChange, tousLesTags }: { tags: string[]; onChange: (t: string[]) => void; tousLesTags: string[] }) {
  const [saisie, setSaisie] = React.useState('')
  const ajouter = (val?: string) => {
    const v = (val ?? saisie).trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setSaisie('')
  }
  const supprimer = (t: string) => onChange(tags.filter(x => x !== t))
  const suggestions = saisie.trim()
    ? tousLesTags.filter(t => !tags.includes(t) && t.toLowerCase().includes(saisie.toLowerCase()))
    : tousLesTags.filter(t => !tags.includes(t))
  return (
    <div>
      <input value={saisie} onChange={e => setSaisie(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); ajouter() } }}
        placeholder="Taper puis Entrée pour ajouter…"
        style={{ ...inputStyleAuteur, width: '100%', marginBottom: '6px' }} />
      {/* Tags actifs */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '5px' }}>
          {tags.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: 'rgba(61,107,79,0.10)', color: '#2e5440', border: '1px solid rgba(61,107,79,0.25)', borderRadius: '3px', padding: '1px 7px' }}>
              {t}
              <button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a958d', fontSize: '10px', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {suggestions.map(t => (
            <button key={t} onClick={() => ajouter(t)}
              style={{ fontSize: '10.5px', background: '#f7f4ef', color: '#6b6560', border: '1px solid #d6d0c4', borderRadius: '3px', padding: '1px 7px', cursor: 'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ChampsAuteur({ valeurs, onChange, onChangeTags, tousLesTags }: {
  valeurs: ValeursAuteur;
  onChange: (champ: keyof ValeursAuteur, val: string) => void;
  onChangeTags: (tags: string[]) => void;
  tousLesTags: string[];
}) {
  const inp = (key: keyof ValeursAuteur, label: string, placeholder?: string) => (
    <div key={key}>
      <label style={lbl}>{label}</label>
      <input type="text" value={valeurs[key] as string} onChange={e => onChange(key, e.target.value)}
        placeholder={placeholder} style={inputStyleAuteur} />
    </div>
  )
  const sep = { borderTop: '1px solid #ede9e2', margin: '10px 0 8px' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'start' }}>
        {inp('nom', 'Nom *', "Augustin d'Hippone")}
        {inp('nom_original', 'Nom original', 'Αὐγουστῖνος')}
        {inp('langue_principale', 'Langue', 'Latin, Grec…')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {inp('date_naissance', 'Naissance', '354')}
        {inp('date_mort', 'Mort', '430')}
      </div>
      <hr style={sep} />
      <div>
        <label style={lbl}>Tradition / École</label>
        <TagsInput tags={valeurs.traditions} onChange={onChangeTags} tousLesTags={tousLesTags} />
      </div>
      <hr style={sep} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={lbl}>Note biographique</label>
          <textarea value={valeurs.note_biographique} onChange={e => onChange('note_biographique', e.target.value)} rows={2} style={{ ...inputStyleAuteur, resize: 'vertical' }} />
        </div>
        <div>
          <label style={lbl}>Note théologique</label>
          <textarea value={valeurs.note_theologique} onChange={e => onChange('note_theologique', e.target.value)} rows={2} style={{ ...inputStyleAuteur, resize: 'vertical' }} />
        </div>
      </div>
    </div>
  )
}

// ── Section Bibliothèque (fusionnée avec la gestion des auteurs) ─────────────
export default function SectionBibliotheque({ auteurs: auteursInit }: { auteurs: Auteur[] }) {
  const [auteurs, setAuteurs] = useState<Auteur[]>(auteursInit)
  const [vueBibliotheque, setVueBibliotheque] = useState<'oeuvres' | 'segments'>('oeuvres')
  const [auteurOuvert, setAuteurOuvert] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ lignes: LignePreview[]; nomFichier: string; idOeuvre: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [resultat, setResultat] = useState<{ idOeuvre: string; msg: string; ok: boolean } | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [profondeurs, setProfondeurs] = useState<Record<string, number>>({})

  // ── Gestion des auteurs (recherche, création, édition, photo) ──────────────
  const [recherche, setRecherche] = useState('')
  const [ajoutAuteur, setAjoutAuteur] = useState(false)
  const [nouvelAuteur, setNouvelAuteur] = useState<ValeursAuteur>(VIDE_AUTEUR)
  const [msgAjoutAuteur, setMsgAjoutAuteur] = useState<string | null>(null)
  const [editionAuteur, setEditionAuteur] = useState<string | null>(null)
  const [formAuteur, setFormAuteur] = useState<ValeursAuteur>(VIDE_AUTEUR)
  const [statutAuteur, setStatutAuteur] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [photos, setPhotos] = useState<Record<string, boolean>>({})
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({})

  React.useEffect(() => {
    supabase.storage.from('auteurs').list('', { limit: 1000 }).then(({ data }) => {
      if (!data) return
      const map: Record<string, boolean> = {}
      data.forEach(f => { map[f.name.replace(/\.jpe?g$/i, '')] = true })
      setPhotos(map)
    })
  }, [])

  const uploadPhoto = async (idAuteur: string, fichier: File) => {
    const formData = new FormData()
    formData.append('id_auteur', idAuteur)
    formData.append('fichier', fichier)
    const res = await fetch('/api/admin/auteur-photo', { method: 'POST', headers: await headersAdmin(), body: formData })
    if (res.ok) setPhotos(prev => ({ ...prev, [idAuteur]: true }))
    else { const json = await res.json().catch(() => ({})); alert('Erreur upload : ' + (json.error ?? 'erreur inconnue')) }
  }

  const ouvrirEditionAuteur = (a: Auteur) => {
    setEditionAuteur(a.id_auteur)
    setFormAuteur({
      nom: a.nom,
      nom_original: (a as any).nom_original ?? '',
      titre: (a as any).titre ?? '',
      date_naissance: (a as any).date_naissance ?? '',
      date_mort: (a as any).date_mort ?? '',
      traditions: Array.isArray((a as any).traditions) ? (a as any).traditions : [],
      langue_principale: (a as any).langue_principale ?? '',
      note_biographique: (a as any).note_biographique ?? '',
      note_theologique: (a as any).note_theologique ?? '',
    })
    setStatutAuteur(null)
  }
  const fermerEditionAuteur = () => { setEditionAuteur(null); setFormAuteur(VIDE_AUTEUR) }

  const sauvegarderAuteur = async () => {
    if (!editionAuteur) return
    const res = await fetch('/api/admin/update-auteur', {
      method: 'POST',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id_auteur: editionAuteur, champs: formAuteur }),
    })
    const json = await res.json()
    if (!res.ok) { setStatutAuteur({ id: editionAuteur, ok: false, msg: json.error ?? 'Erreur.' }); return }
    setAuteurs(prev => prev.map(a => a.id_auteur === editionAuteur ? { ...a, ...formAuteur } : a))
    setStatutAuteur({ id: editionAuteur, ok: true, msg: 'Enregistré.' })
    setTimeout(() => { setStatutAuteur(null); fermerEditionAuteur() }, 1200)
  }

  const creerAuteur = async () => {
    if (!nouvelAuteur.nom.trim()) { setMsgAjoutAuteur('Le nom est requis.'); return }
    const res = await fetch('/api/admin/auteur-creer', {
      method: 'POST', headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(nouvelAuteur),
    })
    const json = await res.json()
    if (!res.ok) { setMsgAjoutAuteur('Erreur : ' + (json.error ?? 'inconnue')); return }
    setAuteurs(prev => [...prev, { ...json.auteur, oeuvres: [] }])
    setAjoutAuteur(false)
    setNouvelAuteur(VIDE_AUTEUR)
    setMsgAjoutAuteur(null)
  }

  const changerProfondeur = async (idOeuvre: string, val: number) => {
    setProfondeurs(prev => ({ ...prev, [idOeuvre]: val }))
    await fetch('/api/admin/update-oeuvre', {
      method: 'POST',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'profondeur_sommaire', valeur: val }),
    })
  }

  const CHAMPS_OEUVRE: { key: string; label: string }[] = [
    { key: 'titre', label: 'Titre *' },
    { key: 'sous_titre', label: 'Sous-titre' },
    { key: 'titre_original', label: 'Titre original' },
    { key: 'trad_auteur', label: 'Traducteur' },
    { key: 'editeur', label: 'Éditeur' },
    { key: 'collection', label: 'Collection' },
    { key: 'ville', label: 'Ville' },
    { key: 'date_publication', label: 'Date de publication' },
  ]

  const ouvrirEditionOeuvre = (o: any) => {
    setEditionOeuvre(o.id_oeuvre)
    setFormOeuvre({
      titre: o.titre ?? '', sous_titre: o.sous_titre ?? '', titre_original: o.titre_original ?? '',
      trad_auteur: o.trad_auteur ?? '', editeur: o.editeur ?? '', collection: o.collection ?? '',
      ville: o.ville ?? '', date_publication: o.date_publication ?? '',
    })
    setStatutOeuvre(null)
  }
  const fermerEditionOeuvre = () => { setEditionOeuvre(null); setFormOeuvre({}) }

  const sauvegarderOeuvre = async (idOeuvre: string) => {
    if (!formOeuvre.titre?.trim()) { setStatutOeuvre({ id: idOeuvre, ok: false, msg: 'Le titre est requis.' }); return }
    try {
      const headers = await headersAdmin({ 'Content-Type': 'application/json' })
      const resultats = await Promise.all(
        CHAMPS_OEUVRE.map(c => fetch('/api/admin/update-oeuvre', {
          method: 'POST', headers,
          body: JSON.stringify({ id_oeuvre: idOeuvre, champ: c.key, valeur: formOeuvre[c.key] || null }),
        }))
      )
      if (resultats.some(r => !r.ok)) { setStatutOeuvre({ id: idOeuvre, ok: false, msg: 'Erreur lors de l\u2019enregistrement.' }); return }
      setAuteurs(prev => prev.map(a => ({
        ...a,
        oeuvres: a.oeuvres.map((o: any) => o.id_oeuvre === idOeuvre ? { ...o, ...formOeuvre } : o),
      })))
      setStatutOeuvre({ id: idOeuvre, ok: true, msg: 'Enregistré.' })
      setTimeout(() => { setStatutOeuvre(null); fermerEditionOeuvre() }, 1200)
    } catch {
      setStatutOeuvre({ id: idOeuvre, ok: false, msg: 'Erreur réseau.' })
    }
  }

  const handleExport = async (idOeuvre: string, titre: string) => { setExporting(idOeuvre); await exporterOeuvre(idOeuvre, titre); setExporting(null) }

  const supprimerOeuvre = async (idOeuvre: string, titre: string) => {
    if (!confirm(`Supprimer définitivement l'œuvre « ${titre } » (${idOeuvre}) ?\n\nCette action supprimera aussi tous ses segments. Elle est irréversible.`)) return
    const res = await fetch('/api/admin/oeuvre-supprimer', {
      method: 'POST',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id_oeuvre: idOeuvre }),
    })
    if (!res.ok) { const j = await res.json(); alert('Erreur : ' + (j.error ?? 'inconnue')); return }
    setAuteurs(prev => prev.map(a => ({ ...a, oeuvres: a.oeuvres.filter((o: any) => o.id_oeuvre !== idOeuvre) })))
  }

  const [configOeuvre, setConfigOeuvre] = useState<string | null>(null)
  const [niveauxConfig, setNiveauxConfig] = useState<Record<string, { sommaire: number; corps: number; txtSommaire: boolean[]; txtCorps: boolean[]; afficherNumeros: boolean }>>({})
  const [editionOeuvre, setEditionOeuvre] = useState<string | null>(null)
  const [formOeuvre, setFormOeuvre] = useState<Record<string, string>>({})
  const [statutOeuvre, setStatutOeuvre] = useState<{ id: string; ok: boolean; msg: string } | null>(null)

  // Initialiser profondeurs depuis les données
  React.useEffect(() => {
    const init: Record<string, number> = {}
    const initNiv: Record<string, { sommaire: number; corps: number; txtSommaire: boolean[]; txtCorps: boolean[]; afficherNumeros: boolean }> = {}
    auteurs.forEach(a => a.oeuvres.forEach((o: any) => {
      if (o.profondeur_sommaire) init[o.id_oeuvre] = o.profondeur_sommaire
      const parseBool = (s: string | null) => (s ?? '0,0,0,0,0').split(',').map(v => v === '1')
      initNiv[o.id_oeuvre] = {
        sommaire: o.niveaux_sommaire ?? o.profondeur_sommaire ?? 1,
        corps: o.niveaux_corps ?? 1,
        txtSommaire: parseBool(o.texte_sommaire),
        txtCorps: parseBool(o.texte_corps),
        afficherNumeros: o.afficher_numeros !== false,
      }
    }))
    setProfondeurs(init)
    setNiveauxConfig(initNiv)
  }, [auteurs])

  const sauvegarderNiveaux = async (idOeuvre: string, cfg: { sommaire: number; corps: number; txtSommaire: boolean[]; txtCorps: boolean[]; afficherNumeros: boolean }) => {
    setNiveauxConfig(prev => ({ ...prev, [idOeuvre]: cfg }))
    const toStr = (arr: boolean[]) => arr.map(v => v ? '1' : '0').join(',')
    const headers = await headersAdmin({ 'Content-Type': 'application/json' })
    await Promise.all([
      fetch('/api/admin/update-oeuvre', { method: 'POST', headers,
        body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'niveaux_sommaire', valeur: cfg.sommaire }) }),
      fetch('/api/admin/update-oeuvre', { method: 'POST', headers,
        body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'niveaux_corps', valeur: cfg.corps }) }),
      fetch('/api/admin/update-oeuvre', { method: 'POST', headers,
        body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'texte_sommaire', valeur: toStr(cfg.txtSommaire) }) }),
      fetch('/api/admin/update-oeuvre', { method: 'POST', headers,
        body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'texte_corps', valeur: toStr(cfg.txtCorps) }) }),
      fetch('/api/admin/update-oeuvre', { method: 'POST', headers,
        body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'afficher_numeros', valeur: cfg.afficherNumeros }) }),
    ])
    setConfigOeuvre(null)
  }

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
      const payload = preview.lignes.map(({ _lien_1_orig, _fiabilite_orig, _texte_orig, _modifie, ...l }) => ({
        ...l,
        id_oeuvre: (l as Record<string, string>).id_oeuvre || preview.idOeuvre,
      }))
      const BATCH = 300
      let inserted = 0
      const headers = await headersAdmin({ 'Content-Type': 'application/json' })
      for (let i = 0; i < payload.length; i += BATCH) {
        const batch = payload.slice(i, i + BATCH)
        const res = await fetch('/api/admin/import-segments', {
          method: 'POST',
          headers,
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

  const tousLesTags = React.useMemo(() => {
    const set = new Set<string>()
    auteurs.forEach(a => ((a as any).traditions as string[] | null)?.forEach(t => set.add(t)))
    return [...set].sort()
  }, [auteurs])

  const rechercheNormalisee = recherche.trim().toLowerCase()
  const auteursFiltres = rechercheNormalisee
    ? auteurs.filter(a =>
        a.nom.toLowerCase().includes(rechercheNormalisee) ||
        a.oeuvres.some(o =>
          o.titre.toLowerCase().includes(rechercheNormalisee) ||
          ((o as any).sous_titre ?? '').toLowerCase().includes(rechercheNormalisee) ||
          ((o as any).titre_original ?? '').toLowerCase().includes(rechercheNormalisee)
        )
      )
    : auteurs

  return (
    <>
      {preview && <ModaleImport lignes={preview.lignes} nomFichier={preview.nomFichier} onConfirmer={handleConfirmerImport} onAnnuler={() => { setPreview(null); Object.values(inputRefs.current).forEach(el => { if (el) el.value = '' }) }} importing={importing} />}

      {/* Modale config niveaux */}
      {configOeuvre && (() => {
        const cfg = niveauxConfig[configOeuvre] ?? { sommaire: 1, corps: 1, txtSommaire: [false,false,false,false,false], txtCorps: [false,false,false,false,false], afficherNumeros: true }
        const oeuvreNom = auteurs.flatMap((a: any) => a.oeuvres).find((o: any) => o.id_oeuvre === configOeuvre)?.titre ?? configOeuvre
        const setCfg = (patch: Partial<typeof cfg>) => setNiveauxConfig(prev => ({ ...prev, [configOeuvre]: { ...prev[configOeuvre] ?? cfg, ...patch } }))
        const toggleTxt = (type: 'txtSommaire'|'txtCorps', idx: number) => {
          const arr = [...(cfg[type] ?? [false,false,false,false,false])]
          arr[idx] = !arr[idx]
          setCfg({ [type]: arr })
        }
        const niveaux = ['Niveau 1','Niveau 2','Niveau 3','Niveau 4','Niveau 5']
        return (
          <div onClick={() => setConfigOeuvre(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '10px', padding: '24px 28px', width: '480px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ fontFamily: "Georgia, serif", fontSize: '14px', color: '#2a3d30', margin: 0 }}>{oeuvreNom}</p>
                <button onClick={() => setConfigOeuvre(null)} style={{ fontSize: '14px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>

              {(['sommaire', 'corps'] as const).map(type => {
                const txtKey = type === 'sommaire' ? 'txtSommaire' : 'txtCorps'
                const niveauActuel = cfg[type]
                return (
                  <div key={type} style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.10em', color: '#9a958d', marginBottom: '10px', textTransform: 'uppercase', borderBottom: '1px solid #ede9e2', paddingBottom: '6px' }}>
                      {type === 'sommaire' ? 'Sommaire' : 'Corps du texte'}
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '3px 8px', color: '#9a958d', fontWeight: 400, fontSize: '10px' }}>Niveau</th>
                          <th style={{ textAlign: 'center', padding: '3px 8px', color: '#9a958d', fontWeight: 400, fontSize: '10px' }}>Affiché</th>
                          <th style={{ textAlign: 'center', padding: '3px 8px', color: '#9a958d', fontWeight: 400, fontSize: '10px' }}>Texte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {niveaux.map((label, i) => {
                          const niv = i + 1
                          const affiche = niveauActuel >= niv
                          const txtAffiche = (cfg[txtKey] ?? [])[i] ?? false
                          return (
                            <tr key={niv} style={{ background: affiche ? 'rgba(61,107,79,0.04)' : '#faf8f4' }}>
                              <td style={{ padding: '5px 8px', color: affiche ? '#2a3d30' : '#c0b8b0' }}>{label}</td>
                              <td style={{ textAlign: 'center', padding: '5px 8px' }}>
                                <button onClick={() => setCfg({ [type]: affiche && niv <= niveauActuel ? (niv === 1 ? 1 : niv - 1) : niv })}
                                  style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '3px', border: '1px solid #d6d0c4', background: affiche ? '#3d6b4f' : '#fff', color: affiche ? '#fff' : '#9a958d', cursor: 'pointer' }}>
                                  {affiche ? '✓' : '○'}
                                </button>
                              </td>
                              <td style={{ textAlign: 'center', padding: '5px 8px' }}>
                                {affiche ? (
                                  <button onClick={() => toggleTxt(txtKey, i)}
                                    style={{ fontSize: '10px', padding: '2px 10px', borderRadius: '3px', border: '1px solid #d6d0c4', background: txtAffiche ? '#2a3d30' : '#fff', color: txtAffiche ? '#fff' : '#c0b8b0', cursor: 'pointer' }}>
                                    {txtAffiche ? 'Texte affiché' : 'Texte masqué'}
                                  </button>
                                ) : <span style={{ color: '#e4dfd8', fontSize: '10px' }}>—</span>}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              {/* Numéros de segments */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #ede9e2', marginTop: '4px' }}>
                <span style={{ fontSize: '11.5px', color: '#3a3530' }}>Numéros de segments</span>
                <button onClick={() => setCfg({ afficherNumeros: !cfg.afficherNumeros })}
                  style={{ fontSize: '11px', padding: '4px 14px', borderRadius: '4px', border: '1px solid #d6d0c4', background: cfg.afficherNumeros ? '#3d6b4f' : '#fff', color: cfg.afficherNumeros ? '#fff' : '#9a958d', cursor: 'pointer' }}>
                  {cfg.afficherNumeros ? 'Affichés' : 'Masqués'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setConfigOeuvre(null)} style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => sauvegarderNiveaux(configOeuvre, niveauxConfig[configOeuvre] ?? cfg)}
                  style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Barre de recherche + nouvel auteur */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
        <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher un auteur ou une œuvre…"
          style={{ flex: 1, fontSize: '12px', padding: '6px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#1e1a16', outline: 'none' }} />
        {recherche && <button onClick={() => setRecherche('')} style={{ fontSize: '11px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
        <button onClick={() => { setAjoutAuteur(!ajoutAuteur); setMsgAjoutAuteur(null) }}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: ajoutAuteur ? '#2e5440' : '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {ajoutAuteur ? 'Annuler' : '+ Nouvel auteur'}
        </button>
        <button onClick={() => setVueBibliotheque(v => v === 'segments' ? 'oeuvres' : 'segments')}
          style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #3d6b4f', background: vueBibliotheque === 'segments' ? '#3d6b4f' : '#fff', color: vueBibliotheque === 'segments' ? '#fff' : '#3d6b4f', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
          ↺ Segments
        </button>
      </div>

      {vueBibliotheque === 'segments' && <SectionRemplacerSegments auteurs={auteurs} />}
      {vueBibliotheque === 'oeuvres' && (
      <>

      {/* Formulaire nouvel auteur */}
      {ajoutAuteur && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '16px 20px', marginBottom: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '14px' }}>Nouvel auteur</p>
          <ChampsAuteur
            valeurs={nouvelAuteur}
            onChange={(champ, val) => setNouvelAuteur(p => ({ ...p, [champ]: val }))}
            onChangeTags={tags => setNouvelAuteur(p => ({ ...p, traditions: tags }))}
            tousLesTags={tousLesTags}
          />
          {msgAjoutAuteur && <p style={{ fontSize: '11.5px', color: '#c0562a', marginBottom: '8px' }}>{msgAjoutAuteur}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => { setAjoutAuteur(false); setMsgAjoutAuteur(null) }} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
            <button onClick={creerAuteur} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer</button>
          </div>
        </div>
      )}

      {auteursFiltres.length === 0 && (
        <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', padding: '12px 0' }}>Aucun auteur trouvé.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[...auteursFiltres].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(auteur => {
          const oeuvreTrouvee = !!rechercheNormalisee && auteur.oeuvres.some(o =>
            o.titre.toLowerCase().includes(rechercheNormalisee) ||
            ((o as any).sous_titre ?? '').toLowerCase().includes(rechercheNormalisee) ||
            ((o as any).titre_original ?? '').toLowerCase().includes(rechercheNormalisee)
          )
          const ouvert = auteurOuvert === auteur.id_auteur || oeuvreTrouvee
          return (
          <div key={auteur.id_auteur} style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: (ouvert || editionAuteur === auteur.id_auteur) ? '1px solid #e4dfd8' : 'none' }}>
              <button onClick={() => setAuteurOuvert(auteurOuvert === auteur.id_auteur ? null : auteur.id_auteur)}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontFamily: "Georgia, serif", fontSize: '15px', fontWeight: 700, color: '#3d6b4f' }}>{auteur.nom}</span>
                {(auteur as any).nom_original && <span style={{ fontSize: '10.5px', color: '#b0a89e', fontStyle: 'italic' }}>{(auteur as any).nom_original}</span>}
                {auteur.dates && <span style={{ fontSize: '11px', color: '#9a958d' }}>{auteur.dates}</span>}
                {auteur.siecle && <span style={{ fontSize: '10.5px', color: '#9a958d' }}><SiecleDisplay n={parseInt(auteur.siecle)} /></span>}
                {((auteur as any).traditions as string[] | null)?.map((t: string) => (
                  <span key={t} style={{ fontSize: '10px', color: '#3d6b4f', background: 'rgba(61,107,79,0.09)', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(61,107,79,0.2)' }}>{t}</span>
                ))}
                <span style={{ fontSize: '11px', color: '#b0a89e' }}>{auteur.oeuvres.length} œuvre{auteur.oeuvres.length > 1 ? 's' : ''}</span>
              </button>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center', marginLeft: '12px' }}>
                <code style={{ fontSize: '10px', background: '#f0ece6', padding: '2px 6px', borderRadius: '3px', color: '#6b6560' }}>{auteur.id_auteur}</code>
                <button
                  onClick={() => photoRefs.current[auteur.id_auteur]?.click()}
                  title={photos[auteur.id_auteur] ? 'Remplacer la photo' : 'Ajouter une photo'}
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${photos[auteur.id_auteur] ? '#3d6b4f' : '#d6d0c4'}`, background: photos[auteur.id_auteur] ? 'rgba(61,107,79,0.08)' : '#fff', color: photos[auteur.id_auteur] ? '#3d6b4f' : '#9a958d', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {photos[auteur.id_auteur] ? '✓ Photo' : '+ Photo'}
                </button>
                <input ref={el => { photoRefs.current[auteur.id_auteur] = el }} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={async e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    const blob = f.slice(0, f.size, 'image/jpeg')
                    const fichierRenomme = new File([blob], `${auteur.id_auteur}.jpg`, { type: 'image/jpeg' })
                    await uploadPhoto(auteur.id_auteur, fichierRenomme)
                    e.target.value = ''
                  }} />
                <button onClick={() => editionAuteur === auteur.id_auteur ? fermerEditionAuteur() : ouvrirEditionAuteur(auteur)}
                  style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer' }}>
                  {editionAuteur === auteur.id_auteur ? 'Fermer' : 'Modifier'}
                </button>
                <span style={{ fontSize: '10px', color: '#b0a89e', cursor: 'pointer' }} onClick={() => setAuteurOuvert(auteurOuvert === auteur.id_auteur ? null : auteur.id_auteur)}>
                  {auteurOuvert === auteur.id_auteur ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* Formulaire d'édition de l'auteur */}
            {editionAuteur === auteur.id_auteur && (
              <div style={{ padding: '14px 16px 16px', borderBottom: auteurOuvert === auteur.id_auteur ? '1px solid #e4dfd8' : 'none', background: '#faf8f4' }}>
                <ChampsAuteur
                  valeurs={formAuteur}
                  onChange={(champ, val) => setFormAuteur(p => ({ ...p, [champ]: val }))}
                  onChangeTags={tags => setFormAuteur(p => ({ ...p, traditions: tags }))}
                  tousLesTags={tousLesTags}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  {statutAuteur?.id === auteur.id_auteur && (
                    <span style={{ fontSize: '11.5px', color: statutAuteur?.ok ? '#3d6b4f' : '#c0562a' }}>
                      {statutAuteur?.ok ? '✓' : '✗'} {statutAuteur?.msg}
                    </span>
                  )}
                  <button onClick={fermerEditionAuteur} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={sauvegarderAuteur} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
                </div>
              </div>
            )}

            {/* Liste des œuvres */}
            {ouvert && (
              <div style={{ padding: '6px 0' }}>
                {auteur.oeuvres.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', padding: '8px 18px' }}>Aucune œuvre pour cet auteur — utilisez « + Ajouter une œuvre ».</p>
                )}
                {[...auteur.oeuvres].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')).map(oeuvre => {
                  const titreMatch = rechercheNormalisee && oeuvre.titre.toLowerCase().includes(rechercheNormalisee)
                  const surbrillance = (texte: string) => {
                    if (!rechercheNormalisee) return <>{texte}</>
                    const idx = texte.toLowerCase().indexOf(rechercheNormalisee)
                    if (idx === -1) return <>{texte}</>
                    return <>{texte.slice(0, idx)}<mark style={{ background: 'rgba(61,107,79,0.18)', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>{texte.slice(idx, idx + rechercheNormalisee.length)}</mark>{texte.slice(idx + rechercheNormalisee.length)}</>
                  }
                  return (
                  <div key={oeuvre.id_oeuvre} style={{ borderBottom: '1px solid #f0ece6', background: titreMatch ? 'rgba(61,107,79,0.03)' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 4px 34px', gap: '10px', flexWrap: 'nowrap', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                      <code style={{ fontSize: '9px', background: '#f0ece6', padding: '1px 4px', borderRadius: '3px', color: '#8a8278', flexShrink: 0 }}>{oeuvre.id_oeuvre}</code>
                      <span style={{ fontSize: '12px', color: '#3a3530', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surbrillance(oeuvre.titre)}</span>
                      {oeuvre.titre_original && <span style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic', whiteSpace: 'nowrap', flexShrink: 0 }}>{surbrillance(oeuvre.titre_original)}</span>}
                      {resultat?.idOeuvre === oeuvre.id_oeuvre && <span style={{ fontSize: '10.5px', color: resultat.ok ? '#3d6b4f' : '#c0562a', flexShrink: 0 }}>{resultat.ok ? '✓' : '✗'} {resultat.msg}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                      <button onClick={() => setConfigOeuvre(configOeuvre === oeuvre.id_oeuvre ? null : oeuvre.id_oeuvre)}
                        title="Configurer les niveaux d'affichage"
                        style={{ fontSize: '10.5px', padding: '3px 7px', borderRadius: '4px', border: '1px solid #d6d0c4', background: configOeuvre === oeuvre.id_oeuvre ? '#3d6b4f' : '#fff', color: configOeuvre === oeuvre.id_oeuvre ? '#fff' : '#9a958d', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        ⚙
                      </button>
                      <a href={`/oeuvre/${oeuvre.id_oeuvre}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10.5px', color: '#9a958d', textDecoration: 'none', padding: '3px 7px', border: '1px solid #d6d0c4', borderRadius: '4px', whiteSpace: 'nowrap' }}>↗</a>
                      <button onClick={() => editionOeuvre === oeuvre.id_oeuvre ? fermerEditionOeuvre() : ouvrirEditionOeuvre(oeuvre)}
                        style={{ fontSize: '10.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #d6d0c4', background: editionOeuvre === oeuvre.id_oeuvre ? '#3d6b4f' : '#fff', color: editionOeuvre === oeuvre.id_oeuvre ? '#fff' : '#3d6b4f', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {editionOeuvre === oeuvre.id_oeuvre ? 'Fermer' : 'Modifier'}
                      </button>
                      <button onClick={() => handleExport(oeuvre.id_oeuvre, oeuvre.titre)} disabled={exporting === oeuvre.id_oeuvre}
                        style={{ fontSize: '10.5px', padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: exporting === oeuvre.id_oeuvre ? '#e4dfd8' : '#3d6b4f', color: exporting === oeuvre.id_oeuvre ? '#9a958d' : '#fff', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {exporting === oeuvre.id_oeuvre ? 'Export…' : 'CSV ↓'}
                      </button>
                      <button onClick={() => { setResultat(null); inputRefs.current[oeuvre.id_oeuvre]?.click() }}
                        style={{ fontSize: '10.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>CSV ↑</button>
                      <input ref={el => { inputRefs.current[oeuvre.id_oeuvre] = el }} type="file" accept=".csv" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFichierChoisi(oeuvre.id_oeuvre, f) }} />
                      <button onClick={() => supprimerOeuvre(oeuvre.id_oeuvre, oeuvre.titre)}
                        style={{ fontSize: '10.5px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Formulaire d'édition de l'œuvre */}
                  {editionOeuvre === oeuvre.id_oeuvre && (
                    <div style={{ padding: '12px 18px 14px 34px', background: '#faf8f4', borderTop: '1px solid #ede9e2' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {CHAMPS_OEUVRE.map(c => (
                          <div key={c.key}>
                            <label style={lbl}>{c.label.toUpperCase()}</label>
                            <input type="text" value={formOeuvre[c.key] ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, [c.key]: e.target.value }))} style={inputStyleAuteur} />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {statutOeuvre?.id === oeuvre.id_oeuvre && (
                          <span style={{ fontSize: '11.5px', color: statutOeuvre?.ok ? '#3d6b4f' : '#c0562a' }}>
                            {statutOeuvre?.ok ? '✓' : '✗'} {statutOeuvre?.msg}
                          </span>
                        )}
                        <button onClick={fermerEditionOeuvre} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                        <button onClick={() => sauvegarderOeuvre(oeuvre.id_oeuvre)} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
                      </div>
                    </div>
                  )}
                  </div>
                )
                })}
              </div>
            )}
          </div>
        )})}
      </div>
      </>
      )}
    </>
  )
}
