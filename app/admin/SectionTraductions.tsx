'use client'

import React, { useState, useRef, useCallback } from 'react'
import { supabase, headersAdmin } from './adminShared'
import type { Traduction } from './adminTypes'
import { revaliderTraductions } from '@/app/actions/revalider'

type PhotoPos = { x: number; y: number; scale: number }
type PhotoPositions = { bandeau: PhotoPos; lateral: PhotoPos }

const POS_DEFAUT: PhotoPos = { x: 50, y: 20, scale: 1 }

function parsePositions(raw: Traduction['photo_position']): PhotoPositions {
  if (!raw) return { bandeau: { ...POS_DEFAUT }, lateral: { ...POS_DEFAUT } }
  // Rétro-compatibilité avec ancien format plat { x, y, scale }
  const r = raw as any
  if (typeof r.x === 'number') return { bandeau: { x: r.x, y: r.y, scale: r.scale ?? 1 }, lateral: { ...POS_DEFAUT } }
  return {
    bandeau: r.bandeau ?? { ...POS_DEFAUT },
    lateral: r.lateral ?? { ...POS_DEFAUT },
  }
}

// ── Modale positionnement photo ───────────────────────────────────────────────
// Rend la VRAIE carte (code identique à la page publique, données réelles)
// avec un calque drag transparent par-dessus chaque image.
function ModalPositionPhoto({ t, posInit, onClose, onSauvegarde }: {
  t: Traduction
  posInit: PhotoPositions
  onClose: () => void
  onSauvegarde: (pos: PhotoPositions) => Promise<void>
}) {
  const [positions, setPositions] = useState<PhotoPositions>(posInit)
  const [active, setActive] = useState<'bandeau' | 'lateral'>('bandeau')
  const [saving, setSaving] = useState(false)
  const bandeauRef = useRef<HTMLDivElement>(null)
  const lateralRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    zone: 'bandeau' | 'lateral'
    startX: number; startY: number; baseX: number; baseY: number
  } | null>(null)

  const startDrag = (zone: 'bandeau' | 'lateral') => (e: React.MouseEvent) => {
    e.preventDefault()
    setActive(zone)
    const p = positions[zone]
    dragRef.current = { zone, startX: e.clientX, startY: e.clientY, baseX: p.x, baseY: p.y }
  }

  const onMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    const { zone, startX, startY, baseX, baseY } = dragRef.current
    const el = zone === 'bandeau' ? bandeauRef.current : lateralRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const scale = positions[zone].scale
    const sensX = 100 / (rect.width * Math.max(scale, 1))
    const sensY = 100 / (rect.height * Math.max(scale, 1))
    setPositions(prev => ({
      ...prev,
      [zone]: {
        ...prev[zone],
        x: Math.max(0, Math.min(100, baseX - (e.clientX - startX) * sensX)),
        y: Math.max(0, Math.min(100, baseY - (e.clientY - startY) * sensY)),
      },
    }))
  }

  const endDrag = () => { dragRef.current = null }

  const zoomer = (delta: number) =>
    setPositions(prev => ({
      ...prev,
      [active]: { ...prev[active], scale: Math.round(Math.max(0.8, Math.min(3, prev[active].scale + delta)) * 100) / 100 },
    }))

  // Styles d'image calculés depuis les positions courantes (même logique que la page publique)
  const posStyle = (zone: 'bandeau' | 'lateral'): React.CSSProperties => {
    const p = positions[zone]
    return {
      objectFit: 'cover',
      objectPosition: `${p.x}% ${p.y}%`,
      transform: `scale(${p.scale})`,
      transformOrigin: `${p.x}% ${p.y}%`,
    }
  }

  const sauvegarder = async () => {
    setSaving(true)
    await onSauvegarde(positions)
    setSaving(false)
    onClose()
  }

  const meta = [t.langue, t.date_publication].filter(Boolean).join(' · ')
  const ombre = '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.35)'
  const activePos = positions[active]
  const isDragging = !!dragRef.current
  const btnZ: React.CSSProperties = {
    width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #d6d0c4',
    background: '#fff', color: '#3a3530', fontSize: '17px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1,
  }
  const badgeStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 3, background: '#3d6b4f', color: '#fff',
    fontSize: '8px', fontWeight: 700, padding: '2px 7px', borderRadius: '3px',
    letterSpacing: '0.07em', textTransform: 'uppercase', pointerEvents: 'none',
  }

  // Simplification du commentaire editorial pour l'affichage dans la modale
  const htmlEditorial = t.commentaire_editorial
    ? (t.commentaire_editorial.startsWith('<')
        ? t.commentaire_editorial
        : t.commentaire_editorial.split(/\n+/).filter(Boolean)
            .map(l => `<p style="color:#2a2520;font-size:13.5px;line-height:1.78;margin:0 0 12px">${l}</p>`)
            .join(''))
    : ''

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#f7f4ef', borderRadius: '10px', padding: '18px 18px 16px', maxWidth: '680px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontFamily: "Georgia, serif", fontSize: '14px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>
            Positionner l'image · <em style={{ color: '#7a7268' }}>{t.nom}</em>
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: '#b0a89e', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: '10.5px', color: '#9a958d', margin: '0 0 12px', lineHeight: 1.5 }}>
          Glissez directement sur le bandeau ou la miniature pour cadrer · + / − pour zoomer
        </p>

        {/* ════════════════════════════════════════════════════════════
            APERÇU : rendu identique à la page publique
            ════════════════════════════════════════════════════════════ */}
        <div
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{ border: '1px solid #ddd8cf', borderRadius: '8px', overflow: 'hidden', background: '#fff', userSelect: 'none' }}>

          {/* ── Bandeau (copie exacte de BandeauTraduction) ── */}
          <div
            ref={bandeauRef}
            style={{
              position: 'relative', width: '100%', minHeight: '92px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              overflow: 'hidden',
              outline: active === 'bandeau' ? '3px solid #3d6b4f' : '3px solid transparent',
              outlineOffset: '-3px', transition: 'outline-color 0.12s',
            }}>
            <img src={t.photo!} alt="" aria-hidden="true" draggable={false} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block',
              filter: 'brightness(0.9)', transition: 'filter 0.2s',
              ...posStyle('bandeau'),
            }} />
            <div aria-hidden="true" style={{
              position: 'absolute', inset: 0, zIndex: 0,
              background: 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)',
            }} />
            <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, padding: '18px 14px 18px 20px' }}>
              <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '17px', fontWeight: 'normal', color: '#f2efe8', margin: 0, lineHeight: 1.25, textShadow: ombre }}>
                {t.nom}
              </h2>
              {meta && (
                <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '11px', fontStyle: 'italic', color: 'rgba(242,239,232,0.72)', display: 'block', marginTop: '4px', textShadow: ombre }}>
                  {meta}
                </span>
              )}
            </div>
            <span style={{ position: 'relative', zIndex: 1, fontSize: '10px', flexShrink: 0, marginRight: '18px', color: 'rgba(255,255,255,0.75)', textShadow: ombre }}>▼</span>
            {/* Calque drag invisible par-dessus tout */}
            <div onMouseDown={startDrag('bandeau')} style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: isDragging ? 'grabbing' : 'grab' }} />
            {active === 'bandeau' && <div style={{ ...badgeStyle, top: 6, right: 6 }}>bandeau</div>}
          </div>

          {/* ── Volet déplié (copie exacte de OngletTraductions) ── */}
          <div style={{ borderTop: '1px solid #ede9e2', display: 'flex', alignItems: 'stretch' }}>

            {/* Miniature latérale */}
            <div
              ref={lateralRef}
              style={{
                position: 'relative', width: '140px', flexShrink: 0,
                borderRight: '1px solid #ede9e2', overflow: 'hidden',
                outline: active === 'lateral' ? '3px solid #3d6b4f' : '3px solid transparent',
                outlineOffset: '-3px', transition: 'outline-color 0.12s',
              }}>
              <img src={t.photo!} alt="" aria-hidden="true" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...posStyle('lateral') }} />
              <div onMouseDown={startDrag('lateral')} style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: isDragging ? 'grabbing' : 'grab' }} />
              {active === 'lateral' && <div style={{ ...badgeStyle, bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>miniature</div>}
            </div>

            {/* Texte réel */}
            <div style={{ flex: 1, minWidth: 0, padding: '18px 20px 22px' }}>
              {t.bio_courte && (
                <p style={{ fontSize: '12.5px', color: '#5a6b5e', lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic', textAlign: 'justify', hyphens: 'auto' }}>
                  {t.bio_courte}
                </p>
              )}
              {htmlEditorial && (
                <div className="trad-article" style={{ color: '#2a2520', fontSize: '13.5px', lineHeight: 1.65, textAlign: 'justify', hyphens: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: htmlEditorial }} />
              )}
            </div>
          </div>
        </div>

        {/* ── Contrôles ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          <p style={{ fontSize: '11px', color: '#9a958d', margin: 0, flex: 1 }}>
            Zone active : <strong style={{ color: active === 'bandeau' ? '#3d6b4f' : '#9a7e3d' }}>{active === 'bandeau' ? 'bandeau' : 'miniature'}</strong>
          </p>
          <button onClick={() => zoomer(-0.1)} style={btnZ}>−</button>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#2a3d30', minWidth: '44px', textAlign: 'center' }}>{Math.round(activePos.scale * 100)} %</span>
          <button onClick={() => zoomer(+0.1)} style={btnZ}>+</button>
          <button onClick={() => setPositions(prev => ({ ...prev, [active]: { ...POS_DEFAUT } }))}
            style={{ fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}>
            Réinit.
          </button>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px', borderTop: '1px solid #e8e3dc', paddingTop: '14px' }}>
          <button onClick={onClose} style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
          <button onClick={sauvegarder} disabled={saving} style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: saving ? '#a0b8aa' : '#3d6b4f', color: '#fff', cursor: saving ? 'default' : 'pointer', fontWeight: 500 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px' }

// Editeur rich-text
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
  const ref = React.useRef<any>(null)

  const entourer = (avant: string, apres: string) => {
    const ta = ref.current
    if (!ta) return
    const debut = ta.selectionStart
    const fin = ta.selectionEnd
    const selection = ta.value.slice(debut, fin)
    const nouveau = ta.value.slice(0, debut) + avant + selection + apres + ta.value.slice(fin)
    onChange(nouveau)
    // Repositionner le curseur aprÃ¨s insertion
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

  React.useEffect(() => {
    if (!ref.current || document.activeElement === ref.current) return
    if (ref.current.innerHTML !== valeur) ref.current.innerHTML = valeur || ''
  }, [valeur])

  const appliquerDirect = (commande: string, valeurCommande?: string) => {
    ref.current?.focus()
    document.execCommand(commande, false, valeurCommande)
    onChange(ref.current?.innerHTML ?? '')
  }

  const petitesCapitalesDirect = () => {
    ref.current?.focus()
    const selection = window.getSelection()?.toString() || ''
    document.execCommand('insertHTML', false, `<span style="font-variant:small-caps">${selection || 'texte'}</span>`)
    onChange(ref.current?.innerHTML ?? '')
  }

  return (
    <div style={{ border: '1px solid #d6d0c4', borderRadius: '5px', overflow: 'hidden' }}>
      {/* Barre d'outils */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: '#f7f4ef', borderBottom: '1px solid #d6d0c4', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('bold') }} style={btnStyle}><strong>G</strong></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('italic') }} style={btnStyle}><em>I</em></button>
        <div style={{ width: '1px', background: '#d6d0c4', margin: '0 2px', alignSelf: 'stretch' }} />
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('formatBlock', 'h1') }} style={btnStyle} title="Titre 1">H1</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('formatBlock', 'h2') }} style={btnStyle} title="Titre 2">H2</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('formatBlock', 'p') }} style={btnStyle} title="Paragraphe">¶</button>
        <div style={{ width: '1px', background: '#d6d0c4', margin: '0 2px', alignSelf: 'stretch' }} />
        <button type="button" onMouseDown={e => { e.preventDefault(); petitesCapitalesDirect() }} style={{ ...btnStyle, fontVariant: 'small-caps' }} title="Petites capitales">sc</button>
        <span style={{ fontSize: '10px', color: '#b0a89e', marginLeft: 'auto' }}>direct</span>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={e => onChange(e.currentTarget.innerHTML)}
        style={{
          width: '100%', minHeight: '150px', padding: '12px 14px', fontSize: '13px',
          fontFamily: 'Georgia, serif', lineHeight: 1.7, color: '#2a2520', outline: 'none',
          border: 'none', background: '#fff', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// Section Traductions
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
  const photoRefs = React.useRef<Record<string, HTMLInputElement | null>>({})
  const [photoStatut, setPhotoStatut] = useState<Record<string, 'loading' | 'ok' | 'err'>>({})
  const [positionModal, setPositionModal] = useState<string | null>(null) // trad_id ouvert
  const [exportStatut, setExportStatut] = useState<Record<string, 'loading' | 'ok' | 'err'>>({})
  const [replaceModal, setReplaceModal] = useState<string | null>(null) // trad_id en cours de remplacement
  const replaceFileRef = React.useRef<HTMLInputElement>(null)
  const [replaceLignes, setReplaceLignes] = useState<{ id_verset: string; texte: string }[]>([])
  const [replaceNom, setReplaceNom] = useState('')
  const [replaceStatut, setReplaceStatut] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [replaceMsg, setReplaceMsg] = useState('')

  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  const exporterCSV = async (tradId: string, nom: string) => {
    setExportStatut(prev => ({ ...prev, [tradId]: 'loading' }))
    try {
      const BATCH = 1000
      const tous: any[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('versets')
          .select(`id_verset,"${tradId}"`)
          .order('id_verset')
          .range(from, from + BATCH - 1)
        if (error) throw error
        if (!data || data.length === 0) break
        tous.push(...data)
        if (data.length < BATCH) break
        from += BATCH
      }
      const rows = tous.map((v: any) => `${escapeCsv(v.id_verset)},${escapeCsv(v[tradId] ?? '')}`)
      const csv = [`id_verset,${tradId}`, ...rows].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tradId}_${nom.replace(/[^a-z0-9]/gi, '_')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportStatut(prev => ({ ...prev, [tradId]: 'ok' }))
      setTimeout(() => setExportStatut(prev => { const n = { ...prev }; delete n[tradId]; return n }), 2500)
    } catch {
      setExportStatut(prev => ({ ...prev, [tradId]: 'err' }))
      setTimeout(() => setExportStatut(prev => { const n = { ...prev }; delete n[tradId]; return n }), 3000)
    }
  }

  const ouvrirRemplacement = (tradId: string) => {
    setReplaceModal(tradId)
    setReplaceLignes([])
    setReplaceNom('')
    setReplaceStatut('idle')
    setReplaceMsg('')
    setTimeout(() => replaceFileRef.current?.click(), 50)
  }

  const handleReplaceCSV = async (fichier: File) => {
    setReplaceNom(fichier.name)
    const texte = await fichier.text()
    const lignesCSV = parseCSV(texte)
    const entetes = (lignesCSV[0] ?? []).map(h => h.trim())
    const idxId = entetes.findIndex(h => h === 'id_verset')
    const idxTexte = entetes.findIndex((_, i) => i !== idxId)
    if (idxId === -1) { setReplaceMsg('Colonne id_verset manquante.'); return }
    const parsed = lignesCSV.slice(1).map(l => ({
      id_verset: (l[idxId] ?? '').trim(), texte: l[idxTexte] ?? ''
    })).filter(r => r.id_verset)
    setReplaceLignes(parsed)
    setReplaceMsg(`${parsed.length} versets prêts à importer.`)
  }

  const confirmerRemplacement = async () => {
    if (!replaceModal) return
    if (replaceLignes.length === 0) { setReplaceMsg('Aucune ligne chargée.'); return }
    setReplaceStatut('loading')
    setReplaceMsg('')
    try {
      const res = await fetch('/api/admin/remplacer-traduction', {
        method: 'POST',
        headers: await headersAdmin({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ trad_id: replaceModal, lignes: replaceLignes }),
      })
      const json = await res.json()
      if (!res.ok) { setReplaceStatut('err'); setReplaceMsg(json.error ?? 'Erreur.'); return }
      const maintenant = new Date().toISOString()
      setLignes(prev => prev.map(l => l.trad_id === replaceModal ? { ...l, import_maj_le: maintenant } : l))
      setReplaceStatut('ok')
      setReplaceMsg(`✓ ${json.maj} versets mis à jour${json.ignores ? ` · ${json.ignores} id_verset inconnus ignorés` : ''}.`)
      setTimeout(() => { setReplaceModal(null); setReplaceStatut('idle'); setReplaceMsg('') }, 3000)
    } catch (e: unknown) {
      setReplaceStatut('err')
      setReplaceMsg(e instanceof Error ? e.message : 'Erreur réseau.')
    }
  }

  const sauvegarderPosition = async (tradId: string, pos: PhotoPositions) => {
    await supabase.from('traductions').update({ photo_position: pos }).eq('trad_id', tradId)
    setLignes(prev => prev.map(t => t.trad_id === tradId ? { ...t, photo_position: pos } : t))
    await revaliderTraductions()
  }

  const uploadPhoto = async (tradId: string, fichier: File, estRemplacement: boolean) => {
    setPhotoStatut(prev => ({ ...prev, [tradId]: 'loading' }))
    const formData = new FormData()
    formData.append('trad_id', tradId)
    formData.append('fichier', fichier)
    const headers = await headersAdmin()
    const res = await fetch('/api/admin/traduction-photo', { method: 'POST', headers, body: formData })
    const json = await res.json()
    if (!res.ok) {
      setPhotoStatut(prev => ({ ...prev, [tradId]: 'err' }))
      setTimeout(() => setPhotoStatut(prev => ({ ...prev, [tradId]: undefined as any })), 3000)
      return
    }
    setLignes(prev => prev.map(t => t.trad_id === tradId ? { ...t, photo: json.url } : t))
    setPhotoStatut(prev => ({ ...prev, [tradId]: 'ok' }))
    setTimeout(() => setPhotoStatut(prev => ({ ...prev, [tradId]: undefined as any })), 3000)
  }

  const CHAMPS_SIMPLES: { key: keyof Traduction; label: string }[] = [
    { key: 'nom', label: 'Nom' },
    { key: 'auteur', label: 'Auteur' },
    { key: 'dates', label: 'Dates (ex. 1826-1894)' },
    { key: 'date_publication', label: 'Date de publication' },
    { key: 'confession', label: 'Confession' },
    { key: 'langue', label: 'Langue' },
  ]

  const ouvrir = (t: Traduction) => { setEdition(t.trad_id); setForm({ ...t }); setStatut(null) }
  const fermer = () => { setEdition(null); setForm({}) }

  const sauvegarder = async () => {
    if (!edition) return
    const { error } = await supabase.from('traductions').update(form).eq('trad_id', edition)
    if (error) { setStatut({ id: edition, ok: false, msg: error.message }); return }
    setLignes(prev => prev.map(t => t.trad_id === edition ?{ ...t, ...form } as Traduction : t))
    setStatut({ id: edition, ok: true, msg: 'Enregistré.' })
    await revaliderTraductions()
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
        headers: await headersAdmin({ 'Content-Type': 'application/json' }),
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
              <p style={{ fontSize: '11px', marginTop: '8px', color: importStatut === 'err' ?'#c0562a' : importStatut === 'ok' ?'#3d6b4f' : '#6b6560' }}>
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
              style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: importStatut === 'loading' ?'#a0b8aa' : '#3d6b4f', color: '#fff', cursor: importStatut === 'loading' ?'default' : 'pointer', fontWeight: 500 }}>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: '14px', color: '#2a3d30' }}>{t.nom}</span>
              {t.dates && <span style={{ fontSize: '11px', color: '#9a958d' }}>{t.dates}</span>}
              {t.import_maj_le && (
                <span style={{ fontSize: '10px', color: '#b0a89e', fontStyle: 'italic' }}>
                  import · {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <code style={{ fontSize: '10.5px', background: '#f0ece6', padding: '2px 6px', borderRadius: '3px', color: '#6b6560' }}>{t.trad_id}</code>
              {photoStatut[t.trad_id] === 'loading' && (
                <span style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic' }}>Envoi…</span>
              )}
              {photoStatut[t.trad_id] === 'ok' && (
                <span style={{ fontSize: '10.5px', color: '#3d6b4f', fontWeight: 600 }}>
                  {t.photo ? '✓ Nouvelle image chargée' : '✓ Image ajoutée'}
                </span>
              )}
              {photoStatut[t.trad_id] === 'err' && (
                <span style={{ fontSize: '10.5px', color: '#c0562a', fontWeight: 600 }}>✗ Erreur</span>
              )}
              <button
                onClick={() => photoRefs.current[t.trad_id]?.click()}
                disabled={photoStatut[t.trad_id] === 'loading'}
                title={t.photo ? 'Remplacer la photo' : 'Ajouter une photo'}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${t.photo ? '#3d6b4f' : '#d6d0c4'}`, background: t.photo ? 'rgba(61,107,79,0.08)' : '#fff', color: t.photo ? '#3d6b4f' : '#9a958d', cursor: photoStatut[t.trad_id] === 'loading' ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                {t.photo ? '✓ Photo' : '+ Photo'}
              </button>
              {t.photo && (
                <button
                  onClick={() => setPositionModal(t.trad_id)}
                  title="Cadrer et zoomer l'image"
                  style={{ fontSize: '13px', padding: '3px 8px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer', lineHeight: 1 }}>
                  ⊹
                </button>
              )}
              <input ref={el => { photoRefs.current[t.trad_id] = el }} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={async e => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  const estRemplacement = !!t.photo
                  const blob = f.slice(0, f.size, 'image/jpeg')
                  const fichierRenomme = new File([blob], `${t.trad_id}.jpg`, { type: 'image/jpeg' })
                  await uploadPhoto(t.trad_id, fichierRenomme, estRemplacement)
                  e.target.value = ''
                }} />
              {exportStatut[t.trad_id] === 'loading' && (
                <span style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic' }}>Export…</span>
              )}
              {exportStatut[t.trad_id] === 'ok' && (
                <span style={{ fontSize: '10.5px', color: '#3d6b4f', fontWeight: 600 }}>✓ Téléchargé</span>
              )}
              {exportStatut[t.trad_id] === 'err' && (
                <span style={{ fontSize: '10.5px', color: '#c0562a', fontWeight: 600 }}>✗ Erreur</span>
              )}
              <button
                onClick={() => exporterCSV(t.trad_id, t.nom)}
                disabled={exportStatut[t.trad_id] === 'loading'}
                title="Exporter cette traduction en CSV"
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: exportStatut[t.trad_id] === 'loading' ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                ↓ CSV
              </button>
              <button
                onClick={() => ouvrirRemplacement(t.trad_id)}
                title="Remplacer les versets de cette traduction via un CSV"
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#9a7e3d', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ↑ Remplacer
              </button>
              <button onClick={() => edition === t.trad_id ?fermer() : ouvrir(t)}
                style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer' }}>
                {edition === t.trad_id ?'Fermer' : 'Modifier'}
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
                      onChange={e => setForm(p => ({ ...p, [c.key]: c.key === 'ordre' ?parseInt(e.target.value) || 99 : e.target.value }))}
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
      {/* Input fichier caché pour le remplacement CSV */}
      <input
        ref={replaceFileRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleReplaceCSV(f); e.target.value = '' }}
      />

      {/* Modale remplacement traduction */}
      {replaceModal && (() => {
        const t = lignes.find(l => l.trad_id === replaceModal)
        if (!t) return null
        return (
          <div onClick={() => { if (replaceStatut !== 'loading') setReplaceModal(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#f7f4ef', borderRadius: '10px', padding: '22px 24px', maxWidth: '440px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>
                  Remplacer · <em style={{ color: '#7a7268' }}>{t.nom}</em>
                  <code style={{ fontSize: '10px', background: '#f0ece6', padding: '1px 5px', borderRadius: '3px', marginLeft: '8px', color: '#6b6560' }}>{t.trad_id}</code>
                </h3>
                <button onClick={() => setReplaceModal(null)} disabled={replaceStatut === 'loading'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: '#b0a89e', padding: 0, lineHeight: 1 }}>✕</button>
              </div>
              <p style={{ fontSize: '11px', color: '#9a958d', marginBottom: '14px', lineHeight: 1.6 }}>
                Le CSV doit contenir deux colonnes : <code style={{ background: '#f0ece6', padding: '1px 4px', borderRadius: '3px' }}>id_verset</code> et le texte. Tous les versets identifiés par leur <code style={{ background: '#f0ece6', padding: '1px 4px', borderRadius: '3px' }}>id_verset</code> seront écrasés.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <button
                  onClick={() => replaceFileRef.current?.click()}
                  disabled={replaceStatut === 'loading'}
                  style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}>
                  ↑ Choisir un CSV
                </button>
                {replaceNom && (
                  <span style={{ fontSize: '11px', color: '#6b6560', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replaceNom}</span>
                )}
              </div>
              {replaceMsg && (
                <p style={{ fontSize: '11.5px', marginBottom: '14px', color: replaceStatut === 'err' ? '#c0562a' : replaceStatut === 'ok' ? '#3d6b4f' : '#5a6b5e', fontWeight: replaceStatut === 'ok' || replaceStatut === 'err' ? 600 : 400 }}>
                  {replaceMsg}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #e8e3dc', paddingTop: '14px' }}>
                <button onClick={() => setReplaceModal(null)} disabled={replaceStatut === 'loading'} style={{ fontSize: '12px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                <button
                  onClick={confirmerRemplacement}
                  disabled={replaceLignes.length === 0 || replaceStatut === 'loading' || replaceStatut === 'ok'}
                  style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: replaceLignes.length === 0 || replaceStatut === 'loading' || replaceStatut === 'ok' ? '#a0b8aa' : '#9a7e3d', color: '#fff', cursor: replaceLignes.length === 0 || replaceStatut === 'loading' || replaceStatut === 'ok' ? 'default' : 'pointer', fontWeight: 500 }}>
                  {replaceStatut === 'loading' ? 'Mise à jour…' : `Écraser ${replaceLignes.length > 0 ? replaceLignes.length + ' versets' : '…'}`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modale positionnement photo */}
      {positionModal && (() => {
        const t = lignes.find(l => l.trad_id === positionModal)
        if (!t?.photo) return null
        return (
          <ModalPositionPhoto
            t={t}
            posInit={parsePositions(t.photo_position)}
            onClose={() => setPositionModal(null)}
            onSauvegarde={pos => sauvegarderPosition(t.trad_id, pos)}
          />
        )
      })()}
    </div>
  )
}


// Section Commentaires (admin)
