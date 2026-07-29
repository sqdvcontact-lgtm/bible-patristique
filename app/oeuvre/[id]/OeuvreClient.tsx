'use client'
import { ABREV_FR } from '@/app/lib/bible'
import { hydraterLiensHerites } from '@/app/lib/liens'

import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import { parseNotes } from '@/app/lib/notes'
import { STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { supabase } from "@/app/lib/supabase"
import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee } from './oeuvreTypes'
import { rendreTexteEnrichi, texteSansEnrichissement, normaliserEspaces } from './texteEnrichi'
import { nettoyerFin } from '@/app/lib/ponctuation'
import ModaleEditionAdmin from './ModaleEditionAdmin'
import PageTitre, { libelleTrad, formaterEditeur } from './PageTitre'
import { useEditeursCharges } from '@/app/lib/editeurs'
import ModaleAuteur from '@/app/components/ModaleAuteur'
import EtoileFavori from '@/app/components/EtoileFavori'
import { useFavoris } from '@/app/lib/useFavoris'
import OngletCommentaires from './OngletCommentaires'
import { BTN_STYLE, BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { BoutonCopieVerset, BoutonEnregistrerVerset, BoutonSignalerVerset } from './BoutonsVerset'
import AssocierVerset from './AssocierVerset'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'

const CHARS_PAR_PAGE = 15000

// Nature d'un signalement ouvert depuis l'onglet Problèmes. Le préfixe est lu par la
// modération pour trier : référence à identifier, absence de référence, ou qualification
// du lien (citation / paraphrase / commentaire doctrinal / écho).
const NATURES_PROBLEME: Record<string, { titre: string; prefixe: string }> = {
  suggestion:       { titre: 'Suggérer une référence', prefixe: 'Référence proposée' },
  pas_de_reference: { titre: 'Pas de référence', prefixe: 'Aucune référence biblique' },
  citation:         { titre: 'Citation', prefixe: 'Nature : citation' },
  paraphrase:       { titre: 'Paraphrase', prefixe: 'Nature : paraphrase' },
  commentaire:      { titre: 'Commentaire doctrinal', prefixe: 'Nature : commentaire doctrinal' },
  echo:             { titre: 'Écho', prefixe: 'Nature : écho' },
}
function natureProbleme(nat?: string) { return NATURES_PROBLEME[nat ?? 'suggestion'] ?? NATURES_PROBLEME.suggestion }

// Même table que celle utilisée côté serveur (page.tsx) pour l'affichage
// des références bibliques en français — doit rester identique aux deux endroits.

function detailsRefBiblique(ref: string): { label: string; livre: string; chapitre: string; verset: string } {
  const p = ref.trim().split(' ')
  if (p.length < 2) return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv = p[1].split(':')
  const label = cv[1] ? `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

// REGROUPEMENTS (affichage seul, la base n'est pas modifiée) : quand un segment cite
// plusieurs versets qui se suivent dans le même chapitre (verset n, n+1, n+2…), on les réunit
// en UNE occurrence — un seul paragraphe, à la suite. On regroupe les entrées adjacentes de la
// liste dont le numéro de verset s'enchaîne sans trou.
function regrouperVersetsConsecutifs<T extends { livre: string; chapitre: string; verset: string }>(versets: T[]): T[][] {
  const groupes: T[][] = []
  for (const v of versets) {
    const dernierGroupe = groupes[groupes.length - 1]
    const prec = dernierGroupe?.[dernierGroupe.length - 1]
    const nPrec = prec ? Number(prec.verset) : NaN
    const nCur = Number(v.verset)
    if (prec && prec.livre === v.livre && prec.chapitre === v.chapitre
        && Number.isFinite(nPrec) && Number.isFinite(nCur) && nCur === nPrec + 1) {
      dernierGroupe.push(v)
    } else {
      groupes.push([v])
    }
  }
  return groupes
}

// Un verset cité PUIS commenté est visé par deux liens du même segment (types 1
// et 3, cumul rendu obligatoire par l'arbitrage n°17). Il ne doit paraître qu'une
// fois dans le volet, en portant les deux natures.
const NATURE_LIEN = ['citation', 'reprise', 'doctrine', 'écho'] as const

function extraireVersetsAvecNature(s: any): { id: string; natures: string[] }[] {
  const ordre: string[] = []
  const natures = new Map<string, string[]>()
  ;[s.lien_1, s.lien_2, s.lien_3, s.lien_4].forEach((col: any, i: number) => {
    String(col ?? '').split(';').map((v: string) => v.trim()).filter(Boolean).forEach((vid: string) => {
      if (!natures.has(vid)) { natures.set(vid, []); ordre.push(vid) }
      const n = NATURE_LIEN[i]
      if (!natures.get(vid)!.includes(n)) natures.get(vid)!.push(n)
    })
  })
  return ordre.map(id => ({ id, natures: natures.get(id)! }))
}

function extraireVersetsSegment(s: any): string[] {
  return extraireVersetsAvecNature(s).map(v => v.id)
}

function segmentAffichable(s: any) {
  if (s.nature === 'separateur') return false
  return Boolean((s.segment_texte ?? '').trim() || extraireVersetsSegment(s).length > 0)
}

const SEUIL_TITRE_COLOPHON = 86
const NBSP_TITRE_COLOPHON = '\u00A0'

function preparerTitreColophon(texte: string) {
  return texte
    .trim()
    .replace(/\s+([;:!?»])/g, `${NBSP_TITRE_COLOPHON}$1`)
    .replace(/([«])\s+/g, `$1${NBSP_TITRE_COLOPHON}`)
    .replace(/\s+([,.])/g, '$1')
}

function titreCompatibleColophon(texte: string) {
  const phrases = texte.split(/[.!?]/).map(p => p.trim()).filter(Boolean)
  if (phrases.length > 2) return false
  if ((texte.match(/[—–-]/g) ?? []).length > 1) return false
  if (texte.length > 165) return false
  return true
}

function decouperColophon(texte: string, maxLignes: number, targetPerLine: number, hautMax: number): string[] {
  const mots = texte.trim().split(/\s+/).filter(Boolean)
  if (mots.length <= 1) return [texte.trim()]
  const total = mots.reduce((s, mot) => s + mot.length, 0) + mots.length - 1
  const nbLignes = Math.min(maxLignes, Math.max(3, Math.round(total / targetPerLine)))
  const haut = Math.min(hautMax, Math.round(total * 2 / (nbLignes + 1)))
  const bas = Math.max(6, Math.round(total * 2 / (nbLignes * (nbLignes + 1))))
  const cibles = Array.from({ length: nbLignes }, (_, i) => {
    const t = nbLignes === 1 ? 0 : i / (nbLignes - 1)
    return Math.round(haut - (haut - bas) * t)
  })
  const longueurs = Array.from({ length: mots.length }, () => Array(mots.length + 1).fill(0))
  for (let i = 0; i < mots.length; i += 1) {
    let longueur = 0
    for (let j = i + 1; j <= mots.length; j += 1) {
      longueur += mots[j - 1].length + (j === i + 1 ? 0 : 1)
      longueurs[i][j] = longueur
    }
  }
  const memo = new Map<string, { cout: number; coupes: number[] }>()
  const chercher = (depart: number, ligne: number, precedente: number): { cout: number; coupes: number[] } => {
    const cle = `${depart}-${ligne}-${precedente}`
    const deja = memo.get(cle)
    if (deja) return deja
    const restantes = nbLignes - ligne
    if (restantes === 1) {
      const longueur = longueurs[depart][mots.length]
      const cible = cibles[ligne]
      const penaliteMontee = longueur >= precedente ? Math.pow(longueur - precedente + 2, 2) * 300 : 0
      const cout = Math.pow(longueur - cible, 2) + penaliteMontee
      const resultat = { cout, coupes: [mots.length] }
      memo.set(cle, resultat)
      return resultat
    }
    let meilleur = { cout: Number.POSITIVE_INFINITY, coupes: [] as number[] }
    for (let fin = depart + 1; fin <= mots.length - restantes + 1; fin += 1) {
      const longueur = longueurs[depart][fin]
      const penaliteMontee = ligne > 0 && longueur >= precedente
        ? Math.pow(longueur - precedente + 2, 2) * 300
        : 0
      const cible = cibles[ligne]
      const motFin = mots[fin - 1] ?? ''
      const bonusPonctuation = /[;:.!?»)]$/.test(motFin) ? -15 : /[,]$/.test(motFin) ? -8 : 0
      const penaliteDebutCourt = ligne < 2 && longueur < cible * 0.72 ? 150 : 0
      const penaliteRegularite = restantes > 1
        ? Math.round(Math.pow(longueur - precedente * (restantes - 1) / restantes, 2) * 0.5)
        : 0
      const suite = chercher(fin, ligne + 1, longueur)
      const cout = Math.pow(longueur - cible, 2) + penaliteMontee + penaliteDebutCourt + bonusPonctuation + penaliteRegularite + suite.cout
      if (cout < meilleur.cout) meilleur = { cout, coupes: [fin, ...suite.coupes] }
    }
    memo.set(cle, meilleur)
    return meilleur
  }
  const { coupes } = chercher(0, 0, 9999)
  let depart = 0
  return coupes.map(fin => {
    const ligne = mots.slice(depart, fin).join(' ')
    depart = fin
    return ligne
  }).filter(Boolean)
}

function decouperTitreColophon(texte: string) {
  return decouperColophon(texte, 7, 34, 58)
}

function rendreLignesColophonAvecLargeurs(lignes: string[], style: React.CSSProperties) {
  const lens = lignes.map(l => l.length)
  const maxLen = Math.max(...lens, 1)
  // Garantir décroissance stricte des largeurs
  const pcts: number[] = lens.map(l => Math.round(96 * l / maxLen))
  for (let i = 1; i < pcts.length; i++) {
    if (pcts[i] >= pcts[i - 1] - 2) pcts[i] = pcts[i - 1] - 4
  }
  const largeurs = pcts.map(p => `${Math.max(10, p)}%`)
  return (
    <span className="titre-colophon" lang="fr" style={style}>
      {lignes.map((ligne, index) => (
        <span key={`${ligne}-${index}`} style={{ display: 'block', width: largeurs[index], textAlign: 'center' }}>
          {rendreTexteEnrichi(ligne)}
        </span>
      ))}
    </span>
  )
}

function rendreTitreColophon(texte: string) {
  const propre = preparerTitreColophon(texte)
  if (propre.length < SEUIL_TITRE_COLOPHON || !titreCompatibleColophon(propre)) return rendreTexteEnrichi(propre)
  const lignes = decouperTitreColophon(propre)
  if (lignes.length <= 1) return rendreTexteEnrichi(propre)
  return rendreLignesColophonAvecLargeurs(lignes, { display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '40.625rem', margin: '0 auto', lineHeight: 1.24, wordSpacing: '-0.04em', letterSpacing: '-0.004em', hyphens: 'none', WebkitHyphens: 'none' } as React.CSSProperties)
}

function rendreLongTexteColophon(texte: string) {
  const propre = preparerTitreColophon(texte)
  return rendreTexteEnrichi(propre)
}

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001',    label: 'Bible de Sacy' },
  { code: 'TR0002',     label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

// Extrait le préfixe de numérotation divergente du texte d'un verset.
// Format stocké en DB : "(Psaumes 9, 22 dans la Vulgate) ut quid Domine…"
// Retourne { note, corps } — note est null si le texte est sans préfixe.
function extraireNoteVerset(texte: string): { note: string | null; corps: string } {
  const m = texte.match(/^\(([^)]+)\)\s+(.+)$/s)
  if (m) return { note: m[1], corps: m[2] }
  return { note: null, corps: texte }
}

let _codesTraductionsCache: PromiseLike<string[]> | null = null
function chargerCodesTraductions(): PromiseLike<string[]> {
  if (!_codesTraductionsCache) {
    _codesTraductionsCache = supabase.from('traductions').select('trad_id').order('ordre', { ascending: true })
      .then(
        ({ data }) => {
          const codes = (data ?? []).map((t: any) => t.trad_id).filter((code: string) => /^TR\d{4}$/.test(code))
          return codes.length > 0 ? codes : TRADUCTIONS_FALLBACK.map(t => t.code)
        },
        () => TRADUCTIONS_FALLBACK.map(t => t.code)
      )
  }
  return _codesTraductionsCache
}

// ── Info-bulle de note ────────────────────────────────────────────────────────
function NoteTooltip({ lettre, contenu }: { lettre: string; contenu: string }) {
  const [visible, setVisible] = useState(false)
  const [figee, setFigee] = useState(false)
  const [rect, setRect] = useState<{ left: number; top: number; bottom: number } | null>(null)
  const marceurRef = useRef<HTMLElement>(null)
  const timerFiger = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerMasquer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const effacerTimers = () => {
    if (timerFiger.current) { clearTimeout(timerFiger.current); timerFiger.current = null }
    if (timerMasquer.current) { clearTimeout(timerMasquer.current); timerMasquer.current = null }
  }

  const fermer = useCallback(() => {
    effacerTimers()
    setVisible(false)
    setFigee(false)
  }, [])

  const survolMarceur = () => {
    effacerTimers()
    if (marceurRef.current) {
      const r = marceurRef.current.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, bottom: r.bottom })
    }
    setVisible(true)
    timerFiger.current = setTimeout(() => setFigee(true), 4000)
  }

  const quitterMarceur = () => {
    if (timerFiger.current) { clearTimeout(timerFiger.current); timerFiger.current = null }
    if (!figee) {
      timerMasquer.current = setTimeout(() => setVisible(false), 200)
    }
  }

  const entrerTooltip = () => {
    effacerTimers()
    setFigee(true)
  }

  // Fermeture sur Échap ou clic extérieur quand figée
  useEffect(() => {
    if (!figee || !visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-note-tooltip]')) fermer()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [figee, visible, fermer])

  // Fermeture sur scroll si pas figée
  useEffect(() => {
    if (!visible || figee) return
    const onScroll = () => setVisible(false)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [visible, figee])

  useEffect(() => () => effacerTimers(), [])

  const W = 340
  const placerEnHaut = (rect?.top ?? 300) > 180

  const tooltip = visible ? (
    <div
      data-note-tooltip=""
      onMouseEnter={entrerTooltip}
      style={{
        position: 'fixed',
        left: Math.max(8, Math.min(rect?.left ?? 0, (typeof window !== 'undefined' ? window.innerWidth : 900) - W - 8)),
        top: placerEnHaut ? (rect?.top ?? 0) - 8 : (rect?.bottom ?? 0) + 8,
        transform: placerEnHaut ? 'translateY(-100%)' : 'none',
        width: W,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 340,
        overflowY: 'auto',
        background: '#faf6ee',
        border: '1px solid #c8b89e',
        borderRadius: 5,
        boxShadow: '0 6px 24px rgba(44,30,10,0.20)',
        padding: '10px 12px',
        zIndex: 9999,
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: '0.78125rem',
        lineHeight: 1.65,
        color: '#2a2218',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', color: '#9a8a6e', textTransform: 'uppercase' }}>
          Note {lettre}
        </span>
        {figee && (
          <button
            onClick={fermer}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a08a', fontSize: '0.9375rem', lineHeight: 1, padding: '0 2px' }}
          >×</button>
        )}
      </div>
      <div style={{ whiteSpace: 'pre-line' }}>
        {contenu || <em style={{ color: '#b0a08a' }}>Note indisponible</em>}
      </div>
    </div>
  ) : null

  return (
    <>
      <sup
        ref={marceurRef as React.RefObject<HTMLElement>}
        onMouseEnter={survolMarceur}
        onMouseLeave={quitterMarceur}
        style={{
          cursor: 'help',
          color: '#8a6a3e',
          fontSize: '0.60em',
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontStyle: 'normal',
          userSelect: 'none',
          letterSpacing: 0,
          display: 'inline-block',
          lineHeight: 1,
          padding: '0 1px',
          borderBottom: '1px dotted #c8a87a',
        }}
      >
        {lettre}
      </sup>
      {visible && typeof document !== 'undefined' && createPortal(tooltip, document.body)}
    </>
  )
}

// Variante de rendreTexteEnrichi qui gère aussi les marqueurs [[A]] de notes.
function rendreTexteAvecNotes(texte: string, notes: Record<string, string>): React.ReactNode {
  const noeuds: React.ReactNode[] = []
  // Le marqueur stocké ([[A]], [[B]]…) reste la clé de la note en base : c'est
  // lui qui donne accès au texte. Seul l'appel AFFICHÉ change — un numéro, selon
  // l'usage français. La numérotation suit l'ordre d'apparition et se fait par
  // marqueur distinct : une note rappelée deux fois garde son numéro.
  const numeros = new Map<string, number>()
  const numeroDe = (marqueur: string) => {
    const connu = numeros.get(marqueur)
    if (connu) return connu
    const n = numeros.size + 1
    numeros.set(marqueur, n)
    return n
  }
  const regex = /\*\*(.+?)\*\*|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\[\[([A-Z0-9]+)\]\]|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(texte.slice(dernierIndex, m.index))
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{m[1]}</strong>)
    else if (m[2] !== undefined) noeuds.push(<sup key={k++}>{m[2]}</sup>)
    else if (m[3] !== undefined) noeuds.push(<em key={k++}>{m[3]}</em>)
    else if (m[4] !== undefined) noeuds.push(
      <a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: '#3d6b4f', textDecoration: 'underline' }}>{m[4]}</a>
    )
    else if (m[6] !== undefined) {
      const marqueur = m[6]
      noeuds.push(<NoteTooltip key={k++} lettre={String(numeroDe(marqueur))} contenu={notes[marqueur] ?? ''} />)
    }
    else if (m[7] !== undefined) {
      noeuds.push(<span key={k++} style={STYLE_ROMAIN}>{m[7]}</span>)
      noeuds.push(<sup key={k++} style={STYLE_ORDINAL}>{m[8]}</sup>)
      noeuds.push(m[9])
    }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}

// ── Proposition de lien biblique (non-admin) ──────────────────────────────────
function ProposerLienBiblique({ segId }: { segId: number }) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'err'>('idle')

  const envoyer = async () => {
    if (!texte.trim()) return
    setStatut('envoi')
    try {
      await insererSignalement({ id_segment: segId, message: `Proposition de lien biblique : ${texte.trim()}`, importance: 'important', url_source: window.location.href })
      setStatut('ok')
      setTimeout(() => { setOuvert(false); setStatut('idle'); setTexte('') }, 1800)
    } catch { setStatut('err') }
  }

  return (
    <>
      <button onClick={() => { setTexte(''); setStatut('idle'); setOuvert(true) }}
        style={{ fontSize: '0.6875rem', color: '#6b8270', background: 'rgba(61,107,79,0.04)', border: '1px dashed #b8cdc0', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px', width: '100%', textAlign: 'left' }}>
        + Proposer un lien biblique
      </button>
      {ouvert && (
        <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '8px', padding: '20px 22px', width: '22.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3d6b4f', margin: 0 }}>Proposer un lien biblique</p>
              <button onClick={() => setOuvert(false)} style={{ fontSize: '0.875rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            <p style={{ fontSize: '0.65625rem', color: '#9a958d', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.45 }}>
              Indiquez la référence biblique que vous souhaitez associer à ce passage (ex. : Jn 1, 1 ou Rm 8, 28-30).
            </p>
            {statut === 'ok' ? (
              <p style={{ fontSize: '0.71875rem', color: '#3d6b4f', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Proposition envoyée, merci !</p>
            ) : (
              <>
                <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} autoFocus
                  placeholder="Référence biblique proposée…"
                  style={{ width: '100%', fontSize: '0.6875rem', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  {statut === 'err' && <span style={{ fontSize: '0.625rem', color: '#c0562a', alignSelf: 'center' }}>Erreur d'envoi.</span>}
                  <button onClick={() => setOuvert(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={envoyer} disabled={statut === 'envoi' || !texte.trim()}
                    style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: texte.trim() ? 'pointer' : 'default', background: texte.trim() ? '#3d6b4f' : '#e4dfd8', color: texte.trim() ? '#fff' : '#9a958d', fontWeight: 500 }}>
                    {statut === 'envoi' ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function OeuvreClient({ auteur, auteurId, idOeuvre, estAdmin: estAdminReel, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, niv1Initial = null, vueInitiale = 'texte' }: Props) {
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const estAdmin = estAdminReel && !modeUtilisateurStandard
  // Charge la table des éditeurs (une fois) pour afficher les noms complets répertoriés.
  useEditeursCharges()
  const { favoris: favorisOeuvres, pret: favorisPret, toggle: toggleFavoriOeuvre } = useFavoris('oeuvre')
  const [segActif, setSegActif] = useState<number | null>(segmentCibleId)
  const [tradIndex, setTradIndex] = useState(0)
  const [traductionsBible, setTraductionsBible] = useState(TRADUCTIONS_FALLBACK)
  const [tradOuverte, setTradOuverte] = useState(false)
  const [ongletDroit, setOngletDroit] = useState<'refs' | 'commentaires' | 'problemes'>('refs')
  const [userId, setUserId] = useState<string | null>(null)
  const [sauvegardesSegs, setSauvegardesSegs] = useState<Set<number>>(new Set())
  const [vue, setVue] = useState<'texte' | 'apparat'>(vueInitiale)
  const [editionCible, setEditionCible] = useState<EditionCible | null>(null)
  const [titreAffiche, setTitreAffiche] = useState(oeuvre.titre)
  const [oeuvreLocale, setOeuvreLocale] = useState<Props['oeuvre']>(oeuvre)
  const [navOuverte, setNavOuverte] = useState(true)
  const [panneauOuvert, setPanneauOuvert] = useState(true)
  // ≤ 900px : nav et apparat en barres fixes + tiroirs (voir AGENTS § mobile).
  const mobile = useEstMobile(900)
  // Mobile : actions de segment masquées, révélées à l'appui long (comme les
  // versets de la page Bible).
  const [actionsSegMobileId, setActionsSegMobileId] = useState<number | null>(null)
  const appuiLongRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appuiLongDeclenche = useRef(false)
  const [infoEditionOuverte, setInfoEditionOuverte] = useState(false)
  const [auteurModalOuvert, setAuteurModalOuvert] = useState(false)
  // null = largeur AUTO (responsive, s'adapte à l'écran, plancher de lisibilité) ;
  // number = largeur fixée à la main (drag), en px.
  const [navWidth, setNavWidth] = useState<number | null>(null)
  const [pannWidth, setPannWidth] = useState<number | null>(null)
  const voletsDirty = navWidth !== null || pannWidth !== null
  const refNav = useRef<HTMLElement>(null)
  const refAside = useRef<HTMLElement>(null)
  const [configNiveaux, setConfigNiveaux] = useState({
    sommaire: niveauxSommaire ?? 1, corps: niveauxCorps ?? 1,
    txtSommaire: (txtSommaire ?? []).concat([false,false,false,false,false]).slice(0,5) as boolean[],
    txtCorps: (txtCorps ?? []).concat([false,false,false,false,false]).slice(0,5) as boolean[],
    afficherNumeros: afficherNumeros ?? true,
  })
  const [configOuverte, setConfigOuverte] = useState(false)
  const [configEnvoi, setConfigEnvoi] = useState(false)
  const resetVolets = () => { setNavWidth(null); setPannWidth(null); try { localStorage.removeItem('cs_volets_oeuvre2') } catch {} }
  const [problemes, setProblemes] = useState<{
    id: number; segment_numero: number; segment_texte: string
    reference_manuelle: string | null; ref_niv1: string | null
    liens: { canon_id: string | null; fiabilite: string; motif: string | null }[]
    aConstituer: boolean
  }[]>([])
  const [problemesCharges, setProblemesCharges] = useState(false)
  const [filtreProbleme, setFiltreProbleme] = useState<'lien_a_constituer' | 'probable'>('lien_a_constituer')
  const [versetsAltMap, setVersetsAltMap] = useState<Record<string, { ref: string; chapAlt: number | null; verAlt: number | null; texte: string | null }>>({})
  const [apercuVerset, setApercuVerset] = useState<{ label: string; texte: string | null } | null>(null)
  const [nbCommentairesOeuvre, setNbCommentairesOeuvre] = useState<number | null>(null)
  useEffect(() => {
    if (segActif === null) { setNbCommentairesOeuvre(null); return }
    supabase.from('commentaires').select('id', { count: 'exact', head: true })
      .eq('id_segment', segActif)
      .then(({ count }) => setNbCommentairesOeuvre(count ?? 0))
  }, [segActif])
  const [suggestionSignalee, setSuggestionSignalee] = useState<{ id: number; segment_numero: number; segment_texte: string; nature?: string } | null>(null)
  const tradSelectRef = useRef<HTMLDivElement>(null)
  // Onglet « Problèmes ». La fiabilité se porte AU LIEN depuis le 20 juillet 2026
  // (charte §24.3) : `segments.fiabilite` est vidée et les colonnes `lien_1` à
  // `lien_4` n'existent plus. Cet onglet interrogeait encore les deux, avec des
  // valeurs abolies (« Lien à constituer ») — il ne pouvait donc rien afficher.
  // On part désormais de `liens_bibliques`, et l'on remonte aux segments.
  useEffect(() => {
    if (ongletDroit !== 'problemes' || problemesCharges || !idOeuvre) return
    ;(async () => {
      const { data: segsOeuvre } = await supabase.from('segments')
        .select('id, segment_numero, segment_texte, reference_manuelle, ref_niv1')
        .eq('id_oeuvre', idOeuvre).order('segment_numero')
      const parId = new Map((segsOeuvre ?? []).map(s => [s.id, s]))

      // Deux familles, conformes au vocabulaire du §24.3 :
      //   · « à constituer » — une source est visée, elle n'est pas résolue (sans cible) ;
      //   · « à vérifier »  — tout ce qui attend une lecture (`arbitrage_requis`).
      const liens: { segment_id: number; canon_id: string | null; fiabilite: string; motif: string | null }[] = []
      const ids = [...parId.keys()]
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await supabase.from('liens_bibliques')
          .select('segment_id, canon_id, fiabilite, motif, arbitrage_requis')
          .in('segment_id', ids.slice(i, i + 500))
          .or('fiabilite.eq.à constituer,arbitrage_requis.is.true')
        liens.push(...((data ?? []) as any[]))
      }
      const parSegment = new Map<number, typeof liens>()
      for (const l of liens) {
        if (!parSegment.has(l.segment_id)) parSegment.set(l.segment_id, [])
        parSegment.get(l.segment_id)!.push(l)
      }
      const lignes = [...parSegment.entries()]
        .map(([sid, ls]) => {
          const s = parId.get(sid)
          if (!s) return null
          return { ...s, liens: ls, aConstituer: ls.some(l => l.fiabilite === 'à constituer') }
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.segment_numero - b.segment_numero)
      setProblemes(lignes as any)
      setProblemesCharges(true)

      const idsVersets = Array.from(new Set(liens.map(l => l.canon_id).filter(Boolean) as string[]))
      if (idsVersets.length > 0) {
        const { data: vs } = await supabase.from('versets_lecture')
          .select('id_verset, ref, chapitre_alternatif, verset_alternatif, TR0001, TR0002, TR0003')
          .in('id_verset', idsVersets)
        const map: Record<string, { ref: string; chapAlt: number | null; verAlt: number | null; texte: string | null }> = {}
        ;(vs ?? []).forEach((v: any) => {
          // Texte de référence : Crampon, à défaut Segond, à défaut Sacy.
          const texte = v.TR0003 || v.TR0002 || v.TR0001 || null
          map[v.id_verset] = { ref: v.ref ?? v.id_verset, chapAlt: v.chapitre_alternatif ?? null, verAlt: v.verset_alternatif ?? null, texte }
        })
        setVersetsAltMap(map)
      }
    })()
  }, [ongletDroit, idOeuvre, problemesCharges])
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('cs_volets_oeuvre2') ?? 'null')
      if (s?.nav) setNavWidth(s.nav)
      if (s?.pann) setPannWidth(s.pann)
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth < 900) {
      setNavOuverte(false)
      setPanneauOuvert(false)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem('cs_volets_oeuvre2', JSON.stringify({ nav: navWidth, pann: pannWidth }))
  }, [navWidth, pannWidth])
  useEffect(() => {
    if (!tradOuverte) return
    const fermerAuClicExterieur = (event: MouseEvent) => {
      if (tradSelectRef.current && !tradSelectRef.current.contains(event.target as Node)) {
        setTradOuverte(false)
      }
    }
    document.addEventListener('mousedown', fermerAuClicExterieur)
    return () => document.removeEventListener('mousedown', fermerAuClicExterieur)
  }, [tradOuverte])

    const [oeuvresAuteur, setOeuvresAuteur] = useState<OeuvreResumee[]>([])
  const [auteurOuvert, setAuteurOuvert] = useState(false)
  const [apparatOuvert, setApparatOuvert] = useState(false)
  const [sommaireOuvert, setSommaireOuvert] = useState(true)
  const [apparatNiv1Actif, setApparatNiv1Actif] = useState<string | null>(null)
  const [ancreEnAttente, setAncreEnAttente] = useState<string | null>(null)

  useEffect(() => {
    if (!ancreEnAttente || vue !== 'apparat') return
    const el = document.getElementById(ancreEnAttente)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setAncreEnAttente(null) }
  }, [vue, ancreEnAttente])

  // Navigation lazy par niv1
  const niv1List = niv1ListProp
  const texteSansNiveaux = niv1List.length === 0
  // Carte niv1 -> titre textuel, complete des le rendu serveur.
  // Elle reste enrichie apres modifications ou chargements forces.
  const [niv1TexteMap, setNiv1TexteMap] = useState<Record<string, string>>(niv1TexteMapProp)
  const [niv1Actif, setNiv1Actif] = useState<string>((niv1Initial && niv1List.includes(niv1Initial) ? niv1Initial : null) ?? niv1List[0] ?? '')
  const [groupes, setGroupes] = useState<GroupeData[]>(groupesInit)
  const [segments, setSegments] = useState<SegData[]>(segmentsInit)
  const [groupesApparat, setGroupesApparat] = useState<GroupeData[]>(groupesApparatInit)
  const [segmentsApparat, setSegmentsApparat] = useState<SegData[]>(segmentsApparatInit)
  const [niv1Loading, setNiv1Loading] = useState(false)
  const [niv1Erreur, setNiv1Erreur] = useState<string | null>(null)
  const [pageActuelle, setPageActuelle] = useState(0)
  const profondeurSommaire = configNiveaux.sommaire
  const profondeurCorps = configNiveaux.corps
  // Navigation par niv2 (si profondeur >= 2)
  const [niv2Actif, setNiv2Actif] = useState<string | null>(null)

  const niv1Index = niv1List.indexOf(niv1Actif)
  const niv1Prev = niv1Index > 0 ? niv1List[niv1Index - 1] : null
  const niv1Next = niv1Index < niv1List.length - 1 ? niv1List[niv1Index + 1] : null

  // Cache mémoire des niv1 déjà chargés : navigation instantanée au retour sur
  // un niveau déjà visité, et préchargement discret des niv1 voisins en tâche
  // de fond pour réduire la latence perçue au clic sur Suivant/Précédent.
  const cacheNiv1Ref = useRef<Map<string, { groupes: GroupeData[]; segments: SegData[] }>>(new Map())
  useEffect(() => {
    cacheNiv1Ref.current.set(niv1Actif, { groupes: groupesInit, segments: segmentsInit })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingScrollTopRef = useRef(false)
  const pendingScrollSegRef = useRef<number | null>(null)
  useEffect(() => {
    if (!pendingScrollTopRef.current || vue !== 'texte') return
    pendingScrollTopRef.current = false
    document.getElementById('barre-nav-niv1')?.scrollIntoView({ block: 'start' })
  }, [vue, groupes])
  // Liste des niv2 du niv1 actif (sert au sommaire)
  const niv2List = Array.from(new Set(groupes.map(g => g.niv2).filter(Boolean)))

  // Pagination : découpe les groupes en pages de CHARS_PAR_PAGE caractères max,
  // sans jamais couper un groupe (niv3/4/5 solidaires).
  const segCharMap = useMemo(() => {
    const m = new Map<number, number>()
    segments.forEach(s => m.set(s.id, s.texte?.length ?? 0))
    return m
  }, [segments])

  const pages = useMemo(() => {
    if (groupes.length === 0) return [[]] as GroupeData[][]
    if (texteSansNiveaux) {
      const result: GroupeData[][] = []
      let currentIds: number[] = []
      let currentChars = 0
      let pageIndex = 0
      const flush = () => {
        if (currentIds.length === 0) return
        result.push([{
          niv1: '', niv2: '', niv3: '', niv4: '',
          niv1_texte: '', niv2_texte: '', niv3_texte: '', niv4_texte: '',
          anchor: `g-sans-niveaux-${pageIndex++}`,
          itemIds: currentIds,
        }])
        currentIds = []
        currentChars = 0
      }
      const tousIds = groupes.flatMap(g => g.itemIds)
      for (const id of tousIds) {
        const chars = segCharMap.get(id) ?? 0
        if (currentIds.length > 0 && currentChars + chars > CHARS_PAR_PAGE) flush()
        currentIds.push(id)
        currentChars += chars
      }
      flush()
      return result.length > 0 ? result : [[]]
    }
    const result: GroupeData[][] = []
    let current: GroupeData[] = []
    let currentChars = 0
    for (const groupe of groupes) {
      const gc = groupe.itemIds.reduce((acc, id) => acc + (segCharMap.get(id) ?? 0), 0)
      if (current.length > 0 && currentChars + gc > CHARS_PAR_PAGE) {
        result.push(current)
        current = [groupe]
        currentChars = gc
      } else {
        current.push(groupe)
        currentChars += gc
      }
    }
    if (current.length > 0) result.push(current)
    return result
  }, [groupes, segCharMap, texteSansNiveaux])

  const groupesFiltres = useMemo(() => pages[pageActuelle] ?? [], [pages, pageActuelle])

  useEffect(() => {
    const segId = pendingScrollSegRef.current
    if (!segId) return
    const g = groupes.find(gr => gr.itemIds.includes(segId))
    if (!g) return
    pendingScrollSegRef.current = null
    const pageIdx = pages.findIndex(p => p.some(gr => gr.anchor === g.anchor))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
    setTimeout(() => document.getElementById(g.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [groupes, pages, pageActuelle])

  const premierSegmentId = pageActuelle === 0 && groupesFiltres.length > 0
    ? (groupesFiltres[0].itemIds[0] ?? null)
    : null

  const segmentsFiltres = useMemo(() => {
    const ids = new Set(groupesFiltres.flatMap(g => g.itemIds))
    return segments.filter(s => ids.has(s.id))
  }, [groupesFiltres, segments])

  // Scroll-spy du sommaire : au défilement, le niveau 2 (question, section…)
  // effectivement à l'écran devient l'actif dans le sommaire — et non celui sur
  // lequel on avait cliqué en dernier. On retient le dernier groupe dont le haut
  // est passé sous la barre fixe (sticky 48px + barre de navigation niv1).
  useEffect(() => {
    if (vue !== 'texte') return
    const onScroll = () => {
      const seuil = 140
      let n2Courant: string | null = null
      let trouve = false
      for (const g of groupesFiltres) {
        const el = document.getElementById(g.anchor)
        if (!el) continue
        if (el.getBoundingClientRect().top - seuil <= 0) {
          n2Courant = g.niv2 || null
          trouve = true
        } else break
      }
      if (trouve) setNiv2Actif(prev => (prev === n2Courant ? prev : n2Courant))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [groupesFiltres, vue])

  // Navigue vers une ancre en changeant de page si nécessaire
  const naviguerVersAncre = useCallback((ancre: string) => {
    const pageIdx = pages.findIndex(p => p.some(g => g.anchor === ancre))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) {
      setPageActuelle(pageIdx)
      setTimeout(() => document.getElementById(ancre)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } else {
      document.getElementById(ancre)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [pages, pageActuelle])

  // Deep link : aller à la bonne page de pagination puis scroller sur le segment
  useEffect(() => {
    if (!segmentCibleId) return
    const pageIdx = pages.findIndex(p => p.some(g => g.itemIds.includes(segmentCibleId)))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentCibleId, pages])

  useEffect(() => {
    if (!segmentCibleId) return
    let stopped = false
    const tryScroll = (attempt = 0) => {
      if (stopped) return
      const el = document.getElementById(`segment-${segmentCibleId}`)
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
      else if (attempt < 15) window.setTimeout(() => tryScroll(attempt + 1), 200)
    }
    const timer = window.setTimeout(() => tryScroll(), 100)
    return () => { stopped = true; window.clearTimeout(timer) }
  }, [segmentCibleId, pageActuelle])

  const allerAuNiv2 = (n2: string | null) => {
    setNiv2Actif(n2)
    setVue('texte')
    if (!n2) return
    const ancre = groupes.find(g => g.niv2 === n2)?.anchor
    if (ancre) naviguerVersAncre(ancre)
  }

  const chargerNiv1Data = async (n1: string): Promise<{ groupes: GroupeData[]; segments: SegData[] }> => {
    const SELECT = 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes'
    const segs: any[] = []
    let from = 0
    while (true) {
      let requete = supabase
        .from('segments')
        .select(SELECT)
        .eq('id_oeuvre', idOeuvre)
        .eq('nature', 'texte')
        .order('segment_numero')
        .range(from, from + 999)
      if (!texteSansNiveaux || n1) requete = requete.eq('ref_niv1', n1)
      const { data: batch } = await requete
      if (!batch || batch.length === 0) break
      segs.push(...batch)
      if (batch.length < 1000) break
      from += 1000
    }

    // Les liens ne sont plus portés par le segment : on les rapporte de
    // `liens_bibliques` et on les repose au format attendu par l'affichage.
    await hydraterLiensHerites(segs)

    const tousIds = new Set<string>()
    const segsAffichables = segs.filter(segmentAffichable)

    segsAffichables.forEach((s: any) => {
      [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).forEach((v: string) =>
        v.split(';').map((x: string) => x.trim()).filter(Boolean).forEach((x: string) => tousIds.add(x)))
    })
    const idsArr = Array.from(tousIds)
      let versetMap: Record<string,{label:string;textes:Record<string,string>;livre:string;chapitre:string;verset:string}> = {}
    if (idsArr.length > 0) {
      const codesTraductions = await chargerCodesTraductions()
      const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
      const { data: vd } = await supabase.from('versets_lecture')
        .select(selectVersets)
        .in('id_verset', idsArr)
      ;(vd ?? []).forEach((v: any) => {
        const ref = detailsRefBiblique(v.ref)
        const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))
        versetMap[v.id_verset] = { ...ref, textes }
      })
    }

    let c = 0
    const newSegs: SegData[] = segsAffichables.map((s: any) => {
      c++
      const versets = extraireVersetsAvecNature(s)
        .map(({ id: vid, natures }) => ({ id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))
      return { id: s.id, numero: c, texte: s.segment_texte, versets, notes: parseNotes(s.notes) }
    })

    const newGroupes: GroupeData[] = []
    let cur: any = { niv1:'', niv2:'', niv3:'', niv4:'', itemIds:[] as number[] }
    let gi = 0
    segsAffichables.forEach((s: any) => {
      const n1v = s.ref_niv1||'', n2v = s.ref_niv2||'', n3v = s.ref_niv3||'', n4v = s.ref_niv4||''
      if (n1v !== cur.niv1 || n2v !== cur.niv2 || n3v !== cur.niv3 || n4v !== cur.niv4) {
        if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `g${gi++}` })
        cur = {
          niv1: n1v, niv2: n2v, niv3: n3v, niv4: n4v,
          niv1_texte: s.ref_niv1_texte||'', niv2_texte: s.ref_niv2_texte||'',
          niv3_texte: s.ref_niv3_texte||'', niv4_texte: s.ref_niv4_texte||'',
          itemIds: [s.id]
        }
      } else cur.itemIds.push(s.id)
    })
    if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `g${gi}` })

    // Enrichir la carte niv1 → niv1_texte avec ce qu'on vient de charger
    const niv1TexteEntries: Record<string, string> = {}
    newGroupes.forEach(g => { if (g.niv1 && g.niv1_texte) niv1TexteEntries[g.niv1] = g.niv1_texte })
    if (Object.keys(niv1TexteEntries).length > 0)
      setNiv1TexteMap(prev => ({ ...prev, ...niv1TexteEntries }))

    return { groupes: newGroupes, segments: newSegs }
  }

  // Recharge tout l'apparat critique de l'œuvre depuis Supabase — nécessaire
  // après une modification ou une suppression admin, puisque l'apparat n'est
  // sinon chargé qu'une seule fois au rendu serveur de la page.
  const chargerApparatData = async () => {
    const { data } = await supabase
      .from('segments')
      .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature')
      .eq('id_oeuvre', idOeuvre)
      .eq('nature', 'apparat_critique')
      .order('segment_numero')
    const segs = ((data ?? []) as any[]).filter(segmentAffichable)

    let c = 0, n1c = ''
    const newSegs: SegData[] = segs.map((s: any) => {
      const n1v = s.ref_niv1 || ''
      if (n1v !== n1c) { c = 0; n1c = n1v }
      c++
      return { id: s.id, numero: c, texte: s.segment_texte, versets: [] }
    })

    const newGroupes: GroupeData[] = []
    let cur: any = { niv1: '', niv2: '', niv3: '', niv4: '', itemIds: [] as number[] }
    let gi = 0
    segs.forEach((s: any) => {
      const n1v = s.ref_niv1 || '', n2v = s.ref_niv2 || '', n3v = s.ref_niv3 || '', n4v = s.ref_niv4 || ''
      if (n1v !== cur.niv1 || n2v !== cur.niv2 || n3v !== cur.niv3 || n4v !== cur.niv4) {
        if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `a${gi++}` })
        cur = {
          niv1: n1v, niv2: n2v, niv3: n3v, niv4: n4v,
          niv1_texte: s.ref_niv1_texte || '', niv2_texte: s.ref_niv2_texte || '',
          niv3_texte: s.ref_niv3_texte || '', niv4_texte: s.ref_niv4_texte || '',
          itemIds: [s.id]
        }
      } else cur.itemIds.push(s.id)
    })
    if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `a${gi}` })

    setGroupesApparat(newGroupes)
    setSegmentsApparat(newSegs)
  }

  const changerNiv1 = async (n1: string, opts?: { forceRefresh?: boolean; conserverPosition?: boolean }) => {
    setNiv1Actif(n1)
    if (!opts?.conserverPosition) {
      setSegActif(null)
      setNiv2Actif(null)
      setVue('texte')
      setPageActuelle(0)
      pendingScrollTopRef.current = true
    }

    const enCache = !opts?.forceRefresh ? cacheNiv1Ref.current.get(n1) : undefined
    if (enCache) {
      setGroupes(enCache.groupes)
      setSegments(enCache.segments)
      setNiv1Loading(false)
      setNiv1Erreur(null)
    } else {
      setNiv1Loading(true)
      setNiv1Erreur(null)
      try {
        const donnees = await chargerNiv1Data(n1)
        cacheNiv1Ref.current.set(n1, donnees)
        setGroupes(donnees.groupes)
        setSegments(donnees.segments)
      } catch {
        setNiv1Erreur(n1)
      } finally {
        setNiv1Loading(false)
      }
    }

    // Préchargement discret des niv1 voisins, en tâche de fond
    const idx = niv1List.indexOf(n1)
    ;[niv1List[idx - 1], niv1List[idx + 1]].forEach(voisin => {
      if (voisin && !cacheNiv1Ref.current.has(voisin)) {
        chargerNiv1Data(voisin).then(d => cacheNiv1Ref.current.set(voisin, d)).catch(() => {})
      }
    })
  }

  // Cf. useMemo groupesFiltres / segmentsFiltres définis plus haut (après `pages`)

  const trad = traductionsBible[tradIndex]?.code ?? 'TR0001'
  const segMap = new Map(segmentsFiltres.map(s => [s.id, s]))
  const segMapApparat = new Map(segmentsApparat.map(s => [s.id, s]))
  const segMapActive = vue === 'texte' ? segMap : segMapApparat
  const segActifData = segActif !== null ? segMapActive.get(segActif) : null
  // idOeuvre vient des Props
  const hasApparat = segmentsApparat.length > 0
  // Le TOC apparat n'inclut que les niv1 qui ne sont PAS dans le sommaire texte :
  // les catéchèses avec des résidus apparat_critique ne doivent pas y apparaître.
  const niv1TexteSetClient = new Set(niv1List)
  const tocApparatLocal = (() => {
    const vus = new Set<string>()
    const out: { niv1: string; anchor: string }[] = []
    groupesApparat.forEach(g => {
      if (g.niv1 && !vus.has(g.niv1) && !niv1TexteSetClient.has(g.niv1)) {
        vus.add(g.niv1)
        out.push({ niv1: g.niv1, anchor: g.anchor })
      }
    })
    return out
  })()

  // Détection session + chargement des segments déjà sauvegardés
  // + traduction biblique par défaut choisie dans Mon compte
  const chargerTraductionDefaut = (uid: string) => {
    supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle().then(({ data }) => {
      if (data?.traduction_defaut) {
        localStorage.setItem('traduction_defaut', data.traduction_defaut)
        const idx = traductionsBible.findIndex(t => t.code === data.traduction_defaut)
        if (idx >= 0) setTradIndex(idx)
      }
    })
  }

  useEffect(() => {
    supabase.from('traductions').select('trad_id, nom').order('ordre', { ascending: true }).then(({ data }) => {
      if (data?.length) setTraductionsBible(data.map((t: any) => ({ code: t.trad_id, label: t.nom })))
    })
  }, [])

  useEffect(() => {
    const code = localStorage.getItem('traduction_defaut')
    if (!code) return
    const idx = traductionsBible.findIndex(t => t.code === code)
    if (idx >= 0) setTradIndex(idx)
  }, [traductionsBible])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre)
      if (uid) chargerTraductionDefaut(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre)
      else setSauvegardesSegs(new Set())
      if (uid) chargerTraductionDefaut(uid)
    })
    return () => listener.subscription.unsubscribe()
  }, [idOeuvre])

  useEffect(() => {
    if (idOeuvre && oeuvre?.titre) {
      localStorage.setItem('cs_derniere_oeuvre', JSON.stringify({ id: idOeuvre, titre: oeuvre.titre, auteur }))
    }
  }, [idOeuvre, oeuvre?.titre, auteur])

  useEffect(() => {
    if (!auteurId) return
    supabase.from('oeuvres').select('id_oeuvre, titre, note')
      .eq('id_auteur', auteurId)
      .neq('id_oeuvre', idOeuvre)
      .order('titre')
      .then(({ data }) => setOeuvresAuteur(((data ?? []) as any[]).filter(estOeuvrePubliee)))
  }, [auteurId, idOeuvre])

  const chargerSauvegardesSegs = async (uid: string, oeuvreId: string) => {
    const { data } = await supabase
      .from('prelevements')
      .select('segment_numero')
      .eq('user_id', uid)
      .eq('type', 'patristique')
      .eq('id_oeuvre', oeuvreId)
    setSauvegardesSegs(new Set((data ?? []).map((r: any) => r.segment_numero)))
  }

  const marquerSauvegardeSeg = (num: number) => {
    setSauvegardesSegs(prev => new Set([...prev, num]))
  }

  // Met à jour l'affichage immédiatement après l'association d'un verset,
  // sans recharger tout le niv1 depuis Supabase.
  const associerVersetLocal = (segId: number) => (_champ: 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4', verset: typeof segments[number]['versets'][number]) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: [...s.versets, verset] } : s))
  }

  // Les liens vivent dans `liens_bibliques` depuis le 20 juillet 2026 (§24.1).
  // Cette fonction réécrivait encore `segments.lien_1` à `lien_4` : ces colonnes
  // subsistent mais sont vides, si bien que le bouton ne supprimait rien — sans
  // la moindre erreur. On supprime désormais les lignes de la table, tous types
  // confondus : le bouton porte sur le verset, pas sur l'un de ses rapports.
  const supprimerLienBiblique = async (segId: number, versetId: string) => {
    if (!estAdmin) return
    if (!confirm('Supprimer ce lien biblique ?')) return
    const { error } = await supabase.from('liens_bibliques')
      .delete().eq('segment_id', segId).eq('canon_id', versetId)
    if (error) { alert('Suppression impossible : ' + error.message); return }
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => v.id !== versetId) } : s))
  }

  return (
    <div style={{ background: '#f7f4ef', minHeight: '100vh' }}>
      <style>{`
        .seg-wrapper { position: relative; }
        .seg-wrapper::after { content: ''; position: absolute; top: 0; right: -44px; width: 44px; height: 100%; pointer-events: none; }
        .seg-p { transition: background 0.12s; }
        .seg-p:hover { background: rgba(61,107,79,0.05) !important; }
        .seg-actions { opacity: 0; transition: opacity 0.15s; position: relative; z-index: 2; pointer-events: auto; }
        .seg-wrapper:hover .seg-actions { opacity: 1; }
        .seg-wrapper--actif .seg-actions { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-enreg { opacity: 1 !important; }
        .seg-wrapper .seg-btn-enreg { opacity: 0; }
        .seg-wrapper--actif .seg-btn-enreg { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-action { opacity: 1 !important; }
        .seg-wrapper .seg-btn-action { opacity: 0; }
        .seg-wrapper--actif .seg-btn-action { opacity: 0.5; }
        @media(max-width: 980px){
          .titre-colophon{max-width:100%!important;line-height:1.32!important;word-spacing:normal!important;letter-spacing:0!important;}
          .titre-colophon > span{display:inline!important;width:auto!important;max-width:100%!important;}
          .titre-colophon > span:not(:last-child)::after{content:" ";}
        }
        .toc-lien-n1:hover, .toc-lien-n2:hover { color: #3d6b4f !important; }
        .ref-lien:hover { color: #3d6b4f !important; }
        .onglet-btn { transition: color 0.12s, border-color 0.12s; }
        .onglet-btn:hover { color: #3d6b4f !important; }
        .signal-btn:hover { color: #c0562a !important; }
        .trad-option:hover { background: rgba(61,107,79,0.06) !important; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── NAV GAUCHE ── */}
        {navOuverte ? (
        <>
        {/* Mobile : tiroir par-dessus le texte, sous la navbar. */}
        {mobile && <div onClick={() => setNavOuverte(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
        <nav ref={refNav} style={mobile ? {
          position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, overflowY: 'auto', background: '#faf8f4', borderBottom: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 28px rgba(45,35,25,0.22)',
        } : { width: navWidth == null ? 'clamp(240px, 16vw, 380px)' : navWidth + 'px', flexShrink: 0, position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', height: 'calc(100vh - 3.5rem)', overflowY: 'auto', borderRight: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div onMouseDown={e => {
            e.preventDefault()
            const startW = navWidth ?? refNav.current?.getBoundingClientRect().width ?? 240
            const startX = e.clientX
            const onMove = (ev: MouseEvent) => setNavWidth(Math.max(120, Math.min(400, startW + ev.clientX - startX)))
            const onUp = () => document.removeEventListener('mousemove', onMove)
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp, { once: true })
          }} style={{ position: 'absolute', right: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10, background: 'transparent', transition: 'background 0.14s, box-shadow 0.14s' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
              e.currentTarget.style.boxShadow = 'inset -1px 0 rgba(122,96,64,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3d6b4f', margin: 0 }}>{auteur}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {estAdmin && (
                  <button onClick={() => setConfigOuverte(true)} title="Configurer les niveaux d'affichage"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#b0a89e', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
                  </button>
                )}
                {favorisPret && (
                  <EtoileFavori actif={favorisOeuvres.has(idOeuvre)} onToggle={() => toggleFavoriOeuvre(idOeuvre)} size={13}
                    title={favorisOeuvres.has(idOeuvre) ? 'Retirer des favoris' : 'Ajouter aux favoris'} />
                )}
                <button onClick={() => setNavOuverte(false)} title="Réduire le sommaire"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#b0a89e', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', color: '#2a3d30', lineHeight: 1.35, margin: 0, whiteSpace: 'pre-line' }}>
              {rendreTexteEnrichi(titreAffiche)}
            </p>
            {(oeuvreLocale.sous_titre || oeuvreLocale.titre_original || oeuvreLocale.trad_auteur || oeuvreLocale.editeur || oeuvreLocale.ville || oeuvreLocale.date_publication || oeuvreLocale.collection) && (
              <button onClick={() => setInfoEditionOuverte(true)}
                style={{ fontSize: '0.625rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '6px', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                En savoir plus sur cette édition
              </button>
            )}
          </div>


          {oeuvresAuteur.length > 0 && (
            <div style={{ borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
              <button onClick={() => setAuteurOuvert(!auteurOuvert)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e' }}>DU MÊME AUTEUR</span>
                <span style={{ fontSize: '0.4375rem', color: '#c0bab0' }}>{auteurOuvert ? '▲' : '▼'}</span>
              </button>
              {auteurOuvert && (
                <div style={{ padding: '0 16px 12px' }}>
                  {oeuvresAuteur.map(o => (
                    <a key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
                      style={{ display: 'block', fontSize: '0.6875rem', color: '#3a3530', textDecoration: 'none', padding: '3px 0', lineHeight: 1.35, borderBottom: '1px solid #f0ece6' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#3d6b4f')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#3a3530')}>
                      {o.titre}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Apparat critique + Sommaire — conteneur partagé à hauteur égale */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {tocApparatLocal.length > 0 && (
              <div style={{ ...(apparatOuvert ? { flex: '0 1 auto', maxHeight: '50%', minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column', borderBottom: '1px solid #d6d0c4' }}>
                <button onClick={() => setApparatOuvert(!apparatOuvert)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e' }}>APPARAT CRITIQUE</span>
                  <span style={{ fontSize: '0.4375rem', color: '#c0bab0' }}>{apparatOuvert ? '▲' : '▼'}</span>
                </button>
                {apparatOuvert && (
                  <div style={{ flex: '0 1 auto', overflowY: 'auto', padding: '0 16px 14px' }}>
                    {tocApparatLocal.map((entry, i) => (
                      <div key={i}>
                        <a href={`#${entry.anchor}`} onClick={(e) => { e.preventDefault(); setVue('apparat'); setSegActif(null); setApparatNiv1Actif(entry.niv1); setAncreEnAttente(entry.anchor) }} className="toc-lien-n1"
                          style={{ display: 'block', fontSize: '0.71875rem', fontWeight: apparatNiv1Actif === entry.niv1 ? 600 : 400, color: apparatNiv1Actif === entry.niv1 ? '#3d6b4f' : '#3a3530', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
                          {entry.niv1}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ ...(sommaireOuvert ? { flex: 1, minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setSommaireOuvert(!sommaireOuvert)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e' }}>SOMMAIRE</span>
                <span style={{ fontSize: '0.4375rem', color: '#c0bab0' }}>{sommaireOuvert ? '▲' : '▼'}</span>
              </button>

              {sommaireOuvert && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
            <p style={{ display: 'none' }}></p>

            {texteSansNiveaux && (
              <p style={{ fontSize: '0.71875rem', color: '#9a958d', fontStyle: 'italic', lineHeight: 1.45, margin: '4px 0 0' }}>
                Texte complet
              </p>
            )}

            {!texteSansNiveaux && niv1List.map(n1 => {
              const estActif = vue === 'texte' && n1 === niv1Actif

              return (
                <div key={n1} style={{ marginBottom: profondeurSommaire >= 2 ? '6px' : '0' }}>
                  {/* Niv1 */}
                  <button onClick={() => changerNiv1(n1)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '0.71875rem', fontWeight: estActif ? 600 : 400, color: estActif ? '#3d6b4f' : '#3a3530', lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                    {n1}
                    {niv1TexteMap[n1] && configNiveaux.txtSommaire[0] && (
                      <span style={{ fontSize: '0.59375rem', color: estActif ? '#3d6b4f' : '#9a958d', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px' }}>{niv1TexteMap[n1]}</span>
                    )}
                  </button>

                  {/* Niv2 — affiché si profondeur >= 2 ET niv1 actif */}
                  {profondeurSommaire >= 2 && estActif && niv2List.map(n2 => {
                    const g2 = groupes.find(g => g.niv2 === n2)
                    const n2txt = g2?.niv2_texte || ''
                    const actif2 = vue === 'texte' && niv2Actif === n2
                    // Niv3 distincts pour ce niv2
                    const niv3DeN2 = profondeurSommaire >= 3
                      ? Array.from(new Set(groupes.filter(g => g.niv2 === n2 && g.niv3).map(g => g.niv3)))
                      : []
                    return (
                      <div key={n2} style={{ borderLeft: actif2 ? '2px solid #3d6b4f' : '2px solid transparent', marginBottom: '2px' }}>
                        {/* Bouton niv2 */}
                        <button
                          onClick={() => allerAuNiv2(actif2 ? null : n2)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0 3px 8px' }}>
                          <span style={{ fontSize: '0.65625rem', color: actif2 ? '#3d6b4f' : '#7a7268', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3 }}>{n2}</span>
                          {n2txt && configNiveaux.txtSommaire[1] && <span style={{ fontSize: '0.59375rem', color: actif2 ? '#3d6b4f' : '#9a958d', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px' }}>{n2txt}</span>}
                        </button>
                        {/* Niv3 — toujours visible, sans accordéon */}
                        {niv3DeN2.map(n3 => {
                          const g3 = groupes.find(g => g.niv2 === n2 && g.niv3 === n3)
                          const n3txt = g3?.niv3_texte || ''
                          const ancre = groupes.find(g => g.niv2 === n2 && g.niv3 === n3)?.anchor
                          return (
                            <button key={n3}
                              onClick={() => {
                                setVue('texte')
                                if (ancre) naviguerVersAncre(ancre)
                              }}
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 2px 16px' }}>
                              <span style={{ fontSize: '0.59375rem', color: '#9a958d', display: 'block', lineHeight: 1.3 }}>{n3}</span>
                              {n3txt && configNiveaux.txtSommaire[2] && <span style={{ fontSize: '0.5625rem', color: '#b0a89e', fontStyle: 'italic', display: 'block', lineHeight: 1.2 }}>{n3txt}</span>}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
              )}
            </div>
          </div>
        </nav>
        </>
        ) : mobile ? (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1200, width: '100%', background: '#faf8f4', border: 'none', borderBottom: '1px solid #d6d0c4', boxShadow: '0 1px 4px rgba(45,35,25,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(90deg)', color: '#9a958d' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: '#6b6560' }}>Sommaire</span>
          </button>
        ) : (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 3.5rem)', width: '22px', background: '#faf8f4', border: 'none', borderRight: '1px solid #d6d0c4', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M3 1l4 4-4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, transform: 'rotate(180deg)', fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: '#b0a89e', userSelect: 'none' }}>Sommaire</span>
          </button>
        )}

        {/* ── TEXTE CENTRAL ── */}
        <main lang="fr" style={{ flex: 1, minWidth: 0, padding: mobile ? '2.875rem 14px 3.75rem' : '0 14px 80px', position: 'relative', overflow: 'visible' }}><div style={{ maxWidth: '35rem', margin: '0 auto', position: 'relative', overflow: 'visible' }}>
          <PageTitre auteur={auteur} oeuvre={oeuvreLocale} titre={titreAffiche} estAdmin={estAdmin}
            onModifier={(champ, va) => setEditionCible({ type: 'titre_oeuvre', champ, texteActuel: va })} />

          {/* Navigation précédent/suivant — toujours au niveau 1 */}
          {vue === 'texte' && !texteSansNiveaux && (
            <div id="barre-nav-niv1" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)', alignItems: 'center', columnGap: '14px', marginBottom: '1.5rem', paddingBottom: '1rem', paddingRight: '60px', borderBottom: '1px solid #ede9e2', minHeight: '32px', scrollMarginTop: '60px' }}>
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev, { conserverPosition: true })} disabled={!niv1Prev}
                style={{ justifySelf: 'start', fontSize: '1.125rem', lineHeight: 1, color: niv1Prev ? '#9a958d' : 'transparent', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Prev ? 'auto' : 'none' }}>
                {niv1Prev ? '‹' : ''}
              </button>
              <span style={{ fontSize: '1.45rem', fontWeight: 500, color: '#2a3d30', fontFamily: "var(--font-source-serif), Georgia, serif", textAlign: 'center', minWidth: 0, lineHeight: 1.3, whiteSpace: 'pre-line', overflowWrap: 'break-word', position: 'relative' }}>
                {niv1Erreur ? (
                  <span style={{ fontSize: '0.75rem', color: '#c0562a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Erreur de chargement.{' '}
                    <button onClick={() => changerNiv1(niv1Erreur, { forceRefresh: true })}
                      style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '3px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer' }}>
                      Réessayer
                    </button>
                  </span>
                ) : niv1Loading ? <span style={{ fontSize: '0.8125rem', color: '#b0a89e' }}>Chargement…</span> : (
                  <>
                    {rendreTitreColophon(niv1Actif)}
                    {(() => {
                      const txt = groupes[0]?.niv1_texte || niv1TexteMap[niv1Actif] || ''
                      return txt && configNiveaux.txtCorps[0]
                        ? <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 400, color: '#7a7268', fontStyle: 'italic', marginTop: '4px', fontFamily: "var(--font-source-serif), Georgia, serif" }}>{rendreLongTexteColophon(txt)}</span>
                        : null
                    })()}
                    {estAdmin && (() => { const g = groupes[0] ?? { niv1: niv1Actif, niv2: '', niv3: '', niv4: '', anchor: '', itemIds: [] }; return (
                      <div style={{ position: 'absolute', right: '-52px', top: '2px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: niv1Actif, schemaTexte: false })}
                          title="Modifier le titre" style={{ fontSize: '0.8125rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}>✎</button>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: g.niv1_texte ?? '', schemaTexte: true })}
                          title="Modifier le sous-titre" style={{ fontSize: '0.625rem', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1, fontStyle: 'italic' }}>✎</button>
                      </div>
                    )})()}
                  </>
                )}
              </span>
              <button onClick={() => niv1Next && changerNiv1(niv1Next, { conserverPosition: true })} disabled={!niv1Next}
                style={{ justifySelf: 'end', fontSize: '1.125rem', lineHeight: 1, color: niv1Next ? '#9a958d' : 'transparent', background: 'none', border: 'none', cursor: niv1Next ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Next ? 'auto' : 'none' }}>
                {niv1Next ? '›' : ''}
              </button>
            </div>
          )}

          {/* Vue texte principal */}
          {vue === 'texte' && (() => {
            let dniv2 = '', dniv3 = '', dniv4 = ''
            let isFirstGroupe = true
            return groupesFiltres.map((groupe) => {
              const showNiv2 = profondeurCorps >= 2 && groupe.niv2 && groupe.niv2 !== dniv2
              const showNiv3 = profondeurCorps >= 3 && groupe.niv3 && groupe.niv3 !== dniv3
              const showNiv4 = profondeurCorps >= 4 && groupe.niv4 && groupe.niv4 !== dniv4
              if (showNiv2) dniv2 = groupe.niv2
              if (showNiv3) dniv3 = groupe.niv3
              if (showNiv4) dniv4 = groupe.niv4
              const marginTop = isFirstGroupe ? '0' : showNiv2 ? '2.5rem' : showNiv3 ? '1.5rem' : '0.8rem'
              if (isFirstGroupe) isFirstGroupe = false
              return (
                <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                  {showNiv2 && (
                    <div style={{ textAlign: 'center', marginTop: marginTop, marginBottom: '1rem', paddingTop: '0.5rem', paddingRight: estAdmin ? '52px' : '60px', position: 'relative' }}>
                      <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.1rem', fontWeight: 400, color: '#2a3d30', lineHeight: 1.3, margin: 0, letterSpacing: '0.01em', whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv2)}</h3>
                      {groupe.niv2_texte && configNiveaux.txtCorps[1] && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.92rem', fontWeight: 400, color: '#7a7268', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv2_texte)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: '52px', top: '0.5rem', display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.6875rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5625rem', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}>✎</button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv3 && (
                    <div style={{ marginTop: isFirstGroupe ? '0' : '1rem', marginBottom: '0.4rem', paddingLeft: '11px', borderLeft: '1px solid #ddd6cb', position: 'relative', paddingRight: estAdmin ? '44px' : 0 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5a5450', lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', whiteSpace: 'pre-line', textAlign: groupe.niv3.length >= SEUIL_TITRE_COLOPHON ? 'center' : undefined }}>{rendreTitreColophon(groupe.niv3)}</p>
                      {groupe.niv3_texte && configNiveaux.txtCorps[2] && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#9a958d', lineHeight: 1.3, margin: '2px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv3_texte)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.625rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5625rem', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}>✎</button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv4 && (
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b0a89e', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: '0.5rem', position: 'relative', paddingRight: estAdmin ? '44px' : 0, whiteSpace: 'pre-line' }}>
                      {rendreTitreColophon(groupe.niv4)}
                      {groupe.niv4_texte && configNiveaux.txtCorps[3] && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px', fontStyle: 'italic' }}>{rendreTitreColophon(groupe.niv4_texte)}</span>}
                      {estAdmin && (
                        <span style={{ position: 'absolute', right: 0, top: 0, display: 'inline-flex', gap: '3px', alignItems: 'center', textTransform: 'none' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.5625rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', letterSpacing: 0 }}>✎</button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5rem', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic', letterSpacing: 0 }}>✎</button>
                        </span>
                      )}
                    </p>
                  )}
                  {groupe.itemIds.map(sid => {
                    const s = segMap.get(sid)
                    if (!s) return null
                    const actif = segActif === sid
                    return (
                      <div key={sid} id={`segment-${sid}`} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`}
                        onTouchStart={mobile ? () => { appuiLongDeclenche.current = false; appuiLongRef.current = setTimeout(() => { appuiLongDeclenche.current = true; setActionsSegMobileId(sid) }, 450) } : undefined}
                        onTouchEnd={mobile ? () => { if (appuiLongRef.current) clearTimeout(appuiLongRef.current) } : undefined}
                        onTouchMove={mobile ? () => { if (appuiLongRef.current) clearTimeout(appuiLongRef.current) } : undefined}
                        style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: '0.45rem', scrollMarginTop: '60px' }}>
                        <p id={`s${s.numero}`} onClick={() => { if (appuiLongDeclenche.current) { appuiLongDeclenche.current = false; return } if (mobile) setActionsSegMobileId(null); setSegActif(actif ? null : sid) }} className="seg-p"
                          lang="fr" style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16', lineHeight: '1.52', textAlign: 'justify', textJustify: 'inter-word', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', margin: 0, flex: 1, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                          {configNiveaux.afficherNumeros && sid !== premierSegmentId && <sup style={{ fontSize: '0.50rem', color: '#b0a89e', userSelect: 'none', marginRight: '2px', lineHeight: 1 }}>{s.numero}</sup>}
                          {sid === premierSegmentId && normaliserEspaces(s.texte).length > 0 ? (() => { const t = nettoyerFin(normaliserEspaces(s.texte)); const chars = [...t]; const li = chars.findIndex(ch => /\p{L}/u.test(ch)); if (li <= 0) { return (<><span style={{ float: 'left', fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '3.4em', lineHeight: '0.78', paddingRight: '5px', paddingTop: '3px', color: '#2a3d30', fontWeight: 'normal', userSelect: 'none' }}>{chars[0] ?? t[0]}</span>{rendreTexteAvecNotes(chars.slice(1).join(''), s.notes ?? {})}</>) } const prefix = chars.slice(0, li).join(''); const lettre = chars[li]; const suite = chars.slice(li + 1).join(''); return (<>{prefix}<span style={{ float: 'left', fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '3.4em', lineHeight: '0.78', paddingRight: '5px', paddingTop: '3px', color: '#2a3d30', fontWeight: 'normal', userSelect: 'none' }}>{lettre}</span>{rendreTexteAvecNotes(suite, s.notes ?? {})}</>) })() : rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                        </p>
                        <div className="seg-actions" style={mobile ? {
                          position: 'absolute', top: '0.25rem', right: '0.25rem', zIndex: 6, opacity: 1, display: actionsSegMobileId === sid ? 'flex' : 'none', flexDirection: 'row', gap: '0.25rem', alignItems: 'center', background: '#fff', border: '1px solid #d6d0c4', borderRadius: '8px', boxShadow: '0 4px 16px rgba(45,35,25,0.18)', padding: '0.25rem 0.375rem',
                        } : { display: 'flex', flexDirection: 'row', gap: '2px', flexShrink: 0, width: '68px', paddingTop: '2px', justifyContent: 'flex-end', marginRight: '-8px' }}>
                          {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
                          <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvre.titre} sousTitre={oeuvre.sous_titre} tradAuteur={oeuvre.trad_auteur} editeur={oeuvre.editeur} collection={oeuvre.collection} ville={oeuvre.ville} datePublication={oeuvre.date_publication} className="seg-btn-action" />
                          <BoutonSignalerSegment segId={sid} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} className="seg-btn-action" />
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)" aria-label="Modifier ce segment"
                              className="seg-btn-action"
                              style={{ ...BTN_STYLE, color: '#c8c0b4' }}>
                              ✎
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}

          {/* Navigation de pages — bas de page */}
          {vue === 'texte' && pages.length > 1 && (
            <NavPages pages={pages} pageActuelle={pageActuelle} setPageActuelle={setPageActuelle} bas />
          )}

          {/* Vue apparat critique */}
          {vue === 'apparat' && (() => {
            let dniv1 = '', dniv2 = ''
            let isFirst = true
            return (
              <>
                {groupesApparat.map((groupe) => {
                  // Les sections qui ont du texte dans le sommaire ne sont pas
                  // affichées ici — leurs résidus apparat_critique sont filtrés.
                  if (niv1TexteSetClient.has(groupe.niv1)) return null
                  const showNiv1 = groupe.niv1 && groupe.niv1 !== dniv1
                  if (showNiv1) dniv1 = groupe.niv1
                  const marginTop = isFirst ? '0' : '2.5rem'
                  if (isFirst) isFirst = false
                  return (
                    <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                      {showNiv1 && (
                        <div style={{ position: 'relative', marginTop: marginTop, marginBottom: '0.5rem' }}>
                          <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.45rem', fontWeight: 500, color: '#2a2520', textAlign: 'center', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv1_texte || groupe.niv1)}</h2>
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe, texteActuel: groupe.niv1_texte || groupe.niv1, schemaTexte: true })}
                              title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.6875rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                          )}
                        </div>
                      )}
                      {groupe.itemIds.map(sid => {
                        const s = segMapApparat.get(sid)
                        if (!s) return null
                        const actif = segActif === sid
                        return (
                          <div key={sid} id={`segment-${sid}`} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: '0.45rem', scrollMarginTop: '60px' }}>
                            <p id={`a${s.numero}`} onClick={() => { setSegActif(actif ? null : sid) }} className="seg-p"
                              lang="fr" style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16', lineHeight: '1.52', textAlign: 'justify', textJustify: 'inter-word', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', paddingRight: estAdmin ? '72px' : '4px', margin: 0, flex: 1, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                              {configNiveaux.afficherNumeros && <sup style={{ fontSize: '0.50rem', color: '#b0a89e', userSelect: 'none', marginRight: '2px', lineHeight: 1 }}>{s.numero}</sup>}
                              {rendreTexteEnrichi(nettoyerFin(normaliserEspaces(s.texte)))}
                            </p>
                            {estAdmin && (
                              <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)"
                                aria-label="Modifier ce segment"
                                className="seg-btn-action"
                                style={{ position: 'absolute', right: '-10px', top: '1px', ...BTN_STYLE, color: '#c8c0b4' }}>
                                ✎
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )
          })()}
        </div></main>

        {/* ── PANNEAU DROIT ── */}
        {panneauOuvert ? (
        <>
        {/* Mobile : tiroir montant du bas, par-dessus le texte. */}
        {mobile && <div onClick={() => setPanneauOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
        <aside ref={refAside} style={mobile ? {
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2rem)`, borderTop: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '0 -10px 28px rgba(45,35,25,0.22)',
        } : { width: pannWidth == null ? 'clamp(280px, 21vw, 480px)' : pannWidth + 'px', flexShrink: 0, position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', height: 'calc(100vh - 3.5rem)', borderLeft: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div onMouseDown={e => {
            e.preventDefault()
            const startW = pannWidth ?? refAside.current?.getBoundingClientRect().width ?? 320
            const startX = e.clientX
            const onMove = (ev: MouseEvent) => setPannWidth(Math.max(200, Math.min(560, startW - (ev.clientX - startX))))
            const onUp = () => document.removeEventListener('mousemove', onMove)
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp, { once: true })
          }} style={{ position: 'absolute', left: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10, background: 'transparent', transition: 'background 0.14s, box-shadow 0.14s' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
              e.currentTarget.style.boxShadow = 'inset 1px 0 rgba(122,96,64,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          <div style={{ position: 'relative', borderBottom: '1px solid #d6d0c4', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
            <button onClick={() => setPanneauOuvert(false)} title="Réduire le panneau"
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 1, padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', color: '#b0a89e', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div style={{ display: 'flex', flex: 1 }}>
              {(['refs', 'commentaires', 'problemes'] as const).map((key, idx) => {
                const labels = { refs: 'Bible', commentaires: 'Commentaires', problemes: 'Problèmes' }
                const actif = ongletDroit === key
                return (
                  <Fragment key={key}>
                    {idx > 0 && (
                      <span style={{ width: '1px', background: '#ddd8d0', alignSelf: 'center', height: '12px', flexShrink: 0 }} />
                    )}
                    <button onClick={() => setOngletDroit(key)} className="onglet-btn"
                      style={{ flex: 1, padding: '7px 4px 6px', background: 'transparent', border: 'none', borderBottom: actif ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: actif ? 600 : 400, color: actif ? '#3d6b4f' : '#6b6560', whiteSpace: 'nowrap' }}>{labels[key]}</span>
                    </button>
                  </Fragment>
                )
              })}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
            {ongletDroit === 'refs' ? (
              <>
                {/* Sélecteur traduction */}
                <div ref={tradSelectRef} style={{ padding: '10px 0 8px', borderBottom: '1px solid #ede9e2', marginBottom: '10px', position: 'relative' }}>
                  {/* Sélecteur de traduction remis dans le style général du site : libellé en
                      capitales espacées grises + contrôle sobre à bord neutre (au lieu de la
                      pilule verte). Le vert ne sert plus qu'à l'option active et au focus. */}
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', margin: '0 0 4px' }}>Traduction</p>
                  <button onClick={() => setTradOuverte(!tradOuverte)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '5px 10px', borderRadius: '5px', border: `1px solid ${tradOuverte ? '#3d6b4f' : '#d6d0c4'}`, background: '#fff', fontSize: '0.65625rem', color: '#2a3d30', cursor: 'pointer', transition: 'border-color 0.12s' }}>
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{traductionsBible[tradIndex]?.label ?? trad}</span>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: '#9a958d', transform: tradOuverte ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {tradOuverte && (
                    <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #d6d0c4', borderRadius: '6px', zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', overflow: 'hidden' }}>
                      {traductionsBible.map((t, i) => (
                        <button key={t.code} onClick={() => { setTradIndex(i); setTradOuverte(false) }} className="trad-option"
                          style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.65625rem', border: 'none', borderBottom: i < traductionsBible.length - 1 ? '1px solid #f0ece6' : 'none', background: tradIndex === i ? '#eef5f1' : '#fff', color: tradIndex === i ? '#3d6b4f' : '#3a3530', fontWeight: tradIndex === i ? 600 : 400, cursor: 'pointer' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Références du segment actif */}
                {segActifData ? (
                  <>
                    {segActifData.versets.length === 0 ? (
                      <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: '#9a958d' }}>Aucun lien biblique pour ce passage.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {regrouperVersetsConsecutifs(segActifData.versets).map(groupe => {
                          const premier = groupe[0]
                          const dernier = groupe[groupe.length - 1]
                          const multiple = groupe.length > 1
                          // Versets réunis : label en fourchette (« Gn 1, 1-3 ») et corps mis à la suite.
                          const labelGroupe = multiple
                            ? `${premier.label.replace(/\d+\s*$/, '')}${premier.verset}-${dernier.verset}`
                            : premier.label
                          const corps = groupe
                            .map(v => extraireNoteVerset(v.textes[trad] || v.textes['TR0001'] || '').corps)
                            .filter(Boolean)
                            .join(' ')
                          // La note éditoriale n'est portée que par un verset seul (sinon on fond
                          // simplement les corps).
                          const note = multiple ? null : extraireNoteVerset(premier.textes[trad] || premier.textes['TR0001'] || '').note
                          const natures = Array.from(new Set(groupe.flatMap(v => (v as any).natures ?? []))) as string[]
                          // Objet synthétique pour les actions (copie/enregistrement) sur le groupe :
                          // textes fondus par traduction, label en fourchette.
                          const versetAction: any = multiple
                            ? { ...premier, label: labelGroupe, textes: Object.fromEntries(Object.keys(premier.textes).map(code => [code, groupe.map(v => (v.textes as any)[code] || '').filter(Boolean).join(' ')])) }
                            : premier
                          const key = groupe.map(v => v.id).join('_')
                          return (
                            <div key={key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: note ? '2px' : '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                  <a href={`/?livre=${encodeURIComponent(premier.livre)}&chapitre=${encodeURIComponent(premier.chapitre)}&verset=${encodeURIComponent(premier.verset)}&trad=${encodeURIComponent(trad)}`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#3d6b4f', margin: 0, textDecoration: 'none' }}>{labelGroupe}</a>
                                  {/* La nature du rapport, dite sans peser : le lecteur
                                      voit la référence d'abord, et peut savoir à quel
                                      titre elle est là s'il y prend garde. */}
                                  {natures.length > 0 && (
                                    <span style={{ fontSize: '0.59375rem', color: '#a89f92', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      {natures.join(' · ')}
                                    </span>
                                  )}
                                  {estAdmin && (
                                    <button onClick={() => groupe.forEach(v => supprimerLienBiblique(segActifData.id, v.id))} title="Supprimer ce lien biblique"
                                      style={{ fontSize: '0.59375rem', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0', lineHeight: 1.1, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {multiple ? 'Supprimer les liens' : 'Supprimer le lien'}
                                    </button>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                  <BoutonEnregistrerVerset verset={versetAction} trad={trad} userId={userId} />
                                  <BoutonCopieVerset texte={corps} label={labelGroupe} />
                                  <BoutonSignalerVerset versetId={premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />
                                </div>
                              </div>
                              {note && (
                                <p style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#9a8a6a', margin: '0 0 3px', lineHeight: 1.3 }}>
                                  ↳ {note}
                                </p>
                              )}
                              {/* Texte du/des verset(s) réuni(s) : SANS SÉRIF, même mise en forme que les
                                  citations patristiques du panneau Bible — justifié, wordSpacing serré,
                                  césure. Enrichissement (« <i> » de Sacy) rendu. */}
                              <p lang="fr" style={{ fontSize: '0.7rem', lineHeight: '1.38', color: '#2a2520', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.08em', hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 4px' } as React.CSSProperties}>
                                {corps ? rendreTexteEnrichi(corps) : '—'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {estAdmin
                      ? <AssocierVerset segId={segActifData.id} onAssocie={associerVersetLocal(segActifData.id)} />
                      : userId && <ProposerLienBiblique segId={segActifData.id} />
                    }
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
                    {/* Cul-de-lampe (buisson ardent), puis l'invite dessous. `multiply` fond le
                        fond blanc du dessin dans le papier. Le PNG porte un blanc interne en bas :
                        on remonte le texte (marge négative) pour qu'il se pose sous le DESSIN, non
                        sous le rectangle de l'image — l'ensemble reste ainsi équilibré. */}
                    <img src="/ornements/cul-de-lampe-buisson-ardent.png" alt="" aria-hidden="true"
                      style={{ width: '82%', maxWidth: '11.875rem', height: 'auto', opacity: 0.42, mixBlendMode: 'multiply' }} />
                    <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: '#9a958d', textAlign: 'center', margin: '-30px 0 0' }}>Cliquez sur un paragraphe.</p>
                  </div>
                )}
              </>
            ) : ongletDroit === 'commentaires' ? (
              <div style={{ paddingTop: '14px' }}>
                <OngletCommentaires segActif={segActif} estAdmin={estAdmin} />
              </div>
            ) : (
              <div style={{ paddingTop: '14px' }}>
                <div style={{ fontSize: '0.59375rem', color: '#8a8278', margin: '0 0 10px', lineHeight: 1.4, padding: '6px 9px', background: '#f7f4ef', borderRadius: '5px', borderLeft: '2px solid #cbb98e' }}>
                  <span style={{ fontWeight: 600, color: '#7a6f4e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>À propos · </span>
                  Aidez-nous à relier ces passages à l'Écriture. Merci de votre concours.
                </div>
                {/* Sous-onglets par type de problème */}
                <div style={{ display: 'flex', gap: '2px', margin: '0 0 12px', background: '#ede9e2', borderRadius: '5px', padding: '2px' }}>
                  {([['lien_a_constituer', 'À constituer'], ['probable', 'À vérifier']] as const).map(([key, label]) => (
                    <button key={key} onClick={() => setFiltreProbleme(key)}
                      style={{ flex: 1, fontSize: '0.625rem', fontWeight: filtreProbleme === key ? 700 : 400, padding: '4px 6px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: filtreProbleme === key ? '#fff' : 'transparent', color: filtreProbleme === key ? '#3a3530' : '#9a958d', boxShadow: filtreProbleme === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none', letterSpacing: '0.04em', textTransform: 'uppercase' as const, transition: 'all 0.12s' }}>
                      {label}
                    </button>
                  ))}
                </div>
                {/* Aide propre au sous-onglet « À constituer » : ces passages appellent
                    vraisemblablement un lien à l'Écriture, mais il n'est pas évident — c'est à
                    vous de l'identifier. */}
                {filtreProbleme === 'lien_a_constituer' && (
                  <p style={{ fontSize: '0.59375rem', fontStyle: 'italic', color: '#9a958d', lineHeight: 1.45, margin: '0 0 12px' }}>
                    Ces passages semblent renvoyer à l'Écriture, mais le lien n'est pas manifeste : à vous de repérer le verset visé.
                  </p>
                )}
                {!problemesCharges ? (
                  <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: '#9a958d' }}>Chargement…</p>
                ) : (() => {
                  const filtres = problemes.filter(s =>
                    filtreProbleme === 'lien_a_constituer' ? s.aConstituer : !s.aConstituer
                  )
                  if (filtres.length === 0) return (
                    <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: '#9a958d' }}>
                      {filtreProbleme === 'lien_a_constituer' ? 'Aucun passage « à constituer » pour cette œuvre.' : 'Aucun passage « à vérifier » pour cette œuvre.'}
                    </p>
                  )
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {filtres.map(s => {
                        const liensIds = Array.from(new Set(
                          s.liens.map(l => l.canon_id).filter(Boolean) as string[]
                        ))
                        return (
                          <div key={s.id} style={{ paddingBottom: '12px', borderBottom: '1px solid #ede9e2' }}>
                            <div lang="fr" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.75rem', lineHeight: 1.38, color: '#2a2520', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 7px', whiteSpace: 'pre-line' } as React.CSSProperties}>
                              {rendreTexteEnrichi(nettoyerFin(normaliserEspaces(s.segment_texte)))}
                            </div>
                            {s.reference_manuelle && (
                              <p style={{ fontSize: '0.65625rem', color: '#9a5a2a', fontStyle: 'italic', margin: '0 0 5px' }}>
                                Référence proposée : {s.reference_manuelle}
                              </p>
                            )}
                            {liensIds.length > 0 && (
                              <div style={{ margin: '0 0 5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {liensIds.map(idV => {
                                  const vi = versetsAltMap[idV]
                                  if (!vi) return null
                                  const label = detailsRefBiblique(vi.ref).label
                                  return (
                                    <button key={idV} type="button"
                                      onClick={() => setApercuVerset({ label, texte: vi.texte })}
                                      title="Voir le verset"
                                      style={{ fontSize: '0.65625rem', color: '#3d5a4f', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: '#c8d2cb' }}>
                                      {label}
                                      {vi.chapAlt != null && (
                                        <span style={{ color: '#9a958d', fontStyle: 'italic' }}>
                                          {' '}({vi.chapAlt}{vi.verAlt != null ? `, ${vi.verAlt}` : ''})
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            {/* Actions. « À constituer » : proposer une référence ou déclarer
                                qu'il n'y en a pas. « À vérifier » : qualifier la nature du lien
                                (citation, paraphrase, commentaire, écho). Chaque bouton (hors
                                « Aller au passage ») ouvre un signalement transmis à la modération. */}
                            <button onClick={() => {
                                setSegActif(s.id)
                                const ancreLocale = groupes.find(g => g.itemIds.includes(s.id))?.anchor
                                if (ancreLocale) {
                                  naviguerVersAncre(ancreLocale)
                                } else if (s.ref_niv1 && s.ref_niv1 !== niv1Actif) {
                                  pendingScrollSegRef.current = s.id
                                  changerNiv1(s.ref_niv1, { conserverPosition: true })
                                }
                              }} className="ref-lien"
                              style={{ display: 'block', fontSize: '0.65625rem', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, margin: '0 0 6px' }}>
                              Aller au passage
                            </button>
                            {/* Les qualificatifs tiennent sur UNE seule ligne (pas de retour à la
                                ligne) : row compacte, libellés courts. */}
                            <div style={{ display:'flex', alignItems:'center', gap:'5px', flexWrap:'nowrap' }}>
                              {filtreProbleme === 'lien_a_constituer' ? (
                                <>
                                  <button onClick={() => setSuggestionSignalee({ ...s, nature: 'suggestion' })} title="Proposer une référence biblique pour ce passage"
                                    style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize:'0.59375rem', color:'#9a5a2a', background:'none', border:'1px solid #e3cdb0', borderRadius:'999px', padding:'2px 8px', cursor:'pointer' }}>Suggérer une référence</button>
                                  <button onClick={() => setSuggestionSignalee({ ...s, nature: 'pas_de_reference' })} title="Signaler que ce passage ne renvoie à aucun verset"
                                    style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize:'0.59375rem', color:'#8a8278', background:'none', border:'1px solid #ddd6cb', borderRadius:'999px', padding:'2px 8px', cursor:'pointer' }}>Pas de référence</button>
                                </>
                              ) : (
                                ([['Citation','citation'],['Paraphrase','paraphrase'],['Commentaire','commentaire'],['Écho','echo']] as const).map(([label, nat]) => (
                                  <button key={nat} onClick={() => setSuggestionSignalee({ ...s, nature: nat })} title={`Signaler ce lien comme « ${label} »`}
                                    style={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize:'0.59375rem', color:'#3d5a4f', background:'none', border:'1px solid #cbd8cf', borderRadius:'999px', padding:'2px 8px', cursor:'pointer' }}>{label}</button>
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>

        </aside>
        </>
        ) : mobile ? (
          <button onClick={() => setPanneauOuvert(true)} title="Ouvrir le panneau de références"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, width: '100%', background: '#fff', border: 'none', borderTop: '1px solid #d6d0c4', boxShadow: '0 -1px 4px rgba(45,35,25,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(-90deg)', color: '#9a958d' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: '#6b6560' }}>Références &amp; commentaires</span>
          </button>
        ) : (
          <button onClick={() => setPanneauOuvert(true)} title="Ouvrir le panneau de références"
            style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 3.5rem)', width: '22px', background: '#fff', border: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M7 1l-4 4 4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: '#b0a89e', userSelect: 'none' }}>Commentaires et références bibliques</span>
          </button>
        )}
      </div>

      {apercuVerset && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
          onClick={() => setApercuVerset(null)}>
          <div onClick={e => e.stopPropagation()} style={{ margin: 'auto', background: '#faf6ee', borderRadius: '8px', border: '1px solid #c8b89e', padding: '16px 18px', width: '23.75rem', maxWidth: '100%', boxShadow: '0 12px 40px rgba(44,30,10,0.22)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', fontWeight: 600, color: '#3d6b4f' }}>{apercuVerset.label}</span>
              <button onClick={() => setApercuVerset(null)} aria-label="Fermer" style={{ fontSize: '0.9375rem', color: '#b0a08a', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 12px', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', lineHeight: 1.6, color: '#2a2218', margin: 0, whiteSpace: 'pre-line' }}>
              {apercuVerset.texte || <em style={{ color: '#b0a08a' }}>Texte du verset indisponible.</em>}
            </p>
          </div>
        </div>,
        document.body
      )}

      {infoEditionOuverte && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', top: 48, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', padding: '20px', overflowY: 'auto' }}
          onClick={() => setInfoEditionOuverte(false)}>
          <div onClick={e => e.stopPropagation()} style={{ margin: 'auto', background: '#fff', borderRadius: '10px', padding: '18px 22px', width: '33.75rem', maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: '#6f9268', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette édition</p>
                {/* Auteur ET titre sur la même ligne ; l'auteur ouvre sa fiche. */}
                <p style={{ margin: 0, lineHeight: 1.28 }}>
                  {auteurId ? (
                    <button onClick={() => setAuteurModalOuvert(true)} title="Voir la fiche de l’auteur"
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3d6b4f', background: 'none', border: 'none', padding: 0, cursor: 'pointer', letterSpacing: '0.02em' }}>{auteur}</button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3d6b4f', letterSpacing: '0.02em' }}>{auteur}</span>
                  )}
                  <span style={{ color: '#cbc3b6', margin: '0 7px' }}>–</span>
                  <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.875rem', color: '#2a3d30' }}>{rendreTexteEnrichi(titreAffiche)}</span>
                </p>
                {oeuvreLocale.sous_titre && (
                  <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.71875rem', color: '#8a8278', fontStyle: 'italic', lineHeight: 1.3, margin: '3px 0 0' }}>{oeuvreLocale.sous_titre}</p>
                )}
              </div>
              <button onClick={() => setInfoEditionOuverte(false)} style={{ fontSize: '1rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>

            {/* Deux colonnes distinctes : texte original / édition de référence. */}
            {(() => {
              const aOriginal = !!(oeuvreLocale.titre_original || oeuvreLocale.date_composition || oeuvreLocale.langue_originale || (oeuvreLocale.genres && oeuvreLocale.genres.length))
              const aEdition = !!(oeuvreLocale.trad_auteur || oeuvreLocale.trad_date || oeuvreLocale.editeur || oeuvreLocale.ville || oeuvreLocale.date_publication || oeuvreLocale.collection)
              if (!aOriginal && !aEdition) return null
              const carte: React.CSSProperties = { background: '#f6f8f3', border: '1px solid #e2ebdc', borderLeft: '2.5px solid #a7c4a0', borderRadius: '8px', padding: '11px 13px' }
              const legende: React.CSSProperties = { fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.10em', color: '#6f9268', margin: '0 0 8px', textTransform: 'uppercase' }
              const cle: React.CSSProperties = { fontSize: '0.53125rem', color: '#a9b0a2', display: 'block', marginBottom: 0, lineHeight: 1.1 }
              const val: React.CSSProperties = { fontSize: '0.71875rem', color: '#3a3530', lineHeight: 1.35 }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: (aOriginal && aEdition) ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr', gap: '10px', marginBottom: '12px' }}>
                  {aOriginal && (
                    <div style={carte}>
                      <p style={legende}>Texte original</p>
                      {oeuvreLocale.titre_original && <div style={{ marginBottom: '6px' }}><span style={cle}>Titre</span><span style={{ ...val, fontStyle: 'italic' }}>{oeuvreLocale.titre_original}</span></div>}
                      {oeuvreLocale.date_composition && <div style={{ marginBottom: '6px' }}><span style={cle}>Date de composition</span><span style={val}>{formaterDateHistorique(oeuvreLocale.date_composition)}</span></div>}
                      {oeuvreLocale.langue_originale && <div style={{ marginBottom: '6px' }}><span style={cle}>Langue originale</span><span style={val}>{oeuvreLocale.langue_originale}</span></div>}
                      {oeuvreLocale.genres && oeuvreLocale.genres.length > 0 && (
                        <div><span style={cle}>Genre{oeuvreLocale.genres.length > 1 ? 's' : ''}</span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {oeuvreLocale.genres.map(g => <span key={g} style={{ fontSize: '0.59375rem', background: '#ece7de', color: '#6b6560', borderRadius: '3px', padding: '2px 6px' }}>{g}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {aEdition && (
                    <div style={carte}>
                      <p style={legende}>Édition de référence</p>
                      {oeuvreLocale.trad_auteur && <div style={{ marginBottom: '6px' }}><span style={cle}>Traducteur</span><span style={val}>{libelleTrad(oeuvreLocale.trad_auteur)}{oeuvreLocale.trad_date ? ` (${formaterDateHistorique(oeuvreLocale.trad_date)})` : ''}</span></div>}
                      {(oeuvreLocale.editeur || oeuvreLocale.ville || oeuvreLocale.date_publication) && <div style={{ marginBottom: '6px' }}><span style={cle}>Publication</span><span style={val}>{[formaterEditeur(oeuvreLocale.editeur), oeuvreLocale.ville, formaterDateHistorique(oeuvreLocale.date_publication)].filter(Boolean).join(', ')}</span></div>}
                      {oeuvreLocale.collection && <div><span style={cle}>Collection</span><span style={val}>{oeuvreLocale.collection}</span></div>}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Lien source — l'URL brute n'est pas affichée */}
            {oeuvreLocale.url_source && (
              <div style={{ marginBottom: '10px' }}>
                <a href={oeuvreLocale.url_source} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.71875rem', color: '#3d6b4f', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  Consulter la source en ligne
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M3.5 3h5.5v5.5M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              </div>
            )}

            {/* Note corpus */}
            <div style={{ background: '#faf8f4', borderRadius: '6px', padding: '10px 12px' }}>
              <p style={{ fontSize: '0.6875rem', color: '#8a8278', lineHeight: 1.55, margin: 0 }}>
                Ce texte est mis à disposition dans le cadre du projet <strong style={{ color: '#3d6b4f', fontWeight: 600 }}>Corpus Scriptura</strong>, qui vise à relier les écrits des Pères de l'Église aux versets bibliques qu'ils citent ou évoquent. Les segments sont indexés et reliés aux textes scripturaires correspondants.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Fiche auteur en fenêtre, ouverte depuis « À propos de cette édition ». */}
      <ModaleAuteur id={auteurModalOuvert ? (auteurId ?? null) : null} onClose={() => setAuteurModalOuvert(false)} />

      {estAdmin && configOuverte && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setConfigOuverte(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', padding: '20px 22px', width: '25rem', maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#3d6b4f', margin: 0 }}>Niveaux d'affichage</p>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.9375rem', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: '0.6875rem', color: '#8a8278', lineHeight: 1.5, margin: '0 0 16px' }}>
              Réglez la finesse des titres affichés, séparément pour le <strong style={{ color: '#6b6560' }}>sommaire</strong> (colonne de gauche) et le <strong style={{ color: '#6b6560' }}>corps</strong> du texte.
            </p>
            {(['sommaire', 'corps'] as const).map(type => {
              const key = type === 'sommaire' ? 'sommaire' : 'corps'
              const txtKey = type === 'sommaire' ? 'txtSommaire' : 'txtCorps'
              const titre = type === 'sommaire' ? 'Sommaire' : 'Corps du texte'
              return (
                <div key={type} style={{ marginBottom: '14px', padding: '12px 14px', background: '#faf8f4', borderRadius: '7px', border: '1px solid #ece7de' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#3d6b4f', margin: '0 0 10px' }}>{titre}</p>

                  <label style={{ fontSize: '0.65625rem', color: '#6b6560', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Niveaux de titres affichés</label>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setConfigNiveaux(prev => ({ ...prev, [key]: n }))}
                        title={`Afficher jusqu’au niveau ${n}`}
                        style={{ width: '34px', height: '30px', borderRadius: '5px', border: `1px solid ${configNiveaux[key] === n ? '#3d6b4f' : '#d6d0c4'}`, background: configNiveaux[key] === n ? '#3d6b4f' : '#fff', color: configNiveaux[key] === n ? '#fff' : '#6b6560', fontSize: '0.75rem', cursor: 'pointer', fontWeight: configNiveaux[key] === n ? 700 : 400 }}>
                        {n}
                      </button>
                    ))}
                  </div>

                  <label style={{ fontSize: '0.65625rem', color: '#6b6560', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Chapeaux descriptifs</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1,2,3,4,5].map((n, i) => {
                      const actif = configNiveaux[txtKey][i]
                      const disponible = n <= configNiveaux[key]
                      return (
                        <button key={n} disabled={!disponible} onClick={() => setConfigNiveaux(prev => {
                          const arr = [...prev[txtKey]]
                          arr[i] = !arr[i]
                          return { ...prev, [txtKey]: arr }
                        })}
                          title={disponible ? `Chapeau du niveau ${n}` : `Le niveau ${n} n’est pas affiché`}
                          style={{ width: '34px', height: '30px', borderRadius: '5px', border: `1px solid ${actif ? '#3d6b4f' : '#d6d0c4'}`, background: actif ? '#3d6b4f' : '#fff', color: actif ? '#fff' : '#9a958d', fontSize: '0.65625rem', cursor: disponible ? 'pointer' : 'default', opacity: disponible ? 1 : 0.4 }}>
                          N{n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.10em', color: '#b0a89e', margin: 0, textTransform: 'uppercase' }}>Numéros de segments</p>
              <button onClick={() => setConfigNiveaux(prev => ({ ...prev, afficherNumeros: !prev.afficherNumeros }))}
                style={{ fontSize: '0.6875rem', padding: '4px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: configNiveaux.afficherNumeros ? '#3d6b4f' : '#fff', color: configNiveaux.afficherNumeros ? '#fff' : '#9a958d', cursor: 'pointer' }}>
                {configNiveaux.afficherNumeros ? 'Affichés' : 'Masqués'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #ede9e2' }}>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
              <button disabled={configEnvoi} onClick={async () => {
                setConfigEnvoi(true)
                const toStr = (b: boolean[]) => b.map(x => x ? '1' : '0').join('')
                const appels = [
                  { champ: 'niveaux_sommaire', valeur: configNiveaux.sommaire },
                  { champ: 'niveaux_corps', valeur: configNiveaux.corps },
                  { champ: 'texte_sommaire', valeur: toStr(configNiveaux.txtSommaire) },
                  { champ: 'texte_corps', valeur: toStr(configNiveaux.txtCorps) },
                  { champ: 'afficher_numeros', valeur: configNiveaux.afficherNumeros },
                ]
                await Promise.all(appels.map(({ champ, valeur }) =>
                  fetch('/api/admin/update-oeuvre', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_oeuvre: idOeuvre, champ, valeur }) })
                ))
                setConfigEnvoi(false)
                setConfigOuverte(false)
              }}
                style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>
                {configEnvoi ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editionCible && (
        <ModaleEditionAdmin
          cible={editionCible}
          idOeuvre={idOeuvre}
          onTitreOeuvreModifie={(champ, valeur) => {
            if (champ === 'titre') setTitreAffiche(valeur)
            setOeuvreLocale(prev => ({ ...prev, [champ]: valeur || undefined }))
          }}
          onClose={() => setEditionCible(null)}
          onEnregistre={() => vue === 'apparat' ? chargerApparatData() : changerNiv1(niv1Actif, { forceRefresh: true, conserverPosition: true })}
        />
      )}
      {voletsDirty && (
        <button
          onClick={resetVolets}
          style={{
            position: 'fixed',
            left: '18px',
            bottom: '18px',
            zIndex: 2500,
            padding: '7px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(198,184,158,0.62)',
            background: 'rgba(250,246,237,0.86)',
            color: '#6f665b',
            boxShadow: '0 6px 20px rgba(55,45,35,0.12)',
            backdropFilter: 'blur(6px)',
            fontSize: '0.71875rem',
            fontFamily: 'var(--font-source-serif), Georgia, serif',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}>
          Rétablir les proportions
        </button>
      )}
      {suggestionSignalee && (
        <ModalSignalement
          titre={`${natureProbleme(suggestionSignalee.nature).titre} — passage n° ${suggestionSignalee.segment_numero}`}
          avecNiveauImportance
          onClose={() => setSuggestionSignalee(null)}
          onEnvoyer={async (msg, importance) => {
            await insererSignalement({
              id_segment: suggestionSignalee.id,
              message: `${natureProbleme(suggestionSignalee.nature).prefixe} : ${msg || suggestionSignalee.segment_texte.slice(0, 160)}`,
              importance,
              url_source: window.location.href,
            })
          }}
        />
      )}
    </div>
  )
}

function NavPages({ pages, pageActuelle, setPageActuelle, bas = false }: {
  pages: any[][]
  pageActuelle: number
  setPageActuelle: (p: number) => void
  bas?: boolean
}) {
  if (pages.length <= 1) return null
  const total = pages.length
  const peutReculer = pageActuelle > 0
  const peutAvancer = pageActuelle < total - 1
  return (
    <div style={{ paddingRight: '8px', paddingTop: bas ? '2.5rem' : '0', paddingBottom: bas ? '0.5rem' : '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', color: '#9a958d' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #d6d0c4)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <button
            onClick={() => peutReculer && setPageActuelle(pageActuelle - 1)}
            disabled={!peutReculer}
            title="Page précédente"
            style={{ background: 'none', border: 'none', cursor: peutReculer ? 'pointer' : 'default', color: peutReculer ? '#7a7268' : '#d6d0c4', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ‹
          </button>
          <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontStyle: 'italic', fontSize: '0.75rem', color: '#9a958d', letterSpacing: '0.02em', userSelect: 'none', minWidth: '80px', textAlign: 'center' }}>
            {pageActuelle + 1} / {total}
          </span>
          <button
            onClick={() => peutAvancer && setPageActuelle(pageActuelle + 1)}
            disabled={!peutAvancer}
            title="Page suivante"
            style={{ background: 'none', border: 'none', cursor: peutAvancer ? 'pointer' : 'default', color: peutAvancer ? '#7a7268' : '#d6d0c4', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ›
          </button>
        </div>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #d6d0c4)' }} />
      </div>
    </div>
  )
}
