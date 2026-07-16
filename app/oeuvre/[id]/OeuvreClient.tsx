'use client'
import { ABREV_FR } from '@/app/lib/bible'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { parseNotes } from '@/app/lib/notes'
import { supabase } from "@/app/lib/supabase"
import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee } from './oeuvreTypes'
import { rendreTexteEnrichi, texteSansEnrichissement, normaliserEspaces } from './texteEnrichi'
import { nettoyerFin } from '@/app/lib/ponctuation'
import ModaleEditionAdmin from './ModaleEditionAdmin'
import PageTitre from './PageTitre'
import EtoileFavori from '@/app/components/EtoileFavori'
import { useFavoris } from '@/app/lib/useFavoris'
import OngletCommentaires from './OngletCommentaires'
import { BTN_STYLE, BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import { BoutonCopieVerset, BoutonEnregistrerVerset, BoutonSignalerVerset } from './BoutonsVerset'
import AssocierVerset from './AssocierVerset'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'

const CHARS_PAR_PAGE = 15000

// Même table que celle utilisée côté serveur (page.tsx) pour l'affichage
// des références bibliques en français — doit rester identique aux deux endroits.

function detailsRefBiblique(ref: string): { label: string; livre: string; chapitre: string; verset: string } {
  const p = ref.trim().split(' ')
  if (p.length < 2) return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv = p[1].split(':')
  const label = cv[1] ? `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

function extraireVersetsSegment(s: any): string[] {
  return [s.lien_1, s.lien_2, s.lien_3, s.lien_4]
    .filter(Boolean)
    .join(';')
    .split(';')
    .map(v => v.trim())
    .filter(Boolean)
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

function decouperTitreColophon(texte: string) {
  const mots = texte.trim().split(/\s+/).filter(Boolean)
  if (mots.length <= 1) return [texte.trim()]
  const total = mots.reduce((s, mot) => s + mot.length, 0) + mots.length - 1
  const nbLignes = Math.min(7, Math.max(3, Math.round(total / 34)))
  // Cibles linéaires : conservation exacte (sum = total) avec décroissance régulière
  const haut = Math.min(58, Math.round(total * 2 / (nbLignes + 1)))
  const bas = Math.max(8, Math.round(total * 2 / (nbLignes * (nbLignes + 1))))
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
      // Forte pénalité si la dernière ligne n'est pas strictement plus courte que la précédente
      const penaliteMontee = longueur >= precedente ? Math.pow(longueur - precedente + 2, 2) * 300 : 0
      const cout = Math.pow(longueur - cible, 2) + penaliteMontee
      const resultat = { cout, coupes: [mots.length] }
      memo.set(cle, resultat)
      return resultat
    }
    let meilleur = { cout: Number.POSITIVE_INFINITY, coupes: [] as number[] }
    const minFin = depart + 1
    const maxFin = mots.length - restantes + 1
    for (let fin = minFin; fin <= maxFin; fin += 1) {
      const longueur = longueurs[depart][fin]
      // Forte pénalité si cette ligne ≥ la précédente (décroissance stricte requise)
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

function rendreTitreColophon(texte: string) {
  const propre = preparerTitreColophon(texte)
  if (propre.length < SEUIL_TITRE_COLOPHON || !titreCompatibleColophon(propre)) return rendreTexteEnrichi(propre)
  const lignes = decouperTitreColophon(propre)
  if (lignes.length <= 1) return rendreTexteEnrichi(propre)
  // Largeurs CSS proportionnelles aux longueurs réelles → pyramide fidèle au texte
  const lens = lignes.map(l => l.length)
  const l0 = Math.max(lens[0], 1)
  const lgs: number[] = lens.map(l => Math.round(94 * l / l0))
  // Garantir décroissance stricte avec écart minimal de 4 points
  for (let i = 1; i < lgs.length; i += 1) {
    if (lgs[i] >= lgs[i - 1] - 2) lgs[i] = lgs[i - 1] - 4
  }
  const largeurs = lgs.map(w => `${Math.max(14, w)}%`)
  return (
    <span
      className="titre-colophon"
      lang="fr"
      style={{ display: 'block', maxWidth: '650px', margin: '0 auto', textAlign: 'center', lineHeight: 1.24, wordSpacing: '-0.04em', letterSpacing: '-0.004em', hyphens: 'auto', WebkitHyphens: 'auto' } as React.CSSProperties}
    >
      {lignes.map((ligne, index) => (
        <span key={`${ligne}-${index}`} style={{ display: 'block', width: largeurs[index] ?? '14%', margin: '0 auto' }}>
          {rendreTexteEnrichi(ligne)}
        </span>
      ))}
    </span>
  )
}

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001',    label: 'Bible de Sacy' },
  { code: 'TR0002',     label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

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
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 12.5,
        lineHeight: 1.65,
        color: '#2a2218',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', color: '#9a8a6e', textTransform: 'uppercase' }}>
          Note {lettre}
        </span>
        {figee && (
          <button
            onClick={fermer}
            aria-label="Fermer"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b0a08a', fontSize: 15, lineHeight: 1, padding: '0 2px' }}
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
          fontFamily: "Georgia, 'Times New Roman', serif",
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
  const regex = /\*\*(.+?)\*\*|\^\^(.+?)\^\^|\*(.+?)\*|\[(.+?)\]\((.+?)\)|\[\[([A-Z0-9]{1,2})\]\]/g
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
      const lettre = m[6]
      noeuds.push(<NoteTooltip key={k++} lettre={lettre} contenu={notes[lettre] ?? ''} />)
    }
    dernierIndex = regex.lastIndex
  }
  if (dernierIndex < texte.length) noeuds.push(texte.slice(dernierIndex))
  return noeuds
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function OeuvreClient({ auteur, auteurId, idOeuvre, estAdmin: estAdminReel, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, niv1Initial = null, vueInitiale = 'texte' }: Props) {
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const estAdmin = estAdminReel && !modeUtilisateurStandard
  const { favoris: favorisOeuvres, pret: favorisPret, toggle: toggleFavoriOeuvre } = useFavoris('oeuvre')
  const [segActif, setSegActif] = useState<number | null>(segmentCibleId)
  const [tradIndex, setTradIndex] = useState(0)
  const [traductionsBible, setTraductionsBible] = useState(TRADUCTIONS_FALLBACK)
  const [tradOuverte, setTradOuverte] = useState(false)
  const [ongletDroit, setOngletDroit] = useState<'refs' | 'commentaires' | 'suggestions'>('refs')
  const [userId, setUserId] = useState<string | null>(null)
  const [sauvegardesSegs, setSauvegardesSegs] = useState<Set<number>>(new Set())
  const [vue, setVue] = useState<'texte' | 'apparat'>(vueInitiale)
  const [editionCible, setEditionCible] = useState<EditionCible | null>(null)
  const [titreAffiche, setTitreAffiche] = useState(oeuvre.titre)
  const [oeuvreLocale, setOeuvreLocale] = useState<Props['oeuvre']>(oeuvre)
  const [navOuverte, setNavOuverte] = useState(true)
  const [panneauOuvert, setPanneauOuvert] = useState(true)
  const [navWidth, setNavWidth] = useState(240)
  const [pannWidth, setPannWidth] = useState(288)
  const voletsDirty = navWidth !== 240 || pannWidth !== 288
  const resetVolets = () => { setNavWidth(240); setPannWidth(288) }
  const [suggestions, setSuggestions] = useState<{ id: number; segment_numero: number; segment_texte: string; reference_manuelle: string | null }[]>([])
  const [suggestionsChargees, setSuggestionsChargees] = useState(false)
  const [nbCommentairesOeuvre, setNbCommentairesOeuvre] = useState<number | null>(null)
  useEffect(() => {
    if (segActif === null) { setNbCommentairesOeuvre(null); return }
    supabase.from('commentaires').select('id', { count: 'exact', head: true })
      .eq('id_segment', segActif)
      .then(({ count }) => setNbCommentairesOeuvre(count ?? 0))
  }, [segActif])
  const [suggestionSignalee, setSuggestionSignalee] = useState<{ id: number; segment_numero: number; segment_texte: string } | null>(null)
  const tradSelectRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ongletDroit !== 'suggestions' || suggestionsChargees || !idOeuvre) return
    supabase.from('segments')
      .select('id, segment_numero, segment_texte, reference_manuelle')
      .eq('id_oeuvre', idOeuvre).eq('fiabilite', 'Lien à constituer')
      .order('segment_numero')
      .then(({ data }) => { setSuggestions(data ?? []); setSuggestionsChargees(true) })
  }, [ongletDroit, idOeuvre, suggestionsChargees])
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('cs_volets_oeuvre') ?? 'null')
      if (s?.nav) setNavWidth(s.nav)
      if (s?.pann) setPannWidth(s.pann)
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth < 880) {
      setNavOuverte(false)
      setPanneauOuvert(false)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem('cs_volets_oeuvre', JSON.stringify({ nav: navWidth, pann: pannWidth }))
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
  const [apparatOuvert, setApparatOuvert] = useState(true)
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
  // Carte niv1 → label humain, enrichie au fil des chargements client
  const [niv1TexteMap, setNiv1TexteMap] = useState<Record<string, string>>(niv1TexteMapProp)
  const [niv1Actif, setNiv1Actif] = useState<string>((niv1Initial && niv1List.includes(niv1Initial) ? niv1Initial : null) ?? niv1List[0] ?? '')
  const [groupes, setGroupes] = useState<GroupeData[]>(groupesInit)
  const [segments, setSegments] = useState<SegData[]>(segmentsInit)
  const [groupesApparat, setGroupesApparat] = useState<GroupeData[]>(groupesApparatInit)
  const [segmentsApparat, setSegmentsApparat] = useState<SegData[]>(segmentsApparatInit)
  const [niv1Loading, setNiv1Loading] = useState(false)
  const [niv1Erreur, setNiv1Erreur] = useState<string | null>(null)
  const [pageActuelle, setPageActuelle] = useState(0)
  const profondeurSommaire = niveauxSommaire  // vient des props (admin)
  const profondeurCorps = niveauxCorps
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
  }, [groupes, segCharMap])

  const groupesFiltres = useMemo(() => pages[pageActuelle] ?? [], [pages, pageActuelle])

  const premierSegmentId = pageActuelle === 0 && groupesFiltres.length > 0
    ? (groupesFiltres[0].itemIds[0] ?? null)
    : null

  const segmentsFiltres = useMemo(() => {
    const ids = new Set(groupesFiltres.flatMap(g => g.itemIds))
    return segments.filter(s => ids.has(s.id))
  }, [groupesFiltres, segments])

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
    const SELECT = 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,lien_1,lien_2,lien_3,lien_4,nature,notes'
    const segs: any[] = []
    let from = 0
    while (true) {
      const { data: batch } = await supabase
        .from('segments')
        .select(SELECT)
        .eq('id_oeuvre', idOeuvre)
        .eq('ref_niv1', n1)
        .eq('nature', 'texte')
        .order('segment_numero')
        .range(from, from + 999)
      if (!batch || batch.length === 0) break
      segs.push(...batch)
      if (batch.length < 1000) break
      from += 1000
    }

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
      const { data: vd } = await supabase.from('versets')
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
      const versets = extraireVersetsSegment(s)
        .map((vid: string) => ({ id: vid, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))
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
      .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,lien_1,lien_2,lien_3,lien_4,nature')
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
    supabase.from('oeuvres').select('id_oeuvre, titre')
      .eq('id_auteur', auteurId)
      .neq('id_oeuvre', idOeuvre)
      .order('titre')
      .then(({ data }) => setOeuvresAuteur(data ?? []))
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

  const supprimerLienBiblique = async (segId: number, versetId: string) => {
    if (!estAdmin) return
    if (!confirm('Supprimer ce lien biblique ?')) return
    const { data, error } = await supabase.from('segments').select('lien_1,lien_2,lien_3,lien_4').eq('id', segId).single()
    if (error || !data) return
    const patch: Record<string, string | null> = {}
    ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as const).forEach(champ => {
      const valeurs = ((data as any)[champ] as string | null ?? '').split(';').map(v => v.trim()).filter(Boolean).filter(v => v !== versetId)
      patch[champ] = valeurs.length ? valeurs.join('; ') : null
    })
    const { error: eUpdate } = await supabase.from('segments').update(patch).eq('id', segId)
    if (eUpdate) return
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

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', minHeight: '100vh' }}>

        {/* ── NAV GAUCHE ── */}
        {navOuverte ? (
        <nav style={{ width: navWidth + 'px', flexShrink: 0, position: 'sticky', top: '48px', alignSelf: 'flex-start', height: 'calc(100vh - 48px)', overflowY: 'auto', borderRight: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div onMouseDown={e => {
            e.preventDefault()
            const startX = e.clientX, startW = navWidth
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
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #d6d0c4', flexShrink: 0, position: 'relative' }}>
            <button onClick={() => setNavOuverte(false)} title="Réduire le sommaire"
              style={{ position: 'absolute', right: '6px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#b0a89e', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '4px' }}>{auteur}</p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
              {favorisPret && (
                <EtoileFavori actif={favorisOeuvres.has(idOeuvre)} onToggle={() => toggleFavoriOeuvre(idOeuvre)} size={13}
                  title={favorisOeuvres.has(idOeuvre) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  style={{ marginTop: '2px', flexShrink: 0 }} />
              )}
              <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: '#2a3d30', lineHeight: 1.35, marginBottom: oeuvre.titre_original ? '3px' : '0', whiteSpace: 'pre-line', position: 'relative', paddingRight: estAdmin ? '16px' : 0, flex: 1, minWidth: 0 }}>
                {rendreTexteEnrichi(titreAffiche)}
                {estAdmin && (
                  <button onClick={() => setEditionCible({ type: 'titre_oeuvre', champ: 'titre', texteActuel: titreAffiche })}
                    title="Modifier le titre de l'œuvre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                )}
              </p>
            </div>
            {oeuvre.titre_original && <p style={{ fontSize: '11.5px', color: '#8a8278', fontStyle: 'italic', marginBottom: '0' }}>{oeuvre.titre_original}</p>}
            {oeuvre.trad_auteur && (
              <p style={{ fontSize: '11px', color: '#9a958d', marginTop: '6px' }}>Trad. {oeuvre.trad_auteur}</p>
            )}
            {(oeuvre.editeur || oeuvre.ville || oeuvre.date_publication) && (
              <p style={{ fontSize: '10.5px', color: '#b0a89e', fontStyle: 'italic', marginTop: '2px' }}>
                D&rsquo;après l&rsquo;édition de {[oeuvre.editeur, oeuvre.ville, oeuvre.date_publication].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          {oeuvresAuteur.length > 0 && (
            <div style={{ borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
              <button onClick={() => setAuteurOuvert(!auteurOuvert)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e' }}>DU MÊME AUTEUR</span>
                <span style={{ fontSize: '7px', color: '#c0bab0' }}>{auteurOuvert ? '▲' : '▼'}</span>
              </button>
              {auteurOuvert && (
                <div style={{ padding: '0 16px 12px' }}>
                  {oeuvresAuteur.map(o => (
                    <a key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
                      style={{ display: 'block', fontSize: '11px', color: '#3a3530', textDecoration: 'none', padding: '3px 0', lineHeight: 1.35, borderBottom: '1px solid #f0ece6' }}
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

            {hasApparat && (
              <div style={{ ...(apparatOuvert ? { flex: '0 1 auto', maxHeight: '50%', minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column', borderBottom: '1px solid #d6d0c4' }}>
                <button onClick={() => setApparatOuvert(!apparatOuvert)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                  <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e' }}>APPARAT CRITIQUE</span>
                  <span style={{ fontSize: '7px', color: '#c0bab0' }}>{apparatOuvert ? '▲' : '▼'}</span>
                </button>
                {apparatOuvert && (
                  <div style={{ flex: '0 1 auto', overflowY: 'auto', padding: '0 16px 14px' }}>
                    {tocApparatLocal.map((entry, i) => (
                      <div key={i}>
                        <a href={`#${entry.anchor}`} onClick={(e) => { e.preventDefault(); setVue('apparat'); setSegActif(null); setApparatNiv1Actif(entry.niv1); setAncreEnAttente(entry.anchor) }} className="toc-lien-n1"
                          style={{ display: 'block', fontSize: '11.5px', fontWeight: apparatNiv1Actif === entry.niv1 ? 600 : 400, color: apparatNiv1Actif === entry.niv1 ? '#3d6b4f' : '#3a3530', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
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
                <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e' }}>SOMMAIRE</span>
                <span style={{ fontSize: '7px', color: '#c0bab0' }}>{sommaireOuvert ? '▲' : '▼'}</span>
              </button>

              {sommaireOuvert && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
            <p style={{ display: 'none' }}></p>

            {niv1List.map(n1 => {
              const estActif = vue === 'texte' && n1 === niv1Actif

              return (
                <div key={n1} style={{ marginBottom: profondeurSommaire >= 2 ? '6px' : '0' }}>
                  {/* Niv1 */}
                  <button onClick={() => changerNiv1(n1)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '11.5px', fontWeight: estActif ? 600 : 400, color: estActif ? '#3d6b4f' : '#3a3530', lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                    {n1}
                    {niv1TexteMap[n1] && txtSommaire[0] && (
                      <span style={{ fontSize: '9.5px', color: estActif ? '#3d6b4f' : '#9a958d', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px' }}>{niv1TexteMap[n1]}</span>
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
                          <span style={{ fontSize: '10.5px', color: actif2 ? '#3d6b4f' : '#7a7268', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3 }}>{n2}</span>
                          {n2txt && txtSommaire[1] && <span style={{ fontSize: '9.5px', color: actif2 ? '#3d6b4f' : '#9a958d', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px' }}>{n2txt}</span>}
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
                              <span style={{ fontSize: '9.5px', color: '#9a958d', display: 'block', lineHeight: 1.3 }}>{n3}</span>
                              {n3txt && txtSommaire[2] && <span style={{ fontSize: '9px', color: '#b0a89e', fontStyle: 'italic', display: 'block', lineHeight: 1.2 }}>{n3txt}</span>}
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
        ) : (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'sticky', top: '48px', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 48px)', width: '22px', background: '#faf8f4', border: 'none', borderRight: '1px solid #d6d0c4', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M3 1l4 4-4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, transform: 'rotate(180deg)', fontSize: '8px', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: '#b0a89e', userSelect: 'none' }}>Sommaire</span>
          </button>
        )}

        {/* ── TEXTE CENTRAL ── */}
        <main lang="fr" style={{ flex: 1, minWidth: 0, padding: '0 48px 80px', position: 'relative', overflow: 'visible' }}><div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative', overflow: 'visible' }}>
          <PageTitre auteur={auteur} oeuvre={oeuvreLocale} titre={titreAffiche} estAdmin={estAdmin}
            onModifier={(champ, va) => setEditionCible({ type: 'titre_oeuvre', champ, texteActuel: va })} />

          {/* Navigation précédent/suivant — toujours au niveau 1 */}
          {vue === 'texte' && (
            <div id="barre-nav-niv1" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)', alignItems: 'center', columnGap: '14px', marginBottom: '1.5rem', paddingBottom: '1rem', paddingRight: '92px', borderBottom: '1px solid #ede9e2', minHeight: '32px', scrollMarginTop: '60px' }}>
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev)} disabled={!niv1Prev}
                style={{ justifySelf: 'start', fontSize: '18px', lineHeight: 1, color: niv1Prev ? '#9a958d' : 'transparent', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Prev ? 'auto' : 'none' }}>
                {niv1Prev ? '‹' : ''}
              </button>
              <span style={{ fontSize: '1.45rem', fontWeight: 500, color: '#2a3d30', fontFamily: "Georgia, serif", textAlign: 'center', minWidth: 0, lineHeight: 1.3, whiteSpace: 'pre-line', overflowWrap: 'break-word', position: 'relative' }}>
                {niv1Erreur ? (
                  <span style={{ fontSize: '12px', color: '#c0562a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Erreur de chargement.{' '}
                    <button onClick={() => changerNiv1(niv1Erreur, { forceRefresh: true })}
                      style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '3px', border: '1px solid #e4c4b8', background: '#fff', color: '#c0562a', cursor: 'pointer' }}>
                      Réessayer
                    </button>
                  </span>
                ) : niv1Loading ? <span style={{ fontSize: '13px', color: '#b0a89e' }}>Chargement…</span> : (
                  <>
                    {rendreTitreColophon(niv1Actif)}
                    {(() => {
                      const txt = groupes[0]?.niv1_texte || niv1TexteMap[niv1Actif] || ''
                      return txt && txtCorps[0]
                        ? <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: 400, color: '#7a7268', fontStyle: 'italic', marginTop: '4px', fontFamily: "Georgia, serif" }}>{rendreTitreColophon(txt)}</span>
                        : null
                    })()}
                    {estAdmin && (() => { const g = groupes[0] ?? { niv1: niv1Actif, niv2: '', niv3: '', niv4: '', anchor: '', itemIds: [] }; return (
                      <div style={{ position: 'absolute', right: '-52px', top: '2px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: niv1Actif, schemaTexte: false })}
                          title="Modifier le titre" style={{ fontSize: '13px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}>✎</button>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: g.niv1_texte ?? '', schemaTexte: true })}
                          title="Modifier le sous-titre" style={{ fontSize: '10px', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1, fontStyle: 'italic' }}>✎</button>
                      </div>
                    )})()}
                  </>
                )}
              </span>
              <button onClick={() => niv1Next && changerNiv1(niv1Next)} disabled={!niv1Next}
                style={{ justifySelf: 'end', fontSize: '18px', lineHeight: 1, color: niv1Next ? '#9a958d' : 'transparent', background: 'none', border: 'none', cursor: niv1Next ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Next ? 'auto' : 'none' }}>
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
                    <div style={{ textAlign: 'center', marginTop: marginTop, marginBottom: '1rem', paddingTop: '0.5rem', paddingRight: '92px', position: 'relative' }}>
                      <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.1rem', fontWeight: 400, color: '#2a3d30', lineHeight: 1.3, margin: 0, letterSpacing: '0.01em', whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv2)}</h3>
                      {groupe.niv2_texte && txtCorps[1] && <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '0.92rem', fontWeight: 400, color: '#7a7268', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv2_texte)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: '92px', top: '0.5rem', display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '11px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '9px', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}>✎</button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv3 && (
                    <div style={{ marginTop: isFirstGroupe ? '0' : '1rem', marginBottom: '0.4rem', paddingLeft: '2px', borderLeft: '2px solid #d6d0c4', position: 'relative', paddingRight: estAdmin ? '44px' : 0 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5a5450', lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', whiteSpace: 'pre-line', textAlign: groupe.niv3.length >= SEUIL_TITRE_COLOPHON ? 'center' : undefined }}>{rendreTitreColophon(groupe.niv3)}</p>
                      {groupe.niv3_texte && txtCorps[2] && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#9a958d', lineHeight: 1.3, margin: '2px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv3_texte)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '9px', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}>✎</button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv4 && (
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b0a89e', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: '0.5rem', position: 'relative', paddingRight: estAdmin ? '44px' : 0, whiteSpace: 'pre-line' }}>
                      {rendreTitreColophon(groupe.niv4)}
                      {groupe.niv4_texte && txtCorps[3] && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px', fontStyle: 'italic' }}>{rendreTitreColophon(groupe.niv4_texte)}</span>}
                      {estAdmin && (
                        <span style={{ position: 'absolute', right: 0, top: 0, display: 'inline-flex', gap: '3px', alignItems: 'center', textTransform: 'none' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '9px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', letterSpacing: 0 }}>✎</button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '8px', color: '#c8c0b4', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic', letterSpacing: 0 }}>✎</button>
                        </span>
                      )}
                    </p>
                  )}
                  {groupe.itemIds.map(sid => {
                    const s = segMap.get(sid)
                    if (!s) return null
                    const actif = segActif === sid
                    return (
                      <div key={sid} id={`segment-${sid}`} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.45rem', gap: '8px', scrollMarginTop: '60px' }}>
                        <p id={`s${s.numero}`} onClick={() => { setSegActif(actif ? null : sid) }} className="seg-p"
                          lang="fr" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16', lineHeight: '1.52', textAlign: 'justify', textJustify: 'inter-word', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px', margin: 0, flex: 1, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                          {afficherNumeros && <sup style={{ fontSize: '0.52rem', color: '#b0a89e', marginRight: '2px', userSelect: 'none' }}>{s.numero}</sup>}
                          {sid === premierSegmentId && normaliserEspaces(s.texte).length > 0 ? (() => { const t = nettoyerFin(normaliserEspaces(s.texte)); const chars = [...t]; const li = chars.findIndex(ch => /\p{L}/u.test(ch)); if (li <= 0) { return (<><span style={{ float: 'left', fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '3.4em', lineHeight: '0.78', paddingRight: '5px', paddingTop: '3px', color: '#2a3d30', fontWeight: 'normal', userSelect: 'none' }}>{chars[0] ?? t[0]}</span>{rendreTexteAvecNotes(chars.slice(1).join(''), s.notes ?? {})}</>) } const prefix = chars.slice(0, li).join(''); const lettre = chars[li]; const suite = chars.slice(li + 1).join(''); return (<>{prefix}<span style={{ float: 'left', fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '3.4em', lineHeight: '0.78', paddingRight: '5px', paddingTop: '3px', color: '#2a3d30', fontWeight: 'normal', userSelect: 'none' }}>{lettre}</span>{rendreTexteAvecNotes(suite, s.notes ?? {})}</>) })() : rendreTexteAvecNotes(nettoyerFin(normaliserEspaces(s.texte)), s.notes ?? {})}
                        </p>
                        <div className="seg-actions" style={{ display: 'flex', flexDirection: 'row', gap: '2px', flexShrink: 0, width: '92px', paddingTop: '2px', justifyContent: 'flex-end', marginRight: '-16px' }}>
                          {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
                          <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvre.titre} sousTitre={oeuvre.sous_titre} tradAuteur={oeuvre.trad_auteur} editeur={oeuvre.editeur} collection={oeuvre.collection} ville={oeuvre.ville} datePublication={oeuvre.date_publication} className="seg-btn-action" />
                          <BoutonSignalerSegment segId={sid} apercu={`§${s.numero} — ${texteSansEnrichissement(s.texte).slice(0,60)}…`} className="seg-btn-action" />
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
                <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #d6d0c4', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => { setVue('texte'); setSegActif(null) }}
                    style={{ fontSize: '11.5px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    ← Retour au texte
                  </button>
                  <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.10em', color: '#b0a89e', textTransform: 'uppercase' }}>Apparat critique</span>
                </div>
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
                          <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.45rem', fontWeight: 500, color: '#2a2520', textAlign: 'center', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophon(groupe.niv1_texte || groupe.niv1)}</h2>
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe, texteActuel: groupe.niv1_texte || groupe.niv1, schemaTexte: true })}
                              title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '11px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                          )}
                        </div>
                      )}
                      {groupe.itemIds.map(sid => {
                        const s = segMapApparat.get(sid)
                        if (!s) return null
                        const actif = segActif === sid
                        return (
                          <div key={sid} id={`segment-${sid}`} className={`seg-wrapper${actif ? ' seg-wrapper--actif' : ''}`} style={{ position: 'relative', marginBottom: '0.45rem', scrollMarginTop: '60px' }}>
                            <p id={`a${s.numero}`} onClick={() => { setSegActif(actif ? null : sid) }} className="seg-p"
                              lang="fr" style={{ fontFamily: 'Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16', lineHeight: '1.52', textAlign: 'justify', textJustify: 'inter-word', cursor: 'pointer', borderRadius: '3px', padding: '1px 4px 1px 4px', paddingRight: estAdmin ? '72px' : '52px', margin: 0, background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                              {afficherNumeros && <sup style={{ fontSize: '0.52rem', color: '#b0a89e', marginRight: '2px', userSelect: 'none' }}>{s.numero}</sup>}
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
        <aside style={{ width: pannWidth + 'px', flexShrink: 0, position: 'sticky', top: '48px', alignSelf: 'flex-start', height: 'calc(100vh - 48px)', borderLeft: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', background: '#fff' }}>
          <div onMouseDown={e => {
            e.preventDefault()
            const startX = e.clientX, startW = pannWidth
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

          <div style={{ display: 'flex', padding: '0 6px 0 0', borderBottom: '1px solid #d6d0c4', flexShrink: 0, overflowX: 'auto', alignItems: 'center' }}>
            <button onClick={() => setPanneauOuvert(false)} title="Réduire le panneau"
              style={{ flexShrink: 0, padding: '0 6px', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', color: '#b0a89e', display: 'flex', alignItems: 'center', height: '100%' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {([
              { key: 'refs' as const,          label: 'Liens',         count: segActifData?.versets.length ?? null },
              { key: 'commentaires' as const,  label: 'Commentaires',  count: nbCommentairesOeuvre },
              { key: 'suggestions' as const,   label: 'Suggestions',   count: suggestionsChargees ? suggestions.length : null },
            ]).map(o => (
              <button key={o.key} onClick={() => setOngletDroit(o.key)} className="onglet-btn"
                style={{ flexShrink: 0, padding: '6px 8px 5px', background: 'transparent', border: 'none', borderBottom: ongletDroit === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '10px', fontWeight: ongletDroit === o.key ? 600 : 400, color: ongletDroit === o.key ? '#3d6b4f' : '#6b6560', whiteSpace: 'nowrap' }}>{o.label}</span>
                {o.count != null && o.count > 0 && (
                  <span style={{ fontSize: '9px', color: ongletDroit === o.key ? '#3d6b4f' : '#b0a89e', fontWeight: 500, lineHeight: 1 }}>{o.count}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
            {ongletDroit === 'refs' ? (
              <>
                {/* Sélecteur traduction */}
                <div ref={tradSelectRef} style={{ padding: '12px 0 10px', borderBottom: '1px solid #ede9e2', marginBottom: '14px', position: 'relative' }}>
                  <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '5px' }}>TRADUCTION BIBLIQUE</p>
                  <button onClick={() => setTradOuverte(!tradOuverte)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '5px 8px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', fontSize: '11.5px', color: '#2a3d30', cursor: 'pointer', fontWeight: 500 }}>
                    <span>{traductionsBible[tradIndex]?.label ?? trad}</span>
                    <span style={{ color: '#9a958d', fontSize: '9px' }}>{tradOuverte ? '▲' : '▼'}</span>
                  </button>
                  {tradOuverte && (
                    <div style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #d6d0c4', borderRadius: '5px', zIndex: 50, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
                      {traductionsBible.map((t, i) => (
                        <button key={t.code} onClick={() => { setTradIndex(i); setTradOuverte(false) }} className="trad-option"
                          style={{ width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: '11.5px', border: 'none', borderBottom: i < traductionsBible.length - 1 ? '1px solid #ede9e2' : 'none', background: tradIndex === i ? 'rgba(61,107,79,0.08)' : '#fff', color: tradIndex === i ? '#3d6b4f' : '#3a3530', fontWeight: tradIndex === i ? 500 : 400, cursor: 'pointer' }}>
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
                      <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Aucun lien biblique pour ce passage.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {segActifData.versets.map(v => (
                          <div key={v.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                <a href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${encodeURIComponent(v.chapitre)}&verset=${encodeURIComponent(v.verset)}&trad=${encodeURIComponent(trad)}`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', margin: 0, textDecoration: 'none' }}>{v.label}</a>
                                {estAdmin && (
                                  <button onClick={() => supprimerLienBiblique(segActifData.id, v.id)} title="Supprimer ce lien biblique"
                                    style={{ fontSize: '9.5px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0', lineHeight: 1.1, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    Supprimer le lien
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                <BoutonEnregistrerVerset verset={v} trad={trad} userId={userId} />
                                <BoutonCopieVerset texte={v.textes[trad] || v.textes['TR0001'] || ''} label={v.label} />
                                <BoutonSignalerVerset versetId={v.id} label={v.label} segmentId={segActifData.id} />
                              </div>
                            </div>
                            <p lang="fr" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12px', lineHeight: '1.38', color: '#2a2520', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', marginBottom: '4px' } as React.CSSProperties}>
                              {v.textes[trad] || v.textes['TR0001'] || '—'}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {estAdmin && <AssocierVerset segId={segActifData.id} onAssocie={associerVersetLocal(segActifData.id)} />}
                  </>
                ) : (
                  <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Cliquez sur un paragraphe pour afficher ses liens bibliques.</p>
                )}
              </>
            ) : ongletDroit === 'commentaires' ? (
              <div style={{ paddingTop: '14px' }}>
                <OngletCommentaires segActif={segActif} estAdmin={estAdmin} />
              </div>
            ) : (
              <div style={{ paddingTop: '14px' }}>
                {!suggestionsChargees ? (
                  <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Chargement…</p>
                ) : suggestions.length === 0 ? (
                  <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Aucun passage « Lien à constituer » pour cette œuvre.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {suggestions.map(s => (
                      <div key={s.id} style={{ paddingBottom: '12px', borderBottom: '1px solid #ede9e2' }}>
                        <div lang="fr" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12px', lineHeight: 1.38, color: '#2a2520', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 7px', whiteSpace: 'pre-line' } as React.CSSProperties}>
                          {rendreTexteEnrichi(nettoyerFin(normaliserEspaces(s.segment_texte)))}
                        </div>
                        {s.reference_manuelle && (
                          <p style={{ fontSize: '10.5px', color: '#9a5a2a', fontStyle: 'italic', margin: '0 0 6px' }}>
                            Référence proposée : {s.reference_manuelle}
                          </p>
                        )}
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', justifyContent:'space-between' }}>
                          <a href={`#s${s.segment_numero}`} onClick={() => setSegActif(s.id)} className="ref-lien"
                            style={{ fontSize: '10.5px', color: '#3d6b4f', textDecoration: 'none' }}>
                            Aller au passage
                          </a>
                          <button onClick={() => setSuggestionSignalee(s)} title="Signaler une référence à indiquer"
                            style={{ fontSize:'10.5px', color:'#9a5a2a', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                            Proposer une référence
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </aside>
        ) : (
          <button onClick={() => setPanneauOuvert(true)} title="Ouvrir le panneau de références"
            style={{ position: 'sticky', top: '48px', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 48px)', width: '22px', background: '#fff', border: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M7 1l-4 4 4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, fontSize: '8px', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: '#b0a89e', userSelect: 'none' }}>Commentaires et références bibliques</span>
          </button>
        )}
      </div>

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
            fontSize: '11.5px',
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}>
          Rétablir les proportions
        </button>
      )}
      {suggestionSignalee && (
        <ModalSignalement
          titre={`Référence à identifier — segment ${suggestionSignalee.segment_numero}`}
          avecNiveauImportance
          onClose={() => setSuggestionSignalee(null)}
          onEnvoyer={async (msg, importance) => {
            await insererSignalement({
              id_segment: suggestionSignalee.id,
              message: `Référence à identifier : ${msg || suggestionSignalee.segment_texte.slice(0, 160)}`,
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
    <div style={{ paddingRight: '92px', paddingTop: bas ? '2.5rem' : '0', paddingBottom: bas ? '0.5rem' : '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', color: '#9a958d' }}>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #d6d0c4)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <button
            onClick={() => peutReculer && setPageActuelle(pageActuelle - 1)}
            disabled={!peutReculer}
            title="Page précédente"
            style={{ background: 'none', border: 'none', cursor: peutReculer ? 'pointer' : 'default', color: peutReculer ? '#7a7268' : '#d6d0c4', fontSize: '15px', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ‹
          </button>
          <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: 'italic', fontSize: '12px', color: '#9a958d', letterSpacing: '0.02em', userSelect: 'none', minWidth: '80px', textAlign: 'center' }}>
            {pageActuelle + 1} / {total}
          </span>
          <button
            onClick={() => peutAvancer && setPageActuelle(pageActuelle + 1)}
            disabled={!peutAvancer}
            title="Page suivante"
            style={{ background: 'none', border: 'none', cursor: peutAvancer ? 'pointer' : 'default', color: peutAvancer ? '#7a7268' : '#d6d0c4', fontSize: '15px', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ›
          </button>
        </div>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #d6d0c4)' }} />
      </div>
    </div>
  )
}
