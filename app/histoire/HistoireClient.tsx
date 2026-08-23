'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { rendreSiecles, decouperSiecles, Siecle } from '@/app/lib/siecles'
import { useEstMobile } from '@/app/lib/useEstMobile'
import {
  type RangFrise, type Densite, DENSITES, coulFamille, passeDensite,
  libelleSource, estUrl, siecleDe,
} from '@/app/lib/frise'
import HistoricalDate from '@/app/components/HistoricalDate'
import { ENCRE_TITRE, GRAISSE_TITRE_VOLET, TITRE_VOLET } from '@/app/lib/hierarchieTitres'
import { colorMix } from '@/app/lib/couleurs'

// Frise générale de l'histoire de l'Église.
// Les champs riches viennent de `v_frise_generale`, triée par `ordre_affichage`.
// Les dates affichées et leurs précisions viennent de `rechercher_frise_v2`.
// L'ordre éditorial ne doit jamais être recalculé ici.

const FOND = 'var(--cs-fond)'
const TEXTE = 'var(--cs-texte-fort)'
const TEXTE2 = '#7a746d'
const BORD = 'var(--cs-bord)'
const SEP = 'var(--cs-fond-doux)'
const VERT = 'var(--cs-vert)'
const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

// ── Réglages du mode frise « à l'échelle » ─────────────────────────────────
// Colonnes par famille, barre verticale proportionnelle à la durée, événements
// positionnés sur un axe temporel réel (px par an).
const PX_PAR_AN = 2.6
const H_ENTETE_ECHELLE = 34
const LARG_GOUTTIERE = 62
const LARG_LANE = 210
const ECART_LANE = 8
const ECART_COL = 18
const BARRE_W = 3
const GAP_TXT = 10
const PAD_BLOC = 4
const GAP_V = 9
const H_BARRE_MIN = 7
const LARG_TEXTE = LARG_LANE - BARRE_W - GAP_TXT - 8
const CHARS_LIGNE = Math.max(8, Math.floor((LARG_TEXTE / 6.0) * 0.62))
const CHARS_LIGNE_GRAS = Math.max(7, Math.floor((LARG_TEXTE / 6.6) * 0.62))
const hauteurTexte = (titre: string, important: boolean) =>
  PAD_BLOC + 13 + Math.max(1, Math.ceil(titre.length / (important ? CHARS_LIGNE_GRAS : CHARS_LIGNE))) * 15.5 + PAD_BLOC

type Filtres = {
  familles: Set<string>
  genres: Set<string>
  zones: Set<string>
  pays: string
  sDe: number | null
  sA: number | null
}
const FILTRES_VIDES: Filtres = {
  familles: new Set(), genres: new Set(), zones: new Set(), pays: '', sDe: null, sA: null,
}
const aucunFiltre = (f: Filtres) =>
  !f.familles.size && !f.genres.size && !f.zones.size && !f.pays && f.sDe == null && f.sA == null

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function echapperRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Surligne le terme recherché (exact, insensible à la casse) dans un fragment de texte.
function surligner(texte: string, cle: string, q: string): React.ReactNode[] {
  if (!q) return [texte]
  const parts = texte.split(new RegExp(`(${echapperRegex(q)})`, 'gi'))
  return parts.map((p, i) => (i % 2 === 1)
    ? <mark key={`${cle}-m${i}`} style={{ background: 'rgba(183,160,106,0.38)', color: 'inherit', borderRadius: '4px', padding: '0 1px' }}>{p}</mark>
    : <React.Fragment key={`${cle}-t${i}`}>{p}</React.Fragment>)
}

// Ordinaux de souverains (« Albert Ier ») : chiffre romain en capitales normales,
// suffixe « er/e » en exposant. On agit sur les fragments NON reconnus comme siècles.
function rendreTexteLibre(v: string, cle: string, q: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /\b([IVXLCDM]+)(er|re|e)\b/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(v))) {
    if (m.index > last) out.push(...surligner(v.slice(last, m.index), `${cle}-${k}a`, q))
    out.push(<React.Fragment key={`${cle}-${k}o`}>{m[1]}<sup style={{ fontSize: '0.62em', lineHeight: 1, verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>{m[2]}</sup></React.Fragment>)
    k++; last = re.lastIndex
  }
  if (last < v.length) out.push(...surligner(v.slice(last), `${cle}-${k}a`, q))
  return out
}

// Un segment (déjà découpé hors italiques) : siècles en petites capitales + exposant,
// ordinaux de souverains, et surlignage du terme recherché.
function rendreSegment(texte: string, cle: string, q: string): React.ReactNode[] {
  return decouperSiecles(texte).map((fr, i) =>
    fr.t === 'romain' ? <span key={`${cle}-r${i}`} style={{ fontVariantCaps: 'all-small-caps' }}>{fr.v}</span>
    : fr.t === 'ordinal' ? <sup key={`${cle}-o${i}`} style={{ fontSize: '0.6em', lineHeight: 1, verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>{fr.v}</sup>
    : <React.Fragment key={`${cle}-t${i}`}>{rendreTexteLibre(fr.v, `${cle}-${i}`, q)}</React.Fragment>,
  )
}

// Rendu complet d'un texte de frise : d'abord les italiques *…* (titres d'œuvres,
// termes latins), puis siècles, ordinaux et surlignage à l'intérieur.
function rendreFrise(texte: string | null | undefined, q: string): React.ReactNode {
  const t = texte ?? ''
  if (!t) return t
  // Découpe sur les paires d'astérisques : indices impairs = contenu en italique.
  return t.split(/\*([^*]+)\*/g).map((p, i) => i % 2 === 1
    ? <em key={`i${i}`}>{rendreSegment(p, `i${i}`, q)}</em>
    : <React.Fragment key={`n${i}`}>{rendreSegment(p, `n${i}`, q)}</React.Fragment>)
}

export default function HistoireClient({ evs }: { evs: RangFrise[] }) {
  const mobile = useEstMobile(900)
  const [densite, setDensite] = useState<Densite>('etendu')
  const [vue, setVue] = useState<'liste' | 'echelle'>('liste')
  const [f, setF] = useState<Filtres>(FILTRES_VIDES)
  const [panneauOuvert, setPanneauOuvert] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [toutesNotes, setToutesNotes] = useState(false)
  const initUrlFaite = useRef(false)

  // Les données (`evs`) arrivent PRÉ-CHARGÉES et fusionnées du serveur (rendu ISR,
  // voir app/histoire/page.tsx) : plus de fetch ni d'état chargement/erreur ici.

  // ── État repris de l'URL au premier rendu, puis reflété dans l'URL ────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const liste = (c: string) => new Set((p.get(c) || '').split('|').filter(Boolean))
    const nb = (c: string) => (p.get(c) ? Number(p.get(c)) : null)
    const d = p.get('densite')
    if (d === 'essentiel' || d === 'etendu' || d === 'complet') setDensite(d)
    setF({
      familles: liste('famille'), genres: liste('genre'), zones: liste('zone'),
      pays: p.get('pays') || '', sDe: nb('de'), sA: nb('a'),
    })
    initUrlFaite.current = true
  }, [])

  useEffect(() => {
    if (!initUrlFaite.current) return
    const p = new URLSearchParams()
    if (f.familles.size) p.set('famille', [...f.familles].join('|'))
    if (f.genres.size) p.set('genre', [...f.genres].join('|'))
    if (f.zones.size) p.set('zone', [...f.zones].join('|'))
    if (f.pays) p.set('pays', f.pays)
    if (f.sDe != null) p.set('de', String(f.sDe))
    if (f.sA != null) p.set('a', String(f.sA))
    if (densite !== 'etendu') p.set('densite', densite)
    const q = p.toString()
    window.history.replaceState(null, '', q ? `?${q}${window.location.hash}` : window.location.pathname + window.location.hash)
  }, [f, densite])

  // ── Répertoires pour les filtres, tirés de la réponse de la vue ──────────
  const rep = useMemo(() => {
    const familles = new Map<string, number>()
    const zones = new Set<string>()
    const pays = new Set<string>()
    const siecles = new Set<number>()
    evs.forEach(e => {
      if (e.famille) familles.set(e.famille, e.famille_id ?? 999)
      if (e.zone_geographique) zones.add(e.zone_geographique)
      ;(e.pays_filtres ?? []).forEach(p => pays.add(p))
      const s = siecleDe(e.date_debut)
      if (s != null) siecles.add(s)
    })
    return {
      familles: [...familles.keys()].sort((a, b) => (familles.get(a)! - familles.get(b)!) || a.localeCompare(b, 'fr')),
      zones: [...zones].sort((a, b) => a.localeCompare(b, 'fr')),
      pays: [...pays].sort((a, b) => a.localeCompare(b, 'fr')),
      siecles: [...siecles].sort((a, b) => a - b),
    }
  }, [evs])

  // Les genres proposés suivent la famille choisie.
  const genresDispo = useMemo(() => {
    const s = new Set<string>()
    evs.forEach(e => {
      if (f.familles.size && !(e.famille && f.familles.has(e.famille))) return
      if (e.genre) s.add(e.genre)
    })
    return [...s].sort((a, b) => a.localeCompare(b, 'fr'))
  }, [evs, f.familles])

  // ── Application des filtres. L'ordre de la vue est conservé tel quel. ─────
  const q = sansAccents(recherche.trim())
  const visibles = useMemo(() => evs.filter(e => {
    if (!passeDensite(e.importance_code, densite)) return false
    // Recherche en direct dans le titre ou la notice (combinée aux autres filtres).
    if (q && !sansAccents(`${e.titre} ${e.notice ?? ''}`).includes(q)) return false
    if (f.familles.size && !(e.famille && f.familles.has(e.famille))) return false
    if (f.genres.size && !(e.genre && f.genres.has(e.genre))) return false
    if (f.zones.size && !(e.zone_geographique && f.zones.has(e.zone_geographique))) return false
    // Pays MODERNE : uniquement `pays_filtres`. Le champ `pays` est historique.
    if (f.pays && !(e.pays_filtres ?? []).includes(f.pays)) return false
    if (f.sDe != null || f.sA != null) {
      const s = siecleDe(e.date_debut)
      if (s == null) return false
      if (f.sDe != null && s < f.sDe) return false
      if (f.sA != null && s > f.sA) return false
    }
    return true
  }), [evs, densite, f, q])

  // Une occurrence trouvée DANS une notice force l'ouverture de toutes les notices,
  // sinon le passage surligné resterait masqué (les notices sont repliées par défaut).
  const matchNotice = useMemo(
    () => !!q && visibles.some(e => sansAccents(e.notice ?? '').includes(q)),
    [q, visibles],
  )
  const notesOuvertes = toutesNotes || matchNotice

  // ── Colonnes du mode « à l'échelle » : positionnement sur un axe temporel. ──
  const echelle = useMemo(() => {
    const avecDate = visibles.filter(e => e.date_debut != null)
    if (!avecDate.length) return null
    const ys = avecDate.flatMap(e => [e.date_debut!, e.date_fin ?? e.date_debut!])
    const debut = Math.floor(Math.min(...ys) / 100) * 100
    const fin = Math.ceil(Math.max(...ys) / 100) * 100
    const famillesPresentes = Array.from(new Set(avecDate.map(e => e.famille ?? '').filter(Boolean)))
    let basMax = 0
    const cols = famillesPresentes.map(fam => {
      const items = avecDate.filter(e => (e.famille ?? '') === fam).sort((a, b) => a.date_debut! - b.date_debut!)
      const finCouloir: number[] = []
      const places = items.map(e => {
        const deb = e.date_debut!, ferme = Math.max(e.date_fin ?? deb, deb)
        const top = (deb - debut) * PX_PAR_AN
        const dureeH = (ferme - deb) * PX_PAR_AN
        const occ = Math.max(H_BARRE_MIN, dureeH, hauteurTexte(e.titre, false))
        const bas = top + occ + GAP_V
        if (bas > basMax) basMax = bas
        let c = finCouloir.findIndex(fc => fc <= top)
        if (c === -1) { c = finCouloir.length; finCouloir.push(bas) } else finCouloir[c] = bas
        return { e, couloir: c, top, dureeH, occ }
      })
      return { fam, places, nbCouloirs: Math.max(1, finCouloir.length) }
    })
    const hauteur = Math.max((fin - debut) * PX_PAR_AN, basMax) + 12
    return { debut, fin, hauteur, cols }
  }, [visibles])

  const basculer = useCallback((cle: 'familles' | 'genres' | 'zones', v: string) => {
    setF(prev => {
      const s = new Set(prev[cle])
      s.has(v) ? s.delete(v) : s.add(v)
      return { ...prev, [cle]: s }
    })
  }, [])

  const reinitialiser = () => setF(FILTRES_VIDES)

  // Ancre : si l'URL désigne un événement, on l'amène en vue une fois chargé.
  useEffect(() => {
    if (!visibles.length) return
    const cible = window.location.hash.slice(1)
    if (!cible) return
    const n = document.getElementById(cible)
    if (n) n.scrollIntoView({ block: 'center' })
  }, [visibles.length])

  const filtresActifs = !aucunFiltre(f)

  const contenuFiltres = (
    <>
      {/* Recherche en direct : titre ou notice, combinée aux filtres. */}
      <div style={{ position: 'relative', marginTop: '2px' }}>
        <input value={recherche} onChange={e => setRecherche(e.target.value)} type="text"
          placeholder="Rechercher un événement…" aria-label="Rechercher dans la frise"
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: SERIF, fontSize: '0.75rem', padding: '7px 10px 7px 28px', borderRadius: '8px', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte)', outline: 'none' }} />
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--cs-texte-fort)', position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <line x1="9" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {recherche && (
          <button onClick={() => setRecherche('')} aria-label="Effacer la recherche"
            style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TEXTE2, fontSize: '0.8125rem', lineHeight: 1, padding: 0 }}>✕</button>
        )}
      </div>

      {/* Afficher/masquer les notices (et l'accès aux « Sources et détail »). */}
      <button onClick={() => setToutesNotes(o => !o)} aria-pressed={toutesNotes}
        style={{ marginTop: '10px', width: '100%', fontFamily: SERIF, fontSize: '0.75rem', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer',
          border: `1px solid ${toutesNotes ? VERT : BORD}`, background: toutesNotes ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-surface)', color: toutesNotes ? VERT : 'var(--cs-texte-second)' }}>
        {toutesNotes ? 'Masquer toutes les notes' : 'Afficher toutes les notes'}
      </button>

      <GroupeFiltre label="Disposition">
        <div style={{ display: 'flex', border: `1px solid ${BORD}`, borderRadius: '999px', overflow: 'hidden' }} role="group" aria-label="Disposition de la frise">
          {([['liste', 'Liste'], ['echelle', 'À l’échelle']] as ['liste' | 'echelle', string][]).map(([cle, label], i) => (
            <button key={cle} onClick={() => setVue(cle)} aria-pressed={vue === cle}
              style={{
                flex: 1, fontSize: '0.6875rem', padding: '5px 4px', border: 'none',
                borderLeft: i > 0 ? `1px solid ${BORD}` : 'none', cursor: 'pointer',
                background: vue === cle ? VERT : 'var(--cs-surface)', color: vue === cle ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)',
                fontFamily: 'inherit', fontWeight: vue === cle ? 600 : 400, whiteSpace: 'nowrap',
              }}>
              {label}
            </button>
          ))}
        </div>
      </GroupeFiltre>

      <GroupeFiltre label="Densité">
        <div style={{ display: 'flex', border: `1px solid ${BORD}`, borderRadius: '999px', overflow: 'hidden' }} role="group" aria-label="Densité de la frise">
          {DENSITES.map((d, i) => (
            <button key={d.cle} onClick={() => setDensite(d.cle)} aria-pressed={densite === d.cle}
              style={{
                flex: 1, fontSize: '0.6875rem', padding: '5px 4px', border: 'none',
                borderLeft: i > 0 ? `1px solid ${BORD}` : 'none', cursor: 'pointer',
                background: densite === d.cle ? VERT : 'var(--cs-surface)', color: densite === d.cle ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)',
                fontFamily: 'inherit', fontWeight: densite === d.cle ? 600 : 400, whiteSpace: 'nowrap',
              }}>
              {d.label}
            </button>
          ))}
        </div>
      </GroupeFiltre>

      {rep.siecles.length > 1 && (
        <GroupeFiltre label="Période">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.71875rem', color: TEXTE2 }}>
            <label htmlFor="frise-de" style={{ flexShrink: 0 }}>Du</label>
            <SelectSiecle id="frise-de" valeur={f.sDe} siecles={rep.siecles} tout="Début"
              onChange={v => setF(p => ({ ...p, sDe: v }))} />
            <label htmlFor="frise-a" style={{ flexShrink: 0 }}>au</label>
            <SelectSiecle id="frise-a" valeur={f.sA} siecles={rep.siecles} tout="Fin"
              onChange={v => setF(p => ({ ...p, sA: v }))} />
          </div>
        </GroupeFiltre>
      )}

      <GroupeFiltre label="Famille">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {rep.familles.map(nom => (
            <BoutonFamille key={nom} fam={nom} actif={f.familles.has(nom)} onClick={() => basculer('familles', nom)} />
          ))}
        </div>
      </GroupeFiltre>

      {genresDispo.length > 0 && (
        <GroupeFiltre label="Genre">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {genresDispo.map(g => (
              <LigneCase key={g} actif={f.genres.has(g)} onClick={() => basculer('genres', g)}>{g}</LigneCase>
            ))}
          </div>
        </GroupeFiltre>
      )}

      {rep.zones.length > 0 && (
        <GroupeFiltre label="Zone géographique">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {rep.zones.map(z => (
              <LigneCase key={z} actif={f.zones.has(z)} onClick={() => basculer('zones', z)}>{z}</LigneCase>
            ))}
          </div>
        </GroupeFiltre>
      )}

      {rep.pays.length > 0 && (
        <GroupeFiltre label="Pays actuel">
          <select value={f.pays} onChange={e => setF(p => ({ ...p, pays: e.target.value }))}
            aria-label="Filtrer par pays actuel"
            style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.71875rem', padding: '4px 8px', borderRadius: '4px', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte)' }}>
            <option value="">Tous les pays</option>
            {rep.pays.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <p style={{ margin: '6px 0 0', fontSize: '0.625rem', lineHeight: 1.4, color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>
            Territoire actuel du lieu. La désignation historique reste affichée sur l’événement.
          </p>
        </GroupeFiltre>
      )}

      {filtresActifs && (
        <button onClick={reinitialiser}
          style={{ marginTop: '14px', width: '100%', padding: '6px 9px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.75rem' }}>
          Réinitialiser les filtres
        </button>
      )}
    </>
  )

  return (
    <main style={{ background: FOND, minHeight: 'calc(100vh - 3.5rem)' }}>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet des filtres. Sur mobile, un panneau repliable. ───────── */}
        <aside style={{
          flexShrink: 0, width: mobile ? '100%' : '15.5rem',
          position: mobile ? 'static' : 'sticky', top: '3.5rem',
          height: mobile ? 'auto' : 'calc(100vh - 3.5rem)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--cs-fond-clair)',
          borderRight: mobile ? 'none' : `1px solid ${BORD}`,
          borderBottom: mobile ? `1px solid ${BORD}` : 'none',
        }}>
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '13px 15px 12px' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b0a088', margin: '0 0 4px' }}>Aller plus loin</p>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: TITRE_VOLET, fontWeight: GRAISSE_TITRE_VOLET, color: ENCRE_TITRE, lineHeight: 1.15, letterSpacing: '0.01em' }}>Histoire de l’Église</h1>
          </div>

          {mobile ? (
            <>
              <button onClick={() => setPanneauOuvert(o => !o)} aria-expanded={panneauOuvert} aria-controls="frise-filtres"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 15px', border: 'none', borderBottom: panneauOuvert ? `1px solid ${SEP}` : 'none', background: 'transparent', cursor: 'pointer', fontFamily: SERIF, fontSize: '0.8125rem', color: '#5a5044' }}>
                <span>Filtres et densité{filtresActifs ? ' (actifs)' : ''}</span>
                <span aria-hidden style={{ color: TEXTE2, fontSize: '0.6875rem' }}>{panneauOuvert ? '▲' : '▼'}</span>
              </button>
              {panneauOuvert && <div id="frise-filtres" style={{ padding: '0 15px 18px' }}>{contenuFiltres}</div>}
            </>
          ) : (
            <div id="frise-filtres" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 15px 22px' }}>
              {contenuFiltres}
            </div>
          )}
        </aside>

        {/* ── Frise ──────────────────────────────────────────────────────── */}
        <section style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 14px 56px' : '16px 32px 64px' }}>
          {/* Le mode « à l'échelle » a besoin de toute la largeur (défilement horizontal). */}
          <div style={{ maxWidth: vue === 'echelle' ? 'none' : '48rem', margin: '0 auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', margin: '0 0 16px', paddingBottom: '12px', borderBottom: `1px solid ${SEP}` }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', whiteSpace: 'nowrap' }} aria-live="polite">
                {visibles.length} repère{visibles.length > 1 ? 's' : ''}
              </span>
            </div>

            {visibles.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '20px' }}>
                <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>
                  Aucun événement ne correspond aux filtres retenus.
                </p>
                {filtresActifs && (
                  <button onClick={reinitialiser}
                    style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.78125rem' }}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : vue === 'echelle' ? (
              <FriseEchelle echelle={echelle} recherche={recherche.trim()} />
            ) : (
              <ListeFrise items={visibles} mobile={mobile} toutesNotes={notesOuvertes} recherche={recherche.trim()} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

// ── Liste verticale : une carte par événement (plus de repères de siècle). ──
function ListeFrise({ items, mobile, toutesNotes, recherche }: { items: RangFrise[]; mobile: boolean; toutesNotes: boolean; recherche: string }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map(e => <CarteEvenement key={e.id} e={e} mobile={mobile} toutesNotes={toutesNotes} recherche={recherche} />)}
    </ul>
  )
}

// ── Mode « à l'échelle » : colonnes par famille, barre ∝ durée, axe temporel. ──
type PlaceEchelle = { e: RangFrise; couloir: number; top: number; dureeH: number; occ: number }
type ColEchelle = { fam: string; places: PlaceEchelle[]; nbCouloirs: number }
function FriseEchelle({ echelle, recherche }: {
  echelle: { debut: number; fin: number; hauteur: number; cols: ColEchelle[] } | null
  recherche: string
}) {
  if (!echelle) return (
    <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', textAlign: 'center', paddingTop: '20px' }}>
      Aucun repère daté à placer sur l’échelle pour cette sélection.
    </p>
  )
  const { debut, hauteur, cols } = echelle
  const largCol = (c: ColEchelle) => c.nbCouloirs * LARG_LANE + (c.nbCouloirs - 1) * ECART_LANE
  const xCol: number[] = []
  let x = LARG_GOUTTIERE
  cols.forEach(c => { xCol.push(x); x += largCol(c) + ECART_COL })
  const largTotale = x - ECART_COL + 8
  const bornesSiecles: number[] = []
  for (let b = debut; b <= echelle.fin; b += 100) bornesSiecles.push(b)

  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${BORD}`, borderRadius: '8px', background: 'var(--cs-fond-clair)' }}>
      <div style={{ position: 'relative', width: largTotale, height: H_ENTETE_ECHELLE + hauteur, minWidth: '100%' }}>

        {/* En-têtes de colonnes (une par famille). */}
        {cols.map((c, i) => (
          <div key={c.fam} style={{
            position: 'absolute', top: 0, left: xCol[i], width: largCol(c), height: H_ENTETE_ECHELLE,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', textAlign: 'center',
            borderBottom: `1.5px solid ${colorMix(coulFamille(c.fam), 27)}`, padding: '0 8px', boxSizing: 'border-box',
          }}>
            <span aria-hidden style={{ width: '8px', height: '8px', borderRadius: '50%', background: coulFamille(c.fam), flexShrink: 0 }} />
            <span style={{ fontFamily: SANS, fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: coulFamille(c.fam), lineHeight: 1.25 }}>{c.fam}</span>
          </div>
        ))}

        <div style={{ position: 'absolute', top: H_ENTETE_ECHELLE, left: 0, right: 0, height: hauteur }}>
          {/* Filets et repères de siècle dans la gouttière. */}
          {bornesSiecles.map(b => {
            const y = (b - debut) * PX_PAR_AN
            const s = siecleDe(b + 1)
            return (
              <React.Fragment key={b}>
                <div style={{ position: 'absolute', top: y, left: LARG_GOUTTIERE - 6, width: largTotale - LARG_GOUTTIERE + 6, borderTop: `1px solid ${SEP}` }} />
                {b < echelle.fin && s != null && (
                  <div style={{ position: 'absolute', top: y + 5, left: 0, width: LARG_GOUTTIERE - 12, textAlign: 'right', fontFamily: SERIF, fontSize: '0.71875rem', color: 'var(--cs-or-doux)' }}>
                    <Siecle n={s} />
                  </div>
                )}
              </React.Fragment>
            )
          })}

          {/* Blocs événements, positionnés sur l'axe et répartis en couloirs. */}
          {cols.map((c, i) => {
            const teinte = coulFamille(c.fam)
            return c.places.map(({ e, couloir, top, dureeH, occ }) => {
              const gauche = xCol[i] + couloir * (LARG_LANE + ECART_LANE)
              return (
                <div key={e.id}
                  title={`${e.date_affichage} · ${e.titre}${e.notice ? '\n\n' + e.notice : ''}`}
                  style={{ position: 'absolute', top, left: gauche, width: LARG_LANE, height: occ }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: BARRE_W, height: Math.max(H_BARRE_MIN, dureeH), background: teinte, opacity: 0.9, borderRadius: '4px' }} />
                  <div style={{ paddingLeft: BARRE_W + GAP_TXT, paddingTop: PAD_BLOC }}>
                    <div style={{ fontFamily: SERIF, fontSize: '0.625rem', color: teinte, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{rendreSiecles(formaterDateHistoire(e.date_affichage))}</div>
                    <div style={{ fontFamily: SERIF, fontSize: '0.71875rem', color: TEXTE, lineHeight: 1.28, marginTop: '1px' }}>{rendreFrise(e.titre, recherche)}</div>
                  </div>
                </div>
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}

// Format d'affichage d'une date d'événement (page Histoire) :
//  • le tiret demi-cadratin entre deux dates est entouré de deux espaces (« 843 – 850 »),
//    de même qu'un trait d'union entre deux chiffres (sans toucher « J.-C. ») ;
//  • majuscule systématique en début de ligne.
function formaterDateHistoire(d: string | null | undefined): string {
  let t = String(d ?? '').trim()
  if (!t) return ''
  t = t.replace(/\s*–\s*/g, ' – ').replace(/(\d)\s*-\s*(\d)/g, '$1 – $2')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

// ── Carte : colonnes date · famille · intitulé (une seule ligne chacune) ; un clic
//    sur l'intitulé déplie la notice correspondante. ─────────────────────────────
function CarteEvenement({ e, mobile, toutesNotes, recherche }: { e: RangFrise; mobile: boolean; toutesNotes: boolean; recherche: string }) {
  const [detailOuvert, setDetailOuvert] = useState(false)
  const [noticeOuverte, setNoticeOuverte] = useState(false)
  const c = coulFamille(e.famille)
  const idCarte = `d-${e.id}`
  const aNotice = !!(
    (e.notice && e.notice.trim())
    || (e.date_precision_affichage && e.date_precision_affichage.trim())
    || (e.note_datation && e.note_datation.trim())
  )
  // La notice s'affiche si le mode global est actif OU si l'on a cliqué sur l'intitulé.
  const afficheNotice = toutesNotes || noticeOuverte

  const notice = e.notice ?? ''
  const noticeCourte = !mobile || detailOuvert || noticeOuverte || notice.length <= 150
    ? notice
    : notice.slice(0, 150).replace(/\s+\S*$/, '') + '…'

  const dateTexte = formaterDateHistoire(e.date_affichage)

  // Colonnes date et famille : chacune sur UNE ligne (troncature discrète si trop long,
  // le texte entier restant accessible en infobulle).
  const dateCol = (
    <div title={dateTexte} style={{ fontFamily: SERIF, fontSize: '0.75rem', color: '#b7a06a', lineHeight: 1.35, fontVariantNumeric: 'tabular-nums', textAlign: mobile ? 'left' : 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <HistoricalDate value={e.date_affichage} variant="short" />
    </div>
  )
  const familleCol = (
    <div title={e.famille ?? ''} style={{ fontFamily: SANS, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: c, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {e.famille ?? ''}
    </div>
  )

  // Intitulé sur une seule ligne ; cliquable (quand il y a une notice) pour la déplier.
  const styleTitre: React.CSSProperties = {
    margin: 0, fontFamily: SERIF, fontSize: '0.9375rem', lineHeight: 1.35, color: TEXTE, fontWeight: 500,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
  }
  const titre = aNotice ? (
    <button onClick={() => setNoticeOuverte(o => !o)} aria-expanded={noticeOuverte} title="Afficher la notice"
      style={{ ...styleTitre, display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      {rendreFrise(e.titre, recherche)}
    </button>
  ) : (
    <h3 style={styleTitre}>{rendreFrise(e.titre, recherche)}</h3>
  )

  // Colonne de contenu : intitulé (une ligne), puis notice/détail dépliés.
  const contenu = (
    <div style={{ minWidth: 0 }}>
      {titre}

      {afficheNotice && noticeCourte && (
        <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.55, margin: '4px 0 0', textAlign: 'justify' }}>
          {rendreFrise(noticeCourte, recherche)}
        </p>
      )}

      {afficheNotice && e.date_precision_affichage && (
        <p style={{ fontFamily: SERIF, fontSize: '0.75rem', color: '#7a6f61', lineHeight: 1.5, margin: '4px 0 0' }}>
          <HistoricalDate value={e.date_precision_affichage} variant="short" />
        </p>
      )}

      {afficheNotice && e.note_datation && (
        <p style={{ fontFamily: SERIF, fontSize: '0.75rem', color: '#7a6f61', lineHeight: 1.5, margin: '4px 0 0' }}>
          {rendreFrise(e.note_datation, recherche)}
        </p>
      )}

      {afficheNotice && (
        <div style={{ marginTop: '5px' }}>
          <button onClick={() => setDetailOuvert(o => !o)} aria-expanded={detailOuvert} aria-controls={idCarte}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SANS, fontSize: '0.625rem', color: 'var(--cs-texte-doux)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
            {detailOuvert ? 'Réduire' : 'Sources et détail'}
          </button>
        </div>
      )}

      {afficheNotice && detailOuvert && (
        <div id={idCarte} style={{ marginTop: '7px', paddingLeft: '10px', borderLeft: `2px solid ${SEP}` }}>
          {/* Sous-famille (genre) : reléguée ici, pas visible au premier regard. */}
          {e.genre && <LigneDetail label="Sous-famille">{e.genre}</LigneDetail>}
          <Geographie e={e} />
          <Sources principale={e.source_principale} secondaire={e.source_secondaire} />
        </div>
      )}
    </div>
  )

  return (
    <li id={e.id} style={{ listStyle: 'none', scrollMarginTop: '4rem' }}>
      <article style={mobile
        ? { padding: '11px 0', borderTop: `1px solid ${SEP}` }
        : { display: 'grid', gridTemplateColumns: '7rem 10.5rem 1fr', columnGap: '14px', alignItems: 'baseline', padding: '11px 0', borderTop: `1px solid ${SEP}` }}>
        {mobile ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginBottom: '3px' }}>
              {dateCol}
              {familleCol}
            </div>
            {contenu}
          </>
        ) : (
          <>
            {dateCol}
            {familleCol}
            {contenu}
          </>
        )}
      </article>
    </li>
  )
}

// Géographie détaillée. Les lignes vides ne sont jamais affichées.
function Geographie({ e }: { e: { lieu: string | null; pays: string | null; zone_geographique: string | null } }) {
  const lignes: [string, string][] = []
  if (e.lieu) lignes.push(['Lieu', e.lieu])
  if (e.pays) lignes.push(['Espace historique', e.pays])
  if (e.zone_geographique) lignes.push(['Zone', e.zone_geographique])
  if (!lignes.length) return null
  return <>{lignes.map(([l, v]) => <LigneDetail key={l} label={l}>{v}</LigneDetail>)}</>
}

function Sources({ principale, secondaire, lien }: { principale: string | null; secondaire: string | null; lien?: string | null }) {
  if (!principale && !secondaire && !lien) return null
  return (
    <>
      {principale && <LigneDetail label="Source de l’événement"><Lien valeur={principale} /></LigneDetail>}
      {secondaire && <LigneDetail label="Source secondaire"><Lien valeur={secondaire} /></LigneDetail>}
      {lien && <LigneDetail label="Source du rattachement à l’auteur"><Lien valeur={lien} /></LigneDetail>}
    </>
  )
}

// Jamais d'URL brute : un libellé de domaine, ouvert dans un nouvel onglet.
function Lien({ valeur }: { valeur: string }) {
  const lib = libelleSource(valeur)
  if (!estUrl(valeur)) return <>{lib}</>
  return (
    <a href={valeur} target="_blank" rel="noopener noreferrer" style={{ color: VERT, textUnderlineOffset: '2px' }}>
      {lib}
    </a>
  )
}

function LigneDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 3px', fontFamily: SANS, fontSize: '0.65625rem', lineHeight: 1.5, color: 'var(--cs-texte-second)' }}>
      <span style={{ color: 'var(--cs-texte-doux)' }}>{label} : </span>{children}
    </p>
  )
}

// ── Commandes de filtre ───────────────────────────────────────────────────
function SelectSiecle({ id, valeur, siecles, tout, onChange }: {
  id: string; valeur: number | null; siecles: number[]; tout: string; onChange: (v: number | null) => void
}) {
  return (
    <select id={id} value={valeur ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      style={{ flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: '0.71875rem', padding: '3px 5px', borderRadius: '4px', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte)' }}>
      <option value="">{tout}</option>
      {siecles.map(s => <option key={s} value={s}>{s > 0 ? `${s}e s.` : `${-s}e s. av. J.-C.`}</option>)}
    </select>
  )
}

function GroupeFiltre({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '13px', paddingTop: '13px', borderTop: `1px solid ${SEP}` }}>
      <div style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}

function BoutonFamille({ fam, actif, onClick }: { fam: string; actif: boolean; onClick: () => void }) {
  const c = coulFamille(fam)
  return (
    <button onClick={onClick} aria-pressed={actif} style={{
      display: 'flex', alignItems: 'center', gap: '9px', width: '100%', textAlign: 'left',
      padding: '6px 9px', borderRadius: '8px', cursor: 'pointer',
      border: `1px solid ${actif ? c : `${colorMix(c, 25)}`}`,
      background: actif ? `${colorMix(c, 13)}` : `${colorMix(c, 5)}`,
      transition: 'background 0.12s, border-color 0.12s',
    }}>
      <span aria-hidden style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: c, fontWeight: actif ? 600 : 500, lineHeight: 1.25 }}>{fam}</span>
    </button>
  )
}

function LigneCase({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={actif} style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 'none', borderLeft: `2px solid ${actif ? VERT : 'transparent'}`,
      padding: '2px 0 2px 9px', margin: 0,
      fontFamily: SERIF, fontSize: '0.75rem', lineHeight: 1.35,
      color: actif ? VERT : 'var(--cs-texte-gris)', fontWeight: actif ? 600 : 400,
      transition: 'color 0.12s, border-color 0.12s',
    }}>{children}</button>
  )
}
