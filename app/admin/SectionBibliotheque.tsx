'use client'

import React, { useState, useRef } from 'react'
import { supabase, parseCSV, SiecleDisplay, headersAdmin } from './adminShared'
import SectionRemplacerSegments from './SectionRemplacerSegments'
import SectionAjouterOeuvre from './SectionAjouterOeuvre'
import type { Auteur, Oeuvre, LignePreview } from './adminTypes'
import {
  CADRES_PORTRAIT, POS_CARTE_DEFAUT, POS_FICHE_DEFAUT,
  bornerPos, deplacerPos, parseAuteurPhotoPositions, stylePhotoAuteur,
  type AuteurPhotoPos, type AuteurPhotoPositions, type SurfacePortrait,
} from '@/app/lib/photoAuteur'
import CadreAuteur from '@/app/components/CadreAuteur'
import { revaliderBibliotheque } from '@/app/actions/revalider'
import { estOeuvrePubliee, MARQUEUR_OEUVRE_DEPUBLIEE } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { chargerAuteursDOeuvre, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'

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
      <div style={{ background: 'var(--cs-surface)', borderRadius: '10px', width: '100%', maxWidth: '53.75rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--cs-bord-clair)', flexShrink: 0 }}>
          <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.22187rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: '0 0 6px' }}>Validation de l'import</h2>
          <p style={{ fontSize: '0.8625rem', color: 'var(--cs-texte-doux)', margin: 0 }}>
            Fichier : <strong style={{ color: 'var(--cs-texte-fort)' }}>{nomFichier}</strong>{' — '}
            <span style={{ color: 'var(--cs-vert)', fontWeight: 500 }}>{modifiees.length} ligne{modifiees.length > 1 ? 's' : ''} modifiée{modifiees.length > 1 ? 's' : ''}</span>
            {inchangees > 0 && <span style={{ color: 'var(--cs-texte-doux)' }}> · {inchangees} inchangée{inchangees > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {modifiees.length === 0 ? (
            <p style={{ padding: '24px', fontSize: '0.93437rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucune modification détectée.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82656rem' }}>
              <thead><tr style={{ background: 'var(--cs-fond)', position: 'sticky', top: 0 }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)', width: '60px' }}>§</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)', width: '90px' }}>Fiabilité</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)' }}>Texte (début)</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--cs-texte-second)', fontWeight: 500, borderBottom: '1px solid var(--cs-bord-clair)' }}>Liens</th>
              </tr></thead>
              <tbody>
                {modifiees.map((l, i) => (
                  <tr key={l.id || String(i)} style={{ background: i % 2 === 0 ? '#fff' : 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--cs-vert)', fontWeight: 500 }}>{l.segment_numero}</td>
                    <td style={{ padding: '7px 12px' }}>
                      {l._fiabilite_orig !== l.fiabilite ? (
                        <span><span style={{ color: 'var(--cs-danger)', textDecoration: 'line-through', marginRight: '4px' }}>{l._fiabilite_orig || '—'}</span><span style={{ color: 'var(--cs-vert)' }}>{l.fiabilite || '—'}</span></span>
                      ) : <span style={{ color: 'var(--cs-texte-second)' }}>{l.fiabilite || '—'}</span>}
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--cs-texte-fort)' }}>{l.segment_texte.slice(0, 60)}…</td>
                    <td style={{ padding: '7px 12px', color: 'var(--cs-texte-second)', fontFamily: 'monospace', fontSize: '0.75469rem' }}>{[l.lien_1, l.lien_2, l.lien_3, l.lien_4].filter(Boolean).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--cs-bord-clair)', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexShrink: 0 }}>
          <button onClick={onAnnuler} disabled={importing} style={{ fontSize: '0.8625rem', padding: '7px 18px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onConfirmer} disabled={importing || modifiees.length === 0}
            style={{ fontSize: '0.8625rem', padding: '7px 18px', borderRadius: '5px', border: 'none', cursor: modifiees.length > 0 ? 'pointer' : 'default', background: modifiees.length > 0 ? 'var(--cs-vert)' : 'var(--cs-bord-clair)', color: modifiees.length > 0 ? '#fff' : 'var(--cs-texte-doux)', fontWeight: 500 }}>
            {importing ? 'Import en cours…' : `Confirmer l'import (${modifiees.length} ligne${modifiees.length > 1 ? 's' : ''})`}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyleAuteur: React.CSSProperties = { width: '100%', padding: '6px 9px', fontSize: '0.8625rem', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: '0.64687rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '2px' }
const sepOeuvre: React.CSSProperties = { borderTop: '1px solid var(--cs-fond-doux)', gridColumn: '1 / -1', margin: '2px 0' }
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

function redimensionnerImage(fichier: File, largeur: number, hauteur: number): Promise<File> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = largeur
      canvas.height = hauteur
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      const ratio = Math.max(largeur / nw, hauteur / nh)
      const sw = largeur / ratio
      const sh = hauteur / ratio
      const sx = (nw - sw) * 0.5
      const sy = (nh - sh) * 0.5
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, largeur, hauteur)
      URL.revokeObjectURL(img.src)
      canvas.toBlob(blob => {
        if (!blob) return
        const nom = fichier.name
        const dot = nom.lastIndexOf('.')
        const base = dot >= 0 ? nom.slice(0, dot) : nom
        resolve(new File([blob], base + '.jpg', { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.9)
    }
    img.src = URL.createObjectURL(fichier)
  })
}

const BTN_ROND: React.CSSProperties = {
  width: 27, height: 27, borderRadius: '50%', border: '1px solid var(--cs-bord)',
  background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer', lineHeight: 1,
}

function ModalPositionAuteur({ auteur, photoUrl, posInit, onClose, onSauvegarde }: {
  auteur: Auteur
  photoUrl: string
  posInit: AuteurPhotoPositions
  onClose: () => void
  onSauvegarde: (pos: AuteurPhotoPositions) => Promise<void>
}) {
  // DEUX réglages, et non un seul recopié : les cadres n'ont pas les mêmes
  // proportions, si bien qu'un cadrage juste sur la carte ne l'est pas sur la
  // fiche. L'écran précédent écrivait le même réglage des deux côtés, ce qui
  // rendait le second inutile.
  const [positions, setPositions] = useState<AuteurPhotoPositions>(posInit)
  const [reglageActif, setReglageActif] = useState<keyof AuteurPhotoPositions>('carte')
  const [saving, setSaving] = useState(false)
  const cadreRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number; base: AuteurPhotoPos } | null>(null)
  const [glisse, setGlisse] = useState(false)

  const pos = positions[reglageActif]
  const majPos = (suite: (p: AuteurPhotoPos) => AuteurPhotoPos) =>
    setPositions(prev => ({ ...prev, [reglageActif]: suite(prev[reglageActif]) }))

  // Le glissé est capté sur le POINTEUR, non sur la souris : le stylet et le doigt
  // fonctionnent, et la capture garde le geste même si le curseur sort du cadre.
  const debutGlisse = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, base: pos }
    setGlisse(true)
  }
  const pendantGlisse = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    const el = cadreRef.current
    if (!d || !el) return
    const r = el.getBoundingClientRect()
    majPos(() => deplacerPos(d.base, e.clientX - d.x, e.clientY - d.y, r.width, r.height))
  }
  const finGlisse = () => { dragRef.current = null; setGlisse(false) }

  // La molette agrandit autour du point visé, comme partout ailleurs.
  const molette = (e: React.WheelEvent) => {
    e.preventDefault()
    majPos(p => bornerPos({ ...p, scale: p.scale - e.deltaY * 0.0015 }))
  }

  const zoomer = (delta: number) =>
    majPos(p => bornerPos({ ...p, scale: Math.round((p.scale + delta) * 100) / 100 }))

  const reinitialiser = () =>
    majPos(() => ({ ...(reglageActif === 'carte' ? POS_CARTE_DEFAUT : POS_FICHE_DEFAUT) }))

  const sauvegarder = async () => {
    setSaving(true)
    try {
      await onSauvegarde(positions)
      onClose()
    } catch (_err) {
    } finally {
      setSaving(false)
    }
  }

  // Le cadre que l'on manipule, en grand : c'est là que le geste se fait.
  const cadreManipule: SurfacePortrait = reglageActif === 'carte' ? 'carte' : 'fiche'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '28px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '41rem', background: 'var(--cs-fond)', borderRadius: '10px', padding: '18px', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.07813rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>
            Cadrer le portrait – <em style={{ color: 'var(--cs-texte-second)' }}>{auteur.nom}</em>
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-faible)', fontSize: '1.07813rem', padding: 0 }}>×</button>
        </div>

        <p style={{ fontSize: '0.75469rem', color: 'var(--cs-texte-doux)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Le portrait paraît sur trois surfaces, dont les cadres n’ont pas les mêmes proportions : la carte et la fiche gardent donc chacune son réglage. Glissez l’image, ou tournez la molette pour agrandir. Les trois aperçus ci-dessous sont composés avec les mesures RÉELLES des pages.
        </p>

        {/* Quel réglage l'on modifie. L'aperçu au survol emprunte celui de la fiche. */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {(['carte', 'fiche'] as const).map(cle => {
            const actif = cle === reglageActif
            return (
              <button key={cle} onClick={() => setReglageActif(cle)}
                style={{ fontSize: '0.71875rem', padding: '5px 14px', borderRadius: '999px', cursor: 'pointer',
                  border: '1px solid ' + (actif ? 'var(--cs-vert)' : 'var(--cs-bord)'),
                  background: actif ? 'rgba(var(--cs-vert-rgb),0.09)' : 'var(--cs-surface)',
                  color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', fontWeight: actif ? 600 : 400 }}>
                {CADRES_PORTRAIT[cle].libelle}
              </button>
            )
          })}
        </div>

        {/* Le cadre manipulé, à sa taille réelle : ce que l'on voit ici est, au
            pixel près, ce que le lecteur verra. */}
        <div onPointerMove={pendantGlisse} onPointerUp={finGlisse} onPointerCancel={finGlisse} onWheel={molette}
          style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', padding: '14px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', userSelect: 'none' }}>
          <div ref={cadreRef}>
            <CadreAuteur surface={cadreManipule} url={photoUrl} pos={pos} alt={auteur.nom}
              onPointerDown={debutGlisse} curseur={glisse ? 'grabbing' : 'grab'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.64687rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cs-texte-faible)', margin: '0 0 8px' }}>
              {CADRES_PORTRAIT[cadreManipule].libelle} — {CADRES_PORTRAIT[cadreManipule].largeur} × {CADRES_PORTRAIT[cadreManipule].hauteur}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-doux)', flex: 1 }}>Zoom</span>
              <button onClick={() => zoomer(-0.1)} style={BTN_ROND}>−</button>
              <span style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-second)', minWidth: '48px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{Math.round(pos.scale * 100)} %</span>
              <button onClick={() => zoomer(0.1)} style={BTN_ROND}>+</button>
            </div>
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', margin: '0 0 10px', fontVariantNumeric: 'tabular-nums' }}>
              Point visé : {Math.round(pos.x)} % · {Math.round(pos.y)} %
            </p>
            <button onClick={reinitialiser} style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-doux)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '5px', padding: '5px 12px', cursor: 'pointer' }}>
              Rétablir le cadrage par défaut
            </button>
          </div>
        </div>

        {/* Les trois surfaces, ensemble : on voit d'un coup ce que le réglage donne
            partout, y compris là où on ne le modifie pas. */}
        <p style={{ fontSize: '0.64687rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--cs-texte-faible)', margin: '16px 0 8px' }}>Les trois surfaces, en direct</p>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap', padding: '14px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px' }}>
          {(Object.keys(CADRES_PORTRAIT) as SurfacePortrait[]).map(surface => (
            <div key={surface} style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
              <CadreAuteur surface={surface} url={photoUrl} pos={positions[CADRES_PORTRAIT[surface].reglage]} alt={auteur.nom} />
              <span style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', maxWidth: '9rem', lineHeight: 1.3 }}>
                {CADRES_PORTRAIT[surface].libelle}
                {CADRES_PORTRAIT[surface].reglage !== surface && ' (réglage de la fiche)'}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--cs-bord-clair)' }}>
          <button onClick={onClose} style={{ fontSize: '0.8625rem', padding: '7px 16px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
          <button onClick={sauvegarder} disabled={saving} style={{ fontSize: '0.8625rem', padding: '7px 18px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

type NoticeCatalogueAdmin = {
  id: number
  id_ligne: string
  id_auteur: string | null
  auteur: string
  dates_auteur: string | null
  id_oeuvre_stable: string
  titre_stable: string
  titre_original: string | null
  titre_edition: string | null
  traducteur: string | null
  annee_edition: number | null
  siecle_edition: string | null
  editeur: string | null
  collection_nom: string | null
  domaine_public: string | null
  url_source: string | null
  url_texte_integral: string | null
  decision_import: string | null
  niveau_verification: string | null
  score_fiabilite: number | null
  presence_sur_le_site: boolean
  verifie: boolean
  verifie_admin: boolean
  refuse_admin: boolean
  genre: string | null
  langue_originale: string | null
  date_oeuvre: string | null
  authenticite: string | null
  created_at: string
}

function couleurScoreCatalogue(score: number | null | undefined) {
  if (score == null) return '#b14b38'
  if (score >= 90) return 'var(--cs-vert)'
  if (score >= 70) return '#8a5a00'
  return 'var(--cs-danger)'
}

function valeurAVerifier(valeur: unknown) {
  if (valeur == null || valeur === '') return true
  if (typeof valeur !== 'string') return false
  const v = valeur.trim().toLowerCase()
  return !v || v.includes('à vérifier') || v.includes('a verifier') || v.includes('verif') || v.includes('vérif')
}

function majPremierMotCatalogue(valeur: unknown) {
  const texte = String(valeur ?? '').trim()
  return texte ? texte.charAt(0).toUpperCase() + texte.slice(1) : ''
}

function dateCatalogue(n?: NoticeCatalogueAdmin) {
  if (!n) return null
  if (n.annee_edition) return formaterDateHistorique(n.annee_edition)
  return formaterDateHistorique(n.siecle_edition)
}

function labelDecisionCatalogue(decision?: string | null) {
  if (!decision) return 'A verifier'
  if (decision.startsWith('Candidat')) return 'Candidat'
  if (decision.startsWith('Bibliographie')) return 'Biblio seulement'
  if (decision.startsWith('Repérage') || decision.startsWith('Reperage')) return 'A verifier'
  if (decision.startsWith('Écarter') || decision.startsWith('Ecarter')) return 'A ecarter'
  return decision
}

type EditChamp = {
  champ: string
  brut: string | number | null
  onEnregistrer: (champ: string, valeur: string) => Promise<string | null>
}

function ChampCatalogue({ label, valeur, accent = false, transform, lien = false, edit }: {
  label: string
  valeur: unknown
  accent?: boolean
  transform?: (valeur: unknown) => string
  lien?: boolean
  edit?: EditChamp
}) {
  const manque = valeurAVerifier(valeur)
  const texte = manque ? 'À compléter' : (transform ? transform(valeur) : String(valeur))
  const estUrl = lien && !manque && /^https?:\/\//i.test(texte)

  const [enEdition, setEnEdition] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [saving, setSaving] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const ouvrir = () => { if (!edit) return; setSaisie(edit.brut == null ? '' : String(edit.brut)); setErreur(null); setEnEdition(true) }
  const valider = async () => {
    if (!edit || saving) return
    setSaving(true)
    const err = await edit.onEnregistrer(edit.champ, saisie)
    setSaving(false)
    if (err) { setErreur(err); return }
    setEnEdition(false)
  }

  return (
    // Une LIGNE claire : libellé fixe à gauche, valeur à droite (éditable au clic).
    <div style={{ display: 'flex', gap: '14px', padding: '4px 0', alignItems: enEdition ? 'flex-start' : 'baseline', borderTop: '1px solid #f4efe6' }}>
      <span style={{ flexShrink: 0, width: '8rem', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: manque ? '#c6a08c' : '#b3a893', lineHeight: 1.5 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {enEdition ? (
          <>
            <input autoFocus value={saisie} disabled={saving}
              onChange={e => setSaisie(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') valider(); if (e.key === 'Escape') { setEnEdition(false); setErreur(null) } }}
              onBlur={valider}
              style={{ fontSize: '0.8rem', padding: '2px 7px', border: '1px solid #b8ccc0', borderRadius: '4px', background: 'var(--cs-surface)', color: '#2a322a', outline: 'none', width: '100%', boxSizing: 'border-box' }} />
            {erreur && <span style={{ fontSize: '0.64687rem', color: '#b3261e', lineHeight: 1.25, marginTop: '1px', display: 'block' }}>{erreur}</span>}
          </>
        ) : estUrl ? (
          <a href={texte} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', fontWeight: accent ? 700 : 400, color: 'var(--cs-vert)', textDecoration: 'underline', textUnderlineOffset: '2px', lineHeight: 1.4, wordBreak: 'break-all' }}>{texte}</a>
        ) : (
          <span onClick={ouvrir} title={edit ? 'Cliquer pour modifier' : undefined}
            style={{ fontSize: '0.8rem', fontWeight: accent ? 700 : 400, fontStyle: manque ? 'italic' : 'normal', color: manque ? '#c0836a' : 'var(--cs-texte-fort)', lineHeight: 1.4, wordBreak: 'break-word', cursor: edit ? 'pointer' : 'default', borderBottom: edit && !manque ? '1px dotted #e2dccd' : 'none' }}>
            {texte}
          </span>
        )}
      </div>
    </div>
  )
}

// Bouton de redirection vers une URL (notice ou fichier en ligne). Grisé si absent.
function BoutonLienNotice({ href, label }: { href: string | null; label: string }) {
  const ok = !!href && /^https?:\/\//i.test(href)
  const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', fontWeight: 500, textDecoration: 'none', padding: '4px 13px', borderRadius: '999px', lineHeight: 1.3 }
  if (!ok) return <span style={{ ...base, color: 'var(--cs-bord)', border: '1px solid var(--cs-fond-doux)', background: '#faf7f1', cursor: 'default' }} title="Aucune URL renseignée">{label}<span aria-hidden="true"> —</span></span>
  return <a href={href!} target="_blank" rel="noopener noreferrer" style={{ ...base, color: 'var(--cs-vert)', border: '1px solid #cfdccb', background: 'var(--cs-surface)' }}>{label}<span aria-hidden="true" style={{ opacity: 0.7 }}>↗</span></a>
}

// Petite flèche oblique nette (nord-est) pour les liens sortants.
function FlecheRaide({ muted = false }: { muted?: boolean }) {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: muted ? 0.5 : 0.85 }}>
      <path d="M4 8L8 4M8 4H4.6M8 4V7.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Deux liens compacts pour une notice de catalogue : « URL » (fichier / texte en ligne)
// et « Notice » (fiche source), chacun avec une flèche. Grisés si l'adresse manque.
function LiensUrlNotice({ urlTexte, urlNotice }: { urlTexte: string | null; urlNotice: string | null }) {
  const lien = (href: string | null, label: string, titre: string) => {
    const ok = !!href && /^https?:\/\//i.test(href)
    const base: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.71875rem', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }
    if (!ok) return <span style={{ ...base, color: '#c2bcb2', cursor: 'default' }} title="Aucune URL renseignée">{label}<FlecheRaide muted /></span>
    return <a href={href!} target="_blank" rel="noopener noreferrer" title={titre} style={{ ...base, color: 'var(--cs-vert)' }}>{label}<FlecheRaide /></a>
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '11px' }}>
      {lien(urlTexte, 'URL', 'Ouvrir le fichier ou le texte en ligne')}
      {lien(urlNotice, 'Notice', 'Ouvrir la notice source')}
    </span>
  )
}

// Rubrique : un titre discret en vert, puis ses champs empilés en lignes claires.
function LigneCatalogue({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '0 16px' }}>
      <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '13px 0 0' }}>{titre}</p>
      {children}
    </div>
  )
}

function regrouperNoticesCatalogue(notices: NoticeCatalogueAdmin[], titreFallback: string) {
  const groupes = new Map<string, { cle: string; titre: string; notices: NoticeCatalogueAdmin[] }>()
  notices.forEach(n => {
    const titre = n.titre_stable || titreFallback
    const cle = n.id_oeuvre_stable || titre
    const groupe = groupes.get(cle) ?? { cle, titre, notices: [] }
    groupe.notices.push(n)
    groupes.set(cle, groupe)
  })
  return [...groupes.values()].map(groupe => ({
    ...groupe,
    notices: groupe.notices.sort((a, b) =>
      String(dateCatalogue(a) ?? '').localeCompare(String(dateCatalogue(b) ?? ''), 'fr') ||
      String(a.titre_edition ?? a.titre_original ?? a.titre_stable ?? '').localeCompare(String(b.titre_edition ?? b.titre_original ?? b.titre_stable ?? ''), 'fr')
    ),
  })).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'))
}

function BlocCatalogueOeuvre({ oeuvre, notices, datesAuteur, onValiderAdmin, onRefuser, onEditerNotice }: {
  oeuvre: Oeuvre; notices: NoticeCatalogueAdmin[]
  datesAuteur: string | null
  onValiderAdmin: (id: number) => void
  onRefuser: (id: number) => void
  onEditerNotice: (id: number, champ: string, valeur: string) => Promise<string | null>
}) {
  if (notices.length === 0) {
    return (
      <div style={{ margin: '0 18px 8px 34px', padding: '10px 14px', borderRadius: '7px', border: '1px solid #f0c4b8', background: '#fff5f3', color: 'var(--cs-danger)', fontSize: '0.82656rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '1.07813rem', lineHeight: 1 }}>⚠</span>
        Aucune fiche catalogue reliée à cette œuvre.
      </div>
    )
  }
  const groupes = regrouperNoticesCatalogue(notices, oeuvre.titre)
  return (
    <div style={{ margin: '0 18px 8px 34px', background: '#fdfcf9', border: '1px solid #e6ddcc', borderRadius: '8px', overflow: 'hidden' }}>
      {groupes.map((groupe, gi) => (
        <div key={groupe.cle} style={{ borderTop: gi > 0 ? '2px solid #e2d9c8' : 'none' }}>
          <div style={{ padding: '9px 14px', background: '#f7f3ec', borderBottom: '1px solid #ebe3d6' }}>
            <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.99187rem', fontWeight: 700, color: '#1a2820', lineHeight: 1.3 }}>
              {groupe.titre}
            </span>
            <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', marginLeft: '8px' }}>
              {groupe.notices.length} titre{groupe.notices.length > 1 ? 's' : ''} répertorié{groupe.notices.length > 1 ? 's' : ''}
            </span>
          </div>

          {groupe.notices.map((n, ni) => {
            // Fabrique d'un champ éditable : clic → saisie → enregistrement de CETTE notice.
            const ed = (champ: string, brut: string | number | null): EditChamp =>
              ({ champ, brut, onEnregistrer: (c, v) => onEditerNotice(n.id, c, v) })
            return (
            <div key={n.id} style={{ borderTop: ni > 0 ? '1px solid #e8e1d4' : 'none' }}>

          {/* En-tête de la notice */}
          <div style={{ padding: '10px 14px 9px', background: '#faf7f0', borderBottom: '1px solid #ede7dc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.90562rem', fontWeight: 500, color: '#4a4038', marginBottom: '8px', lineHeight: 1.3, fontStyle: n.titre_edition || n.titre_original ? 'italic' : 'normal' }}>
                {n.titre_edition || n.titre_original || n.titre_stable || oeuvre.titre}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {([
                  ['Ligne', n.id_ligne],
                  ['Œuvre', n.id_oeuvre_stable || oeuvre.id_oeuvre],
                  ['Auteur', n.id_auteur],
                ] as [string, string | null | undefined][]).map(([label, val]) => (
                  <span key={label} style={{
                    fontSize: '0.68281rem', fontFamily: 'monospace',
                    background: val ? '#ede9e0' : '#fff5f3',
                    color: val ? '#5a5650' : 'var(--cs-danger)',
                    padding: '2px 7px', borderRadius: '3px',
                    border: `1px solid ${val ? 'var(--cs-bord)' : '#e5a99b'}`,
                    display: 'inline-flex', gap: '4px',
                  }}>
                    <span style={{ color: 'var(--cs-texte-doux)' }}>{label}</span>
                    {val ?? <span style={{ fontStyle: 'italic' }}>—</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Badges score + statut, puis les deux actions d'administration. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '1.07813rem', fontWeight: 700, lineHeight: 1,
                  color: couleurScoreCatalogue(n.score_fiabilite),
                  background: 'var(--cs-surface)',
                  border: `1.5px solid ${couleurScoreCatalogue(n.score_fiabilite)}`,
                  padding: '3px 9px', borderRadius: '5px',
                  minWidth: '40px', textAlign: 'center',
                }}>
                  {n.score_fiabilite ?? '?'}
                </span>
                <span style={{
                  fontSize: '0.68281rem', fontWeight: 600, padding: '3px 8px', borderRadius: '3px',
                  border: `1px solid ${n.verifie ? '#c1dbcb' : '#ecd6cc'}`,
                  background: n.verifie ? '#f1f7f3' : '#fbf3ef',
                  color: n.verifie ? '#3a6b50' : '#b06a54',
                  whiteSpace: 'nowrap',
                }}>
                  {n.verifie ? '✓ Validée' : '· À vérifier'}
                </span>
              </div>
              {/* Validation admin : contrôle humain (verifie_admin). Refus admin : la fiche
                  est consignée puis retirée de la liste ; elle reste en base pour que l'IA
                  ne la propose plus. */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button onClick={() => onValiderAdmin(n.id)} disabled={n.verifie_admin}
                  title={n.verifie_admin ? 'Déjà validée par un administrateur' : 'Valider cette fiche (contrôle humain)'}
                  style={{
                    fontSize: '0.68281rem', fontWeight: 600, padding: '4px 10px', borderRadius: '4px',
                    border: `1px solid ${n.verifie_admin ? '#a9c9b6' : '#cbe0d4'}`,
                    background: n.verifie_admin ? 'var(--cs-vert)' : '#f4faf6',
                    color: n.verifie_admin ? '#fff' : '#2f6046',
                    cursor: n.verifie_admin ? 'default' : 'pointer', whiteSpace: 'nowrap',
                  }}>
                  {n.verifie_admin ? '✓ Validation admin' : 'Validation admin'}
                </button>
                <button onClick={() => onRefuser(n.id)}
                  title="Refuser et consigner cette fiche (elle disparaît de la liste)"
                  style={{
                    fontSize: '0.68281rem', fontWeight: 600, padding: '4px 10px', borderRadius: '4px',
                    border: '1px solid #e3c3b8', background: '#fdf4f0', color: '#a85a44',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>
                  Refus admin
                </button>
              </div>
            </div>
          </div>

          {/* Corps — lignes de catalogue */}
          <div>
            <LigneCatalogue titre="Auteur">
              <ChampCatalogue label="Auteur" valeur={n.auteur} edit={ed('auteur', n.auteur)} />
              <ChampCatalogue label="Authenticité" valeur={n.authenticite} transform={v => String(v).toLowerCase()} edit={ed('authenticite', n.authenticite)} />
              {/* Dates : on n'affiche PAS le champ redondant `dates_auteur` de la notice,
                  mais la donnée de la table auteurs — source unique, non éditable ici. */}
              <ChampCatalogue label="Dates" valeur={formaterDateHistorique(datesAuteur ?? n.dates_auteur)} />
            </LigneCatalogue>
            <LigneCatalogue titre="Titres">
              <ChampCatalogue label="Stable" valeur={n.titre_stable} edit={ed('titre_stable', n.titre_stable)} />
              <ChampCatalogue label="Original" valeur={n.titre_original ?? oeuvre.titre_original} edit={ed('titre_original', n.titre_original)} />
              <ChampCatalogue label="Édition" valeur={n.titre_edition} edit={ed('titre_edition', n.titre_edition)} />
            </LigneCatalogue>
            <LigneCatalogue titre="Édition">
              <ChampCatalogue label="Éditeur" valeur={n.editeur ?? oeuvre.editeur} edit={ed('editeur', n.editeur)} />
              <ChampCatalogue label="Ville" valeur={oeuvre.ville} />
              <ChampCatalogue label="Collection" valeur={n.collection_nom ?? oeuvre.collection} edit={ed('collection_nom', n.collection_nom)} />
              <ChampCatalogue label="Publication" valeur={dateCatalogue(n) || formaterDateHistorique(oeuvre.date_publication)} edit={ed('annee_edition', n.annee_edition)} />
            </LigneCatalogue>
            <LigneCatalogue titre="Classement">
              <ChampCatalogue label="Genre" valeur={n.genre ?? oeuvre.genres?.[0]} transform={majPremierMotCatalogue} edit={ed('genre', n.genre)} />
              <ChampCatalogue label="Langue" valeur={n.langue_originale} transform={majPremierMotCatalogue} edit={ed('langue_originale', n.langue_originale)} />
              <ChampCatalogue label="Composition" valeur={formaterDateHistorique(n.date_oeuvre ?? oeuvre.date_composition)} edit={ed('date_oeuvre', n.date_oeuvre)} />
            </LigneCatalogue>
            <LigneCatalogue titre="Import">
              <ChampCatalogue label="Décision" valeur={n.decision_import} accent transform={() => labelDecisionCatalogue(n.decision_import)} edit={ed('decision_import', n.decision_import)} />
              <ChampCatalogue label="Vérif." valeur={n.niveau_verification} edit={ed('niveau_verification', n.niveau_verification)} />
              <ChampCatalogue label="URL notice" valeur={n.url_source ?? oeuvre.url_source} edit={ed('url_source', n.url_source)} />
              <ChampCatalogue label="URL fichier" valeur={n.url_texte_integral} edit={ed('url_texte_integral', n.url_texte_integral)} />
              <ChampCatalogue label="Sur site" valeur={n.presence_sur_le_site} transform={v => v ? 'OUI' : 'NON'} />
              <ChampCatalogue label="Notice" valeur={n.verifie} transform={v => v ? 'VALIDÉE' : 'NON VALIDÉE'} />
            </LigneCatalogue>
            {/* Redirections directes vers la notice et vers le fichier plein texte en ligne. */}
            <LigneCatalogue titre="Liens">
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', padding: '3px 0 2px' }}>
                <BoutonLienNotice href={n.url_source ?? oeuvre.url_source ?? null} label="Notice" />
                <BoutonLienNotice href={n.url_texte_integral} label="Fichier" />
              </div>
            </LigneCatalogue>
          </div>

            </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Boutons Validation / Refus admin d'une fiche, réutilisés hors des œuvres du site.
function BoutonsAdminNotice({ n, onValiderAdmin, onRefuser }: {
  n: NoticeCatalogueAdmin; onValiderAdmin: (id: number) => void; onRefuser: (id: number) => void
}) {
  return (
    <>
      <button onClick={() => onValiderAdmin(n.id)} disabled={n.verifie_admin}
        title={n.verifie_admin ? 'Déjà validée par un administrateur' : 'Valider cette fiche (contrôle humain)'}
        style={{ fontSize: '0.68281rem', fontWeight: 600, padding: '3px 9px', borderRadius: '4px',
          border: `1px solid ${n.verifie_admin ? '#a9c9b6' : '#cbe0d4'}`,
          background: n.verifie_admin ? 'var(--cs-vert)' : '#f4faf6', color: n.verifie_admin ? '#fff' : '#2f6046',
          cursor: n.verifie_admin ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
        {n.verifie_admin ? '✓ Validation admin' : 'Validation admin'}
      </button>
      <button onClick={() => onRefuser(n.id)} title="Refuser et consigner cette fiche (elle disparaît de la liste)"
        style={{ fontSize: '0.68281rem', fontWeight: 600, padding: '3px 9px', borderRadius: '4px',
          border: '1px solid #e3c3b8', background: '#fdf4f0', color: '#a85a44', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Refus admin
      </button>
    </>
  )
}

// Un auteur qui n'existe QUE dans le catalogue (aucune fiche `auteurs`) : ses œuvres
// répertoriées, dépliables, avec les actions d'administration. C'est ce qui manquait pour
// que « Tout afficher » montre réellement tout le catalogue.
function BlocCatalogueAuteurSeul({ nom, notices, onValiderAdmin, onRefuser }: {
  nom: string
  notices: NoticeCatalogueAdmin[]
  onValiderAdmin: (id: number) => void
  onRefuser: (id: number) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div style={{ border: '1px solid #e7ddc6', borderRadius: '8px', background: '#fdfcf7', overflow: 'hidden' }}>
      <button onClick={() => setOuvert(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 14px', background: '#faf6ec', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '9px', minWidth: 0 }}>
          <span style={{ fontSize: '0.575rem', color: '#b0a480' }}>{ouvert ? '▲' : '▼'}</span>
          <span style={{ fontFamily: "var(--font-source-sans), Arial, sans-serif", fontSize: '0.8625rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#7a6a48' }}>{nom}</span>
          <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)' }}>{notices.length} œuvre{notices.length > 1 ? 's' : ''} au catalogue</span>
        </span>
        <span style={{ fontSize: '0.575rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c0a86a', flexShrink: 0 }}>Catalogue seul</span>
      </button>
      {ouvert && (
        <div>
          {/* Regroupement par TITRE STABLE : le titre de l'œuvre paraît une fois, en
              en-tête ; en dessous, une ligne par édition portant SON titre propre. */}
          {regrouperNoticesCatalogue(notices, '').map(groupe => (
            <div key={groupe.cle}>
              <div style={{ padding: '6px 14px 2px', borderTop: '1px solid #f0ebdd', background: '#faf6ec', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.86rem', fontWeight: 700, color: '#1a2820' }}>
                {groupe.titre}
              </div>
              {groupe.notices.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', padding: '8px 14px', borderTop: '1px solid #f4efe4' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.85rem', fontStyle: 'italic', color: 'var(--cs-texte)', lineHeight: 1.3 }}>
                      {n.titre_edition || n.titre_original || n.titre_stable || '(sans titre)'}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.75469rem', color: '#9a8f7e' }}>
                      {n.annee_edition && <span>{n.annee_edition}</span>}
                      {n.traducteur && <span style={{ fontStyle: 'italic' }}>trad. {n.traducteur}</span>}
                      {n.editeur && <span>{n.editeur}</span>}
                      {n.decision_import && (
                        <span title={n.decision_import} style={{ fontSize: '0.64687rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '1px 4px', borderRadius: '3px', width: '5.75rem', textAlign: 'center', boxSizing: 'border-box', display: 'inline-block', ...decorDecision(n.decision_import) }}>
                          {abregerDecision(n.decision_import)}
                        </span>
                      )}
                      <LiensUrlNotice urlTexte={n.url_texte_integral} urlNotice={n.url_source} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span title="Score" style={{ fontSize: '0.71875rem', fontWeight: 700, padding: '3px 7px', borderRadius: '4px', border: `1.5px solid ${couleurScoreCatalogue(n.score_fiabilite)}`, color: couleurScoreCatalogue(n.score_fiabilite), background: 'var(--cs-surface)', minWidth: '30px', textAlign: 'center' }}>
                      {n.score_fiabilite ?? '?'}
                    </span>
                    <BoutonsAdminNotice n={n} onValiderAdmin={onValiderAdmin} onRefuser={onRefuser} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const GENRES_PAR_CATEGORIE: { cat: string; genres: string[] }[] = [
  { cat: 'Écriture & exégèse', genres: ['Commentaire biblique', 'Homélie exégétique', 'Chaîne (catena)', 'Scolie'] },
  { cat: 'Théologie', genres: ['Traité théologique', 'Apologie', 'Réfutation / Controverse', 'Symbole de foi', 'Questions & réponses'] },
  { cat: 'Pastorale & discipline', genres: ['Homélie / Sermon', 'Catéchèse / Mystagogíe', 'Lettre pastorale', 'Règle monastique', 'Droit canonique'] },
  { cat: 'Spiritualité & ascèse', genres: ['Sentence / Apophtegme', 'Traité ascétique', 'Hagiographie (vie de saint)', 'Actes de martyre', 'Récit monastique'] },
  { cat: 'Liturgie & prière', genres: ['Anaphore / Liturgie', 'Hymne', 'Prière / Invocation'] },
  { cat: 'Littérature', genres: ['Confession / Autobiographie', 'Poème', 'Dialogue philosophique', 'Florilège', 'Encyclopédie'] },
]

function TagsGenres({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [nouveau, setNouveau] = React.useState(false)
  const [saisie, setSaisie] = React.useState('')
  const ajouter = (v: string) => { if (!tags.includes(v)) onChange([...tags, v]) }
  const supprimer = (v: string) => onChange(tags.filter(x => x !== v))
  const ajouterCustom = () => {
    const v = saisie.trim()
    if (v) { ajouter(v); setSaisie(''); setNouveau(false) }
  }
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '8px' }}>
        {GENRES_PAR_CATEGORIE.map(({ cat, genres }) => (
          <div key={cat} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.64687rem', color: 'var(--cs-texte-faible)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0, minWidth: '120px' }}>{cat}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {genres.map(g => {
                const actif = tags.includes(g)
                return (
                  <button key={g} onClick={() => actif ? supprimer(g) : ajouter(g)}
                    style={{ fontSize: '0.75469rem', borderRadius: '3px', padding: '2px 7px', cursor: 'pointer', border: actif ? '1px solid rgba(var(--cs-vert-rgb),0.35)' : '1px solid var(--cs-bord)', background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-fond)', color: actif ? 'var(--cs-vert-fonce)' : 'var(--cs-texte-second)', fontWeight: actif ? 600 : 400 }}>
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: tags.length > 0 ? '8px' : '0' }}>
        {nouveau ? (
          <>
            <input value={saisie} onChange={e => setSaisie(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ajouterCustom(); if (e.key === 'Escape') { setNouveau(false); setSaisie('') } }}
              autoFocus style={{ ...inputStyleAuteur, width: '10rem', fontSize: '0.79062rem', padding: '4px 8px' }} />
            <button onClick={ajouterCustom} style={{ fontSize: '0.75469rem', padding: '3px 10px', borderRadius: '3px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer' }}>Ajouter</button>
            <button onClick={() => { setNouveau(false); setSaisie('') }} style={{ fontSize: '0.75469rem', padding: '3px 8px', borderRadius: '3px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', cursor: 'pointer' }}>Annuler</button>
          </>
        ) : (
          <button onClick={() => setNouveau(true)} style={{ fontSize: '0.75469rem', color: 'var(--cs-texte-second)', border: '1px dashed var(--cs-bord)', background: 'transparent', borderRadius: '3px', padding: '2px 10px', cursor: 'pointer' }}>
            + Autre genre
          </button>
        )}
      </div>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingTop: '6px', borderTop: '1px solid var(--cs-fond-doux)' }}>
          {tags.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.79062rem', background: 'rgba(var(--cs-vert-rgb),0.10)', color: 'var(--cs-vert-fonce)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', borderRadius: '3px', padding: '1px 8px' }}>
              {t}<button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-doux)', fontSize: '0.71875rem', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type ValeursAuteur = {
  nom: string; nom_original: string; titre: string;
  date_naissance: string; date_mort: string;
  traditions: string[];
  langue_principale: string;
  note_biographique: string; note_theologique: string;
  chronologie: string; anecdotes: string; influence: string;
}

const VIDE_AUTEUR: ValeursAuteur = {
  nom: '', nom_original: '', titre: '',
  date_naissance: '', date_mort: '',
  traditions: [],
  langue_principale: '',
  note_biographique: '', note_theologique: '',
  chronologie: '', anecdotes: '', influence: '',
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
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.79062rem', background: 'rgba(var(--cs-vert-rgb),0.10)', color: 'var(--cs-vert-fonce)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', borderRadius: '3px', padding: '1px 7px' }}>
              {t}
              <button onClick={() => supprimer(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-doux)', fontSize: '0.71875rem', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {suggestions.map(t => (
            <button key={t} onClick={() => ajouter(t)}
              style={{ fontSize: '0.75469rem', background: 'var(--cs-fond)', color: 'var(--cs-texte-second)', border: '1px solid var(--cs-bord)', borderRadius: '3px', padding: '1px 7px', cursor: 'pointer' }}>
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
  const sep = { borderTop: '1px solid var(--cs-fond-doux)', margin: '10px 0 8px' }
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
      <hr style={sep} />
      <div>
        <label style={lbl}>Chronologie <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— une ligne par événement : « année | événement »</span></label>
        <textarea value={valeurs.chronologie} onChange={e => onChange('chronologie', e.target.value)} rows={4}
          placeholder={'354 | Naissance à Thagaste\n386 | Conversion à Milan\n430 | Mort à Hippone'}
          style={{ ...inputStyleAuteur, resize: 'vertical', fontFamily: 'var(--font-source-sans), Arial, sans-serif' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={lbl}>Postérité / Influence</label>
          <textarea value={valeurs.influence} onChange={e => onChange('influence', e.target.value)} rows={3} style={{ ...inputStyleAuteur, resize: 'vertical' }} />
        </div>
        <div>
          <label style={lbl}>Anecdotes</label>
          <textarea value={valeurs.anecdotes} onChange={e => onChange('anecdotes', e.target.value)} rows={3} style={{ ...inputStyleAuteur, resize: 'vertical' }} />
        </div>
      </div>
    </div>
  )
}

// `decision_import` est rédigée en clair, parfois sur deux lignes (« Candidat prioritaire
// à l'import après contrôle du fac-similé et de l'OCR »). Illisible dans une pastille : on
// n'en garde que la famille, le texte entier restant en infobulle.
function abregerDecision(d: string): string {
  const s = d.toLowerCase()
  if (s.startsWith('candidat')) return s.includes('prioritaire') ? 'Prioritaire' : 'Candidat'
  if (s.startsWith('bibliographie')) return 'Biblio seule'
  if (s.startsWith('écarter') || s.startsWith('ecarter')) return 'À écarter'
  if (s.startsWith('importé') || s.startsWith('importe')) return 'Importé'
  if (s.startsWith('repérage') || s.startsWith('reperage')) return 'Repérage'
  return 'Autre'
}

function decorDecision(d: string): React.CSSProperties {
  const s = d.toLowerCase()
  if (s.startsWith('candidat')) return { background: 'var(--cs-vert-pale)', color: '#2f6046', border: '1px solid #c8d8ce' }
  if (s.startsWith('bibliographie')) return { background: '#f4f2fa', color: '#5a4b9c', border: '1px solid #cfc8e6' }
  if (s.startsWith('écarter') || s.startsWith('ecarter')) return { background: '#fdf0ec', color: 'var(--cs-danger-fonce)', border: '1px solid #e6c4b4' }
  return { background: '#f4f2ee', color: 'var(--cs-texte-second)', border: '1px solid #ddd6cc' }
}

// ── Filtre d'affichage des auteurs (menu déroulant) ─────────────────────────
type FiltreAuteurs = 'tout' | 'publiees' | 'non-publiees' | 'candidates' | 'non-candidates' | 'critiques'
const FILTRES_AUTEURS: { code: FiltreAuteurs; label: string }[] = [
  { code: 'tout', label: 'Tout afficher' },
  { code: 'publiees', label: 'Œuvres publiées' },
  { code: 'non-publiees', label: 'Œuvres non publiées' },
  { code: 'candidates', label: 'Œuvres candidates' },
  { code: 'non-candidates', label: 'Œuvres non candidates' },
  { code: 'critiques', label: 'Œuvres critiques' },
]
// Une notice « candidate » : sa décision d'import commence par « candidat ».
function noticeCandidate(n: NoticeCatalogueAdmin): boolean {
  return (n.decision_import ?? '').toLowerCase().startsWith('candidat')
}
// Une notice « critique » appartient à la tranche rouge du score de fiabilité.
// Une URL absente signale une fiche incomplète, pas une œuvre au score critique.
function noticeCritique(n: NoticeCatalogueAdmin): boolean {
  return n.score_fiabilite != null && n.score_fiabilite < 70
}

function filtrerNoticesSelonVue(notices: NoticeCatalogueAdmin[], filtre: FiltreAuteurs): NoticeCatalogueAdmin[] {
  switch (filtre) {
    case 'candidates':     return notices.filter(noticeCandidate)
    case 'non-candidates': return notices.filter(n => !noticeCandidate(n))
    case 'critiques':      return notices.filter(noticeCritique)
    case 'publiees':
    case 'tout':
    case 'non-publiees':
    default:               return notices
  }
}

// ── Section Bibliothèque (fusionnée avec la gestion des auteurs) ─────────────
export default function SectionBibliotheque({ auteurs: auteursInit }: { auteurs: Auteur[] }) {
  const [auteurs, setAuteurs] = useState<Auteur[]>(auteursInit)
  const [vueBibliotheque, setVueBibliotheque] = useState<'oeuvres' | 'segments'>('oeuvres')
  // Filtre d'affichage des auteurs, en menu déroulant. « publiees » (défaut) n'a besoin
  // que des œuvres du site ; les autres modes exigent le catalogue complet (chargé à la
  // demande). « candidat » / « critique » s'évaluent sur les notices du catalogue.
  const [filtreAuteurs, setFiltreAuteurs] = useState<FiltreAuteurs>('publiees')
  const besoinCatalogue = filtreAuteurs !== 'publiees'
  const [menuFiltreOuvert, setMenuFiltreOuvert] = useState(false)
  const [catalogueParOeuvre, setCatalogueParOeuvre] = useState<Record<string, NoticeCatalogueAdmin[]>>({})
  const [catalogueDeploye, setCatalogueDeploye] = useState<Record<string, boolean>>({})
  // Le catalogue ENTIER, rangé par auteur : 2 502 notices pour 17 œuvres publiées. On ne
  // le charge qu'au premier « Tout afficher », et une seule fois.
  const [catalogueParAuteur, setCatalogueParAuteur] = useState<Record<string, NoticeCatalogueAdmin[]> | null>(null)
  // Auteurs présents UNIQUEMENT au catalogue (aucune fiche dans la table `auteurs`, ou
  // id_auteur absent) : regroupés par nom, ils n'avaient jusqu'ici aucun bloc où paraître.
  const [catalogueAutres, setCatalogueAutres] = useState<Record<string, NoticeCatalogueAdmin[]> | null>(null)
  const [chargementCatalogue, setChargementCatalogue] = useState(false)
  // Message de panne du chargement du catalogue, affiché en clair au lieu d'une liste vide.
  const [erreurCatalogue, setErreurCatalogue] = useState<string | null>(null)
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
  const [ajoutOeuvre, setAjoutOeuvre] = useState(false)
  const [nouvelAuteur, setNouvelAuteur] = useState<ValeursAuteur>(VIDE_AUTEUR)
  const [msgAjoutAuteur, setMsgAjoutAuteur] = useState<string | null>(null)
  const [editionAuteur, setEditionAuteur] = useState<string | null>(null)
  const [formAuteur, setFormAuteur] = useState<ValeursAuteur>(VIDE_AUTEUR)
  const [statutAuteur, setStatutAuteur] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [photos, setPhotos] = useState<Record<string, boolean>>({})
  const [photoVersions, setPhotoVersions] = useState<Record<string, number>>({})
  const [positionAuteur, setPositionAuteur] = useState<string | null>(null)
  const photoRefs = useRef<Record<string, HTMLInputElement | null>>({})

  React.useEffect(() => {
    supabase.storage.from('auteurs').list('', { limit: 1000 }).then(({ data }) => {
      if (!data) return
      const map: Record<string, boolean> = {}
      data.forEach(f => { map[f.name.replace(/\.jpe?g$/i, '')] = true })
      setPhotos(map)
    })
  }, [])

  React.useEffect(() => {
    const ids = Array.from(new Set(auteurs.flatMap(a => a.oeuvres.map(o => o.id_oeuvre)))).filter(Boolean)
    if (ids.length === 0) {
      setCatalogueParOeuvre({})
      return
    }
    let annule = false
    ;(async () => {
      try {
        const groupes: Record<string, NoticeCatalogueAdmin[]> = {}
        const headers = await headersAdmin()
        for (let i = 0; i < ids.length; i += 400) {
          const lot = ids.slice(i, i + 400)
          const params = new URLSearchParams({ oeuvres: lot.join(','), limit: '5000' })
          const res = await fetch(`/api/admin/catalogue?${params}`, { headers })
          if (!res.ok) continue
          const json = await res.json()
          ;(json.data ?? []).forEach((notice: NoticeCatalogueAdmin) => {
            if (!groupes[notice.id_oeuvre_stable]) groupes[notice.id_oeuvre_stable] = []
            groupes[notice.id_oeuvre_stable].push(notice)
          })
        }
        Object.values(groupes).forEach(liste => liste.sort((a, b) => {
          if (Number(b.verifie) !== Number(a.verifie)) return Number(b.verifie) - Number(a.verifie)
          return (b.score_fiabilite ?? -1) - (a.score_fiabilite ?? -1)
        }))
        if (!annule) setCatalogueParOeuvre(groupes)
      } catch {
        if (!annule) setCatalogueParOeuvre({})
      }
    })()
    return () => { annule = true }
  }, [auteurs])

  // « Tout afficher » ne dévoilait que les auteurs sans œuvre publiée. Il doit montrer
  // TOUT le catalogue : 2 502 notices contre 17 œuvres sur le site, soit l'essentiel du
  // travail à venir, jusqu'ici invisible depuis cet écran. Chargement à la demande, une
  // seule fois — l'API accepte jusqu'à 5 000 lignes par appel.
  React.useEffect(() => {
    // NB : `chargementCatalogue` ne doit PAS figurer ici (ni dans les dépendances).
    // Le mettre à `true` déclenchait une reprise de l'effet, dont le nettoyage posait
    // `annule = true` sur la requête en cours ; à l'arrivée des données, `if (!annule)`
    // était faux et l'on ne quittait jamais l'état de chargement → spinner infini.
    if (!besoinCatalogue || catalogueParAuteur !== null) return
    let annule = false
    setChargementCatalogue(true)
    ;(async () => {
      try {
        const headers = await headersAdmin()
        const idsConnus = new Set(auteurs.map(a => a.id_auteur))
        const groupes: Record<string, NoticeCatalogueAdmin[]> = {}   // auteurs de la table
        const autres: Record<string, NoticeCatalogueAdmin[]> = {}    // auteurs seulement au catalogue
        for (let page = 0; page < 40; page += 1) {
          const params = new URLSearchParams({ limit: '1000', page: String(page) })
          const res = await fetch(`/api/admin/catalogue?${params}`, { headers })
          // Un échec ne doit plus être avalé en silence : sans catalogue, les filtres
          // « candidates », « critiques » et « non publiées » se vident sans un mot,
          // et l'on croit à tort que la base ne contient rien.
          if (!res.ok) {
            const detail = await res.text().catch(() => '')
            throw new Error(`HTTP ${res.status} — ${detail.slice(0, 300) || res.statusText}`)
          }
          // Le verrou du site (proxy.ts) répond par une REDIRECTION vers /chantier quand la
          // session n'est pas reconnue. `fetch` la suit, si bien que la réponse est un 200
          // porteur de HTML : sans ce contrôle, seul un « Unexpected token < » sortait.
          if (res.redirected || !(res.headers.get('content-type') ?? '').includes('application/json')) {
            throw new Error(`réponse inattendue (${res.headers.get('content-type') || 'sans type'}) depuis ${res.url} — session expirée ou verrou du site ?`)
          }
          const json = await res.json()
          const lot: NoticeCatalogueAdmin[] = json.data ?? []
          lot.forEach(notice => {
            if (notice.id_auteur && idsConnus.has(notice.id_auteur)) {
              (groupes[notice.id_auteur] ??= []).push(notice)
            } else {
              // Aucun auteur en base : on range sous le nom porté par la notice.
              const cle = (notice.auteur || '').trim() || '(Auteur non identifié)'
              ;(autres[cle] ??= []).push(notice)
            }
          })
          if (lot.length < 1000) break
        }
        Object.values(groupes).forEach(liste =>
          liste.sort((a, b) => (a.titre_stable ?? '').localeCompare(b.titre_stable ?? '', 'fr')))
        Object.values(autres).forEach(liste =>
          liste.sort((a, b) => (a.titre_stable ?? '').localeCompare(b.titre_stable ?? '', 'fr')))
        if (!annule) { setCatalogueParAuteur(groupes); setCatalogueAutres(autres); setErreurCatalogue(null) }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[admin/bibliothèque] chargement du catalogue :', e)
        if (!annule) { setCatalogueParAuteur({}); setCatalogueAutres({}); setErreurCatalogue(msg) }
      } finally {
        if (!annule) setChargementCatalogue(false)
      }
    })()
    return () => { annule = true }
  }, [besoinCatalogue, catalogueParAuteur])

  const uploadPhoto = async (idAuteur: string, fichier: File) => {
    const fichierRedim = await redimensionnerImage(fichier, 300, 450)
    const formData = new FormData()
    formData.append('id_auteur', idAuteur)
    formData.append('fichier', fichierRedim)
    const res = await fetch('/api/admin/auteur-photo', { method: 'POST', headers: await headersAdmin(), body: formData })
    if (res.ok) {
      const json = await res.json().catch(() => ({}))
      setPhotos(prev => ({ ...prev, [idAuteur]: true }))
      setPhotoVersions(prev => ({ ...prev, [idAuteur]: Number(json.version ?? Date.now()) }))
    }
    else { const json = await res.json().catch(() => ({})); alert('Erreur upload : ' + (json.error ?? 'erreur inconnue')) }
  }

  const photoUrlAuteur = (idAuteur: string) =>
    `${SUPABASE_URL}/storage/v1/object/public/auteurs/${idAuteur}.jpg?v=${photoVersions[idAuteur] ?? Date.now()}`

  const sauvegarderPositionAuteur = async (idAuteur: string, pos: AuteurPhotoPositions) => {
    const res = await fetch('/api/admin/update-auteur', {
      method: 'POST',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id_auteur: idAuteur, champs: { photo_position: pos } }),
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const msg = json.error ?? 'erreur inconnue'
      alert('Erreur de cadrage : ' + msg)
      throw new Error(msg)
    }
    setAuteurs(prev => prev.map(a => a.id_auteur === idAuteur ? { ...a, photo_position: pos } : a))
    await revaliderBibliotheque()
  }

  const ouvrirEditionAuteur = (a: Auteur) => {
    setEditionAuteur(a.id_auteur)
    setFormAuteur({
      nom: a.nom,
      nom_original: a.nom_original ?? '',
      titre: a.titre ?? '',
      date_naissance: a.date_naissance ?? '',
      date_mort: a.date_mort ?? '',
      traditions: Array.isArray(a.traditions) ? a.traditions : [],
      langue_principale: a.langue_principale ?? '',
      note_biographique: a.note_biographique ?? '',
      note_theologique: a.note_theologique ?? '',
      chronologie: a.chronologie ?? '',
      anecdotes: a.anecdotes ?? '',
      influence: a.influence ?? '',
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

  const CHAMPS_OEUVRE_TEXTE: { key: string; label: string }[] = [
    { key: 'titre', label: 'Titre *' },
    // Composition du titre pour la page de titre seule (sauts de ligne compris).
    // Renseignée, c'est elle que le frontispice affiche à la place du titre.
    { key: 'titre_affichage', label: 'Titre composé (page de titre)' },
    { key: 'sous_titre', label: 'Sous-titre' },
    { key: 'titre_original', label: 'Titre original' },
    { key: 'trad_auteur', label: 'Traducteur' },
    { key: 'editeur', label: 'Éditeur' },
    { key: 'collection', label: 'Collection' },
    { key: 'ville', label: 'Ville' },
    { key: 'date_publication', label: 'Date de publication' },
    { key: 'date_composition', label: 'Date de composition originale' },
    { key: 'url_source', label: 'URL source' },
    { key: 'commentaire_traduction', label: 'Commentaires' },
  ]

  const ouvrirEditionOeuvre = (o: Oeuvre) => {
    setEditionOeuvre(o.id_oeuvre)
    setFormOeuvre({
      titre: o.titre ?? '', titre_affichage: o.titre_affichage ?? '',
      sous_titre: o.sous_titre ?? '', titre_original: o.titre_original ?? '',
      trad_auteur: o.trad_auteur ?? '', editeur: o.editeur ?? '', collection: o.collection ?? '',
      ville: o.ville ?? '', date_publication: o.date_publication ?? '',
      date_composition: o.date_composition ?? '', url_source: o.url_source ?? '',
      langue_originale: o.langue_originale ?? '',
      commentaire_traduction: o.commentaire_traduction ?? '',
    })
    setFormOeuvreGenres(Array.isArray(o.genres) ? o.genres : [])
    setStatutOeuvre(null)
    setCoAuteurAAjouter(''); setStatutAuteursOeuvre(null)
    setAuteursOeuvre([])
    chargerAuteursDOeuvre(supabase, o.id_oeuvre).then(setAuteursOeuvre)
  }
  const fermerEditionOeuvre = () => {
    setEditionOeuvre(null); setFormOeuvre({}); setFormOeuvreGenres([])
    setAuteursOeuvre([]); setCoAuteurAAjouter(''); setStatutAuteursOeuvre(null)
  }

  // Co-signature d'une œuvre : les auteurs sont à égalité, mais le PREMIER vit
  // dans `oeuvres.id_auteur` et se change par le champ « Auteur » de l'œuvre ;
  // seuls les suivants s'ajoutent et se retirent ici.
  const majAuteursOeuvre = async (idOeuvre: string, action: 'ajouter' | 'retirer', idAuteur: string) => {
    setStatutAuteursOeuvre(null)
    try {
      const res = await fetch('/api/admin/oeuvre-auteurs', {
        method: 'POST',
        headers: await headersAdmin({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action, id_oeuvre: idOeuvre, id_auteur: idAuteur }),
      })
      // Le verrou du site répond par une REDIRECTION vers /chantier, pas par un
      // 401 : un `res.ok` ne suffit donc pas à conclure que l'écriture a eu lieu.
      const estJson = res.headers.get('content-type')?.includes('application/json')
      if (res.redirected || !estJson) { setStatutAuteursOeuvre('Session expirée — se reconnecter.'); return }
      const corps = await res.json()
      if (!res.ok) { setStatutAuteursOeuvre(corps?.error ?? 'Échec de l’enregistrement.'); return }
      setAuteursOeuvre(await chargerAuteursDOeuvre(supabase, idOeuvre))
      setCoAuteurAAjouter('')
      setStatutAuteursOeuvre(action === 'ajouter' ? 'Auteur ajouté.' : 'Auteur retiré.')
    } catch {
      setStatutAuteursOeuvre('Erreur réseau.')
    }
  }

  const sauvegarderOeuvre = async (idOeuvre: string) => {
    if (!formOeuvre.titre?.trim()) { setStatutOeuvre({ id: idOeuvre, ok: false, msg: 'Le titre est requis.' }); return }
    try {
      const headers = await headersAdmin({ 'Content-Type': 'application/json' })
      const requetes = [
        ...CHAMPS_OEUVRE_TEXTE.map(c => fetch('/api/admin/update-oeuvre', {
          method: 'POST', headers,
          body: JSON.stringify({ id_oeuvre: idOeuvre, champ: c.key, valeur: formOeuvre[c.key] || null }),
        })),
        fetch('/api/admin/update-oeuvre', {
          method: 'POST', headers,
          body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'langue_originale', valeur: formOeuvre.langue_originale || null }),
        }),
        fetch('/api/admin/update-oeuvre', {
          method: 'POST', headers,
          body: JSON.stringify({ id_oeuvre: idOeuvre, champ: 'genres', valeur: formOeuvreGenres }),
        }),
      ]
      const resultats = await Promise.all(requetes)
      if (resultats.some(r => !r.ok)) { setStatutOeuvre({ id: idOeuvre, ok: false, msg: 'Erreur lors de l\u2019enregistrement.' }); return }
      setAuteurs(prev => prev.map(a => ({
        ...a,
        oeuvres: a.oeuvres.map(o => o.id_oeuvre === idOeuvre ? { ...o, ...formOeuvre, genres: formOeuvreGenres } : o),
      })))
      setStatutOeuvre({ id: idOeuvre, ok: true, msg: 'Enregistré.' })
      setTimeout(() => { setStatutOeuvre(null); fermerEditionOeuvre() }, 1200)
    } catch {
      setStatutOeuvre({ id: idOeuvre, ok: false, msg: 'Erreur réseau.' })
    }
  }

  const handleExport = async (idOeuvre: string, titre: string) => { setExporting(idOeuvre); await exporterOeuvre(idOeuvre, titre); setExporting(null) }

  // ── Validation / refus admin d'une fiche catalogue ──────────────────────────
  const patchNotice = async (id: number, corps: Record<string, boolean>) => {
    const res = await fetch('/api/admin/catalogue', {
      method: 'PATCH',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id, ...corps }),
    })
    return res.ok
  }
  const majNoticeLocale = (id: number, patch: Partial<NoticeCatalogueAdmin> | null) => {
    const appliquer = (liste: NoticeCatalogueAdmin[]) =>
      patch === null ? liste.filter(n => n.id !== id) : liste.map(n => n.id === id ? { ...n, ...patch } : n)
    setCatalogueParOeuvre(prev => Object.fromEntries(Object.entries(prev).map(([k, l]) => [k, appliquer(l)])))
    setCatalogueParAuteur(prev => prev ? Object.fromEntries(Object.entries(prev).map(([k, l]) => [k, appliquer(l)])) : prev)
    setCatalogueAutres(prev => prev ? Object.fromEntries(Object.entries(prev).map(([k, l]) => [k, appliquer(l)])) : prev)
  }
  const validerAdminNotice = async (id: number) => {
    if (!(await patchNotice(id, { verifie_admin: true }))) { alert('Échec de la validation admin.'); return }
    majNoticeLocale(id, { verifie_admin: true })
  }
  const refuserNotice = async (id: number) => {
    if (!window.confirm('Refuser et consigner cette fiche ? Elle disparaîtra de la liste (mais reste conservée en base).')) return
    if (!(await patchNotice(id, { refuse_admin: true }))) { alert('Échec du refus.'); return }
    majNoticeLocale(id, null)
  }
  // Édition en ligne d'un champ de notice. Renvoie null si tout va bien, sinon le message
  // d'erreur (par ex. le refus du déclencheur sur un titre stable déjà validé).
  const editerNotice = async (id: number, champ: string, valeur: string): Promise<string | null> => {
    const res = await fetch('/api/admin/catalogue', {
      method: 'PATCH',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id, champs: { [champ]: valeur } }),
    })
    if (!res.ok) { const j = await res.json().catch(() => ({})); return j.error || 'Échec de l’enregistrement.' }
    const brut = valeur.trim()
    const coerce = (): string | number | null => {
      if (champ === 'annee_edition' || champ === 'score_fiabilite') {
        if (brut === '') return null
        const nb = Number(brut.replace(/[^\d-]/g, '')); return Number.isFinite(nb) ? nb : null
      }
      return brut === '' ? null : brut
    }
    majNoticeLocale(id, { [champ]: coerce() } as Partial<NoticeCatalogueAdmin>)
    return null
  }

  // Publier / dépublier une œuvre : le drapeau est le marqueur dans `note`
  // (cf. oeuvresPublication.ts). Dépublier écrit le marqueur, publier efface la note.
  const [bascule, setBascule] = useState<string | null>(null)
  const basculerPublication = async (o: Oeuvre) => {
    const publiee = estOeuvrePubliee(o)
    if (publiee && !confirm(`Dépublier « ${o.titre} » ?\n\nElle restera au catalogue mais disparaîtra de la lecture (bibliothèque, recherche, navigation).`)) return
    const nouvelleNote = publiee ? MARQUEUR_OEUVRE_DEPUBLIEE : null
    setBascule(o.id_oeuvre)
    try {
      const res = await fetch('/api/admin/update-oeuvre', {
        method: 'POST',
        headers: await headersAdmin({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id_oeuvre: o.id_oeuvre, champ: 'note', valeur: nouvelleNote }),
      })
      if (!res.ok) { alert('Échec de la mise à jour.'); return }
      setAuteurs(prev => prev.map(a => ({
        ...a,
        oeuvres: a.oeuvres.map(x => x.id_oeuvre === o.id_oeuvre ? { ...x, note: nouvelleNote } : x),
      })))
      await revaliderBibliotheque()
    } catch {
      alert('Erreur réseau.')
    } finally {
      setBascule(null)
    }
  }

  const supprimerOeuvre = async (idOeuvre: string, titre: string) => {
    if (!confirm(`Supprimer définitivement l'œuvre « ${titre } » (${idOeuvre}) ?\n\nCette action supprimera aussi tous ses segments. Elle est irréversible.`)) return
    const res = await fetch('/api/admin/oeuvre-supprimer', {
      method: 'POST',
      headers: await headersAdmin({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id_oeuvre: idOeuvre }),
    })
    if (!res.ok) { const j = await res.json(); alert('Erreur : ' + (j.error ?? 'inconnue')); return }
    setAuteurs(prev => prev.map(a => ({ ...a, oeuvres: a.oeuvres.filter(o => o.id_oeuvre !== idOeuvre) })))
  }

  const [configOeuvre, setConfigOeuvre] = useState<string | null>(null)
  const [niveauxConfig, setNiveauxConfig] = useState<Record<string, { sommaire: number; corps: number; txtSommaire: boolean[]; txtCorps: boolean[]; afficherNumeros: boolean }>>({})
  const [editionOeuvre, setEditionOeuvre] = useState<string | null>(null)
  // Auteurs de l'œuvre en cours de modification (le premier et ses co-signataires).
  const [auteursOeuvre, setAuteursOeuvre] = useState<AuteurOeuvre[]>([])
  const [coAuteurAAjouter, setCoAuteurAAjouter] = useState('')
  const [statutAuteursOeuvre, setStatutAuteursOeuvre] = useState<string | null>(null)
  const [formOeuvre, setFormOeuvre] = useState<Record<string, string>>({})
  const [formOeuvreGenres, setFormOeuvreGenres] = useState<string[]>([])
  const [statutOeuvre, setStatutOeuvre] = useState<{ id: string; ok: boolean; msg: string } | null>(null)

  // Initialiser profondeurs depuis les données
  React.useEffect(() => {
    const init: Record<string, number> = {}
    const initNiv: Record<string, { sommaire: number; corps: number; txtSommaire: boolean[]; txtCorps: boolean[]; afficherNumeros: boolean }> = {}
    auteurs.forEach(a => a.oeuvres.forEach(o => {
      if (o.profondeur_sommaire) init[o.id_oeuvre] = o.profondeur_sommaire
      const parseBool = (s: string | null | undefined) => (s ?? '0,0,0,0,0').split(',').map(v => v === '1')
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
    auteurs.forEach(a => a.traditions?.forEach(t => set.add(t)))
    return [...set].sort()
  }, [auteurs])

  const rechercheNormalisee = recherche.trim().toLowerCase()
  // Notices « restantes » (au catalogue, pas sur le site) d'un auteur.
  const restantesDe = (a: Auteur): NoticeCatalogueAdmin[] => {
    const surSite = new Set(a.oeuvres.map(o => o.id_oeuvre))
    return (catalogueParAuteur?.[a.id_auteur] ?? []).filter(n => !n.id_oeuvre_stable || !surSite.has(n.id_oeuvre_stable))
  }
  const restantesAfficheesDe = (a: Auteur): NoticeCatalogueAdmin[] =>
    filtrerNoticesSelonVue(restantesDe(a), filtreAuteurs)
  const oeuvresAfficheesDe = (a: Auteur): Oeuvre[] => {
    if (filtreAuteurs === 'non-publiees') return []
    if (filtreAuteurs === 'tout' || filtreAuteurs === 'publiees') return a.oeuvres
    return a.oeuvres.filter(o =>
      filtrerNoticesSelonVue(catalogueParOeuvre[o.id_oeuvre] ?? [], filtreAuteurs).length > 0)
  }
  const auteursAvecPresence = (() => {
    switch (filtreAuteurs) {
      case 'tout':           return auteurs
      case 'non-publiees':   return auteurs.filter(a => restantesAfficheesDe(a).length > 0)
      case 'candidates':
      case 'non-candidates':
      case 'critiques':      return auteurs.filter(a => oeuvresAfficheesDe(a).length > 0 || restantesAfficheesDe(a).length > 0)
      case 'publiees':
      default:               return auteurs.filter(a => a.oeuvres.length > 0)
    }
  })()
  const auteursFiltres = rechercheNormalisee
    ? auteursAvecPresence.filter(a =>
        a.nom.toLowerCase().includes(rechercheNormalisee) ||
        a.oeuvres.some(o =>
          o.titre.toLowerCase().includes(rechercheNormalisee) ||
          (o.sous_titre ?? '').toLowerCase().includes(rechercheNormalisee) ||
          (o.titre_original ?? '').toLowerCase().includes(rechercheNormalisee)
        )
      )
    : auteursAvecPresence

  return (
    <>
      {preview && <ModaleImport lignes={preview.lignes} nomFichier={preview.nomFichier} onConfirmer={handleConfirmerImport} onAnnuler={() => { setPreview(null); Object.values(inputRefs.current).forEach(el => { if (el) el.value = '' }) }} importing={importing} />}
      {positionAuteur && (() => {
        const auteur = auteurs.find(a => a.id_auteur === positionAuteur)
        if (!auteur) return null
        return (
          <ModalPositionAuteur
            auteur={auteur}
            photoUrl={photoUrlAuteur(auteur.id_auteur)}
            posInit={parseAuteurPhotoPositions(auteur.photo_position)}
            onClose={() => setPositionAuteur(null)}
            onSauvegarde={pos => sauvegarderPositionAuteur(auteur.id_auteur, pos)}
          />
        )
      })()}

      {/* Modale config niveaux */}
      {configOeuvre && (() => {
        const cfg = niveauxConfig[configOeuvre] ?? { sommaire: 1, corps: 1, txtSommaire: [false,false,false,false,false], txtCorps: [false,false,false,false,false], afficherNumeros: true }
        const oeuvreNom = auteurs.flatMap(a => a.oeuvres).find(o => o.id_oeuvre === configOeuvre)?.titre ?? configOeuvre
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
              style={{ background: 'var(--cs-surface)', borderRadius: '10px', padding: '24px 28px', width: '30rem', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.00625rem', color: 'var(--cs-encre)', margin: 0 }}>{oeuvreNom}</p>
                <button onClick={() => setConfigOeuvre(null)} style={{ fontSize: '1.00625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>

              {(['sommaire', 'corps'] as const).map(type => {
                const txtKey = type === 'sommaire' ? 'txtSommaire' : 'txtCorps'
                const niveauActuel = cfg[type]
                return (
                  <div key={type} style={{ marginBottom: '20px' }}>
                    <p style={{ fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.10em', color: 'var(--cs-texte-doux)', marginBottom: '10px', textTransform: 'uppercase', borderBottom: '1px solid var(--cs-fond-doux)', paddingBottom: '6px' }}>
                      {type === 'sommaire' ? 'Sommaire' : 'Corps du texte'}
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82656rem' }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', padding: '3px 8px', color: 'var(--cs-texte-doux)', fontWeight: 400, fontSize: '0.71875rem' }}>Niveau</th>
                          <th style={{ textAlign: 'center', padding: '3px 8px', color: 'var(--cs-texte-doux)', fontWeight: 400, fontSize: '0.71875rem' }}>Affiché</th>
                          <th style={{ textAlign: 'center', padding: '3px 8px', color: 'var(--cs-texte-doux)', fontWeight: 400, fontSize: '0.71875rem' }}>Texte</th>
                        </tr>
                      </thead>
                      <tbody>
                        {niveaux.map((label, i) => {
                          const niv = i + 1
                          const affiche = niveauActuel >= niv
                          const txtAffiche = (cfg[txtKey] ?? [])[i] ?? false
                          return (
                            <tr key={niv} style={{ background: affiche ? 'rgba(var(--cs-vert-rgb),0.04)' : 'var(--cs-fond-clair)' }}>
                              <td style={{ padding: '5px 8px', color: affiche ? 'var(--cs-encre)' : 'var(--cs-texte-faible)' }}>{label}</td>
                              <td style={{ textAlign: 'center', padding: '5px 8px' }}>
                                <button onClick={() => setCfg({ [type]: affiche && niv <= niveauActuel ? (niv === 1 ? 1 : niv - 1) : niv })}
                                  style={{ fontSize: '0.79062rem', padding: '2px 10px', borderRadius: '3px', border: '1px solid var(--cs-bord)', background: affiche ? 'var(--cs-vert)' : '#fff', color: affiche ? '#fff' : 'var(--cs-texte-doux)', cursor: 'pointer' }}>
                                  {affiche ? '✓' : '○'}
                                </button>
                              </td>
                              <td style={{ textAlign: 'center', padding: '5px 8px' }}>
                                {affiche ? (
                                  <button onClick={() => toggleTxt(txtKey, i)}
                                    style={{ fontSize: '0.71875rem', padding: '2px 10px', borderRadius: '3px', border: '1px solid var(--cs-bord)', background: txtAffiche ? 'var(--cs-encre)' : '#fff', color: txtAffiche ? '#fff' : 'var(--cs-texte-faible)', cursor: 'pointer' }}>
                                    {txtAffiche ? 'Texte affiché' : 'Texte masqué'}
                                  </button>
                                ) : <span style={{ color: 'var(--cs-bord-clair)', fontSize: '0.71875rem' }}>—</span>}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid var(--cs-fond-doux)', marginTop: '4px' }}>
                <span style={{ fontSize: '0.82656rem', color: 'var(--cs-texte)' }}>Numéros de segments</span>
                <button onClick={() => setCfg({ afficherNumeros: !cfg.afficherNumeros })}
                  style={{ fontSize: '0.79062rem', padding: '4px 14px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: cfg.afficherNumeros ? 'var(--cs-vert)' : '#fff', color: cfg.afficherNumeros ? '#fff' : 'var(--cs-texte-doux)', cursor: 'pointer' }}>
                  {cfg.afficherNumeros ? 'Affichés' : 'Masqués'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button onClick={() => setConfigOeuvre(null)} style={{ fontSize: '0.8625rem', padding: '7px 16px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                <button onClick={() => sauvegarderNiveaux(configOeuvre, niveauxConfig[configOeuvre] ?? cfg)}
                  style={{ fontSize: '0.8625rem', padding: '7px 16px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Barre de recherche + nouvel auteur */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
        <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher un auteur ou une œuvre…"
          style={{ flex: 1, fontSize: '0.8625rem', padding: '6px 10px', border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none' }} />
        {recherche && <button onClick={() => setRecherche('')} style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
        <button onClick={() => { setAjoutAuteur(!coAuteurAAjouter); setMsgAjoutAuteur(null) }}
          style={{ width: '7.375rem', textAlign: 'center', fontSize: '0.8625rem', padding: '6px 10px', borderRadius: '5px', border: 'none', background: coAuteurAAjouter ? 'var(--cs-vert-fonce)' : 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {coAuteurAAjouter ? 'Fermer' : '+ Nouvel auteur'}
        </button>
        <button onClick={() => { setAjoutOeuvre(!ajoutOeuvre); setVueBibliotheque('oeuvres') }}
          style={{ width: '8rem', textAlign: 'center', fontSize: '0.8625rem', padding: '6px 10px', borderRadius: '5px', border: 'none', background: ajoutOeuvre ? 'var(--cs-vert-fonce)' : 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {ajoutOeuvre ? 'Fermer' : '+ Nouvelle œuvre'}
        </button>
        {/* Menu déroulant de filtrage des auteurs (remplace l'ancien bouton bascule). */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuFiltreOuvert(v => !v)}
            title="Filtrer les auteurs affichés"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8625rem', padding: '6px 12px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: filtreAuteurs === 'publiees' ? '#fff' : 'var(--cs-fond)', color: 'var(--cs-texte-second)', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {FILTRES_AUTEURS.find(f => f.code === filtreAuteurs)?.label ?? 'Filtrer'}
            <span style={{ fontSize: '0.575rem', color: 'var(--cs-texte-faible)' }}>▼</span>
          </button>
          {menuFiltreOuvert && (
            <>
              <div onClick={() => setMenuFiltreOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 41, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '6px', boxShadow: '0 6px 20px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: '190px' }}>
                {FILTRES_AUTEURS.map(f => (
                  <button key={f.code} onClick={() => { setFiltreAuteurs(f.code); setMenuFiltreOuvert(false) }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: '0.8625rem', padding: '7px 12px', border: 'none', borderBottom: '1px solid var(--cs-fond-doux)', background: filtreAuteurs === f.code ? 'rgba(var(--cs-vert-rgb),0.08)' : '#fff', color: filtreAuteurs === f.code ? '#2f6046' : 'var(--cs-texte)', fontWeight: filtreAuteurs === f.code ? 600 : 400, cursor: 'pointer' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {/* En rouge : cette vue REMPLACE le texte d'une œuvre entière. Le libellé
            « Segments » ne disait pas ce qu'on y fait, ni ce qu'on y risque. */}
        <button onClick={() => setVueBibliotheque(v => v === 'segments' ? 'oeuvres' : 'segments')}
          title="Remplacer intégralement les segments d’une œuvre par un nouveau fichier"
          style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: '1px solid var(--cs-danger)', background: vueBibliotheque === 'segments' ? 'var(--cs-danger)' : '#fff7f4', color: vueBibliotheque === 'segments' ? '#fff' : 'var(--cs-danger-fonce)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
          ↺ Remplacer la base
        </button>
      </div>

      {vueBibliotheque === 'segments' && <SectionRemplacerSegments auteurs={auteurs} />}
      {vueBibliotheque === 'oeuvres' && (
      <>

      {ajoutOeuvre && (
        <div style={{ background: 'var(--cs-surface)', border: '2px solid var(--cs-vert)', borderRadius: '8px', padding: '18px 20px', marginBottom: '10px' }}>
          <SectionAjouterOeuvre auteurs={auteurs} />
        </div>
      )}

      {/* Formulaire nouvel auteur */}
      {coAuteurAAjouter && (
        <div style={{ background: 'var(--cs-surface)', border: '2px solid var(--cs-vert)', borderRadius: '8px', padding: '16px 20px', marginBottom: '8px' }}>
          <p style={{ fontSize: '0.8625rem', fontWeight: 600, color: 'var(--cs-vert)', marginBottom: '14px' }}>Nouvel auteur</p>
          <ChampsAuteur
            valeurs={nouvelAuteur}
            onChange={(champ, val) => setNouvelAuteur(p => ({ ...p, [champ]: val }))}
            onChangeTags={tags => setNouvelAuteur(p => ({ ...p, traditions: tags }))}
            tousLesTags={tousLesTags}
          />
          {msgAjoutAuteur && <p style={{ fontSize: '0.82656rem', color: 'var(--cs-danger)', marginBottom: '8px' }}>{msgAjoutAuteur}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => { setAjoutAuteur(false); setMsgAjoutAuteur(null) }} style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
            <button onClick={creerAuteur} style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer</button>
          </div>
        </div>
      )}

      {erreurCatalogue && (
        <div style={{ background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '6px', padding: '10px 14px', marginBottom: '8px' }}>
          <p style={{ fontSize: '0.8625rem', fontWeight: 600, color: 'var(--cs-danger-fonce)', marginBottom: '4px' }}>Le catalogue n’a pas pu être chargé.</p>
          <p style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-second)', marginBottom: '8px' }}>
            Les filtres « candidates », « non candidates », « critiques » et « non publiées » restent vides tant que la panne dure. Détail renvoyé par <code>/api/admin/catalogue</code> : {erreurCatalogue}
          </p>
          <button onClick={() => { setErreurCatalogue(null); setCatalogueParAuteur(null); setCatalogueAutres(null) }}
            style={{ fontSize: '0.8625rem', padding: '5px 12px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
            Réessayer
          </button>
        </div>
      )}

      {auteursFiltres.length === 0 && !erreurCatalogue && (
        <p style={{ fontSize: '0.8625rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', padding: '12px 0' }}>Aucun auteur trouvé.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[...auteursFiltres].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')).map(auteur => {
          const oeuvreTrouvee = !!rechercheNormalisee && auteur.oeuvres.some(o =>
            o.titre.toLowerCase().includes(rechercheNormalisee) ||
            (o.sous_titre ?? '').toLowerCase().includes(rechercheNormalisee) ||
            (o.titre_original ?? '').toLowerCase().includes(rechercheNormalisee)
          )
          const ouvert = auteurOuvert === auteur.id_auteur || oeuvreTrouvee
          return (
          <div key={auteur.id_auteur} style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: (ouvert || editionAuteur === auteur.id_auteur) ? '1px solid var(--cs-bord-clair)' : 'none' }}>
              <button onClick={() => setAuteurOuvert(auteurOuvert === auteur.id_auteur ? null : auteur.id_auteur)}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.07813rem', fontWeight: 700, color: 'var(--cs-vert)' }}>{auteur.nom}</span>
                {(() => {
                  const nbPub = auteur.oeuvres.length
                  const surLeSite = new Set(auteur.oeuvres.map(o => o.id_oeuvre))
                  const nbNonPub = (catalogueParAuteur?.[auteur.id_auteur] ?? [])
                    .filter(n => !n.id_oeuvre_stable || !surLeSite.has(n.id_oeuvre_stable)).length
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '12px', fontSize: '0.79062rem' }}>
                      <span style={{ color: '#2f6046' }}>{nbPub} œuvre{nbPub > 1 ? 's' : ''} publiée{nbPub > 1 ? 's' : ''}</span>
                      {nbNonPub > 0 && <span style={{ color: '#a2542f' }}>{nbNonPub} non publiée{nbNonPub > 1 ? 's' : ''}</span>}
                    </span>
                  )
                })()}
              </button>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center', marginLeft: '12px' }}>
                <code style={{ fontSize: '0.71875rem', background: 'var(--cs-fond-doux)', padding: '2px 6px', borderRadius: '3px', color: 'var(--cs-texte-second)' }}>{auteur.id_auteur}</code>
                <button
                  onClick={() => photoRefs.current[auteur.id_auteur]?.click()}
                  title={photos[auteur.id_auteur] ? 'Remplacer la photo' : 'Ajouter une photo'}
                  style={{ fontSize: '0.79062rem', padding: '4px 10px', borderRadius: '4px', border: `1px solid ${photos[auteur.id_auteur] ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: photos[auteur.id_auteur] ? 'rgba(var(--cs-vert-rgb),0.08)' : '#fff', color: photos[auteur.id_auteur] ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {photos[auteur.id_auteur] ? '✓ Photo' : '+ Photo'}
                </button>
                {photos[auteur.id_auteur] && (
                  <button
                    onClick={() => setPositionAuteur(auteur.id_auteur)}
                    title="Cadrer la photo"
                    style={{ fontSize: '0.79062rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Cadrer
                  </button>
                )}
                <input ref={el => { photoRefs.current[auteur.id_auteur] = el }} type="file" accept=".jpg,.jpeg,.png,.webp,.avif" style={{ display: 'none' }}
                  onChange={async e => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    await uploadPhoto(auteur.id_auteur, f)
                    e.target.value = ''
                  }} />
                <button onClick={() => editionAuteur === auteur.id_auteur ? fermerEditionAuteur() : ouvrirEditionAuteur(auteur)}
                  style={{ fontSize: '0.79062rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer' }}>
                  {editionAuteur === auteur.id_auteur ? 'Fermer' : 'Modifier'}
                </button>
                <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', cursor: 'pointer' }} onClick={() => setAuteurOuvert(auteurOuvert === auteur.id_auteur ? null : auteur.id_auteur)}>
                  {auteurOuvert === auteur.id_auteur ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {/* Formulaire d'édition de l'auteur */}
            {editionAuteur === auteur.id_auteur && (
              <div style={{ padding: '16px 20px 18px', borderBottom: auteurOuvert === auteur.id_auteur ? '1px solid var(--cs-bord-clair)' : 'none', background: 'var(--cs-surface)', borderLeft: '3px solid var(--cs-vert)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                  <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.97031rem', color: 'var(--cs-encre)' }}>
                    Modification — <em>{auteur.nom}</em>
                  </span>
                  <code style={{ fontSize: '0.68281rem', background: 'var(--cs-fond-doux)', padding: '2px 6px', borderRadius: '3px', color: 'var(--cs-texte-second)' }}>{auteur.id_auteur}</code>
                </div>
                <ChampsAuteur
                  valeurs={formAuteur}
                  onChange={(champ, val) => setFormAuteur(p => ({ ...p, [champ]: val }))}
                  onChangeTags={tags => setFormAuteur(p => ({ ...p, traditions: tags }))}
                  tousLesTags={tousLesTags}
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '14px' }}>
                  {statutAuteur?.id === auteur.id_auteur && (
                    <span style={{ fontSize: '0.82656rem', color: statutAuteur?.ok ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>
                      {statutAuteur?.ok ? '✓' : '✗'} {statutAuteur?.msg}
                    </span>
                  )}
                  <button onClick={fermerEditionAuteur} style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={sauvegarderAuteur} style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
                </div>
              </div>
            )}

            {/* Liste des œuvres */}
            {ouvert && (
              <div style={{ padding: '6px 0' }}>
                {oeuvresAfficheesDe(auteur).length === 0 && !besoinCatalogue && (
                  <p style={{ fontSize: '0.8625rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', padding: '8px 18px' }}>Aucune œuvre pour cet auteur — utilisez « + Ajouter une œuvre ».</p>
                )}
                {[...oeuvresAfficheesDe(auteur)].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')).map(oeuvre => {
                  const titreMatch = rechercheNormalisee && oeuvre.titre.toLowerCase().includes(rechercheNormalisee)
                  const surbrillance = (texte: string) => {
                    if (!rechercheNormalisee) return <>{texte}</>
                    const idx = texte.toLowerCase().indexOf(rechercheNormalisee)
                    if (idx === -1) return <>{texte}</>
                    return <>{texte.slice(0, idx)}<mark style={{ background: 'rgba(var(--cs-vert-rgb),0.18)', color: 'inherit', borderRadius: '2px', padding: '0 1px' }}>{texte.slice(idx, idx + rechercheNormalisee.length)}</mark>{texte.slice(idx + rechercheNormalisee.length)}</>
                  }
                  const noticesCatalogue = filtrerNoticesSelonVue(
                    catalogueParOeuvre[oeuvre.id_oeuvre] ?? [], filtreAuteurs)
                  const noticeCatalogue = noticesCatalogue[0]
                  const catalogueOuvert = !!catalogueDeploye[oeuvre.id_oeuvre]
                  const publiee = estOeuvrePubliee(oeuvre)
                  const btnSobre = {
                    fontSize: '0.75469rem',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid #d8d1c6',
                    background: '#fffdf9',
                    color: '#5f5952',
                    cursor: 'pointer',
                    fontWeight: 500,
                    whiteSpace: 'nowrap' as const,
                    textDecoration: 'none',
                  }
                  const btnVert = {
                    ...btnSobre,
                    border: '1px solid #c8d8ce',
                    background: '#f7fbf8',
                    color: '#2f6046',
                  }
                  const btnActif = {
                    ...btnSobre,
                    border: '1px solid var(--cs-vert)',
                    background: 'var(--cs-vert)',
                    color: '#fff',
                  }
                  return (
                  /* Œuvre PUBLIÉE : léger liseré vert discret (par opposition à l'ocre-rouge
                     des œuvres seulement au catalogue). */
                  <div key={oeuvre.id_oeuvre} style={{ borderBottom: '1px solid var(--cs-fond-doux)', borderLeft: `2px solid ${publiee ? '#cfe0d5' : '#e0cdbe'}`, background: titreMatch ? 'rgba(var(--cs-vert-rgb),0.03)' : (publiee ? undefined : 'rgba(150,110,70,0.035)') }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 18px 5px 14px', gap: '12px', flexWrap: 'nowrap', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, overflow: 'hidden', flex: 1 }}>
                      <a href={`/oeuvre/${oeuvre.id_oeuvre}`} target="_blank" rel="noopener noreferrer" title="Ouvrir l'œuvre"
                        style={{ flexShrink: 0, width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cs-texte-doux)', textDecoration: 'none', lineHeight: 1 }}>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M5 11L11 5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round"/>
                          <path d="M7.2 5H11v3.8" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </a>
                      <span style={{ fontSize: '0.8625rem', color: 'var(--cs-texte)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{surbrillance(oeuvre.titre)}</span>
                      {oeuvre.trad_auteur && (
                        <span style={{ fontSize: '0.75469rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '9.375rem', flexShrink: 0 }}>
                          Trad. {oeuvre.trad_auteur}
                        </span>
                      )}
                      {/* Le commentaire sur l'édition ne paraît plus ici : il a rejoint le
                          formulaire de modification, sous le nom « Commentaires », où il
                          se corrige au lieu de se lire seulement. */}
                      {!publiee && (
                        <span title="Œuvre conservée au catalogue mais retirée de la lecture"
                          style={{ fontSize: '0.64687rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a6a3e', background: '#f6ece1', border: '1px solid #e0cdbe', borderRadius: '3px', padding: '1px 6px', flexShrink: 0 }}>
                          Dépubliée
                        </span>
                      )}
                      {resultat?.idOeuvre === oeuvre.id_oeuvre && <span style={{ fontSize: '0.75469rem', color: resultat.ok ? 'var(--cs-vert)' : 'var(--cs-danger)', flexShrink: 0 }}>{resultat.ok ? '✓' : '✗'} {resultat.msg}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, alignItems: 'center' }}>
                      <span style={{ width: '1px', height: '16px', background: 'var(--cs-bord-clair)', display: 'inline-block' }} />
                      <button onClick={() => setConfigOeuvre(configOeuvre === oeuvre.id_oeuvre ? null : oeuvre.id_oeuvre)}
                        title="Configurer les niveaux d'affichage"
                        style={configOeuvre === oeuvre.id_oeuvre ? btnActif : { ...btnSobre, padding: '3px 7px', color: '#8a8278' }}>
                        ⚙
                      </button>
                      <button onClick={() => editionOeuvre === oeuvre.id_oeuvre ? fermerEditionOeuvre() : ouvrirEditionOeuvre(oeuvre)}
                        style={{ ...(editionOeuvre === oeuvre.id_oeuvre ? btnActif : btnSobre), minWidth: '58px', textAlign: 'center' }}>
                        {editionOeuvre === oeuvre.id_oeuvre ? 'Fermer' : 'Modifier'}
                      </button>
                      <button onClick={() => { setResultat(null); inputRefs.current[oeuvre.id_oeuvre]?.click() }}
                        style={btnSobre}>Import CSV</button>
                      <input ref={el => { inputRefs.current[oeuvre.id_oeuvre] = el }} type="file" accept=".csv" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFichierChoisi(oeuvre.id_oeuvre, f) }} />
                      <button onClick={() => handleExport(oeuvre.id_oeuvre, oeuvre.titre)} disabled={exporting === oeuvre.id_oeuvre}
                        style={exporting === oeuvre.id_oeuvre ? { ...btnSobre, opacity: .65, cursor: 'default' } : btnSobre}>
                        {exporting === oeuvre.id_oeuvre ? 'Export…' : 'Export CSV'}
                      </button>
                      <span style={{ width: '1px', height: '16px', background: 'var(--cs-bord-clair)', display: 'inline-block', marginLeft: '2px' }} />
                      <span title="Score de la fiche catalogue"
                        style={{ fontSize: '0.71875rem', padding: '3px 7px', borderRadius: '4px', border: '1px solid #ded8ce', background: 'var(--cs-fond-clair)', color: couleurScoreCatalogue(noticeCatalogue?.score_fiabilite), fontWeight: 700, minWidth: '58px', boxSizing: 'border-box', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        Score {noticeCatalogue?.score_fiabilite ?? '?'}
                      </span>
                      <span title="Validation ADMIN de la fiche catalogue (distincte du score IA)"
                        style={{ fontSize: '0.71875rem', padding: '3px 7px', borderRadius: '4px', border: `1px solid ${noticeCatalogue?.verifie ? '#c8d8ce' : '#e4d3c8'}`, background: noticeCatalogue?.verifie ? '#f7fbf8' : '#fbf7f2', color: noticeCatalogue?.verifie ? '#2f6046' : '#8a5a32', fontWeight: 600, width: '78px', boxSizing: 'border-box', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {noticeCatalogue?.verifie ? 'Validé' : 'À vérifier'}
                      </span>
                      {/* Redirections directes : notice source et fichier plein texte en ligne.
                          Grisées et non cliquables quand l'URL manque. */}
                      {(() => {
                        const urlNotice = noticeCatalogue?.url_source ?? oeuvre.url_source ?? null
                        const urlFichier = noticeCatalogue?.url_texte_integral ?? null
                        const okN = !!urlNotice && /^https?:\/\//i.test(urlNotice)
                        const okF = !!urlFichier && /^https?:\/\//i.test(urlFichier)
                        const lien = (ok: boolean, href: string | null, label: string, titre: string) => ok
                          ? <a key={label} href={href!} target="_blank" rel="noopener noreferrer" title={titre}
                              style={{ ...btnVert, minWidth: '72px', textAlign: 'center', boxSizing: 'border-box' }}>{label} ↗</a>
                          : <span key={label} title="Aucune URL renseignée"
                              style={{ ...btnSobre, minWidth: '72px', textAlign: 'center', boxSizing: 'border-box', color: '#c2bcb2', background: 'var(--cs-fond-clair)', cursor: 'default' }}>{label} —</span>
                        return <>{lien(okN, urlNotice, 'Notice', 'Ouvrir la notice source')}{lien(okF, urlFichier, 'Fichier', 'Ouvrir le fichier en ligne (PDF, TXT…)')}</>
                      })()}
                      <button onClick={() => setCatalogueDeploye(prev => ({ ...prev, [oeuvre.id_oeuvre]: !prev[oeuvre.id_oeuvre] }))}
                        style={{ ...(catalogueOuvert ? btnActif : btnVert), minWidth: '52px', textAlign: 'center' }}>
                        {catalogueOuvert ? 'Replier' : 'Détails'}
                      </button>
                      <a href={`/admin?onglet=controle-oeuvres&id_oeuvre=${oeuvre.id_oeuvre}`}
                        style={btnVert}>
                        Contrôle
                      </a>
                      <span style={{ width: '1px', height: '16px', background: 'var(--cs-bord-clair)', display: 'inline-block', marginLeft: '4px' }} />
                      <button onClick={() => basculerPublication(oeuvre)} disabled={bascule === oeuvre.id_oeuvre}
                        title={publiee ? 'Retirer de la lecture (reste au catalogue)' : 'Remettre en lecture'}
                        style={{ ...(publiee ? btnSobre : { ...btnSobre, border: '1px solid #d8b48f', background: '#fbf3ea', color: '#9a6a3e' }), minWidth: '72px', textAlign: 'center', opacity: bascule === oeuvre.id_oeuvre ? 0.6 : 1 }}>
                        {bascule === oeuvre.id_oeuvre ? '…' : (publiee ? 'Dépublier' : 'Publier')}
                      </button>
                      <button onClick={() => supprimerOeuvre(oeuvre.id_oeuvre, oeuvre.titre)}
                        style={{ ...btnSobre, border: '1px solid #e6c8be', background: '#fffaf8', color: '#b44a34', marginLeft: '4px' }}>
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {catalogueOuvert && (
                    <BlocCatalogueOeuvre oeuvre={oeuvre} notices={noticesCatalogue}
                      datesAuteur={auteur.dates ?? null}
                      onValiderAdmin={validerAdminNotice} onRefuser={refuserNotice}
                      onEditerNotice={editerNotice} />
                  )}

                  {/* Formulaire d'édition de l'œuvre */}
                  {editionOeuvre === oeuvre.id_oeuvre && (
                    <div style={{ padding: '16px 22px 18px', background: 'var(--cs-surface)', borderTop: '1px solid var(--cs-fond-doux)', borderLeft: '3px solid var(--cs-vert)' }}>
                      {/* En-tête */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                        <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.97031rem', color: 'var(--cs-encre)' }}>
                          Modification — <em>{oeuvre.titre}</em>
                        </span>
                        <code style={{ fontSize: '0.68281rem', background: 'var(--cs-fond-doux)', padding: '2px 6px', borderRadius: '3px', color: 'var(--cs-texte-second)' }}>{oeuvre.id_oeuvre}</code>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* Titres */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Titre *</label>
                          <input type="text" value={formOeuvre.titre ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, titre: e.target.value }))} style={inputStyleAuteur} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Sous-titre</label>
                          <input type="text" value={formOeuvre.sous_titre ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, sous_titre: e.target.value }))} style={inputStyleAuteur} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Titre original</label>
                          <input type="text" value={formOeuvre.titre_original ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, titre_original: e.target.value }))} style={inputStyleAuteur} />
                        </div>

                        <hr style={sepOeuvre} />

                        {/* Auteurs — une œuvre peut être signée à plusieurs, à
                            égalité. Elle paraît alors sur l'étagère de chacun et
                            porte les deux noms. Le premier auteur vient de l'œuvre
                            elle-même ; les suivants s'ajoutent ici. */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Auteurs</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                            {auteursOeuvre.map(a => (
                              <span key={a.id_auteur} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: 'var(--cs-texte-fort)', background: 'var(--cs-fond-doux)', border: '1px solid var(--cs-bord-clair)', borderRadius: '3px', padding: '2px 6px' }}>
                                {a.nom}
                                {a.rang === 1
                                  ? <span style={{ fontSize: '0.62rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>premier</span>
                                  : <button onClick={() => majAuteursOeuvre(oeuvre.id_oeuvre, 'retirer', a.id_auteur)}
                                      title="Retirer cet auteur de l’œuvre"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-danger)', fontSize: '0.8rem', lineHeight: 1, padding: 0 }}>×</button>}
                              </span>
                            ))}
                            {auteursOeuvre.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</span>}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <select value={coAuteurAAjouter} onChange={e => setCoAuteurAAjouter(e.target.value)} style={{ ...inputStyleAuteur, flex: 1 }}>
                              <option value="">Ajouter un auteur…</option>
                              {auteurs
                                .filter(a => !auteursOeuvre.some(existant => existant.id_auteur === a.id_auteur))
                                .map(a => <option key={a.id_auteur} value={a.id_auteur}>{a.nom}</option>)}
                            </select>
                            <button onClick={() => coAuteurAAjouter && majAuteursOeuvre(oeuvre.id_oeuvre, 'ajouter', coAuteurAAjouter)}
                              disabled={!coAuteurAAjouter} style={{ ...btnSobre, opacity: coAuteurAAjouter ? 1 : 0.5 }}>Ajouter</button>
                          </div>
                          {statutAuteursOeuvre && (
                            <p style={{ margin: '5px 0 0', fontSize: '0.68rem', color: /ajouté|retiré/.test(statutAuteursOeuvre) ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>{statutAuteursOeuvre}</p>
                          )}
                        </div>

                        <hr style={sepOeuvre} />

                        {/* Édition */}
                        <div><label style={lbl}>Éditeur</label><input type="text" value={formOeuvre.editeur ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, editeur: e.target.value }))} style={inputStyleAuteur} /></div>
                        <div><label style={lbl}>Traducteur</label><input type="text" value={formOeuvre.trad_auteur ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, trad_auteur: e.target.value }))} style={inputStyleAuteur} /></div>
                        <div><label style={lbl}>Ville</label><input type="text" value={formOeuvre.ville ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, ville: e.target.value }))} style={inputStyleAuteur} /></div>
                        <div><label style={lbl}>Collection</label><input type="text" value={formOeuvre.collection ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, collection: e.target.value }))} style={inputStyleAuteur} /></div>
                        <div><label style={lbl}>Date de publication</label><input type="text" value={formOeuvre.date_publication ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, date_publication: e.target.value }))} style={inputStyleAuteur} /></div>
                        <div><label style={lbl}>Date de composition originale</label><input type="text" value={formOeuvre.date_composition ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, date_composition: e.target.value }))} style={inputStyleAuteur} /></div>
                        <div>
                          <label style={lbl}>Langue originale</label>
                          <select value={formOeuvre.langue_originale ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, langue_originale: e.target.value }))} style={inputStyleAuteur}>
                            <option value="">—</option>
                            <option value="Latin">Latin</option>
                            <option value="Grec">Grec</option>
                            <option disabled style={{ color: 'var(--cs-bord)' }}>──────</option>
                            <option value="Syriaque">Syriaque</option>
                            <option value="Copte">Copte</option>
                            <option value="Arménien">Arménien</option>
                            <option value="Géorgien">Géorgien</option>
                            <option value="Arabe chrétien">Arabe chrétien</option>
                            <option value="Guèze">Guèze</option>
                          </select>
                        </div>
                        <div><label style={lbl}>URL source</label><input type="text" value={formOeuvre.url_source ?? ''} onChange={e => setFormOeuvre(p => ({ ...p, url_source: e.target.value }))} style={inputStyleAuteur} /></div>

                        <hr style={sepOeuvre} />

                        {/* Commentaires (colonne `commentaire_traduction`) : une note en
                            clair sur l'édition ou la traduction, du genre « Traduction de
                            Louis Judicis de Mirandol, édition de 1861 ». Une phrase, donc
                            une zone de texte et non une ligne. */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Commentaires</label>
                          <textarea value={formOeuvre.commentaire_traduction ?? ''}
                            onChange={e => setFormOeuvre(p => ({ ...p, commentaire_traduction: e.target.value }))}
                            rows={2} style={{ ...inputStyleAuteur, resize: 'vertical' }} />
                        </div>

                        {/* Genre */}
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={lbl}>Genre</label>
                          <TagsGenres tags={formOeuvreGenres} onChange={setFormOeuvreGenres} />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center', marginTop: '16px' }}>
                        {statutOeuvre?.id === oeuvre.id_oeuvre && (
                          <span style={{ fontSize: '0.82656rem', color: statutOeuvre?.ok ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>
                            {statutOeuvre?.ok ? '✓' : '✗'} {statutOeuvre?.msg}
                          </span>
                        )}
                        <button onClick={fermerEditionOeuvre} style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                        <button onClick={() => sauvegarderOeuvre(oeuvre.id_oeuvre)} style={{ fontSize: '0.8625rem', padding: '6px 14px', borderRadius: '5px', border: 'none', background: 'var(--cs-vert)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Enregistrer</button>
                      </div>
                    </div>
                  )}
                  </div>
                )
                })}

                {/* Le reste du catalogue : les œuvres de cet auteur qui NE SONT PAS sur le
                    site. Elles ne paraissent qu'en mode « Tout afficher », et se distinguent
                    d'un liseré ambre — on ne peut ni les exporter ni les segmenter, il n'y a
                    pas encore de texte derrière. */}
                {besoinCatalogue && (() => {
                  if (chargementCatalogue) {
                    return <p style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: '8px 0 0' }}>Chargement du catalogue…</p>
                  }
                  const restantes = restantesAfficheesDe(auteur)
                  if (restantes.length === 0) return null
                  return (
                    <div style={{ marginTop: auteur.oeuvres.length ? '6px' : '0' }}>
                      {/* Plus d'intitulé « Au catalogue… » : la couleur suffit à distinguer
                          (ocre-rouge = présent au catalogue mais non publié, vert = publié). */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Regroupement par TITRE STABLE : titre de l'œuvre une fois, en tête ;
                            puis une ligne par édition portant SON titre propre (latin, ancien,
                            moderne…), plutôt que le titre stable répété. */}
                        {regrouperNoticesCatalogue(restantes, auteur.oeuvres[0]?.titre ?? '').map(groupe => (
                          <div key={groupe.cle}>
                            <div style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.84rem', fontWeight: 600, color: 'var(--cs-encre-fonce)', margin: '0 0 3px 2px' }}>
                              {groupe.titre}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {groupe.notices.map(n => (
                                <div key={n.id}
                                  style={{ display: 'flex', alignItems: 'baseline', gap: '9px', flexWrap: 'wrap', padding: '6px 10px', borderLeft: '2px solid #c07a4a', background: '#fbf3ee', borderRadius: '0 4px 4px 0' }}>
                                  <span style={{ fontSize: '0.82656rem', color: 'var(--cs-texte)', fontStyle: (n.titre_edition || n.titre_original) ? 'italic' : 'normal' }}>
                                    {n.titre_edition || n.titre_original || n.titre_stable || '(sans titre)'}
                                  </span>
                                  {n.annee_edition && <span style={{ fontSize: '0.75469rem', color: 'var(--cs-texte-doux)' }}>{n.annee_edition}</span>}
                                  {n.traducteur && <span style={{ fontSize: '0.75469rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>trad. {n.traducteur}</span>}
                                  {/* Liens URL/Notice d'abord, puis la pastille de décision en dernier :
                                      sa case a une largeur fixe et se cale au bord droit, si bien que
                                      toutes les décisions (« Prioritaire », « Candidat »…) s'alignent. */}
                                  <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '11px' }}>
                                    <LiensUrlNotice urlTexte={n.url_texte_integral} urlNotice={n.url_source} />
                                    {n.decision_import && (
                                      <span title={n.decision_import}
                                        style={{ fontSize: '0.64687rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '2px 4px', borderRadius: '3px', whiteSpace: 'nowrap', width: '5.75rem', textAlign: 'center', boxSizing: 'border-box', ...decorDecision(n.decision_import) }}>
                                        {abregerDecision(n.decision_import)}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )})}

        {/* Auteurs présents UNIQUEMENT au catalogue (aucune fiche `auteurs`) : sans ce
            bloc, « Tout afficher » laissait invisible l'essentiel du catalogue. */}
        {besoinCatalogue && chargementCatalogue && catalogueAutres === null && (
          <p style={{ fontSize: '0.79062rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', padding: '8px 2px' }}>Chargement du catalogue…</p>
        )}
        {besoinCatalogue && catalogueAutres && (() => {
          const entrees = Object.entries(catalogueAutres)
            .map(([nom, ns]) => [nom, filtrerNoticesSelonVue(ns, filtreAuteurs)] as const)
            .filter(([, ns]) => ns.length > 0)
            .filter(([nom, ns]) => !rechercheNormalisee
              || nom.toLowerCase().includes(rechercheNormalisee)
              || ns.some(n => [n.titre_stable, n.titre_original, n.titre_edition].some(t => (t ?? '').toLowerCase().includes(rechercheNormalisee))))
            .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
          if (entrees.length === 0) return null
          const total = entrees.reduce((s, [, ns]) => s + ns.length, 0)
          return (
            <>
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.64687rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--cs-or)', whiteSpace: 'nowrap' }}>
                  Auteurs seulement au catalogue — {entrees.length} auteur{entrees.length > 1 ? 's' : ''}, {total} œuvre{total > 1 ? 's' : ''}
                </span>
                <span style={{ flex: 1, height: '1px', background: '#e6ddc6' }} />
              </div>
              {entrees.map(([nom, ns]) => (
                <BlocCatalogueAuteurSeul key={nom} nom={nom} notices={ns}
                  onValiderAdmin={validerAdminNotice} onRefuser={refuserNotice} />
              ))}
            </>
          )
        })()}
      </div>
      </>
      )}
    </>
  )
}
