'use client'
import { ABREV_FR } from '@/app/lib/bible'
import { hydraterLiensHerites } from '@/app/lib/liens'
import { codesTraductionsLecture } from '@/app/lib/traductions'

import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import IconeCrayon from '@/app/components/IconeCrayon'
import { createPortal } from 'react-dom'
import { parseNotes } from '@/app/lib/notes'
import { STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { supabase } from "@/app/lib/supabase"
import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee } from './oeuvreTypes'
import { rendreTexteEnrichi, texteSansEnrichissement, normaliserEspaces, normaliserEspacesOriginal } from './texteEnrichi'
import { nettoyerFin } from '@/app/lib/ponctuation'
import ModaleEditionAdmin from './ModaleEditionAdmin'
import PageTitre, { libelleTrad, formaterEditeur } from './PageTitre'
import { useEditeursCharges } from '@/app/lib/editeurs'
import ModaleAuteur from '@/app/components/ModaleAuteur'
import ApercuAuteur from '@/app/components/ApercuAuteur'
import { FeuilleVigne } from './Ornements'
import EtoileFavori from '@/app/components/EtoileFavori'
import { useFavoris } from '@/app/lib/useFavoris'
import OngletCommentaires from './OngletCommentaires'
import { BTN_STYLE, BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { sansPointFinal, cleTriTitre } from '@/app/lib/titres'
import { enregistrerOeuvreRecente } from '@/app/lib/oeuvresRecentes'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { BoutonCopieVerset, BoutonEnregistrerVerset, BoutonSignalerVerset } from './BoutonsVerset'
import AssocierVerset from './AssocierVerset'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import ModalSignalement from './ModalSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
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
const FINE_TITRE_COLOPHON = '\u202F'

// Espacement typographique des titres et du colophon. Les classes sont bornées à
// l'espace et à la tabulation, JAMAIS `\s`, qui engloberait le retour à la ligne :
// un titre composé sur deux lignes dont la seconde commence par une ponctuation
// perdait son saut de ligne, remplacé par une espace insécable (« ; : ! ? » »)
// ou purement supprimé (« , . »). Le saut de ligne est un choix de composition,
// il ne se rattrape pas.
function preparerTitreColophon(texte: string) {
  return texte
    .trim()
    .replace(/[ \t]+([;!?])/g, `${FINE_TITRE_COLOPHON}$1`)
    .replace(/[ \t]+([:»])/g, `${NBSP_TITRE_COLOPHON}$1`)
    .replace(/([«])[ \t]+/g, `$1${NBSP_TITRE_COLOPHON}`)
    .replace(/[ \t]+([,.])/g, '$1')
}

// Le sommaire est une navigation compacte : les appels restent actifs dans le
// titre développé du corps, mais leur syntaxe de stockage ne doit pas y paraître.
function titreSansAppelsDeNote(texte: string) {
  return texte.replace(/\[\[[A-Z0-9]+\]\]/g, '')
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
    // Ne garde que les traductions matérialisées dans `versets_lecture` : une colonne
    // inexistante dans le select ferait échouer toute la requête et viderait l'apparat
    // biblique (voir app/lib/traductions.ts).
    _codesTraductionsCache = codesTraductionsLecture(supabase).then(
      codes => codes.length > 0 ? codes : TRADUCTIONS_FALLBACK.map(t => t.code),
      () => TRADUCTIONS_FALLBACK.map(t => t.code),
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

  const basculerTooltip = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation()
    if (visible && figee) { fermer(); return }
    effacerTimers()
    if (marceurRef.current) {
      const r = marceurRef.current.getBoundingClientRect()
      setRect({ left: r.left, top: r.top, bottom: r.bottom })
    }
    setVisible(true)
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
        border: '1px solid var(--cs-or-doux)',
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
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.09em', color: 'var(--cs-texte-doux)', textTransform: 'uppercase' }}>
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
        onClick={basculerTooltip}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') basculerTooltip(e) }}
        role="button"
        tabIndex={0}
        aria-label={`Consulter la note ${lettre}`}
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
    // Les imports récents portent déjà une numérotation éditoriale globale.
    // Ne jamais la renuméroter localement (un [[78]] doit rester 78).
    if (/^\d+$/.test(marqueur)) return Number(marqueur)
    const connu = numeros.get(marqueur)
    if (connu) return connu
    const n = numeros.size + 1
    numeros.set(marqueur, n)
    return n
  }
  const regex = /\*\*(.+?)\*\*|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\[\[([A-Z0-9]+)\]\]|\b([IVXLCDM]+)(e|er|ère|ème|ième)(\s+siècles?)|<i>([\s\S]*?)<\/i>/g
  let dernierIndex = 0, k = 0, m: RegExpExecArray | null
  while ((m = regex.exec(texte))) {
    if (m.index > dernierIndex) noeuds.push(texte.slice(dernierIndex, m.index))
    // Un appel de note peut se trouver à l'intérieur d'une emphase. Le contenu
    // doit donc repasser par le même moteur au lieu d'être rendu comme texte brut.
    if (m[1] !== undefined) noeuds.push(<strong key={k++}>{rendreTexteAvecNotes(m[1], notes)}</strong>)
    else if (m[2] !== undefined) noeuds.push(<sup key={k++}>{rendreTexteAvecNotes(m[2], notes)}</sup>)
    else if (m[3] !== undefined) noeuds.push(<em key={k++}>{rendreTexteAvecNotes(m[3], notes)}</em>)
    else if (m[4] !== undefined) noeuds.push(
      <a key={k++} href={m[5]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>{rendreTexteAvecNotes(m[4], notes)}</a>
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
    else if (m[10] !== undefined) {
      noeuds.push(<em key={k++}>{rendreTexteAvecNotes(m[10], notes)}</em>)
    }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}

// Les titres utilisent le mÃªme systÃ¨me de notes que le corps. Lorsqu'un appel
// est prÃ©sent, on privilÃ©gie son rendu interactif ; les autres titres gardent
// la composition en colophon Ã©ventuellement appliquÃ©e aux intitulÃ©s longs.
function rendreTitreColophonAvecNotes(texte: string, notes: Record<string, string>, estTitre = false): React.ReactNode {
  // Rendu simple : le titre s'enroule naturellement (centré par ses conteneurs).
  // On a renoncé à la composition « colophon » (pavé à lignes décroissantes).
  // `estTitre` : retire le point final (règle éditoriale) ; pas pour les _texte,
  // qui sont des chapeaux/phrases.
  return rendreTexteAvecNotes(preparerTitreColophon(estTitre ? sansPointFinal(texte) : texte), notes)
}

// ── Proposition de lien biblique (non-admin) ──────────────────────────────────
function ProposerLienBiblique({ segId }: { segId: number }) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'err'>('idle')
  const { exigerCompte } = useCompte()

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
      <button onClick={() => { if (!exigerCompte('proposer un lien biblique')) return; setTexte(''); setStatut('idle'); setOuvert(true) }}
        style={{ fontSize: '0.6875rem', color: '#6b8270', background: 'rgba(var(--cs-vert-rgb),0.04)', border: '1px dashed #b8cdc0', borderRadius: '5px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px', width: '100%', textAlign: 'left' }}>
        + Proposer un lien biblique
      </button>
      {ouvert && (
        <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 22px', width: '22.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>Proposer un lien biblique</p>
              <button onClick={() => setOuvert(false)} style={{ fontSize: '0.875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.45 }}>
              Indiquez la référence biblique que vous souhaitez associer à ce passage (ex. : Jn 1, 1 ou Rm 8, 28-30).
            </p>
            {statut === 'ok' ? (
              <p style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>Proposition envoyée, merci !</p>
            ) : (
              <>
                <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3} autoFocus
                  placeholder="Référence biblique proposée…"
                  style={{ width: '100%', fontSize: '0.6875rem', padding: '7px 9px', border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  {statut === 'err' && <span style={{ fontSize: '0.625rem', color: 'var(--cs-danger)', alignSelf: 'center' }}>Erreur d'envoi.</span>}
                  <button onClick={() => setOuvert(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={envoyer} disabled={statut === 'envoi' || !texte.trim()}
                    style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: texte.trim() ? 'pointer' : 'default', background: texte.trim() ? 'var(--cs-vert)' : 'var(--cs-bord-clair)', color: texte.trim() ? '#fff' : 'var(--cs-texte-doux)', fontWeight: 500 }}>
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
// Styles partagés des contrôles du volet gauche (Lecture / Texte / Traduction) :
// listes verticales pleine largeur, de même gabarit, pour un alignement parfait.
const LABEL_VOLET: React.CSSProperties = { fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block' }
const BTN_VOLET = (actif: boolean): React.CSSProperties => ({ width: '100%', textAlign: 'left', fontSize: '0.625rem', lineHeight: 1.32, padding: '4px 8px', borderRadius: '5px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.07)' : 'transparent', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)', cursor: 'pointer', fontWeight: actif ? 600 : 400, transition: 'border-color 0.12s, background 0.12s' })

export default function OeuvreClient({ auteur, auteurId, idOeuvre, estAdmin: estAdminReel, idTexteActif = null, versionsTextuelles = [], langueTexteActive = null, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, lectureTexteEntier = false, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, niv1Initial = null, vueInitiale = 'texte', eligibleParagraphes = false, niv1InitialPartiel = false }: Props) {
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
  const { exigerCompte } = useCompte()
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

  // Mémorise l'œuvre ouverte dans les « dernières consultées » (survol de
  // « Patristique » dans la navbar). Local au navigateur.
  useEffect(() => {
    enregistrerOeuvreRecente({ id: idOeuvre, titre: oeuvre.titre, auteur })
  }, [idOeuvre, oeuvre.titre, auteur])
  // Mobile : actions de segment masquées, révélées à l'appui long (comme les
  // versets de la page Bible).
  const [actionsSegMobileId, setActionsSegMobileId] = useState<number | null>(null)
  const appuiLongRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const appuiLongDeclenche = useRef(false)
  const [infoEditionOuverte, setInfoEditionOuverte] = useState(false)
  const [auteurModalOuvert, setAuteurModalOuvert] = useState(false)
  // Mode de lecture. « paragraphes » (nouveau, par défaut) : les segments d'un
  // même paragraphe coulent en un seul bloc, leur délimitation n'apparaissant
  // qu'au survol. « segments » (l'ancien) : un segment = un bloc, conservé à
  // l'identique. La préférence est mémorisée ; elle n'a d'effet que si l'œuvre
  // porte la colonne `paragraphe` (sinon le mode paragraphes est indisponible).
  const [modeLecturePref, setModeLecturePref] = useState<'paragraphes' | 'segments'>('paragraphes')
  const aTexteOriginal = useMemo(
    () => [...segmentsInit, ...segmentsApparatInit].some(s => Boolean(s.texteOriginal?.trim())),
    [segmentsInit, segmentsApparatInit],
  )
  // Mode d'affichage du texte : français seul, bilingue (français + latin), latin seul.
  const [modeTexte, setModeTexte] = useState<'fr' | 'bilingue' | 'la'>('fr')
  useEffect(() => {
    try {
      const v = localStorage.getItem('cs_mode_lecture_oeuvre')
      if (v === 'segments' || v === 'paragraphes') setModeLecturePref(v)
      // Un lien direct « ?mt=la » (texte original / bilingue) l'emporte sur la préférence
      // enregistrée : il ouvre l'œuvre exactement dans le mode demandé. L'original étant
      // aligné par paragraphe, les modes « la »/« bilingue » imposent la vue paragraphes.
      const urlMt = new URLSearchParams(window.location.search).get('mt')
      if (urlMt === 'fr' || urlMt === 'bilingue' || urlMt === 'la') {
        setModeTexte(urlMt)
        if (urlMt !== 'fr' && eligibleParagraphes) setModeLecturePref('paragraphes')
        return
      }
      const mt = localStorage.getItem(`cs_modetexte_${idOeuvre}`)
      if (mt === 'fr' || mt === 'bilingue' || mt === 'la') setModeTexte(mt)
      else if (localStorage.getItem(`cs_bilingue_${idOeuvre}`) === '1') setModeTexte('bilingue')
    } catch {}
  }, [idOeuvre, eligibleParagraphes])
  const affichageBilingue = modeTexte === 'bilingue'
  const afficherOriginalSeul = modeTexte === 'la'
  // Libellés du choix de lecture selon la langue de l'original (grec ou, par défaut, latin).
  const estGrec = oeuvre.langue_originale === 'Grec'
  const labelOriginal = estGrec ? 'Grec' : 'Latin'
  const labelBilingue = estGrec ? 'Français & Grec' : 'Français & Latin'
  const langueHtml = String(langueTexteActive || '').toLowerCase().startsWith('lat') ? 'la' : 'fr'
  const modeLecture: 'paragraphes' | 'segments' = eligibleParagraphes ? modeLecturePref : 'segments'
  const basculerMode = (m: 'paragraphes' | 'segments') => {
    setModeLecturePref(m)
    try { localStorage.setItem('cs_mode_lecture_oeuvre', m) } catch {}
  }
  const basculerTexte = (mode: 'fr' | 'bilingue' | 'la') => {
    setModeTexte(mode)
    // L'original est aligné sur le paragraphe source (rang 1) : les vues qui le montrent
    // (bilingue, latin seul) imposent donc le mode paragraphes.
    if (mode !== 'fr' && eligibleParagraphes) setModeLecturePref('paragraphes')
    try {
      localStorage.setItem(`cs_modetexte_${idOeuvre}`, mode)
      if (mode !== 'fr' && eligibleParagraphes) localStorage.setItem('cs_mode_lecture_oeuvre', 'paragraphes')
    } catch {}
  }
  // Compensation droite CONSTANTE pour centrer tous les titres (fleuron, niv1,
  // niv2) sur le CORPS DU TEXTE, en excluant systématiquement la gouttière des
  // boutons d'action (signaler, prélever, copier) — ~60px à droite. Le corps du
  // texte se définit toujours ainsi, quel que soit le mode de lecture (segments,
  // paragraphes, bilingue) : le centre visuel se décale d'environ 30px vers la
  // gauche, comme la page de titre. Sur mobile, pas de gouttière : aucune compensation.
  const gouttiereTitre = mobile ? undefined : '60px'

  // Survol d'un segment en mode paragraphes : cellule d'actions flottante ancrée
  // sur le segment (via portail, pour n'être pas clippée par le corps).
  const [segSurvol, setSegSurvol] = useState<{ id: number; top: number; left: number } | null>(null)
  const timerSurvolRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    texteEntier: lectureTexteEntier,
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
      let requeteSegmentsOeuvre = supabase.from('segments')
        .select('id, segment_numero, segment_texte, reference_manuelle, ref_niv1')
        .eq('id_oeuvre', idOeuvre)
      if (idTexteActif) requeteSegmentsOeuvre = requeteSegmentsOeuvre.eq('id_texte', idTexteActif)
      const { data: segsOeuvre } = await requeteSegmentsOeuvre.order('segment_numero')
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
  }, [ongletDroit, idOeuvre, idTexteActif, problemesCharges])
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
  const router = useRouter()
  const changerVersionTextuelle = (nouvelIdTexte: string) => {
    if (!nouvelIdTexte || nouvelIdTexte === idTexteActif || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('texte', nouvelIdTexte)
    params.delete('segment')
    params.delete('mt')
    // Rechargement complet volontaire : le sommaire, le corps, l'apparat et les
    // caches de niveau 1 appartiennent tous au témoin sélectionné.
    window.location.assign(`${window.location.pathname}?${params.toString()}`)
  }
  // Traductions sœurs : œuvres du MÊME auteur au MÊME titre normalisé (comme le
  // regroupement de la Bibliothèque). Sert au sélecteur de traduction du volet gauche.
  type VersionTrad = { id_oeuvre: string; titre: string; trad_auteur: string | null; editeur: string | null; ville: string | null; date_publication: string | null; note: string | null }
  const [versions, setVersions] = useState<VersionTrad[]>([])
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

  // Niv1 actif suivi en ref : la complétion en tâche de fond ne doit s'appliquer
  // que si le lecteur n'a pas changé de niveau entre-temps.
  const niv1ActifRef = useRef(niv1Actif)
  useEffect(() => { niv1ActifRef.current = niv1Actif }, [niv1Actif])

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
  const groupesNiv1Actif = lectureTexteEntier ? groupes.filter(g => g.niv1 === niv1Actif) : groupes
  const niv2List = Array.from(new Set(groupesNiv1Actif.map(g => g.niv2).filter(Boolean)))

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

  // Amène un élément au NIVEAU DES YEUX : son sommet se pose au tiers supérieur de la
  // fenêtre. On passe par `scrollIntoView` (fiable ici) avec une marge de défilement
  // haute temporaire égale au tiers de la fenêtre — `block:'start'` cale alors le sommet
  // à ce tiers.
  const scrollNiveauDesYeux = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return false
    const prev = el.style.scrollMarginTop
    el.style.scrollMarginTop = `${Math.round(window.innerHeight / 3)}px`
    // Défilement INSTANTANÉ (et non « smooth ») : un défilement animé était annulé dès la
    // première frame par le re-rendu déclenché par la sélection du segment.
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
    window.setTimeout(() => { el.style.scrollMarginTop = prev }, 200)
    return true
  }, [])

  useEffect(() => {
    const segId = pendingScrollSegRef.current
    if (!segId) return
    const g = groupes.find(gr => gr.itemIds.includes(segId))
    if (!g) return
    pendingScrollSegRef.current = null
    const pageIdx = pages.findIndex(p => p.some(gr => gr.anchor === g.anchor))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
    // « Aller au passage » : on pose le passage au niveau des yeux (tiers supérieur) ;
    // à défaut du segment précis, on se rabat sur le paragraphe qui le contient.
    setTimeout(() => {
      if (!scrollNiveauDesYeux(`segment-${segId}`)) document.getElementById(g.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [groupes, pages, pageActuelle, scrollNiveauDesYeux])

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
    // Scroll-spy throttlé : au plus UNE mesure par frame (requestAnimationFrame),
    // au lieu de lire la géométrie (getBoundingClientRect en boucle) à chaque
    // événement scroll — ce qui provoquait du jank sur les grosses œuvres.
    const etat = { ticking: false }
    const calcul = () => {
      etat.ticking = false
      const seuil = 140
      let n1Courant: string | null = null
      let n2Courant: string | null = null
      let trouve = false
      for (const g of groupesFiltres) {
        const el = document.getElementById(g.anchor)
        if (!el) continue
        if (el.getBoundingClientRect().top - seuil <= 0) {
          n1Courant = g.niv1 || null
          n2Courant = g.niv2 || null
          trouve = true
        } else break
      }
      if (trouve) {
        if (lectureTexteEntier && n1Courant) setNiv1Actif(prev => (prev === n1Courant ? prev : n1Courant!))
        setNiv2Actif(prev => (prev === n2Courant ? prev : n2Courant))
      }
    }
    const onScroll = () => {
      if (etat.ticking) return
      etat.ticking = true
      requestAnimationFrame(calcul)
    }
    calcul()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [groupesFiltres, lectureTexteEntier, vue])

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
    const ancre = groupes.find(g => (!lectureTexteEntier || g.niv1 === niv1Actif) && g.niv2 === n2)?.anchor
    if (ancre) naviguerVersAncre(ancre)
  }

  const chargerNiv1Data = async (n1: string): Promise<{ groupes: GroupeData[]; segments: SegData[] }> => {
    const SELECT = 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes,paragraphe,rang,texte_original'
    const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'lemme', 'vers', 'rubrique', 'dialogue', 'apparat_auteur', 'texte absent']
    // Chargement par lots de 1000 mais EN PARALLÈLE (les grosses divisions, ex.
    // Somme théologique ~6500 segments/niv1, se chargeaient en séquentiel) : on
    // récupère le total avec le 1er lot, puis on tire le reste d'un coup.
    const lotNiv1 = (from: number) => {
      let q = supabase.from('segments').select(SELECT).eq('id_oeuvre', idOeuvre)
        .in('nature', NATURES_TEXTE).order('segment_numero').range(from, from + 999)
      if (idTexteActif) q = q.eq('id_texte', idTexteActif)
      if (!lectureTexteEntier && !texteSansNiveaux && n1) q = q.eq('ref_niv1', n1)
      return q
    }
    let premierReq = supabase.from('segments').select(SELECT, { count: 'exact' }).eq('id_oeuvre', idOeuvre)
      .in('nature', NATURES_TEXTE).order('segment_numero').range(0, 999)
    if (idTexteActif) premierReq = premierReq.eq('id_texte', idTexteActif)
    if (!lectureTexteEntier && !texteSansNiveaux && n1) premierReq = premierReq.eq('ref_niv1', n1)
    const premier = await premierReq
    const segs: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? segs.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lotNiv1((i + 1) * 1000))
      )
      for (const r of restes) segs.push(...((r.data as any[]) ?? []))
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
      const estIntro = s.nature === 'introduction'
      if (!estIntro) c++
      const versets = extraireVersetsAvecNature(s)
        .map(({ id: vid, natures }) => ({ id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))
      return { id: s.id, numero: estIntro ? s.segment_numero : c, texte: s.segment_texte, versets, notes: parseNotes(s.notes), paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original, nature: s.nature }
    })

    const newGroupes: GroupeData[] = []
    let cur: any = { niv1:'', niv2:'', niv3:'', niv4:'', itemIds:[] as number[] }
    let gi = 0
    segsAffichables.forEach((s: any) => {
      if (s.nature === 'introduction') return
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
    let requeteApparat = supabase
      .from('segments')
      .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes,paragraphe,rang,texte_original')
      .eq('id_oeuvre', idOeuvre)
      .in('nature', ['apparat_critique', 'apparat_editeur'])
    if (idTexteActif) requeteApparat = requeteApparat.eq('id_texte', idTexteActif)
    const { data } = await requeteApparat.order('segment_numero')
    const segs = ((data ?? []) as any[]).filter(segmentAffichable)

    let c = 0, n1c = ''
    const newSegs: SegData[] = segs.map((s: any) => {
      const n1v = s.ref_niv1 || ''
      if (n1v !== n1c) { c = 0; n1c = n1v }
      c++
      return { id: s.id, numero: c, texte: s.segment_texte, versets: [], notes: parseNotes(s.notes), paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original, nature: s.nature }
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
    if (lectureTexteEntier && !opts?.forceRefresh) {
      setSegActif(null)
      setNiv2Actif(null)
      setVue('texte')
      const ancre = groupes.find(g => g.niv1 === n1)?.anchor
      if (ancre) naviguerVersAncre(ancre)
      return
    }
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

  // Complétion en tâche de fond de la première tranche du niv1 initial. Le serveur
  // n'en envoie qu'une tranche (~1000 segments) pour peindre vite les grosses
  // divisions ; on charge ici le reste sans bloquer l'affichage, puis on remplace
  // par le niv1 complet. La tranche serveur est ordonnée par segment_numero (comme
  // `chargerNiv1Data`), donc c'en est un vrai préfixe : pas de saut visible.
  useEffect(() => {
    if (!niv1InitialPartiel) return
    let annule = false
    const n1 = niv1Actif
    ;(async () => {
      try {
        const donnees = await chargerNiv1Data(n1)
        cacheNiv1Ref.current.set(n1, donnees)
        // N'appliquer que si le lecteur est toujours sur ce niv1.
        if (!annule && niv1ActifRef.current === n1) {
          setGroupes(donnees.groupes)
          setSegments(donnees.segments)
        }
      } catch { /* la tranche initiale reste affichée */ }
    })()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      .then(({ data }) => setOeuvresAuteur(
        ((data ?? []) as any[]).filter(estOeuvrePubliee)
          // Classement alphabétique en écartant l'article/déterminant de tête
          // (« La Cité de Dieu » → à « C »), titre brut en départage.
          .sort((a, b) => cleTriTitre(a.titre).localeCompare(cleTriTitre(b.titre), 'fr')
            || String(a.titre).localeCompare(String(b.titre), 'fr'))
      ))
  }, [auteurId, idOeuvre])

  // Charge les traductions sœurs (même auteur, même titre normalisé), œuvre courante
  // incluse. S'il y en a plus d'une, le sélecteur de traduction s'affiche.
  useEffect(() => {
    if (!auteurId) return
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    const cible = norm(oeuvre?.titre || '')
    supabase.from('oeuvres').select('id_oeuvre, titre, trad_auteur, editeur, ville, date_publication, note')
      .eq('id_auteur', auteurId)
      .order('date_publication', { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        const soeurs = ((data ?? []) as VersionTrad[]).filter(o => norm(o.titre) === cible && estOeuvrePubliee(o))
        setVersions(soeurs)
      })
  }, [auteurId, oeuvre?.titre])

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
  // Supprime en UNE fois tous les liens d'un groupe (un lien fusionné couvre
  // plusieurs versets) : une seule confirmation, une seule requête, une seule
  // mise à jour d'état — au lieu d'une boucle qui rouvrait un confirm() natif et
  // lançait une écriture par verset.
  const supprimerLiensBibliques = async (segId: number, versetIds: string[]) => {
    if (!estAdmin || !versetIds.length) return
    const multiple = versetIds.length > 1
    if (!confirm(multiple ? `Supprimer ces ${versetIds.length} liens bibliques ?` : 'Supprimer ce lien biblique ?')) return
    const { error } = await supabase.from('liens_bibliques')
      .delete().eq('segment_id', segId).in('canon_id', versetIds)
    if (error) { alert('Suppression impossible : ' + error.message); return }
    const aRetirer = new Set(versetIds)
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !aRetirer.has(v.id)) } : s))
  }

  // Lettrine (drop cap) du tout premier segment, réutilisée par les deux modes.
  const DROPCAP: React.CSSProperties = { float: 'left', fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '3.4em', lineHeight: '0.78', paddingRight: '5px', paddingTop: '3px', color: 'var(--cs-encre)', fontWeight: 'normal', userSelect: 'none' }

  // Rend un texte de segment avec sa lettrine (drop cap) sur la première LETTRE.
  // Si le paragraphe s'ouvre sur une ponctuation (guillemet «, tiret…), celle-ci
  // doit rester SOLIDAIRE de la lettrine flottante : rendue à part, un « float »
  // la rejetterait à droite de la lettrine (« [V] « ous… » au lieu de « «V ous… »).
  // On la glisse donc dans le même flottant, en petit corps calé sur le haut.
  const rendreAvecLettrine = (texte: string, notes: Record<string, string>): React.ReactNode => {
    const t = nettoyerFin(normaliserEspaces(texte))
    const chars = [...t]
    const li = chars.findIndex(ch => /\p{L}/u.test(ch))
    if (li < 0) return rendreTexteAvecNotes(t, notes)
    const prefix = chars.slice(0, li).join('')
    const lettre = chars[li]
    const suite = chars.slice(li + 1).join('')
    return (
      <>
        <span style={DROPCAP}>
          {prefix && <span style={{ fontSize: '0.34em', verticalAlign: '0.72em', lineHeight: 1, paddingRight: '1px' }}>{rendreTexteAvecNotes(prefix, notes)}</span>}
          {lettre}
        </span>
        {rendreTexteAvecNotes(suite, notes)}
      </>
    )
  }

  // Mode paragraphes : découpe les segments d'un groupe en paragraphes (colonne
  // `paragraphe`, charte §6.1), ordonnés en interne par `rang`. Segments
  // consécutifs de même paragraphe → un bloc coulant. Un `paragraphe` nul isole
  // le segment (garde-fou).
  const paragraphesDe = (itemIds: number[], source: Map<number, SegData> = segMap): { ids: number[] }[] => {
    const chunks: { par: number | null | undefined; ids: number[] }[] = []
    for (const sid of itemIds) {
      const par = source.get(sid)?.paragraphe
      const dernier = chunks[chunks.length - 1]
      if (dernier && par != null && dernier.par === par) dernier.ids.push(sid)
      else chunks.push({ par, ids: [sid] })
    }
    for (const c of chunks) c.ids.sort((a, b) => {
      const ra = source.get(a)?.rang, rb = source.get(b)?.rang
      return (ra != null && rb != null) ? ra - rb : 0
    })
    return chunks.map(c => ({ ids: c.ids }))
  }

  // Cellule d'actions flottante d'un segment (mode paragraphes), ancrée sur le
  // segment survolé ou sélectionné.
  const positionnerToolbar = (el: HTMLElement, sid: number) => {
    if (timerSurvolRef.current) clearTimeout(timerSurvolRef.current)
    const r = el.getBoundingClientRect()
    const largeurEcran = typeof window !== 'undefined' ? window.innerWidth : 1200
    setSegSurvol({ id: sid, top: Math.max(r.top - 4, 56), left: Math.min(r.right + 6, largeurEcran - 132) })
  }
  const masquerToolbar = (sid: number) => {
    timerSurvolRef.current = setTimeout(() => setSegSurvol(prev => (prev && prev.id === sid ? null : prev)), 200)
  }

  return (
    <div style={{ background: 'var(--cs-fond)', minHeight: '100vh' }}>
      <style>{`
        .seg-wrapper { position: relative; }
        .seg-wrapper::after { content: ''; position: absolute; top: 0; right: -44px; width: 44px; height: 100%; pointer-events: none; }
        .seg-p { transition: background 0.12s; }
        .seg-p:hover { background: rgba(var(--cs-vert-rgb),0.05) !important; }
        .seg-actions { opacity: 0; transition: opacity 0.15s; position: relative; z-index: 2; pointer-events: auto; }
        .seg-wrapper:hover .seg-actions { opacity: 1; }
        .seg-wrapper--actif .seg-actions { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-enreg { opacity: 1 !important; }
        .seg-wrapper .seg-btn-enreg { opacity: 0; }
        .seg-wrapper--actif .seg-btn-enreg { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-action { opacity: 1 !important; }
        .seg-wrapper .seg-btn-action { opacity: 0; }
        .seg-wrapper--actif .seg-btn-action { opacity: 0.5; }
        /* Mode paragraphes : segments coulant dans un même bloc, délimités au survol. */
        .seg-inline { border-radius: 2px; padding: 0 0.5px; cursor: pointer; transition: background 0.12s; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
        .seg-inline:hover { background: rgba(var(--cs-vert-rgb),0.09); }
        .seg-inline--actif { background: #ddeee2; }
        .para-bilingue { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr); gap: 1.6rem; align-items: start; border-bottom: 1px solid rgba(var(--cs-bord-rgb),0.55); margin-bottom: 0.85rem; }
        .para-bilingue > p { margin-bottom: 0.85rem !important; }
        .texte-original { color: #575048; font-family: var(--font-source-serif), Georgia, serif; }
        @media(max-width: 980px){
          .titre-colophon{max-width:100%!important;line-height:1.32!important;word-spacing:normal!important;letter-spacing:0!important;}
          .titre-colophon > span{display:inline!important;width:auto!important;max-width:100%!important;}
          .titre-colophon > span:not(:last-child)::after{content:" ";}
          .para-bilingue { grid-template-columns: 1fr; gap: 0.15rem; }
          .para-bilingue > .texte-original { padding-left: 0.85rem; border-left: 2px solid #ddd6cb; }
        }
        .toc-lien-n1:hover, .toc-lien-n2:hover { color: var(--cs-vert) !important; }
        .ref-lien:hover { color: var(--cs-vert) !important; }
        .onglet-btn { transition: color 0.12s, border-color 0.12s; }
        .onglet-btn:hover { color: var(--cs-vert) !important; }
        .signal-btn:hover { color: var(--cs-danger) !important; }
        .trad-option:hover { background: rgba(var(--cs-vert-rgb),0.06) !important; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── NAV GAUCHE ── */}
        {navOuverte ? (
        <>
        {/* Mobile : tiroir par-dessus le texte, sous la navbar. */}
        {mobile && <div onClick={() => setNavOuverte(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
        <nav ref={refNav} style={mobile ? {
          position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, overflowY: 'auto', background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 28px rgba(45,35,25,0.22)',
        } : { width: navWidth == null ? 'clamp(240px, 16vw, 380px)' : navWidth + 'px', flexShrink: 0, position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', height: 'calc(100vh - 3.5rem)', overflowY: 'auto', borderRight: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--cs-bord)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <ApercuAuteur auteurId={auteurId ?? null} onOuvrirFiche={() => { if (auteurId) setAuteurModalOuvert(true) }}>{auteur}</ApercuAuteur>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {estAdmin && (
                  <button onClick={() => setConfigOuverte(true)} title="Configurer les niveaux d'affichage"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
                  </button>
                )}
                {favorisPret && (
                  <EtoileFavori actif={favorisOeuvres.has(idOeuvre)} onToggle={() => toggleFavoriOeuvre(idOeuvre)} size={13}
                    title={favorisOeuvres.has(idOeuvre) ? 'Retirer des favoris' : 'Ajouter aux favoris'} />
                )}
                <button onClick={() => setNavOuverte(false)} title="Réduire le sommaire"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', color: 'var(--cs-encre)', lineHeight: 1.35, margin: 0, whiteSpace: 'pre-line' }}>
              {rendreTexteEnrichi(oeuvreLocale.titre_affichage || titreAffiche)}
            </p>
            {(oeuvreLocale.sous_titre || oeuvreLocale.titre_original || oeuvreLocale.trad_auteur || oeuvreLocale.editeur || oeuvreLocale.ville || oeuvreLocale.date_publication || oeuvreLocale.collection) && (
              <button onClick={() => setInfoEditionOuverte(true)}
                style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '6px', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                En savoir plus sur cette édition
              </button>
            )}
            {versionsTextuelles.length > 1 && (
              <div style={{ marginTop: '10px' }}>
                <span style={LABEL_VOLET}>Versions textuelles</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {versionsTextuelles.map(v => {
                    const actif = v.id_texte === idTexteActif
                    const label = v.titre_version || (String(v.langue || '').toLowerCase().startsWith('lat') ? 'Texte latin' : 'Texte français')
                    return (
                      <button key={v.id_texte} disabled={actif}
                        onClick={() => changerVersionTextuelle(v.id_texte)}
                        title={actif ? 'Version textuelle affichée' : `Afficher : ${label}`}
                        style={{ ...BTN_VOLET(actif), cursor: actif ? 'default' : 'pointer' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lecture : trois lignes de texte (Français, Français & Latin, Latin). Le
                choix « paragraphes / segments » n'existe que pour le français d'une œuvre
                segmentée. Sur le modèle du bouton « Les Saintes Écritures » de la navbar
                (et des trois cartes d'accueil), la ligne « Français » SE DIVISE EN DEUX au
                survol : sa face s'efface et laisse paraître, sur place, « Paragraphes » et
                « Segments », que l'on choisit d'un clic. */}
            {aTexteOriginal ? (
              <div style={{ marginTop: '10px' }}>
                <style>{`
                  .lec-split { position: relative; border-radius: 5px; overflow: hidden; }
                  .lec-split-face { transition: opacity 200ms ease; }
                  .lec-split:hover .lec-split-face, .lec-split:focus-within .lec-split-face { opacity: 0; pointer-events: none; }
                  .lec-split-menu { position: absolute; inset: 0; display: flex; opacity: 0; pointer-events: none; transition: opacity 200ms ease; border-radius: 5px; overflow: hidden; }
                  .lec-split:hover .lec-split-menu, .lec-split:focus-within .lec-split-menu { opacity: 1; pointer-events: auto; }
                  .lec-split-seg { flex: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none; background: transparent; font-family: inherit; font-size: 0.57rem; color: var(--cs-texte-second); transition: background 140ms ease, color 140ms ease; }
                  .lec-split-seg:hover { background: rgba(var(--cs-vert-rgb),0.12); color: var(--cs-encre); }
                  .lec-split-seg + .lec-split-seg { box-shadow: inset 1px 0 0 rgba(var(--cs-vert-rgb),0.18); }
                  .lec-split-seg--actif { color: var(--cs-encre); background: rgba(var(--cs-vert-rgb),0.10); font-weight: 600; }
                  @media (prefers-reduced-motion: reduce) { .lec-split-face, .lec-split-menu { transition: none; } }
                `}</style>
                <span style={LABEL_VOLET}>Lecture</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {(([['fr', 'Français'], ['bilingue', labelBilingue], ['la', labelOriginal]]) as ['fr' | 'bilingue' | 'la', string][]).map(([mode, label]) => {
                    const actif = modeTexte === mode
                    // Seul le français d'une œuvre segmentée peut se lire en paragraphes OU
                    // en segments ; l'original (bilingue, latin) impose les paragraphes.
                    const peutSegmenter = mode === 'fr' && eligibleParagraphes
                    if (!peutSegmenter) {
                      return (
                        <button key={mode} onClick={() => basculerTexte(mode)} style={{ ...BTN_VOLET(actif) }}>{label}</button>
                      )
                    }
                    return (
                      <div key={mode} className="lec-split">
                        {/* Face : sélectionne « Français » en conservant le mode courant ;
                            au survol elle s'efface. */}
                        <button className="lec-split-face" onClick={() => basculerTexte('fr')}
                          style={{ ...BTN_VOLET(actif), display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span>{label}</span>
                          {actif && (
                            <span aria-hidden="true" style={{ fontSize: '0.5rem', fontStyle: 'italic', letterSpacing: '0.02em', color: '#6f9a80' }}>
                              {modeLecture === 'segments' ? 'segments' : 'paragraphes'}
                            </span>
                          )}
                        </button>
                        {/* Deux moitiés révélées au survol. */}
                        <div className="lec-split-menu" style={{ border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: 'var(--cs-surface)' }}>
                          {(['paragraphes', 'segments'] as const).map(m => (
                            <button key={m} className={`lec-split-seg${actif && modeLecture === m ? ' lec-split-seg--actif' : ''}`}
                              onClick={() => { if (modeTexte !== 'fr') basculerTexte('fr'); basculerMode(m) }}>
                              {m === 'paragraphes' ? 'Paragraphes' : 'Segments'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : eligibleParagraphes ? (
              // Œuvre sans texte original : pas de choix de langue, seulement paragraphes/segments.
              <div style={{ marginTop: '10px' }}>
                <span style={LABEL_VOLET}>Lecture</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {(['paragraphes', 'segments'] as const).map(m => (
                    <button key={m} onClick={() => basculerMode(m)} style={{ ...BTN_VOLET(modeLecture === m) }}>
                      {m === 'paragraphes' ? 'Paragraphes' : 'Segments'}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {versionsTextuelles.length <= 1 && versions.length > 1 && (
              <div style={{ marginTop: '7px' }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '4px' }}>Traduction</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {versions.map(v => {
                    const actif = v.id_oeuvre === idOeuvre
                    const label = v.trad_auteur ? libelleTrad(v.trad_auteur) : (formaterEditeur(v.editeur) || 'Édition')
                    return (
                      <button key={v.id_oeuvre} disabled={actif}
                        onClick={() => { if (!actif) router.push(`/oeuvre/${v.id_oeuvre}`) }}
                        title={actif ? 'Traduction affichée' : 'Afficher cette traduction'}
                        style={{ textAlign: 'left', fontSize: '0.625rem', lineHeight: 1.32, padding: '4px 8px', borderRadius: '5px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.07)' : 'transparent', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)', cursor: actif ? 'default' : 'pointer', fontWeight: actif ? 600 : 400, transition: 'border-color 0.12s, background 0.12s' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>


          {oeuvresAuteur.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--cs-bord)', flexShrink: 0 }}>
              <button onClick={() => setAuteurOuvert(!auteurOuvert)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)' }}>DU MÊME AUTEUR</span>
                <span style={{ fontSize: '0.4375rem', color: 'var(--cs-texte-faible)' }}>{auteurOuvert ? '▲' : '▼'}</span>
              </button>
              {auteurOuvert && (
                <div style={{ padding: '0 16px 12px' }}>
                  {oeuvresAuteur.map(o => (
                    <a key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
                      style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--cs-texte)', textDecoration: 'none', padding: '3px 0', lineHeight: 1.35, borderBottom: '1px solid var(--cs-fond-doux)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-vert)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-texte)')}>
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
              <div style={{ ...(apparatOuvert ? { flex: '0 1 auto', maxHeight: '50%', minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--cs-bord)' }}>
                <button onClick={() => setApparatOuvert(!apparatOuvert)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)' }}>APPARAT</span>
                  <span style={{ fontSize: '0.4375rem', color: 'var(--cs-texte-faible)' }}>{apparatOuvert ? '▲' : '▼'}</span>
                </button>
                {apparatOuvert && (
                  <div style={{ flex: '0 1 auto', overflowY: 'auto', padding: '0 16px 14px' }}>
                    {tocApparatLocal.map((entry, i) => (
                      <div key={i}>
                        <a href={`#${entry.anchor}`} onClick={(e) => { e.preventDefault(); setVue('apparat'); setSegActif(null); setApparatNiv1Actif(entry.niv1); setAncreEnAttente(entry.anchor) }} className="toc-lien-n1"
                          style={{ display: 'block', fontSize: '0.71875rem', fontWeight: apparatNiv1Actif === entry.niv1 ? 600 : 400, color: apparatNiv1Actif === entry.niv1 ? 'var(--cs-vert)' : 'var(--cs-texte)', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
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
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)' }}>SOMMAIRE</span>
                <span style={{ fontSize: '0.4375rem', color: 'var(--cs-texte-faible)' }}>{sommaireOuvert ? '▲' : '▼'}</span>
              </button>

              {sommaireOuvert && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
            <p style={{ display: 'none' }}></p>

            {texteSansNiveaux && (
              <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', lineHeight: 1.45, margin: '4px 0 0' }}>
                Texte complet
              </p>
            )}

            {!texteSansNiveaux && niv1List.map(n1 => {
              const estActif = vue === 'texte' && n1 === niv1Actif

              return (
                <div key={n1} style={{ marginBottom: profondeurSommaire >= 2 ? '6px' : '0' }}>
                  {/* Niv1 */}
                  <button onClick={() => changerNiv1(n1)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '0.71875rem', fontWeight: estActif ? 600 : 400, color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte)', lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                    {n1}
                    {niv1TexteMap[n1] && configNiveaux.txtSommaire[0] && (
                      <span style={{ fontSize: '0.59375rem', color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px' }}>{titreSansAppelsDeNote(niv1TexteMap[n1])}</span>
                    )}
                  </button>

                  {/* Niv2 — affiché si profondeur >= 2 ET niv1 actif */}
                  {profondeurSommaire >= 2 && estActif && niv2List.map(n2 => {
                    const g2 = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2)
                    const n2txt = g2?.niv2_texte || ''
                    const actif2 = vue === 'texte' && niv2Actif === n2
                    // Niv3 distincts pour ce niv2
                    const niv3DeN2 = profondeurSommaire >= 3
                      ? Array.from(new Set(groupes.filter(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3).map(g => g.niv3)))
                      : []
                    return (
                      <div key={n2} style={{ borderLeft: actif2 ? '2px solid var(--cs-vert)' : '2px solid transparent', marginBottom: '2px' }}>
                        {/* Bouton niv2 */}
                        <button
                          onClick={() => allerAuNiv2(actif2 ? null : n2)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0 3px 8px' }}>
                          <span style={{ fontSize: '0.65625rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3 }}>{n2}</span>
                          {n2txt && configNiveaux.txtSommaire[1] && <span style={{ fontSize: '0.59375rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px' }}>{n2txt}</span>}
                        </button>
                        {/* Niv3 — toujours visible, sans accordéon */}
                        {niv3DeN2.map(n3 => {
                          const g3 = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3 === n3)
                          const n3txt = g3?.niv3_texte || ''
                          const ancre = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3 === n3)?.anchor
                          return (
                            <button key={n3}
                              onClick={() => {
                                setVue('texte')
                                if (ancre) naviguerVersAncre(ancre)
                              }}
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 2px 16px' }}>
                              <span style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-doux)', display: 'block', lineHeight: 1.3 }}>{n3}</span>
                              {n3txt && configNiveaux.txtSommaire[2] && <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', display: 'block', lineHeight: 1.2 }}>{n3txt}</span>}
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
            style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderBottom: '1px solid var(--cs-bord)', boxShadow: '0 1px 4px rgba(45,35,25,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(90deg)', color: 'var(--cs-texte-doux)' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>Sommaire</span>
          </button>
        ) : (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 3.5rem)', width: '22px', background: 'var(--cs-fond-clair)', border: 'none', borderRight: '1px solid var(--cs-bord)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M3 1l4 4-4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, transform: 'rotate(180deg)', fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: 'var(--cs-texte-faible)', userSelect: 'none' }}>Sommaire</span>
          </button>
        )}

        {/* ── TEXTE CENTRAL ── */}
        <main lang={langueHtml} style={{ flex: 1, minWidth: 0, padding: mobile ? '2.875rem 14px 3.75rem' : '0 14px 80px', position: 'relative', overflow: 'visible' }}><div style={{ maxWidth: '35rem', margin: '0 auto', position: 'relative', overflow: 'visible' }}>
          <PageTitre auteur={auteur} oeuvre={oeuvreLocale} titre={titreAffiche} estAdmin={estAdmin} mobile={mobile}
            onModifier={(champ, va) => setEditionCible({
              type: 'titre_oeuvre', champ, texteActuel: va,
              // Le titre a deux colonnes, et la page de titre montre la seconde dès
              // qu'elle est renseignée : on laisse donc choisir celle qu'on modifie,
              // au lieu d'écrire dans l'une pendant que l'écran affiche l'autre.
              variantes: champ === 'titre' ? [
                { champ: 'titre', libelle: 'Titre de catalogue', texte: titreAffiche,
                  aide: 'Le nom de l’œuvre : bibliothèque, recherche, citations, fil d’Ariane. Il s’écrit d’un seul tenant.' },
                { champ: 'titre_affichage', libelle: 'Titre composé', texte: oeuvreLocale.titre_affichage ?? '',
                  aide: 'La composition du seul frontispice, sauts de ligne compris. Renseignée, c’est elle qui paraît ici, à la place du titre de catalogue.' },
              ] : undefined,
            })} />

          {/* Fleuron (feuille de vigne) séparant la page de titre du niveau 1,
              à la place du long filet. */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0 44px', paddingRight: gouttiereTitre }}>
            <FeuilleVigne />
          </div>

          {/* Navigation précédent/suivant — toujours au niveau 1 */}
          {vue === 'texte' && !texteSansNiveaux && !lectureTexteEntier && (
            <div id="barre-nav-niv1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem', paddingBottom: '1rem', paddingRight: gouttiereTitre, borderBottom: '1px solid var(--cs-fond-doux)', minHeight: '32px', scrollMarginTop: '60px' }}>
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev, { conserverPosition: true })} disabled={!niv1Prev}
                style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: niv1Prev ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Prev ? 'auto' : 'none' }}>
                {niv1Prev ? '‹' : ''}
              </button>
              <span style={{ fontSize: '1.45rem', fontWeight: 500, color: 'var(--cs-encre)', fontFamily: "var(--font-source-serif), Georgia, serif", textAlign: 'center', minWidth: 0, lineHeight: 1.3, whiteSpace: 'pre-line', overflowWrap: 'break-word', position: 'relative' }}>
                {niv1Erreur ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Erreur de chargement.{' '}
                    <button onClick={() => changerNiv1(niv1Erreur, { forceRefresh: true })}
                      style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '3px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer' }}>
                      Réessayer
                    </button>
                  </span>
                ) : niv1Loading ? <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)' }}>Chargement…</span> : (
                  <>
                    {rendreTitreColophonAvecNotes(niv1Actif, segMap.get(groupes[0]?.itemIds[0] ?? -1)?.notes ?? {}, true)}
                    {(() => {
                      const txt = groupes[0]?.niv1_texte || niv1TexteMap[niv1Actif] || ''
                      const notesTitre = segMap.get(groupes[0]?.itemIds[0] ?? -1)?.notes ?? {}
                      return txt && configNiveaux.txtCorps[0]
                        ? <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', marginTop: '4px', fontFamily: "var(--font-source-serif), Georgia, serif" }}>{rendreTexteAvecNotes(preparerTitreColophon(txt), notesTitre)}</span>
                        : null
                    })()}
                    {estAdmin && (() => { const g = groupes[0] ?? { niv1: niv1Actif, niv2: '', niv3: '', niv4: '', anchor: '', itemIds: [] }; return (
                      <div style={{ position: 'absolute', right: '-52px', top: '2px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: niv1Actif, schemaTexte: false })}
                          title="Modifier le titre" style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}><IconeCrayon size={12} /></button>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: g.niv1_texte ?? '', schemaTexte: true })}
                          title="Modifier le sous-titre" style={{ fontSize: '0.625rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1, fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                      </div>
                    )})()}
                  </>
                )}
              </span>
              <button onClick={() => niv1Next && changerNiv1(niv1Next, { conserverPosition: true })} disabled={!niv1Next}
                style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: niv1Next ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: niv1Next ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Next ? 'auto' : 'none' }}>
                {niv1Next ? '›' : ''}
              </button>
            </div>
          )}

          {/* Vue texte principal */}
          {vue === 'texte' && (() => {
            let dniv1 = pageActuelle > 0 ? (pages[pageActuelle - 1]?.at(-1)?.niv1 ?? '') : ''
            let dniv2 = '', dniv3 = '', dniv4 = ''
            let isFirstGroupe = true
            // Introductions (arguments) hissées en tête de l'homélie, hors des groupes
            // et de la pagination : police plus petite et plus claire, marges latérales.
            // Rendues depuis l'état complet des segments, et seulement sur la 1re page.
            const intros = pageActuelle === 0 ? segments.filter(s => s.nature === 'introduction') : []
            return (<>
              {intros.map((s, index) => {
                const suivant = intros[index + 1]
                const memeParagraphe = suivant?.paragraphe != null && suivant.paragraphe === s.paragraphe
                return (
                <div key={`intro-${s.id}`} className="seg-wrapper" style={{ position: 'relative', margin: `0 0 ${memeParagraphe ? '0.18rem' : '0.55rem'}` }}>
                  <div lang="fr" onClick={() => setSegActif(segActif === s.id ? null : s.id)} className="seg-p"
                    style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.74rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.6, textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto', WebkitHyphens: 'auto', cursor: 'pointer', borderRadius: '3px', padding: '2px 6px', margin: 0, background: segActif === s.id ? '#ddeee2' : 'transparent' } as React.CSSProperties}>
                    {rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                  </div>
                  <div className="seg-actions" style={{ position: 'absolute', top: '2px', right: '2px', display: 'flex', gap: '2px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', boxShadow: '0 2px 10px rgba(45,35,25,0.12)', padding: '2px 4px' }}>
                    {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
                    <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvre.titre} sousTitre={oeuvre.sous_titre} tradAuteur={oeuvre.trad_auteur} editeur={oeuvre.editeur} collection={oeuvre.collection} ville={oeuvre.ville} datePublication={oeuvre.date_publication} />
                    <BoutonSignalerSegment segId={s.id} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} />
                  </div>
                </div>
                )
              })}
              {groupesFiltres.map((groupe) => {
              const itemsReels = groupe.itemIds.filter(id => segMap.get(id)?.nature !== 'introduction')
              if (itemsReels.length === 0) return null
              const notesTitre = segMap.get(itemsReels[0])?.notes ?? {}
              const showNiv1 = lectureTexteEntier && profondeurCorps >= 1 && groupe.niv1 && groupe.niv1 !== dniv1
              const showNiv2 = profondeurCorps >= 2 && groupe.niv2 && groupe.niv2 !== dniv2
              const showNiv3 = profondeurCorps >= 3 && groupe.niv3 && groupe.niv3 !== dniv3
              const showNiv4 = profondeurCorps >= 4 && groupe.niv4 && groupe.niv4 !== dniv4
              if (showNiv1) {
                dniv1 = groupe.niv1
                dniv2 = ''
                dniv3 = ''
                dniv4 = ''
              }
              if (showNiv2) dniv2 = groupe.niv2
              if (showNiv3) dniv3 = groupe.niv3
              if (showNiv4) dniv4 = groupe.niv4
              const marginTop = isFirstGroupe ? '0' : showNiv1 ? '2.8rem' : showNiv2 ? '2.5rem' : showNiv3 ? '1.5rem' : '0.8rem'
              if (isFirstGroupe) isFirstGroupe = false
              return (
                <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                  {showNiv1 && (
                    <div style={{ textAlign: 'center', marginTop, marginBottom: '1.5rem', paddingTop: '0.5rem', paddingRight: gouttiereTitre, position: 'relative' }}>
                      <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.45rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv1, notesTitre, true)}</h2>
                      {groupe.niv1_texte && configNiveaux.txtCorps[0] && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.95rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTexteAvecNotes(preparerTitreColophon(groupe.niv1_texte), notesTitre)}</p>}
                    </div>
                  )}
                  {showNiv2 && (
                    <div style={{ textAlign: 'center', marginTop: marginTop, marginBottom: '1rem', paddingTop: '0.5rem', paddingRight: gouttiereTitre, position: 'relative' }}>
                      <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.1rem', fontWeight: 400, color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, letterSpacing: '0.01em', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2, notesTitre, true)}</h3>
                      {groupe.niv2_texte && configNiveaux.txtCorps[1] && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.92rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2_texte, notesTitre)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: '52px', top: '0.5rem', display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5625rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv3 && (
                    <div style={{ marginTop: isFirstGroupe ? '0' : '1rem', marginBottom: '0.4rem', paddingLeft: '11px', borderLeft: '1px solid #ddd6cb', position: 'relative', paddingRight: estAdmin ? '44px' : 0 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--cs-texte)', lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', whiteSpace: 'pre-line', textAlign: groupe.niv3.length >= SEUIL_TITRE_COLOPHON ? 'center' : undefined }}>{rendreTitreColophonAvecNotes(groupe.niv3, notesTitre, true)}</p>
                      {groupe.niv3_texte && configNiveaux.txtCorps[2] && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', lineHeight: 1.3, margin: '2px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv3_texte, notesTitre)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5625rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv4 && (
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--cs-texte-faible)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: '0.5rem', position: 'relative', paddingRight: estAdmin ? '44px' : 0, whiteSpace: 'pre-line' }}>
                      {rendreTitreColophonAvecNotes(groupe.niv4, notesTitre, true)}
                      {groupe.niv4_texte && configNiveaux.txtCorps[3] && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px', fontStyle: 'italic' }}>{rendreTitreColophonAvecNotes(groupe.niv4_texte, notesTitre)}</span>}
                      {estAdmin && (
                        <span style={{ position: 'absolute', right: 0, top: 0, display: 'inline-flex', gap: '3px', alignItems: 'center', textTransform: 'none' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', letterSpacing: 0 }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic', letterSpacing: 0 }}><IconeCrayon size={12} /></button>
                        </span>
                      )}
                    </p>
                  )}
                  {modeLecture === 'paragraphes' ? paragraphesDe(itemsReels).map((chunk) => {
                    const original = chunk.ids.map(sid => segMap.get(sid)).find(s => Boolean(s?.texteOriginal?.trim()))
                    return (
                    <div key={`para-${chunk.ids[0]}`} className={affichageBilingue && original ? 'para-bilingue' : undefined}
                      /* Réserve la MÊME gouttière d'actions (~60px) que le mode segments, pour que
                         la largeur du texte (et de la grille bilingue) s'aligne sur les titres et
                         la page de titre. */
                      style={{ paddingRight: gouttiereTitre }}>
                      <p lang="fr" style={{ display: afficherOriginalSeul ? 'none' : undefined, fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.82rem', color: 'var(--cs-texte-fort)', lineHeight: '1.62', textAlign: 'justify', textJustify: 'inter-word', margin: '0 0 0.72rem', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                        {chunk.ids.map((sid, i) => {
                          const s = segMap.get(sid)
                          if (!s) return null
                          const actif = segActif === sid
                          const estPremier = sid === premierSegmentId
                          return (
                            <Fragment key={sid}>
                              <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: '60px' }}
                                onClick={(e) => { setSegActif(actif ? null : sid); positionnerToolbar(e.currentTarget as HTMLElement, sid) }}
                                onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                {configNiveaux.afficherNumeros && !estPremier && <sup style={{ fontSize: '0.50rem', color: 'var(--cs-texte-faible)', userSelect: 'none', marginRight: '2px', lineHeight: 1 }}>{s.numero}</sup>}
                                {estPremier && normaliserEspaces(s.texte).length > 0 ? rendreAvecLettrine(s.texte, s.notes ?? {}) : rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                              </span>
                              {i < chunk.ids.length - 1 ? ' ' : ''}
                            </Fragment>
                          )
                        })}
                      </p>
                      {(affichageBilingue || afficherOriginalSeul) && original?.texteOriginal && (
                        // En « Latin seul », l'original occupe seul la colonne, au gabarit du
                        // français (mêmes taille et teinte).
                        <p lang="la" className="texte-original" style={{ fontSize: afficherOriginalSeul ? '0.82rem' : '0.79rem', color: afficherOriginalSeul ? 'var(--cs-texte-fort)' : undefined, lineHeight: afficherOriginalSeul ? '1.62' : '1.58', textAlign: 'justify', textJustify: 'inter-word', margin: '0 0 0.72rem', hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                          {rendreTexteAvecNotes(normaliserEspacesOriginal(original.texteOriginal), original.notes ?? {})}
                        </p>
                      )}
                    </div>
                    )
                  }) : itemsReels.map(sid => {
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
                          lang="fr" style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.82rem', color: 'var(--cs-texte-fort)', lineHeight: '1.52', textAlign: 'justify', textJustify: 'inter-word', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', margin: 0, flex: 1, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                          {configNiveaux.afficherNumeros && sid !== premierSegmentId && <sup style={{ fontSize: '0.50rem', color: 'var(--cs-texte-faible)', userSelect: 'none', marginRight: '2px', lineHeight: 1 }}>{s.numero}</sup>}
                          {sid === premierSegmentId && normaliserEspaces(s.texte).length > 0 ? rendreAvecLettrine(s.texte, s.notes ?? {}) : rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                        </p>
                        <div className="seg-actions" style={mobile ? {
                          position: 'absolute', top: '0.25rem', right: '0.25rem', zIndex: 6, opacity: 1, display: actionsSegMobileId === sid ? 'flex' : 'none', flexDirection: 'row', gap: '0.25rem', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(45,35,25,0.18)', padding: '0.25rem 0.375rem',
                        } : { display: 'flex', flexDirection: 'row', gap: '2px', flexShrink: 0, width: '68px', paddingTop: '2px', justifyContent: 'flex-end', marginRight: '-8px' }}>
                          {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
                          <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvre.titre} sousTitre={oeuvre.sous_titre} tradAuteur={oeuvre.trad_auteur} editeur={oeuvre.editeur} collection={oeuvre.collection} ville={oeuvre.ville} datePublication={oeuvre.date_publication} className="seg-btn-action" />
                          <BoutonSignalerSegment segId={sid} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} className="seg-btn-action" />
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)" aria-label="Modifier ce segment"
                              className="seg-btn-action"
                              style={{ ...BTN_STYLE, color: 'var(--cs-bord)' }}>
                              <IconeCrayon size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
            </>)
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
                  if (showNiv1) { dniv1 = groupe.niv1; dniv2 = '' }
                  const showNiv2 = groupe.niv2 && groupe.niv2 !== dniv2
                  if (showNiv2) dniv2 = groupe.niv2
                  const notesTitre = segMapApparat.get(groupe.itemIds[0])?.notes ?? {}
                  const marginTop = isFirst ? '0' : '2.5rem'
                  if (isFirst) isFirst = false
                  return (
                    <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                      {showNiv1 && (
                        <div style={{ position: 'relative', marginTop: marginTop, marginBottom: '0.5rem' }}>
                          <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.45rem', fontWeight: 500, color: 'var(--cs-texte-fort)', textAlign: 'center', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv1, notesTitre, true)}</h2>
                          {groupe.niv1_texte && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.95rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4, margin: '4px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv1_texte, notesTitre)}</p>}
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe, texteActuel: groupe.niv1_texte || groupe.niv1, schemaTexte: true })}
                              title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          )}
                        </div>
                      )}
                      {showNiv2 && (
                        <div style={{ margin: showNiv1 ? '1rem 0 0.6rem' : '2rem 0 0.6rem', textAlign: 'center' }}>
                          <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.05rem', fontWeight: 500, color: '#3d3832', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2, notesTitre, true)}</h3>
                          {groupe.niv2_texte && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.86rem', color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.35, margin: '3px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2_texte, notesTitre)}</p>}
                        </div>
                      )}
                      {modeLecture === 'paragraphes' ? paragraphesDe(groupe.itemIds, segMapApparat).map(chunk => (
                        <div key={`apparat-para-${chunk.ids[0]}`} style={{ paddingRight: gouttiereTitre }}>
                          <p lang="fr" style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.82rem', color: 'var(--cs-texte-fort)', lineHeight: '1.62', textAlign: 'justify', textJustify: 'inter-word', margin: '0 0 0.72rem', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                            {chunk.ids.map((sid, i) => {
                              const s = segMapApparat.get(sid)
                              if (!s) return null
                              const actif = segActif === sid
                              return (
                                <Fragment key={sid}>
                                  <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: '60px' }}
                                    onClick={(e) => { setSegActif(actif ? null : sid); positionnerToolbar(e.currentTarget as HTMLElement, sid) }}
                                    onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                    onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                    {configNiveaux.afficherNumeros && <sup style={{ fontSize: '0.50rem', color: 'var(--cs-texte-faible)', userSelect: 'none', marginRight: '2px', lineHeight: 1 }}>{s.numero}</sup>}
                                    {rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                                  </span>
                                  {i < chunk.ids.length - 1 ? ' ' : ''}
                                </Fragment>
                              )
                            })}
                          </p>
                        </div>
                      )) : groupe.itemIds.map(sid => {
                        const s = segMapApparat.get(sid)
                        if (!s) return null
                        const actif = segActif === sid
                        return (
                          <div key={sid} id={`segment-${sid}`} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', marginBottom: '0.45rem', scrollMarginTop: '60px' }}>
                            <p id={`a${s.numero}`} onClick={() => { setSegActif(actif ? null : sid) }} className="seg-p"
                              lang="fr" style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.82rem', color: 'var(--cs-texte-fort)', lineHeight: '1.52', textAlign: 'justify', textJustify: 'inter-word', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', paddingRight: estAdmin ? '72px' : '4px', margin: 0, flex: 1, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                              {configNiveaux.afficherNumeros && <sup style={{ fontSize: '0.50rem', color: 'var(--cs-texte-faible)', userSelect: 'none', marginRight: '2px', lineHeight: 1 }}>{s.numero}</sup>}
                              {rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                            </p>
                            {estAdmin && (
                              <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)"
                                aria-label="Modifier ce segment"
                                className="seg-btn-action"
                                style={{ position: 'absolute', right: '-10px', top: '1px', ...BTN_STYLE, color: 'var(--cs-bord)' }}>
                                <IconeCrayon size={12} />
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
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2rem)`, borderTop: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', background: 'var(--cs-surface)', boxShadow: '0 -10px 28px rgba(45,35,25,0.22)',
        } : { width: pannWidth == null ? 'clamp(280px, 21vw, 480px)' : pannWidth + 'px', flexShrink: 0, position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', height: 'calc(100vh - 3.5rem)', borderLeft: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', background: 'var(--cs-surface)' }}>
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

          <div style={{ position: 'relative', borderBottom: '1px solid var(--cs-bord)', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
            <button onClick={() => setPanneauOuvert(false)} title="Réduire le panneau"
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 1, padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div style={{ display: 'flex', flex: 1 }}>
              {(['refs', 'commentaires', 'problemes'] as const).map((key, idx) => {
                const labels = { refs: 'Bible', commentaires: 'Commentaires', problemes: 'Problèmes' }
                const actif = ongletDroit === key
                return (
                  <Fragment key={key}>
                    {idx > 0 && (
                      <span style={{ width: '1px', background: '#ddd8d0', alignSelf: 'center', height: '16px', flexShrink: 0 }} />
                    )}
                    <button onClick={() => setOngletDroit(key)} className="onglet-btn"
                      style={{ flex: 1, padding: '11px 4px 10px', background: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: actif ? '2px solid var(--cs-vert)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: '0.78125rem', fontWeight: actif ? 600 : 400, color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-second)', whiteSpace: 'nowrap' }}>{labels[key]}</span>
                    </button>
                  </Fragment>
                )
              })}
            </div>
          </div>

          <div style={ongletDroit === 'commentaires'
            ? { flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 12px', display: 'flex', flexDirection: 'column' }
            : { flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
            {ongletDroit === 'refs' ? (
              <>
                {/* Sélecteur traduction */}
                <div ref={tradSelectRef} style={{ padding: '10px 0 8px', borderBottom: '1px solid var(--cs-fond-doux)', marginBottom: '10px', position: 'relative' }}>
                  {/* Sélecteur de traduction remis dans le style général du site : libellé en
                      capitales espacées grises + contrôle sobre à bord neutre (au lieu de la
                      pilule verte). Le vert ne sert plus qu'à l'option active et au focus. */}
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 4px' }}>Traduction</p>
                  <button onClick={() => setTradOuverte(!tradOuverte)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '5px 10px', borderRadius: '5px', border: `1px solid ${tradOuverte ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: 'var(--cs-surface)', fontSize: '0.65625rem', color: 'var(--cs-encre)', cursor: 'pointer', transition: 'border-color 0.12s' }}>
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{traductionsBible[tradIndex]?.label ?? trad}</span>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: 'var(--cs-texte-doux)', transform: tradOuverte ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {tradOuverte && (
                    <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: 0, right: 0, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '6px', zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', overflow: 'hidden' }}>
                      {traductionsBible.map((t, i) => (
                        <button key={t.code} onClick={() => { setTradIndex(i); setTradOuverte(false) }} className="trad-option"
                          style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.65625rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: i < traductionsBible.length - 1 ? '1px solid var(--cs-fond-doux)' : 'none', background: tradIndex === i ? '#eef5f1' : '#fff', color: tradIndex === i ? 'var(--cs-vert)' : 'var(--cs-texte)', fontWeight: tradIndex === i ? 600 : 400, cursor: 'pointer' }}>
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
                      <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)' }}>Aucun lien biblique pour ce passage.</p>
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
                                  <a href={`/?livre=${encodeURIComponent(premier.livre)}&chapitre=${encodeURIComponent(premier.chapitre)}&verset=${encodeURIComponent(premier.verset)}&trad=${encodeURIComponent(trad)}`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0, textDecoration: 'none' }}>{labelGroupe}</a>
                                  {/* La nature du rapport, dite sans peser : le lecteur
                                      voit la référence d'abord, et peut savoir à quel
                                      titre elle est là s'il y prend garde. */}
                                  {natures.length > 0 && (
                                    <span style={{ fontSize: '0.59375rem', color: '#a89f92', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      {natures.join(' · ')}
                                    </span>
                                  )}
                                  {estAdmin && (
                                    <button onClick={() => supprimerLiensBibliques(segActifData.id, groupe.map(v => v.id))} title="Supprimer ce lien biblique"
                                      style={{ fontSize: '0.59375rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0', lineHeight: 1.1, fontWeight: 600, whiteSpace: 'nowrap' }}>
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
                              <p lang="fr" style={{ fontSize: '0.7rem', lineHeight: '1.38', color: 'var(--cs-texte-fort)', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.08em', hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 4px' } as React.CSSProperties}>
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
                    <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', textAlign: 'center', margin: '-30px 0 0' }}>Cliquez sur un paragraphe.</p>
                  </div>
                )}
              </>
            ) : ongletDroit === 'commentaires' ? (
              <div style={{ flex: 1, minHeight: 0, paddingTop: '14px', display: 'flex', flexDirection: 'column' }}>
                <OngletCommentaires segActif={segActif} estAdmin={estAdmin} />
              </div>
            ) : (
              <div style={{ paddingTop: '14px' }}>
                {!problemesCharges ? (
                  <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)' }}>Chargement…</p>
                ) : (() => {
                  // Plus de division en sous-onglets : tous les passages sont réunis, les
                  // « à constituer » d'abord, chacun portant une pastille qui indique son type.
                  const filtres = [...problemes].sort((a, b) => Number(b.aConstituer) - Number(a.aConstituer))
                  if (filtres.length === 0) return (
                    <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)' }}>
                      Aucun passage à relier pour cette œuvre.
                    </p>
                  )
                  // Aller au passage : sélectionne le segment et l'amène AU NIVEAU DES YEUX
                  // (tiers supérieur de l'écran). Le défilement est DIFFÉRÉ (après le rendu de
                  // React) et retenté quelques fois, le temps que le segment soit peint.
                  const allerAuPassage = (s: typeof filtres[number]) => {
                    setSegActif(s.id)
                    const id = `segment-${s.id}`
                    let essais = 0
                    const tenter = () => {
                      if (scrollNiveauDesYeux(id)) return
                      if (++essais < 12) { setTimeout(tenter, 110); return }
                      // Segment jamais peint : autre niveau 1 → bascule + effet différé ;
                      // sinon repli sur l'ancre du paragraphe.
                      if (s.ref_niv1 && s.ref_niv1 !== niv1Actif) {
                        pendingScrollSegRef.current = s.id
                        changerNiv1(s.ref_niv1, { conserverPosition: true })
                      } else {
                        const ancreLocale = groupes.find(g => g.itemIds.includes(s.id))?.anchor
                        if (ancreLocale) naviguerVersAncre(ancreLocale)
                      }
                    }
                    setTimeout(tenter, 50)
                  }
                  const pilleAction: React.CSSProperties = { flexShrink: 0, whiteSpace: 'nowrap', fontSize: '0.59375rem', borderRadius: '999px', padding: '3px 9px', cursor: 'pointer', lineHeight: 1.3, background: 'none' }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {filtres.map(s => {
                        const liensIds = Array.from(new Set(
                          s.liens.map(l => l.canon_id).filter(Boolean) as string[]
                        ))
                        const pill = s.aConstituer
                          ? { color: '#9a5a2a', background: '#fbf1e5', border: '1px solid #e8d3b6' }
                          : { color: '#3d5a4f', background: '#eef4f0', border: '1px solid #cbd8cf' }
                        return (
                          <div key={s.id} style={{ paddingBottom: '14px', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                            {/* En-tête : pastille de type, puis le titre de l'œuvre à côté, pour
                                situer le passage d'un coup d'œil. */}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                              <span style={{ flexShrink: 0, display: 'inline-block', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px', ...pill }}>
                                {s.aConstituer ? 'À constituer' : 'À vérifier'}
                              </span>
                              <span style={{ minWidth: 0, fontFamily: "var(--font-source-serif), Georgia, serif", fontStyle: 'italic', fontSize: '0.6875rem', color: '#8a8278', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {rendreTexteEnrichi(titreAffiche)}
                              </span>
                            </div>
                            <div lang="fr" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.75rem', lineHeight: 1.4, color: 'var(--cs-texte-fort)', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 8px', whiteSpace: 'pre-line' } as React.CSSProperties}>
                              {rendreTexteEnrichi(nettoyerFin(normaliserEspaces(s.segment_texte)))}
                            </div>
                            {s.reference_manuelle && (
                              <p style={{ fontSize: '0.65625rem', color: '#9a5a2a', fontStyle: 'italic', margin: '0 0 6px' }}>
                                Référence proposée : {s.reference_manuelle}
                              </p>
                            )}
                            {liensIds.length > 0 && (
                              <div style={{ margin: '0 0 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
                                        <span style={{ color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>
                                          {' '}({vi.chapAlt}{vi.verAlt != null ? `, ${vi.verAlt}` : ''})
                                        </span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                            {/* Actions sur UNE même rangée alignée : « Aller au passage » puis les
                                qualificatifs (proposer/écarter une référence, ou nature du lien). */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '9px' }}>
                              <button onClick={() => allerAuPassage(s)} title="Aller au passage dans le texte"
                                style={{ ...pilleAction, display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.07)', border: '1px solid #cbdccf' }}>
                                Aller au passage
                                <svg width="11" height="7" viewBox="0 0 12 8" fill="none" aria-hidden="true"><path d="M0.5 4h9M7 1l3 3-3 3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                              <span style={{ width: '1px', height: '13px', background: 'var(--cs-bord-clair)', flexShrink: 0 }} />
                              {s.aConstituer ? (
                                <>
                                  <button onClick={() => { if (exigerCompte('suggérer une référence')) setSuggestionSignalee({ ...s, nature: 'suggestion' }) }} title="Proposer une référence biblique pour ce passage"
                                    style={{ ...pilleAction, color: '#9a5a2a', border: '1px solid #e3cdb0' }}>Suggérer une référence</button>
                                  <button onClick={() => { if (exigerCompte('signaler ce passage')) setSuggestionSignalee({ ...s, nature: 'pas_de_reference' }) }} title="Signaler que ce passage ne renvoie à aucun verset"
                                    style={{ ...pilleAction, color: '#8a8278', border: '1px solid #ddd6cb' }}>Pas de référence</button>
                                </>
                              ) : (
                                ([['Citation','citation'],['Paraphrase','paraphrase'],['Commentaire','commentaire'],['Écho','echo']] as const).map(([label, nat]) => (
                                  <button key={nat} onClick={() => { if (exigerCompte('signaler ce lien')) setSuggestionSignalee({ ...s, nature: nat }) }} title={`Signaler ce lien comme « ${label} »`}
                                    style={{ ...pilleAction, color: '#3d5a4f', border: '1px solid #cbd8cf' }}>{label}</button>
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
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-surface)', border: 'none', borderTop: '1px solid var(--cs-bord)', boxShadow: '0 -1px 4px rgba(45,35,25,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(-90deg)', color: 'var(--cs-texte-doux)' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>Références &amp; commentaires</span>
          </button>
        ) : (
          <button onClick={() => setPanneauOuvert(true)} title="Ouvrir le panneau de références"
            style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 3.5rem)', width: '22px', background: 'var(--cs-surface)', border: 'none', borderLeft: '1px solid var(--cs-bord)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M7 1l-4 4 4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: 'var(--cs-texte-faible)', userSelect: 'none' }}>Commentaires et références bibliques</span>
          </button>
        )}
      </div>

      {/* Mode paragraphes : cellule d'actions flottante du segment survolé/sélectionné. */}
      {segSurvol && modeLecture === 'paragraphes' && vue === 'texte' && typeof document !== 'undefined' && (() => {
        const s = segMap.get(segSurvol.id)
        if (!s) return null
        return createPortal(
          <div onMouseEnter={() => { if (timerSurvolRef.current) clearTimeout(timerSurvolRef.current) }}
            onMouseLeave={() => masquerToolbar(segSurvol.id)}
            style={{ position: 'fixed', top: segSurvol.top, left: segSurvol.left, zIndex: 1500, display: 'flex', gap: '2px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(45,35,25,0.16)', padding: '2px 4px' }}>
            {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
            <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvre.titre} sousTitre={oeuvre.sous_titre} tradAuteur={oeuvre.trad_auteur} editeur={oeuvre.editeur} collection={oeuvre.collection} ville={oeuvre.ville} datePublication={oeuvre.date_publication} />
            <BoutonSignalerSegment segId={s.id} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} />
            {estAdmin && (
              <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)" aria-label="Modifier ce segment"
                style={{ ...BTN_STYLE, color: 'var(--cs-bord)' }}><IconeCrayon size={12} /></button>
            )}
          </div>,
          document.body
        )
      })()}

      {apercuVerset && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
          onClick={() => setApercuVerset(null)}>
          <div onClick={e => e.stopPropagation()} style={{ margin: 'auto', background: '#faf6ee', borderRadius: '8px', border: '1px solid var(--cs-or-doux)', padding: '16px 18px', width: '23.75rem', maxWidth: '100%', boxShadow: '0 12px 40px rgba(44,30,10,0.22)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-vert)' }}>{apercuVerset.label}</span>
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
          <div onClick={e => e.stopPropagation()} style={{ margin: 'auto', background: 'var(--cs-surface)', borderRadius: '10px', padding: '18px 22px', width: '33.75rem', maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: '#6f9268', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette édition</p>
                {/* Auteur ET titre sur la même ligne ; l'auteur ouvre sa fiche. */}
                <p style={{ margin: 0, lineHeight: 1.28 }}>
                  {auteurId ? (
                    <button onClick={() => setAuteurModalOuvert(true)} title="Voir la fiche de l’auteur"
                      style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', letterSpacing: '0.02em' }}>{auteur}</button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', letterSpacing: '0.02em' }}>{auteur}</span>
                  )}
                  <span style={{ margin: '0 3px' }}> </span>
                  <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.875rem', color: 'var(--cs-encre)' }}>{rendreTexteEnrichi(titreAffiche)}</span>
                </p>
                {oeuvreLocale.sous_titre && (
                  <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.71875rem', color: '#8a8278', fontStyle: 'italic', lineHeight: 1.3, margin: '3px 0 0' }}>{oeuvreLocale.sous_titre}</p>
                )}
              </div>
              <button onClick={() => setInfoEditionOuverte(false)} style={{ fontSize: '1rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>

            {/* Deux colonnes distinctes : texte original / édition de référence. */}
            {(() => {
              const aOriginal = !!(oeuvreLocale.titre_original || oeuvreLocale.date_composition || oeuvreLocale.langue_originale || (oeuvreLocale.genres && oeuvreLocale.genres.length))
              const aEdition = !!(oeuvreLocale.trad_auteur || oeuvreLocale.trad_date || oeuvreLocale.editeur || oeuvreLocale.ville || oeuvreLocale.date_publication || oeuvreLocale.collection || oeuvreLocale.commentaire_traduction?.trim())
              if (!aOriginal && !aEdition) return null
              const carte: React.CSSProperties = { background: '#f6f8f3', border: '1px solid #e2ebdc', borderLeft: '2.5px solid #a7c4a0', borderRadius: '8px', padding: '11px 13px' }
              const legende: React.CSSProperties = { fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.10em', color: '#6f9268', margin: '0 0 8px', textTransform: 'uppercase' }
              const cle: React.CSSProperties = { fontSize: '0.53125rem', color: '#a9b0a2', display: 'block', marginBottom: '-3px', lineHeight: 0.95 }
              const val: React.CSSProperties = { fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.15 }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: (aOriginal && aEdition) ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr', gap: '10px', marginBottom: '12px' }}>
                  {aOriginal && (
                    <div style={carte}>
                      <p style={legende}>Texte original</p>
                      {oeuvreLocale.titre_original && <div style={{ marginBottom: '6px' }}><span style={cle}>Titre</span><span style={{ ...val, fontStyle: 'italic' }}>{oeuvreLocale.titre_original}</span></div>}
                      {oeuvreLocale.date_composition && <div style={{ marginBottom: '6px' }}><span style={cle}>Date de composition</span><span style={val}>{formaterDateHistorique(oeuvreLocale.date_composition)}</span></div>}
                      {oeuvreLocale.langue_originale && <div style={{ marginBottom: '6px' }}><span style={cle}>Langue originale</span><span style={val}>{oeuvreLocale.langue_originale}</span></div>}
                      {oeuvreLocale.genres && oeuvreLocale.genres.length > 0 && (
                        <div><span style={cle}>Genre{oeuvreLocale.genres.length > 1 ? 's' : ''}</span><span style={val}>{oeuvreLocale.genres.join(', ')}</span></div>
                      )}
                    </div>
                  )}
                  {aEdition && (
                    <div style={carte}>
                      <p style={legende}>Édition de référence</p>
                      {oeuvreLocale.trad_auteur && <div style={{ marginBottom: '6px' }}><span style={cle}>Traducteur</span><span style={val}>{libelleTrad(oeuvreLocale.trad_auteur)}{oeuvreLocale.trad_date ? ` (${formaterDateHistorique(oeuvreLocale.trad_date)})` : ''}</span></div>}
                      {(oeuvreLocale.editeur || oeuvreLocale.ville || oeuvreLocale.date_publication) && <div style={{ marginBottom: '6px' }}><span style={cle}>Publication</span><span style={val}>{[formaterEditeur(oeuvreLocale.editeur), oeuvreLocale.ville, formaterDateHistorique(oeuvreLocale.date_publication)].filter(Boolean).join(', ')}</span></div>}
                      {oeuvreLocale.collection && <div><span style={cle}>Collection</span><span style={val}>{oeuvreLocale.collection}</span></div>}
                      {/* Commentaire éventuel destiné au public, dans la carte « Édition de référence ». */}
                      {oeuvreLocale.commentaire_traduction?.trim() && (
                        <div style={{ marginTop: '9px', paddingTop: '8px', borderTop: '1px solid #e2ebdc' }}>
                          <span style={{ ...cle, marginBottom: '2px' }}>Commentaire</span>
                          <span style={{ ...val, display: 'block', lineHeight: 1.55, fontStyle: 'italic', color: 'var(--cs-texte)', marginTop: '1px' }}>{sansPointFinal(oeuvreLocale.commentaire_traduction)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* Fiche auteur en fenêtre, ouverte depuis « À propos de cette édition ». */}
      <ModaleAuteur id={auteurModalOuvert ? (auteurId ?? null) : null} onClose={() => setAuteurModalOuvert(false)} />

      {estAdmin && configOuverte && typeof document !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setConfigOuverte(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '10px', padding: '20px 22px', width: '25rem', maxWidth: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>Niveaux d'affichage</p>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.9375rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: '0.6875rem', color: '#8a8278', lineHeight: 1.5, margin: '0 0 16px' }}>
              Réglez la finesse des titres affichés, séparément pour le <strong style={{ color: 'var(--cs-texte-second)' }}>sommaire</strong> (colonne de gauche) et le <strong style={{ color: 'var(--cs-texte-second)' }}>corps</strong> du texte.
            </p>
            <div style={{ marginBottom: '14px', padding: '12px 14px', background: 'var(--cs-fond-clair)', borderRadius: '7px', border: '1px solid var(--cs-fond-doux)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>Mode de lecture</p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {[
                  { valeur: false, libelle: 'Par niveau 1' },
                  { valeur: true, libelle: 'Texte entier paginé' },
                ].map(option => (
                  <button key={option.libelle} onClick={() => setConfigNiveaux(prev => ({ ...prev, texteEntier: option.valeur }))}
                    style={{ flex: 1, minHeight: '34px', padding: '5px 8px', borderRadius: '5px', border: `1px solid ${configNiveaux.texteEntier === option.valeur ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: configNiveaux.texteEntier === option.valeur ? 'var(--cs-vert)' : '#fff', color: configNiveaux.texteEntier === option.valeur ? '#fff' : 'var(--cs-texte-second)', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: configNiveaux.texteEntier === option.valeur ? 700 : 400 }}>
                    {option.libelle}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.625rem', color: '#8a8278', lineHeight: 1.45, margin: 0 }}>Le texte entier conserve ses titres et son sommaire. La pagination ne s’arrête plus à chaque niveau 1.</p>
            </div>
            {(['sommaire', 'corps'] as const).map(type => {
              const key = type === 'sommaire' ? 'sommaire' : 'corps'
              const txtKey = type === 'sommaire' ? 'txtSommaire' : 'txtCorps'
              const titre = type === 'sommaire' ? 'Sommaire' : 'Corps du texte'
              return (
                <div key={type} style={{ marginBottom: '14px', padding: '12px 14px', background: 'var(--cs-fond-clair)', borderRadius: '7px', border: '1px solid var(--cs-fond-doux)' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>{titre}</p>

                  <label style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-second)', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Niveaux de titres affichés</label>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setConfigNiveaux(prev => ({ ...prev, [key]: n }))}
                        title={`Afficher jusqu’au niveau ${n}`}
                        style={{ width: '34px', height: '30px', borderRadius: '5px', border: `1px solid ${configNiveaux[key] === n ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: configNiveaux[key] === n ? 'var(--cs-vert)' : '#fff', color: configNiveaux[key] === n ? '#fff' : 'var(--cs-texte-second)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: configNiveaux[key] === n ? 700 : 400 }}>
                        {n}
                      </button>
                    ))}
                  </div>

                  <label style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-second)', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Chapeaux descriptifs</label>
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
                          style={{ width: '34px', height: '30px', borderRadius: '5px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'var(--cs-vert)' : '#fff', color: actif ? '#fff' : 'var(--cs-texte-doux)', fontSize: '0.65625rem', cursor: disponible ? 'pointer' : 'default', opacity: disponible ? 1 : 0.4 }}>
                          N{n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.10em', color: 'var(--cs-texte-faible)', margin: 0, textTransform: 'uppercase' }}>Numéros de segments</p>
              <button onClick={() => setConfigNiveaux(prev => ({ ...prev, afficherNumeros: !prev.afficherNumeros }))}
                style={{ fontSize: '0.6875rem', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: configNiveaux.afficherNumeros ? 'var(--cs-vert)' : '#fff', color: configNiveaux.afficherNumeros ? '#fff' : 'var(--cs-texte-doux)', cursor: 'pointer' }}>
                {configNiveaux.afficherNumeros ? 'Affichés' : 'Masqués'}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--cs-fond-doux)' }}>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button disabled={configEnvoi} onClick={async () => {
                setConfigEnvoi(true)
                const toStr = (b: boolean[]) => b.map(x => x ? '1' : '0').join(',')
                const appels = [
                  { champ: 'niveaux_sommaire', valeur: configNiveaux.sommaire },
                  { champ: 'niveaux_corps', valeur: configNiveaux.corps },
                  { champ: 'texte_sommaire', valeur: toStr(configNiveaux.txtSommaire) },
                  { champ: 'texte_corps', valeur: toStr(configNiveaux.txtCorps) },
                  { champ: 'afficher_numeros', valeur: configNiveaux.afficherNumeros },
                  { champ: 'lecture_texte_entier', valeur: configNiveaux.texteEntier },
                ]
                const reponses = await Promise.all(appels.map(({ champ, valeur }) =>
                  fetch('/api/admin/update-oeuvre', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_oeuvre: idOeuvre, champ, valeur }) })
                ))
                if (reponses.some(reponse => !reponse.ok)) {
                  setConfigEnvoi(false)
                  return
                }
                const modeModifie = configNiveaux.texteEntier !== lectureTexteEntier
                setConfigEnvoi(false)
                setConfigOuverte(false)
                if (modeModifie) window.location.reload()
              }}
                style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert)', color: '#fff', fontWeight: 500, cursor: 'pointer' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', color: 'var(--cs-texte-doux)' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--cs-bord))' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <button
            onClick={() => peutReculer && setPageActuelle(pageActuelle - 1)}
            disabled={!peutReculer}
            title="Page précédente"
            style={{ background: 'none', border: 'none', cursor: peutReculer ? 'pointer' : 'default', color: peutReculer ? 'var(--cs-texte-second)' : 'var(--cs-bord)', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ‹
          </button>
          <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--cs-texte-doux)', letterSpacing: '0.02em', userSelect: 'none', minWidth: '80px', textAlign: 'center' }}>
            {pageActuelle + 1} / {total}
          </span>
          <button
            onClick={() => peutAvancer && setPageActuelle(pageActuelle + 1)}
            disabled={!peutAvancer}
            title="Page suivante"
            style={{ background: 'none', border: 'none', cursor: peutAvancer ? 'pointer' : 'default', color: peutAvancer ? 'var(--cs-texte-second)' : 'var(--cs-bord)', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ›
          </button>
        </div>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--cs-bord))' }} />
      </div>
    </div>
  )
}

