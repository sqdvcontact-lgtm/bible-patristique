'use client'

import React, { useState, useRef, useCallback } from 'react'
import { preparerPortrait, BOITE_TRADUCTION, BOITE_TRADUCTION_ENCART } from '@/app/lib/preparerPortrait'
import DOMPurify from 'dompurify'
import { supabase, headersAdmin } from './adminShared'
import IconeCrayon from '@/app/components/IconeCrayon'
import type { Traduction } from './adminTypes'
import { revaliderTraductions } from '@/app/actions/revalider'
import { colonnesPeriodeHistorique, formaterDateHistorique, normaliserDateHistoriqueTexte } from '@/app/lib/datesHistoriques'

type PhotoPos = { x: number; y: number; scale: number }
type PhotoPositions = { bandeau: PhotoPos; encart: PhotoPos }

const POS_DEFAUT: PhotoPos = { x: 50, y: 20, scale: 1 }
// Une image debout donnée à un cadre debout n'a presque rien à recadrer : elle se
// centre. Le défaut du bandeau, lui, vise haut (y = 20) parce qu'une image couchée
// serrée dans 92 px de haut coupe le plus souvent par le bas.
const POS_DEFAUT_ENCART: PhotoPos = { x: 50, y: 50, scale: 1 }

function parsePositions(raw: Traduction['photo_position']): PhotoPositions {
  if (!raw) return { bandeau: { ...POS_DEFAUT }, encart: { ...POS_DEFAUT_ENCART } }
  // Rétro-compatibilité avec ancien format plat { x, y, scale }
  const r = raw as any
  if (typeof r.x === 'number') return { bandeau: { x: r.x, y: r.y, scale: r.scale ?? 1 }, encart: { ...POS_DEFAUT_ENCART } }
  // `lateral` est l'ancien nom de l'encart, du temps où la même image servait aux
  // deux cadres : on reprend le cadrage qui y dort, faute de mieux, tant qu'aucune
  // image d'encart propre n'a été déposée.
  return {
    bandeau: r.bandeau ?? { ...POS_DEFAUT },
    encart: r.encart ?? r.lateral ?? { ...POS_DEFAUT_ENCART },
  }
}

// ── Modale positionnement photo ───────────────────────────────────────────────
// Rend la VRAIE carte (code identique à la page publique, données réelles)
// avec un calque drag transparent par-dessus chaque image. La carte y est
// toujours DÉPLIÉE : le bandeau s'y montre donc dans son cadre, et l'encart
// détaché des bords, exactement comme le lecteur les verra.
function ModalPositionPhoto({ t, posInit, onClose, onSauvegarde }: {
  t: Traduction
  posInit: PhotoPositions
  onClose: () => void
  onSauvegarde: (pos: PhotoPositions) => Promise<void>
}) {
  // Tant qu'une notice n'a pas reçu son portrait, le bandeau tient lieu d'encart :
  // on cadre alors la même image dans les deux boîtes, comme le fait la page publique.
  const imageBandeau = t.photo
  const imageEncart = t.photo_encart ?? t.photo
  const [positions, setPositions] = useState<PhotoPositions>(posInit)
  const [active, setActive] = useState<'bandeau' | 'encart'>(imageBandeau ? 'bandeau' : 'encart')
  const [saving, setSaving] = useState(false)
  const bandeauRef = useRef<HTMLDivElement>(null)
  const encartRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    zone: 'bandeau' | 'encart'
    startX: number; startY: number; baseX: number; baseY: number
  } | null>(null)

  const startDrag = (zone: 'bandeau' | 'encart') => (e: React.MouseEvent) => {
    e.preventDefault()
    setActive(zone)
    const p = positions[zone]
    dragRef.current = { zone, startX: e.clientX, startY: e.clientY, baseX: p.x, baseY: p.y }
  }

  const onMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return
    const { zone, startX, startY, baseX, baseY } = dragRef.current
    const el = zone === 'bandeau' ? bandeauRef.current : encartRef.current
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
  const posStyle = (zone: 'bandeau' | 'encart'): React.CSSProperties => {
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

  const meta = [t.langue, formaterDateHistorique(t.date_publication)].filter(Boolean).join(' · ')
  const ombre = '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.35)'
  const activePos = positions[active]
  const isDragging = !!dragRef.current
  const btnZ: React.CSSProperties = {
    width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--cs-bord)',
    background: 'var(--cs-surface)', color: 'var(--cs-texte)', fontSize: '1.25rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1,
  }
  const badgeStyle: React.CSSProperties = {
    position: 'absolute', zIndex: 3, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)',
    fontSize: '0.5625rem', fontWeight: 700, padding: '2px 7px', borderRadius: '4px',
    letterSpacing: '0.07em', textTransform: 'uppercase', pointerEvents: 'none',
  }

  // Simplification du commentaire editorial pour l'affichage dans la modale
  const htmlEditorial = t.commentaire_editorial
    ? DOMPurify.sanitize(t.commentaire_editorial.startsWith('<')
        ? t.commentaire_editorial
        : t.commentaire_editorial.split(/\n+/).filter(Boolean)
            .map(l => `<p style="color:var(--cs-texte-fort);font-size:0.84375rem;line-height:1.78;margin:0 0 12px">${l}</p>`)
            .join(''))
    : ''

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-fond)', borderRadius: '8px', padding: '18px 18px 16px', maxWidth: '42.5rem', width: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>
            Positionner les images · <em style={{ color: 'var(--cs-texte-second)' }}>{t.nom}</em>
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.0625rem', color: 'var(--cs-texte-faible)', padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Glissez directement sur le bandeau ou sur l’encart pour cadrer · + / − pour zoomer
        </p>
        {!t.photo_encart && (
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: '0 0 12px', lineHeight: 1.5 }}>
            Cette notice n’a pas encore d’image d’encart : c’est le bandeau qui en tient lieu,
            cadré en portrait. Déposez-en une par le bouton « Encart ».
          </p>
        )}

        {/* ════════════════════════════════════════════════════════════
            APERÇU : rendu identique à la page publique
            ════════════════════════════════════════════════════════════ */}
        <div
          onMouseMove={onMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          style={{ border: '1px solid var(--cs-bord)', borderRadius: '8px', overflow: 'hidden', background: 'var(--cs-surface)', userSelect: 'none' }}>

          {/* ── Bandeau, dans son cadre (copie exacte de BandeauTraduction dépliée) ── */}
          <div
            ref={bandeauRef}
            style={{
              position: 'relative', width: '100%', minHeight: '112px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              overflow: 'hidden',
              outline: active === 'bandeau' ? '3px solid var(--cs-vert)' : '3px solid transparent',
              outlineOffset: '-3px', transition: 'outline-color 0.12s',
            }}>
            {imageBandeau && (
              <div aria-hidden="true" style={{
                position: 'absolute', inset: '10px', zIndex: 0,
                borderRadius: '3px', overflow: 'hidden',
                boxShadow: '0 0 0 1px var(--cs-bord), 0 1px 5px rgba(0,0,0,0.16)',
              }}>
                <img src={imageBandeau} alt="" draggable={false} style={{
                  width: '100%', height: '100%', display: 'block',
                  filter: 'brightness(0.78)',
                  ...posStyle('bandeau'),
                }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)',
                }} />
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, padding: '28px 14px 28px 30px' }}>
              <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.25rem', fontWeight: 'normal', color: imageBandeau ? '#f7f4ef' : 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.25, textShadow: imageBandeau ? ombre : 'none' }}>
                {t.nom}
              </h2>
              {meta && (
                <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.78125rem', fontStyle: 'italic', color: imageBandeau ? 'rgba(242,239,232,0.72)' : 'var(--cs-texte-second)', display: 'block', marginTop: '4px', textShadow: imageBandeau ? ombre : 'none' }}>
                  {meta}
                </span>
              )}
            </div>
            <span style={{ position: 'relative', zIndex: 1, fontSize: '0.71875rem', flexShrink: 0, marginRight: '28px', color: imageBandeau ? 'rgba(255,255,255,0.75)' : 'var(--cs-bord)', textShadow: imageBandeau ? ombre : 'none' }}>▼</span>
            {/* Calque drag invisible, borné au cadre */}
            {imageBandeau && <div onMouseDown={startDrag('bandeau')} style={{ position: 'absolute', inset: '10px', zIndex: 2, cursor: isDragging ? 'grabbing' : 'grab' }} />}
            {active === 'bandeau' && <div style={{ ...badgeStyle, top: 16, right: 16 }}>bandeau</div>}
          </div>

          {/* ── Volet déplié (copie exacte de AllerPlusLoinClient) ── */}
          <div style={{ borderTop: '1px solid var(--cs-fond-doux)', display: 'flex', alignItems: 'flex-start' }}>

            {/* Encart portrait, détaché des bords */}
            {imageEncart && (
              <div
                ref={encartRef}
                style={{
                  position: 'relative', width: '8.75rem', flexShrink: 0,
                  aspectRatio: '2 / 3',
                  margin: '18px 0 18px 18px',
                  borderRadius: '3px', overflow: 'hidden',
                  boxShadow: '0 0 0 1px var(--cs-bord), 0 1px 5px rgba(0,0,0,0.14)',
                  outline: active === 'encart' ? '3px solid var(--cs-vert)' : '3px solid transparent',
                  outlineOffset: '-3px', transition: 'outline-color 0.12s',
                }}>
                <img src={imageEncart} alt="" draggable={false}
                  style={{ width: '100%', height: '100%', display: 'block', ...posStyle('encart') }} />
                <div onMouseDown={startDrag('encart')} style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: isDragging ? 'grabbing' : 'grab' }} />
                {active === 'encart' && <div style={{ ...badgeStyle, bottom: 6, left: '50%', transform: 'translateX(-50%)' }}>encart</div>}
              </div>
            )}

            {/* Texte réel */}
            <div style={{ flex: 1, minWidth: 0, padding: '18px 20px 22px' }}>
              {t.bio_courte && (
                <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic', textAlign: 'justify', hyphens: 'auto' }}>
                  {t.bio_courte}
                </p>
              )}
              {htmlEditorial && (
                <div className="trad-article" style={{ color: 'var(--cs-texte-fort)', fontSize: '1rem', lineHeight: 1.65, textAlign: 'justify', hyphens: 'auto' }}
                  dangerouslySetInnerHTML={{ __html: htmlEditorial }} />
              )}
            </div>
          </div>
        </div>

        {/* ── Contrôles ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
          <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, flex: 1 }}>
            Zone active : <strong style={{ color: active === 'bandeau' ? 'var(--cs-vert)' : 'var(--cs-or)' }}>{active === 'bandeau' ? 'bandeau' : 'encart'}</strong>
          </p>
          <button onClick={() => zoomer(-0.1)} style={btnZ}>−</button>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-encre)', minWidth: '44px', textAlign: 'center' }}>{Math.round(activePos.scale * 100)} %</span>
          <button onClick={() => zoomer(+0.1)} style={btnZ}>+</button>
          <button onClick={() => setPositions(prev => ({ ...prev, [active]: active === 'bandeau' ? { ...POS_DEFAUT } : { ...POS_DEFAUT_ENCART } }))}
            style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}>
            Réinit.
          </button>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px', borderTop: '1px solid var(--cs-bord-clair)', paddingTop: '14px' }}>
          <button onClick={onClose} style={{ fontSize: '0.875rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
          <button onClick={sauvegarder} disabled={saving} style={{ fontSize: '0.875rem', padding: '7px 18px', borderRadius: '4px', border: 'none', background: saving ? '#a0b8aa' : 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: saving ? 'default' : 'pointer', fontWeight: 500 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { fontSize: '0.71875rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--cs-texte-doux)', display: 'block', marginBottom: '4px' }

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
    padding: '4px 9px', fontSize: '0.8125rem', border: '1px solid var(--cs-bord)',
    borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer', lineHeight: 1,
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
    <div style={{ border: '1px solid var(--cs-bord)', borderRadius: '4px', overflow: 'hidden' }}>
      {/* Barre d'outils */}
      <div style={{ display: 'flex', gap: '4px', padding: '6px 8px', background: 'var(--cs-fond)', borderBottom: '1px solid var(--cs-bord)', flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('bold') }} style={btnStyle}><strong>G</strong></button>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('italic') }} style={btnStyle}><em>I</em></button>
        <div style={{ width: '1px', background: 'var(--cs-bord)', margin: '0 2px', alignSelf: 'stretch' }} />
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('formatBlock', 'h1') }} style={btnStyle} title="Titre 1">H1</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('formatBlock', 'h2') }} style={btnStyle} title="Titre 2">H2</button>
        <button type="button" onMouseDown={e => { e.preventDefault(); appliquerDirect('formatBlock', 'p') }} style={btnStyle} title="Paragraphe">¶</button>
        <div style={{ width: '1px', background: 'var(--cs-bord)', margin: '0 2px', alignSelf: 'stretch' }} />
        <button type="button" onMouseDown={e => { e.preventDefault(); petitesCapitalesDirect() }} style={{ ...btnStyle, fontVariant: 'small-caps' }} title="Petites capitales">sc</button>
        <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', marginLeft: 'auto' }}>direct</span>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={e => onChange(e.currentTarget.innerHTML)}
        style={{
          width: '100%', minHeight: '150px', padding: '12px 14px', fontSize: '0.9375rem',
          fontFamily: 'var(--font-source-serif), Georgia, serif', lineHeight: 1.7, color: 'var(--cs-texte-fort)', outline: 'none',
          border: 'none', background: 'var(--cs-surface)', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ── Édition source précise + apparats critiques ───────────────────────────────
type EditionSource = {
  id: number; trad_id: string; titre_edition: string | null; sous_titre_edition: string | null; traducteur: string | null
  editeur: string | null; annee_edition: string | null; lieu_edition: string | null; langue: string | null
  confession: string | null; source_type: string | null; source_nom: string | null; source_url: string | null
  source_fichier: string | null; licence: string | null; graphie: string | null; date_extraction: string | null
  particularites: string | null; integrite_verifiee: boolean | null; notes: string | null; nombre_tomes: number | null; numero_edition: number | null
}
type ApparatPiece = { id: number; trad_id: string; livre: string | null; piece: string | null; ordre: number | null; texte: string; source: string | null }
type EntreeJournalIA = { id: number; cree_le: string | null; sujet: string | null; probleme: string | null; reponse: string | null; statut: string | null }

// Extrait les URL http(s) d'un champ (une source, ou plusieurs séparées par des espaces,
// retours à la ligne ou points-virgules — cas des éditions en plusieurs tomes).
function urlsDe(champ: string | null): string[] {
  return (champ || '').split(/[\s;]+/).map(s => s.trim()).filter(s => /^https?:\/\//i.test(s))
}

// Lien vers une source : un bouton sobre si une seule URL, un menu déroulant si plusieurs.
function BoutonSource({ label, urls }: { label: string; urls: string[] }) {
  const [ouvert, setOuvert] = React.useState(false)
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.65625rem', fontWeight: 500, color: 'var(--cs-vert)', textDecoration: 'none', padding: '3px 11px', border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'var(--cs-surface)', lineHeight: 1.3 }
  if (urls.length === 1) {
    return <a href={urls[0]} target="_blank" rel="noopener noreferrer" style={base}>{label}<span aria-hidden="true" style={{ opacity: 0.7 }}>↗</span></a>
  }
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOuvert(o => !o)} style={{ ...base, cursor: 'pointer' }}>
        {label}<span style={{ color: 'var(--cs-texte-doux)' }}>· {urls.length}</span><span aria-hidden="true" style={{ opacity: 0.7 }}>▾</span>
      </button>
      {ouvert && (
        <>
          <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, zIndex: 10, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)', minWidth: '8rem', overflow: 'hidden' }}>
            {urls.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noopener noreferrer" onClick={() => setOuvert(false)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '6px 12px', fontSize: '0.65625rem', color: 'var(--cs-vert)', textDecoration: 'none', borderBottom: i < urls.length - 1 ? '1px solid var(--cs-fond-doux)' : 'none' }}>
                Tome {i + 1}<span aria-hidden="true" style={{ opacity: 0.7 }}>↗</span>
              </a>
            ))}
          </div>
        </>
      )}
    </span>
  )
}

// Découpe un champ multi-valeurs (séparé par des points-virgules) en valeurs distinctes.
function enValeurs(champ: string | null | undefined): string[] {
  return String(champ ?? '').split(';').map(s => s.trim()).filter(Boolean)
}
function mentionEdition(n: number): string {
  if (n === 1) return '1re édition'
  return `${n}e édition`
}
const styleTag: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.6875rem', background: 'var(--cs-fond-doux)', color: 'var(--cs-texte)', border: '1px solid var(--cs-bord-clair)', borderRadius: '999px', padding: '1px 9px', lineHeight: 1.45 }
const styleInput: React.CSSProperties = { width: '100%', fontSize: '0.75rem', padding: '4px 8px', border: '1px solid var(--cs-or-doux)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-encre)', outline: 'none', boxSizing: 'border-box' }
const styleMini: React.CSSProperties = { fontSize: '0.625rem', padding: '3px 9px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', cursor: 'pointer', color: 'var(--cs-texte-second)' }

// Éditeur de valeurs multiples sous forme de tags (add / remove), enregistré joint par « ; ».
function EditeurTags({ initial, onValider, onAnnuler }: { initial: string[]; onValider: (v: string[]) => void; onAnnuler: () => void }) {
  const [tags, setTags] = React.useState<string[]>(initial)
  const [saisie, setSaisie] = React.useState('')
  const ajouter = () => { const v = saisie.trim(); if (v) { setTags([...tags, v]); setSaisie('') } }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tags.map((v, i) => (
            <span key={i} style={styleTag}>{v}
              <button onClick={() => setTags(tags.filter((_, j) => j !== i))} title="Retirer" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-doux)', padding: 0, fontSize: '0.78125rem', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input value={saisie} autoFocus onChange={e => setSaisie(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); ajouter() } if (e.key === 'Escape') onAnnuler() }}
          placeholder="Ajouter une valeur…" style={{ ...styleInput, flex: 1 }} />
        <button onClick={ajouter} style={styleMini}>Ajouter</button>
        <button onClick={() => onValider(tags)} style={{ ...styleMini, color: 'var(--cs-vert)', borderColor: 'var(--cs-vert-clair)', fontWeight: 600 }}>Enregistrer</button>
        <button onClick={onAnnuler} style={{ ...styleMini, color: 'var(--cs-texte-doux)' }}>Annuler</button>
      </div>
    </div>
  )
}

function PanneauEditionApparat({ edition, pieces, nomBref }: { edition?: EditionSource; pieces: ApparatPiece[]; nomBref: string }) {
  // Un seul apparat ouvert à la fois : on n'affiche que les titres, le texte s'ouvre en grand au clic.
  const [pieceOuverte, setPieceOuverte] = React.useState<number | null>(null)
  // Petit onglet en tête : la fiche d'édition, ou le journal des commentaires IA (chargé
  // à la demande, parcouru par une barre de navigation).
  const [onglet, setOnglet] = React.useState<'fiche' | 'ia'>('fiche')
  const [journal, setJournal] = React.useState<EntreeJournalIA[] | null>(null)
  const [idxJ, setIdxJ] = React.useState(0)
  React.useEffect(() => {
    if (onglet === 'ia' && journal === null) {
      supabase.from('journal_ia').select('id, cree_le, sujet, probleme, reponse, statut').order('cree_le', { ascending: false })
        .then(({ data }) => setJournal((data as EntreeJournalIA[]) ?? []))
    }
  }, [onglet, journal])
  // Édition en ligne : copie locale synchronisée avec la prop ; champ en cours d'édition.
  const [local, setLocal] = React.useState<EditionSource | undefined>(edition)
  React.useEffect(() => { setLocal(edition) }, [edition])
  const [champEdit, setChampEdit] = React.useState<keyof EditionSource | null>(null)
  const [brouillon, setBrouillon] = React.useState('')
  const [erreurSave, setErreurSave] = React.useState(false)
  async function enregistrer(patch: Partial<EditionSource>) {
    if (!local) return
    setErreurSave(false)
    const { error } = await supabase.from('editions_sources').update(patch).eq('id', local.id)
    if (error) { setErreurSave(true); return }
    setLocal({ ...local, ...patch })
    setChampEdit(null)
  }
  const editerSingle = (k: keyof EditionSource) => { setChampEdit(k); setBrouillon(String((local as Record<string, unknown> | undefined)?.[k] ?? '')) }
  const validerSingle = (k: keyof EditionSource, numeric?: boolean) => {
    const v = brouillon.trim()
    enregistrer({ [k]: v === '' ? null : (numeric ? Number(v) : v) } as Partial<EditionSource>)
  }
  const sousTitre: React.CSSProperties = { fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 4px' }
  const vide: React.CSSProperties = { fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }
  const cleStyle: React.CSSProperties = { display: 'block', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', marginBottom: '1px' }
  // Ligne (libellé à gauche, valeur à droite) — présentation sobre en lignes, texte réduit.
  const labelLigne: React.CSSProperties = { flexShrink: 0, width: '8.5rem', fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', lineHeight: 1.35 }
  const tiret = <span style={{ color: 'var(--cs-bord)' }}>—</span>
  const Ligne = ({ cle, children }: { cle: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: '12px', padding: '4px 0', borderTop: '1px solid var(--cs-fond-doux)', alignItems: 'baseline' }}>
      <span style={labelLigne}>{cle}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte)', lineHeight: 1.4, wordBreak: 'break-word', flex: 1 }}>{children}</span>
    </div>
  )
  // Ligne éditable au clic. `multi` → tags (séparés par « ; ») ; `numeric` → nombre ;
  // `rendu` transforme la valeur affichée (ex. « 1re édition »).
  const LigneEd = ({ cle, champ: k, multi, numeric, rendu }: { cle: string; champ: keyof EditionSource; multi?: boolean; numeric?: boolean; rendu?: (v: string) => React.ReactNode }) => {
    const brut = (local as Record<string, unknown> | undefined)?.[k]
    const enEd = champEdit === k
    return (
      <div style={{ display: 'flex', gap: '12px', padding: '4px 0', borderTop: '1px solid var(--cs-fond-doux)', alignItems: enEd ? 'flex-start' : 'baseline' }}>
        <span style={labelLigne}>{cle}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {enEd ? (
            multi ? (
              <EditeurTags initial={enValeurs(brut as string)} onAnnuler={() => setChampEdit(null)}
                onValider={(vals) => enregistrer({ [k]: vals.length ? vals.join(' ; ') : null } as Partial<EditionSource>)} />
            ) : (
              <input autoFocus value={brouillon} onChange={ev => setBrouillon(ev.target.value)}
                onKeyDown={ev => { if (ev.key === 'Enter') validerSingle(k, numeric); if (ev.key === 'Escape') setChampEdit(null) }}
                onBlur={() => validerSingle(k, numeric)} style={styleInput} />
            )
          ) : (
            <span onClick={() => multi ? setChampEdit(k) : editerSingle(k)} title="Cliquer pour modifier"
              style={{ fontSize: '0.75rem', color: 'var(--cs-texte)', lineHeight: 1.4, wordBreak: 'break-word', cursor: 'pointer', ...(multi ? {} : { borderBottom: '1px dotted var(--cs-bord)' }) }}>
              {multi
                ? (enValeurs(brut as string).length ? <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px' }}>{enValeurs(brut as string).map((v, i) => <span key={i} style={styleTag}>{v}</span>)}</span> : tiret)
                : (brut != null && String(brut) !== '' ? (rendu ? rendu(String(brut)) : String(brut)) : tiret)}
            </span>
          )}
        </div>
      </div>
    )
  }
  // Ligne éditable en texte long (particularités, notes) — textarea au clic.
  const LigneEdTexte = ({ cle, champ: k }: { cle: string; champ: keyof EditionSource }) => {
    const brut = (local as Record<string, unknown> | undefined)?.[k]
    const enEd = champEdit === k
    return (
      <div style={{ padding: '5px 0', borderTop: '1px solid var(--cs-fond-doux)' }}>
        <span style={{ ...labelLigne, width: 'auto', display: 'block', marginBottom: '3px' }}>{cle}</span>
        {enEd ? (
          <textarea autoFocus value={brouillon} rows={3} onChange={ev => setBrouillon(ev.target.value)}
            onKeyDown={ev => { if (ev.key === 'Escape') setChampEdit(null) }}
            onBlur={() => enregistrer({ [k]: brouillon.trim() || null } as Partial<EditionSource>)}
            style={{ ...styleInput, resize: 'vertical', lineHeight: 1.5 }} />
        ) : (
          <span onClick={() => editerSingle(k)} title="Cliquer pour modifier"
            style={{ fontSize: '0.75rem', color: 'var(--cs-texte)', lineHeight: 1.5, cursor: 'pointer', whiteSpace: 'pre-wrap', display: 'block' }}>
            {brut && String(brut).trim() ? String(brut) : <em style={{ color: 'var(--cs-bord)' }}>Cliquer pour renseigner…</em>}
          </span>
        )}
      </div>
    )
  }
  const e = local
  const ongletBtn = (actif: boolean): React.CSSProperties => ({ fontSize: '0.6875rem', fontWeight: 600, padding: '5px 13px', borderRadius: '8px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.09)' : 'var(--cs-surface)', color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', cursor: 'pointer' })
  const navBtn = (actif: boolean): React.CSSProperties => ({ fontSize: '0.71875rem', padding: '4px 12px', borderRadius: '4px', border: `1px solid ${actif ? 'var(--cs-bord)' : 'var(--cs-fond-doux)'}`, background: 'var(--cs-surface)', color: actif ? 'var(--cs-vert)' : 'var(--cs-bord)', cursor: actif ? 'pointer' : 'default' })

  return (
    <div style={{ padding: '16px 18px 20px', borderTop: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)' }}>
      {/* Petit onglet en tête : Fiche / Commentaires IA */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '15px' }}>
        <button onClick={() => setOnglet('fiche')} style={ongletBtn(onglet === 'fiche')}>Fiche</button>
        <button onClick={() => setOnglet('ia')} style={ongletBtn(onglet === 'ia')}>Commentaires IA</button>
      </div>

      {onglet === 'ia' ? (
        <div>
          {/* Notes propres à cette édition (fusionnées ici) — éditables au clic. */}
          {e && (
            <div style={{ marginBottom: '16px' }}>
              <p style={sousTitre}>Notes de cette édition</p>
              <LigneEdTexte cle="Particularités" champ="particularites" />
              <LigneEdTexte cle="Notes" champ="notes" />
            </div>
          )}
          <p style={sousTitre}>Journal des commentaires IA</p>
          {journal === null ? <p style={{ ...vide, marginTop: '6px' }}>Chargement…</p>
          : journal.length === 0 ? <p style={{ ...vide, marginTop: '6px' }}>Aucun commentaire IA.</p>
          : (() => {
          const idx = Math.min(idxJ, journal.length - 1)
          const j = journal[idx]
          return (
            <div style={{ marginTop: '8px' }}>
              {/* Barre de navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                <button disabled={idx <= 0} onClick={() => setIdxJ(idx - 1)} style={navBtn(idx > 0)}>‹ Précédent</button>
                <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)' }}>{idx + 1} / {journal.length}</span>
                <button disabled={idx >= journal.length - 1} onClick={() => setIdxJ(idx + 1)} style={navBtn(idx < journal.length - 1)}>Suivant ›</button>
              </div>
              <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', background: 'var(--cs-surface)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-encre)' }}>{j.sujet || 'Sans sujet'}</span>
                  {j.statut && <span style={{ fontSize: '0.59375rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.10)', borderRadius: '4px', padding: '2px 7px', flexShrink: 0 }}>{j.statut}</span>}
                </div>
                {j.cree_le && <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', margin: '0 0 9px' }}>{new Date(j.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
                {j.probleme && <div style={{ marginBottom: '9px' }}><span style={cleStyle}>Problème</span><p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte)', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>{j.probleme}</p></div>}
                {j.reponse && <div><span style={cleStyle}>Réponse</span><p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-fort)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{j.reponse}</p></div>}
              </div>
            </div>
          )
        })()}
        </div>
      ) : (
      <>
      {e ? (
        <>
          {/* Première ligne — SEULE en colonnes : sources, licence, intégrité (tout éditable). */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', padding: '9px 12px', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', background: 'var(--cs-surface)', marginBottom: '14px' }}>
            {champEdit === 'source_url' ? (
              <input autoFocus value={brouillon} onChange={ev => setBrouillon(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') validerSingle('source_url'); if (ev.key === 'Escape') setChampEdit(null) }} onBlur={() => validerSingle('source_url')} placeholder="URL notice (plusieurs séparées par un espace)…" style={{ ...styleInput, maxWidth: '20rem' }} />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {urlsDe(e.source_url).length > 0 ? <BoutonSource label="Notice" urls={urlsDe(e.source_url)} /> : <span style={{ fontSize: '0.65625rem', color: 'var(--cs-bord)' }}>Notice —</span>}
                <button onClick={() => editerSingle('source_url')} title="Modifier l’URL notice" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-faible)', fontSize: '0.65625rem', padding: '1px 2px', lineHeight: 1 }}><IconeCrayon size={11} /></button>
              </span>
            )}
            {champEdit === 'source_fichier' ? (
              <input autoFocus value={brouillon} onChange={ev => setBrouillon(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') validerSingle('source_fichier'); if (ev.key === 'Escape') setChampEdit(null) }} onBlur={() => validerSingle('source_fichier')} placeholder="URL texte (plusieurs séparées par un espace)…" style={{ ...styleInput, maxWidth: '20rem' }} />
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {urlsDe(e.source_fichier).length > 0 ? <BoutonSource label="Source" urls={urlsDe(e.source_fichier)} /> : <strong style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)' }}>Source manquante</strong>}
                <button onClick={() => editerSingle('source_fichier')} title="Modifier l’URL texte" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-faible)', fontSize: '0.65625rem', padding: '1px 2px', lineHeight: 1 }}><IconeCrayon size={11} /></button>
              </span>
            )}
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px 14px' }}>
              {champEdit === 'licence' ? (
                <input autoFocus value={brouillon} onChange={ev => setBrouillon(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') validerSingle('licence'); if (ev.key === 'Escape') setChampEdit(null) }} onBlur={() => validerSingle('licence')} placeholder="Licence…" style={{ ...styleInput, maxWidth: '12rem' }} />
              ) : (
                <span onClick={() => editerSingle('licence')} title="Modifier la licence" style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-second)', cursor: 'pointer' }}><span style={{ color: 'var(--cs-texte-faible)' }}>Licence · </span>{e.licence || <em style={{ color: 'var(--cs-bord)' }}>définir</em>}</span>
              )}
              <button onClick={() => enregistrer({ integrite_verifiee: !e.integrite_verifiee })} title="Basculer l’état d’intégrité" style={{ fontSize: '0.65625rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <span style={{ color: 'var(--cs-texte-faible)' }}>Intégrité · </span><strong style={{ color: e.integrite_verifiee ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>{e.integrite_verifiee ? 'vérifiée' : 'non vérifiée'}</strong>
              </button>
            </span>
          </div>
          {erreurSave && <p style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)', margin: '0 0 10px' }}>Échec de l’enregistrement.</p>}

          {/* Le reste en LIGNES éditables au clic ; les champs à occurrences multiples en tags. */}
          <p style={sousTitre}>Titre</p>
          <Ligne cle="Titre bref">{nomBref || tiret}</Ligne>
          <LigneEd cle="Titre d’origine" champ="titre_edition" />
          <LigneEd cle="Sous-titre d’origine" champ="sous_titre_edition" />

          <p style={{ ...sousTitre, marginTop: '14px' }}>Publication</p>
          <LigneEd cle="Traducteur(s)" champ="traducteur" multi />
          <LigneEd cle="Éditeur(s)" champ="editeur" multi />
          <LigneEd cle="Lieu de publication" champ="lieu_edition" multi />
          <LigneEd cle="Année de publication" champ="annee_edition" />
          <LigneEd cle="Édition" champ="numero_edition" numeric rendu={v => mentionEdition(Number(v))} />

          <p style={{ ...sousTitre, marginTop: '14px' }}>Tomes</p>
          <LigneEd cle="Nombre de tomes" champ="nombre_tomes" numeric rendu={v => `${v} ${Number(v) > 1 ? 'tomes' : 'tome'}`} />

          <p style={{ ...sousTitre, marginTop: '14px' }}>Caractéristiques</p>
          <LigneEd cle="Langue" champ="langue" />
          <LigneEd cle="Confession" champ="confession" />
          <LigneEd cle="Graphie" champ="graphie" />
          <LigneEd cle="Source (nom)" champ="source_nom" />
          <LigneEd cle="Source (type)" champ="source_type" />
        </>
      ) : (
        <p style={{ ...vide, marginBottom: '16px' }}>Aucune fiche d’édition source (<code style={{ fontSize: '0.78125rem' }}>editions_sources</code>) n’est enregistrée pour cette traduction.</p>
      )}

      {/* Apparats critiques — rubrique dédiée ; texte replié, ouvert en grand au clic sur le titre. */}
      <p style={{ ...sousTitre, marginTop: '18px' }}>Apparats critiques — {pieces.length}</p>
      {pieces.length === 0 ? (
        <p style={vide}>Aucun apparat critique enregistré pour cette traduction.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {pieces.map(p => {
            const ouv = pieceOuverte === p.id
            return (
              <div key={p.id} style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', background: 'var(--cs-surface)', overflow: 'hidden' }}>
                <button onClick={() => setPieceOuverte(ouv ? null : p.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', textAlign: 'left', padding: '8px 11px', background: ouv ? 'var(--cs-fond)' : 'var(--cs-fond)', border: 'none', borderBottom: ouv ? '1px solid var(--cs-fond-doux)' : 'none', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-encre)' }}>{[p.livre, p.piece].filter(Boolean).join(' · ') || 'Apparat'}</span>
                    {p.source && <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>{p.source}</span>}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: ouv ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', flexShrink: 0, fontWeight: 600 }}>{ouv ? 'Réduire ▲' : 'Ouvrir ▾'}</span>
                </button>
                {ouv && (
                  <div style={{ padding: '11px 14px', fontSize: '0.875rem', color: 'var(--cs-texte-fort)', lineHeight: 1.65, maxHeight: '480px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                    {p.texte}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
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
  // Fiche « édition précise » (editions_sources) et apparats critiques (traduction_apparat)
  // par traduction, chargés une fois ; le panneau « Édition & apparat » les affiche.
  const [editionsSrc, setEditionsSrc] = useState<Record<string, EditionSource>>({})
  const [apparats, setApparats] = useState<Record<string, ApparatPiece[]>>({})
  const [panneauInfos, setPanneauInfos] = useState<string | null>(null)

  React.useEffect(() => {
    supabase.from('editions_sources').select('*').then(({ data }) => {
      const map: Record<string, EditionSource> = {}
      ;(data ?? []).forEach((e: EditionSource) => { map[e.trad_id] = e })
      setEditionsSrc(map)
    })
    supabase.from('traduction_apparat').select('*').order('ordre', { ascending: true }).then(({ data }) => {
      const map: Record<string, ApparatPiece[]> = {}
      ;(data ?? []).forEach((a: ApparatPiece) => { (map[a.trad_id] ??= []).push(a) })
      setApparats(map)
    })
  }, [])

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
          .from('versets_lecture')
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

  const uploadPhoto = async (tradId: string, fichier: File, variante: 'bandeau' | 'encart') => {
    // Une notice porte deux images : l'état de dépôt se suit par image, sans quoi
    // le dépôt de l'encart afficherait « ✓ » sur le bouton du bandeau.
    const cle = `${tradId}:${variante}`
    setPhotoStatut(prev => ({ ...prev, [cle]: 'loading' }))
    const formData = new FormData()
    formData.append('trad_id', tradId)
    formData.append('variante', variante)
    // Deux boîtes, parce que deux cadres : le bandeau court sur toute la largeur de
    // la carte, l'encart tient dans 140 px de large mais se dresse.
    formData.append('fichier', await preparerPortrait(fichier, variante === 'encart' ? BOITE_TRADUCTION_ENCART : BOITE_TRADUCTION))
    const headers = await headersAdmin()
    const res = await fetch('/api/admin/traduction-photo', { method: 'POST', headers, body: formData })
    const json = await res.json()
    if (!res.ok) {
      setPhotoStatut(prev => ({ ...prev, [cle]: 'err' }))
      setTimeout(() => setPhotoStatut(prev => ({ ...prev, [cle]: undefined as any })), 3000)
      return
    }
    const colonne = variante === 'encart' ? 'photo_encart' : 'photo'
    setLignes(prev => prev.map(t => t.trad_id === tradId ? { ...t, [colonne]: json.url } : t))
    setPhotoStatut(prev => ({ ...prev, [cle]: 'ok' }))
    setTimeout(() => setPhotoStatut(prev => ({ ...prev, [cle]: undefined as any })), 3000)
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
    const datesNormalisees = Object.prototype.hasOwnProperty.call(form, 'dates') ? normaliserDateHistoriqueTexte(form.dates) : undefined
    const datePublicationNormalisee = Object.prototype.hasOwnProperty.call(form, 'date_publication') ? normaliserDateHistoriqueTexte(form.date_publication) : undefined
    const payload = {
      ...form,
      ...(datesNormalisees !== undefined ? { dates: datesNormalisees, ...colonnesPeriodeHistorique('traducteur', datesNormalisees) } : {}),
      ...(datePublicationNormalisee !== undefined ? { date_publication: datePublicationNormalisee, ...colonnesPeriodeHistorique('publication', datePublicationNormalisee) } : {}),
    }
    const { error } = await supabase.from('traductions').update(payload).eq('trad_id', edition)
    if (error) { setStatut({ id: edition, ok: false, msg: error.message }); return }
    setLignes(prev => prev.map(t => t.trad_id === edition ?{ ...t, ...payload } as Traduction : t))
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

  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: '0.875rem', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Bouton ajouter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button onClick={() => { setAjout(!ajout); setImportStatut('idle'); setImportMsg('') }}
          style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 500 }}>
          + Ajouter une traduction
        </button>
      </div>

      {/* Formulaire nouvelle traduction */}
      {ajout && (
        <div style={{ background: 'var(--cs-surface)', border: '2px solid var(--cs-vert)', borderRadius: '8px', padding: '18px 20px', marginBottom: '4px' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--cs-vert)', marginBottom: '14px' }}>Nouvelle traduction</p>

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
          <div style={{ borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--cs-encre)', marginBottom: '6px' }}>Fichier CSV des versets *</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', marginBottom: '10px' }}>
              Le CSV doit contenir deux colonnes : <code style={{ background: 'var(--cs-fond-doux)', padding: '1px 5px', borderRadius: '4px' }}>id_verset</code> et le texte de la traduction.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', fontWeight: 500 }}>
                ↑ Choisir un CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleCSV(f) }} />
              {csvNom && (
                <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)' }}>{csvNom}</span>
              )}
            </div>
            {importMsg && (
              <p style={{ fontSize: '0.78125rem', marginTop: '8px', color: importStatut === 'err' ?'var(--cs-danger)' : importStatut === 'ok' ?'var(--cs-vert)' : 'var(--cs-texte-second)' }}>
                {importMsg}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setAjout(false); setNouveau({}); setCsvLignes([]); setCsvNom(''); setImportMsg('') }}
              style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
              Annuler
            </button>
            <button onClick={importer} disabled={importStatut === 'loading'}
              style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: 'none', background: importStatut === 'loading' ?'#a0b8aa' : 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: importStatut === 'loading' ?'default' : 'pointer', fontWeight: 500 }}>
              {importStatut === 'loading' ? 'Import en cours…' : 'Créer et importer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des traductions */}
      {lignes.map(t => (
        <div key={t.trad_id} style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', overflow: 'hidden' }}>
          {/* En-tête */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1rem', color: 'var(--cs-encre)' }}>{t.nom}</span>
              {t.dates && <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)' }}>{formaterDateHistorique(t.dates)}</span>}
              {t.import_maj_le && (
                <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>
                  import · {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <code style={{ fontSize: '0.6875rem', background: 'var(--cs-fond-doux)', padding: '1px 5px', borderRadius: '4px', color: 'var(--cs-texte-second)', marginRight: '1px' }}>{t.trad_id}</code>
              {/* Deux images, deux dépôts : le bandeau horizontal qui coiffe la notice,
                  et l'encart en portrait qui se pose dans le bloc déplié. Elles ne se
                  remplacent pas et ne se dérivent pas l'une de l'autre. */}
              {([
                { variante: 'bandeau' as const, libelle: 'Bandeau', url: t.photo,        glose: 'image horizontale qui coiffe la notice' },
                { variante: 'encart'  as const, libelle: 'Encart',  url: t.photo_encart, glose: 'image en portrait, posée dans le bloc déplié' },
              ]).map(({ variante, libelle, url, glose }) => {
                const cle = `${t.trad_id}:${variante}`
                const statut = photoStatut[cle]
                return (
                  <React.Fragment key={variante}>
                    {statut === 'loading' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Envoi…</span>
                    )}
                    {statut === 'ok' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--cs-vert)', fontWeight: 600 }}>✓ {libelle} chargé</span>
                    )}
                    {statut === 'err' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', fontWeight: 600 }}>✗ Erreur</span>
                    )}
                    <button
                      onClick={() => photoRefs.current[cle]?.click()}
                      disabled={statut === 'loading'}
                      title={`${url ? 'Remplacer' : 'Ajouter'} le ${libelle.toLowerCase()} — ${glose}`}
                      style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: `1px solid ${url ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: url ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)', color: url ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', cursor: statut === 'loading' ? 'default' : 'pointer', whiteSpace: 'nowrap', minWidth: '5.25rem', textAlign: 'center' }}>
                      {url ? `✓ ${libelle}` : `+ ${libelle}`}
                    </button>
                    <input ref={el => { photoRefs.current[cle] = el }} type="file" accept=".jpg,.jpeg,.png,.webp,.avif" style={{ display: 'none' }}
                      onChange={async e => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        const blob = f.slice(0, f.size, 'image/jpeg')
                        const fichierRenomme = new File([blob], `${t.trad_id}.jpg`, { type: 'image/jpeg' })
                        await uploadPhoto(t.trad_id, fichierRenomme, variante)
                        e.target.value = ''
                      }} />
                  </React.Fragment>
                )
              })}
              {/* Toujours présent — grisé et désactivé quand il n'y a aucune image, pour
                  que les lignes restent strictement alignées. */}
              <button
                onClick={() => (t.photo || t.photo_encart) && setPositionModal(t.trad_id)}
                disabled={!t.photo && !t.photo_encart}
                title={t.photo || t.photo_encart ? 'Cadrer et zoomer les images' : 'Aucune image à cadrer'}
                style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: t.photo || t.photo_encart ? 'var(--cs-texte-second)' : 'var(--cs-bord)', cursor: t.photo || t.photo_encart ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                ⊹ Cadrer
              </button>
              {exportStatut[t.trad_id] === 'loading' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Export…</span>
              )}
              {exportStatut[t.trad_id] === 'ok' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--cs-vert)', fontWeight: 600 }}>✓ Téléchargé</span>
              )}
              {exportStatut[t.trad_id] === 'err' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', fontWeight: 600 }}>✗ Erreur</span>
              )}
              <button
                onClick={() => exporterCSV(t.trad_id, t.nom)}
                disabled={exportStatut[t.trad_id] === 'loading'}
                title="Exporter cette traduction en CSV"
                style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: exportStatut[t.trad_id] === 'loading' ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
                ↓ CSV
              </button>
              <button
                onClick={() => ouvrirRemplacement(t.trad_id)}
                title="Remplacer les versets de cette traduction via un CSV"
                style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-or)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ↑ Remplacer
              </button>
              <button onClick={() => setPanneauInfos(panneauInfos === t.trad_id ? null : t.trad_id)}
                title="Voir l'édition source précise et les apparats critiques"
                style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: `1px solid ${panneauInfos === t.trad_id ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: panneauInfos === t.trad_id ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '8.5rem', textAlign: 'center' }}>
                Édition &amp; apparat{apparats[t.trad_id]?.length ? ` (${apparats[t.trad_id].length})` : ''}
              </button>
              <button onClick={() => edition === t.trad_id ?fermer() : ouvrir(t)}
                style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', minWidth: '4.5rem', textAlign: 'center' }}>
                {edition === t.trad_id ?'Fermer' : 'Modifier'}
              </button>
              <button onClick={() => supprimer(t.trad_id)}
                style={{ fontSize: '0.71875rem', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer' }}>
                Supprimer
              </button>
            </div>
          </div>

          {/* Panneau « Édition & apparat » : cette édition précise + apparats critiques */}
          {panneauInfos === t.trad_id && (
            <PanneauEditionApparat edition={editionsSrc[t.trad_id]} pieces={apparats[t.trad_id] ?? []} nomBref={t.nom} />
          )}

          {/* Formulaire édition */}
          {edition === t.trad_id && (
            <div style={{ padding: '16px 18px 18px', borderTop: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)' }}>
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
                  <span style={{ fontSize: '0.8125rem', color: statut?.ok ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>{statut?.ok ? '✓' : '✗'} {statut?.msg}</span>
                )}
                <button onClick={fermer} style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                <button onClick={sauvegarder} style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
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
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-fond)', borderRadius: '8px', padding: '22px 24px', maxWidth: '27.5rem', width: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>
                  Remplacer · <em style={{ color: 'var(--cs-texte-second)' }}>{t.nom}</em>
                  <code style={{ fontSize: '0.71875rem', background: 'var(--cs-fond-doux)', padding: '1px 5px', borderRadius: '4px', marginLeft: '8px', color: 'var(--cs-texte-second)' }}>{t.trad_id}</code>
                </h3>
                <button onClick={() => setReplaceModal(null)} disabled={replaceStatut === 'loading'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.0625rem', color: 'var(--cs-texte-faible)', padding: 0, lineHeight: 1 }}>✕</button>
              </div>
              <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', marginBottom: '14px', lineHeight: 1.6 }}>
                Le CSV doit contenir deux colonnes : <code style={{ background: 'var(--cs-fond-doux)', padding: '1px 4px', borderRadius: '4px' }}>id_verset</code> et le texte. Tous les versets identifiés par leur <code style={{ background: 'var(--cs-fond-doux)', padding: '1px 4px', borderRadius: '4px' }}>id_verset</code> seront écrasés.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <button
                  onClick={() => replaceFileRef.current?.click()}
                  disabled={replaceStatut === 'loading'}
                  style={{ fontSize: '0.875rem', padding: '6px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', fontWeight: 500, flexShrink: 0 }}>
                  ↑ Choisir un CSV
                </button>
                {replaceNom && (
                  <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{replaceNom}</span>
                )}
              </div>
              {replaceMsg && (
                <p style={{ fontSize: '0.8125rem', marginBottom: '14px', color: replaceStatut === 'err' ? 'var(--cs-danger)' : replaceStatut === 'ok' ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: replaceStatut === 'ok' || replaceStatut === 'err' ? 600 : 400 }}>
                  {replaceMsg}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--cs-bord-clair)', paddingTop: '14px' }}>
                <button onClick={() => setReplaceModal(null)} disabled={replaceStatut === 'loading'} style={{ fontSize: '0.875rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                <button
                  onClick={confirmerRemplacement}
                  disabled={replaceLignes.length === 0 || replaceStatut === 'loading' || replaceStatut === 'ok'}
                  style={{ fontSize: '0.875rem', padding: '7px 18px', borderRadius: '4px', border: 'none', background: replaceLignes.length === 0 || replaceStatut === 'loading' || replaceStatut === 'ok' ? '#a0b8aa' : 'var(--cs-or)', color: 'var(--cs-sur-aplat)', cursor: replaceLignes.length === 0 || replaceStatut === 'loading' || replaceStatut === 'ok' ? 'default' : 'pointer', fontWeight: 500 }}>
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
        if (!t) return null
        if (!t.photo && !t.photo_encart) return null
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
