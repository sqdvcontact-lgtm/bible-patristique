'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
// ⚠️ `rendreSiecles` et `Siecle` sont partis avec le mode « à l'échelle », qui seul les
// employait : la liste compose ses siècles par `decouperSiecles` (voir `rendreTexteLibre`).
import { decouperSiecles, STYLE_ROMAIN, STYLE_ORDINAL } from '@/app/lib/siecles'
import { decouperOrdinaux } from './ordinauxFrise'
import { useEstMobile } from '@/app/lib/useEstMobile'
import {
  type RangFrise, type ModeLecture, type RelationFrise, type SerieFrise,
  type LienDEvenement, type PlaceDansSerie,
  MODES_LECTURE, coulFamille, passeMode, passeTraditions, modeDepuisUrl,
  liensDesEvenements, placesDansSeries, decouperEnPeriodes,
  libelleSource, estUrl, siecleDe,
} from '@/app/lib/frise'
import HistoricalDate from '@/app/components/HistoricalDate'
import { ENCRE_TITRE, GRAISSE_TITRE_VOLET, TITRE_VOLET } from '@/app/lib/hierarchieTitres'
import { RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { colorMix } from '@/app/lib/couleurs'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

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

// ⛔ LE MODE « À L'ÉCHELLE » EST SUPPRIMÉ (décision de l'auteur, 2026-09-05 :
// « à l'échelle, on pourra jamais l'utiliser ; supprime ça »). La frise se lit en
// LISTE, et c'est le seul mode.
//
// ⚠️ Ce qu'il promettait — la DURÉE d'un événement rendue par la longueur d'une
// barre, et deux événements contemporains vus côte à côte — n'a jamais tenu sur ce
// corpus. L'audit du 2026-09-04 l'avait mesuré : ce sont les INTITULÉS qui décident
// de la largeur, non la simultanéité. Un bloc réserve la hauteur de son texte, si
// bien qu'une famille dense ouvre autant de couloirs qu'elle a d'événements dont
// les titres se chevauchent, et la frise partait en largeur pour des raisons qui ne
// devaient rien à la chronologie. Aucun des trois partis envisagés — barre seule
// avec l'intitulé au survol, couloirs plafonnés, retrait du mode — n'a été arbitré
// ce jour-là ; c'est le troisième qui l'est.
//
// ⚠️ Et la DONNÉE ne portait pas non plus ce que la barre promettait. Mesuré le
// 2026-09-05 sur les 1 170 repères de la frise : tous portent une date de fin, mais
// 456 seulement — 39 % — couvrent un empan réel ; les 714 autres sont des points, où
// la fin égale le début. Près de deux repères sur trois se rendaient donc par une
// barre de hauteur minimale, c'est-à-dire par une barre qui ne dit rien.

type Filtres = {
  familles: Set<string>
  genres: Set<string>
  zones: Set<string>
  /** Latine, grecque, syriaque… 19 traditions, 1 529 rattachements, une couverture
   *  totale : la coupe qui manquait le plus à un corpus patristique. */
  traditions: Set<string>
  pays: string
  sDe: number | null
  sA: number | null
}
const FILTRES_VIDES: Filtres = {
  familles: new Set(), genres: new Set(), zones: new Set(), traditions: new Set(),
  pays: '', sDe: null, sA: null,
}
const aucunFiltre = (f: Filtres) =>
  !f.familles.size && !f.genres.size && !f.zones.size && !f.traditions.size
  && !f.pays && f.sDe == null && f.sA == null

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

// Ordinaux de souverains (« Albert Ier ») et chiffres de siècle élidés (« du XIIe ») :
// chiffre romain en capitales normales, suffixe en exposant. On agit sur les fragments
// NON reconnus comme siècles par `decouperSiecles`.
//
// ⛔ LA RÈGLE VIT DANS `ordinauxFrise`, ET PLUS ICI. Le motif écrit sur place valait
// `[IVXLCDM]+(er|re|e)` : le L de « Le » est un chiffre romain, le C de « Ce » et le D de
// « De » aussi, et « Le scribe Shlomo » se composait « Lᵉ scribe ». Mesuré sur tout le
// corpus : **559 faux exposants** contre 99 vrais (relevé de l'auteur, 2026-09-04).
function rendreTexteLibre(v: string, cle: string, q: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let k = 0
  for (const fr of decouperOrdinaux(v)) {
    if (fr.t === 'texte') out.push(...surligner(fr.v, `${cle}-${k++}a`, q))
    else if (fr.t === 'romain') out.push(<React.Fragment key={`${cle}-${k++}r`}>{fr.v}</React.Fragment>)
    // ⛔ Les styles viennent de la source unique : l'exposant valait ici 0,62 em écrit à
    // la main, comme le faisait déjà `rendreSegment` avant qu'on l'y reprenne.
    else out.push(<sup key={`${cle}-${k++}o`} style={STYLE_ORDINAL}>{fr.v}</sup>)
  }
  return out
}

// Un segment (déjà découpé hors italiques) : siècles en petites capitales + exposant,
// ordinaux de souverains, et surlignage du terme recherché.
function rendreSegment(texte: string, cle: string, q: string): React.ReactNode[] {
  return decouperSiecles(texte).map((fr, i) =>
    // ⛔ Les styles viennent de la source unique, ils ne se recopient pas : l'ordinal
    // valait ici 0,6 em contre 0,62 dans `siecles.tsx`, et la dérive était déjà là.
    fr.t === 'romain' ? <span key={`${cle}-r${i}`} style={STYLE_ROMAIN}>{fr.v}</span>
    : fr.t === 'ordinal' ? <sup key={`${cle}-o${i}`} style={STYLE_ORDINAL}>{fr.v}</sup>
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

export default function HistoireClient(
  { evs, series, relations }: { evs: RangFrise[]; series: SerieFrise[]; relations: RelationFrise[] },
) {
  const mobile = useEstMobile(900)
  const [mode, setMode] = useState<ModeLecture>('reperes')
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
    setMode(modeDepuisUrl(p.get('mode'), p.get('densite')))
    setF({
      familles: liste('famille'), genres: liste('genre'), zones: liste('zone'),
      traditions: liste('tradition'),
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
    if (f.traditions.size) p.set('tradition', [...f.traditions].join('|'))
    if (f.pays) p.set('pays', f.pays)
    if (f.sDe != null) p.set('de', String(f.sDe))
    if (f.sA != null) p.set('a', String(f.sA))
    // ⚠️ Le paramètre change de NOM : « densite » disait un rabattage fait dans le
    // client, « mode » dit le classement éditorial. Les anciennes adresses restent
    // lues (voir modeDepuisUrl), elles ne se réécrivent simplement plus.
    if (mode !== 'reperes') p.set('mode', mode)
    const q = p.toString()
    window.history.replaceState(null, '', q ? `?${q}${window.location.hash}` : window.location.pathname + window.location.hash)
  }, [f, mode])

  // ── Répertoires pour les filtres, tirés de la réponse de la vue ──────────
  const rep = useMemo(() => {
    const familles = new Map<string, number>()
    const zones = new Set<string>()
    const pays = new Set<string>()
    const traditions = new Map<string, number>()
    const siecles = new Set<number>()
    evs.forEach(e => {
      if (e.famille) familles.set(e.famille, e.famille_id ?? 999)
      if (e.zone_geographique) zones.add(e.zone_geographique)
      ;(e.pays_filtres ?? []).forEach(p => pays.add(p))
      // ⚠️ Les traditions se rangent par EFFECTIF, non par ordre alphabétique : la
      // latine et la grecque portent le corpus, et une liste de dix-neuf entrées qui
      // ouvrirait sur « arménienne » ferait chercher l'essentiel au milieu.
      ;(e.traditions ?? []).forEach(t => traditions.set(t, (traditions.get(t) ?? 0) + 1))
      const s = siecleDe(e.date_debut)
      if (s != null) siecles.add(s)
    })
    return {
      familles: [...familles.keys()].sort((a, b) => (familles.get(a)! - familles.get(b)!) || a.localeCompare(b, 'fr')),
      zones: [...zones].sort((a, b) => a.localeCompare(b, 'fr')),
      pays: [...pays].sort((a, b) => a.localeCompare(b, 'fr')),
      traditions: [...traditions.entries()]
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'fr'))
        .map(([nom, n]) => ({ nom, n })),
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
    // ⛔ Le classement est ÉDITORIAL : il se lit dans la vue, il ne se calcule plus ici.
    if (!passeMode(e, mode)) return false
    if (!passeTraditions(e, f.traditions)) return false
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
  }), [evs, mode, f, q])

  // Le graphe et les fils, indexés une seule fois : 616 relations et 181 séries pour
  // 1 170 événements, et une carte n'a plus qu'à demander les siens.
  const liensParEvenement = useMemo(() => liensDesEvenements(relations), [relations])
  const placesParEvenement = useMemo(() => {
    const par = new Map<string, PlaceDansSerie[]>()
    for (const e of evs) {
      const places = placesDansSeries(series, e.id)
      if (places.length) par.set(e.id, places)
    }
    return par
  }, [evs, series])
  const titresParId = useMemo(() => new Map(evs.map(e => [e.id, e.titre])), [evs])

  // Une occurrence trouvée DANS une notice force l'ouverture de toutes les notices,
  // sinon le passage surligné resterait masqué (les notices sont repliées par défaut).
  const matchNotice = useMemo(
    () => !!q && visibles.some(e => sansAccents(e.notice ?? '').includes(q)),
    [q, visibles],
  )
  const notesOuvertes = toutesNotes || matchNotice

  const basculer = useCallback((cle: 'familles' | 'genres' | 'zones' | 'traditions', v: string) => {
    setF(prev => {
      const s = new Set(prev[cle])
      s.has(v) ? s.delete(v) : s.add(v)
      return { ...prev, [cle]: s }
    })
  }, [])

  const reinitialiser = () => setF(FILTRES_VIDES)

  // ── SUIVRE UN FIL — la série, la relation ────────────────────────────────
  //
  // ⛔ Un lien qui mène à un événement ÉCARTÉ par les filtres ne peut pas ne rien
  // faire : c'est le défaut qu'on corrige ici, non celui qu'on introduit. Quand la
  // cible est à l'écran, on y va ; sinon on rouvre la frise — le mode passe à « tout »,
  // les filtres tombent — puis on y va au rendu suivant.
  // ⚠️ La cible attend dans une RÉFÉRENCE : la liste n'est pas encore rendue au moment
  // du clic, et un défilement demandé trop tôt ne trouverait rien.
  const cibleFil = useRef<string | null>(null)
  const allerAEvenement = useCallback((id: string) => {
    const noeud = document.getElementById(id)
    if (noeud) { noeud.scrollIntoView({ block: 'center' }); return }
    cibleFil.current = id
    setMode('tout')
    setF(FILTRES_VIDES)
    setRecherche('')
  }, [])
  useEffect(() => {
    const id = cibleFil.current
    if (!id) return
    const noeud = document.getElementById(id)
    if (!noeud) return
    cibleFil.current = null
    noeud.scrollIntoView({ block: 'center' })
  }, [visibles])

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

      {/* ⛔ LE CLASSEMENT EST ÉDITORIAL. La « Densité » d'avant rabattait
          `importance_code` dans le navigateur : le jugement de ce qui est essentiel se
          prenait à l'affichage. La base porte un classement contrôlé, avec sa
          justification et son verrou, et c'est lui qu'on lit. Quatre crans : 411, 1 061,
          1 117 et 1 170 événements. */}
      <GroupeFiltre label="Lecture">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {MODES_LECTURE.map(m => (
            <button key={m.cle} onClick={() => setMode(m.cle)} aria-pressed={mode === m.cle}
              className="cs-option-volet"
              style={{
                display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
                border: 'none', borderRadius: '4px', padding: '2px 7px',
                fontFamily: 'inherit', fontSize: '0.71875rem', lineHeight: 1.3,
                background: mode === m.cle ? VERT : 'transparent',
                color: mode === m.cle ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)',
                fontWeight: mode === m.cle ? 600 : 400,
              }}>
              {m.label}
            </button>
          ))}
        </div>
      </GroupeFiltre>

      {rep.traditions.length > 1 && (
        <GroupeFiltre label="Tradition">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {rep.traditions.map(t => (
              <LigneCase key={t.nom} actif={f.traditions.has(t.nom)} onClick={() => basculer('traditions', t.nom)}>
                {t.nom}
              </LigneCase>
            ))}
          </div>
        </GroupeFiltre>
      )}

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
    <main style={{ background: FOND, minHeight: 'calc(100dvh - 3.5rem)' }}>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet des filtres. Sur mobile, un panneau repliable. ───────── */}
        <aside style={{
          flexShrink: 0, width: mobile ? '100%' : '15.5rem',
          position: mobile ? 'static' : 'sticky', top: '3.5rem',
          height: mobile ? 'auto' : 'calc(100dvh - 3.5rem)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--cs-fond-clair)',
          borderRight: mobile ? 'none' : `1px solid ${BORD}`,
          borderBottom: mobile ? `1px solid ${BORD}` : 'none',
        }}>
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '13px 15px 12px' }}>
          {/* ⛔ PLUS DE SUR-TITRE EN CAPITALES ESPACÉES (demande de l'auteur, 2026-09-04 :
              « pour l'ensemble des volets de gauche, reprendre le style et la méthode des
              volets de la page bible classique et œuvres patristiques »). Les volets de
              lecture n'en portent aucun : le titre ouvre le volet, et la barre de
              navigation dit déjà d'où l'on vient. Trois formes d'étiquette coexistaient
              ici — 0,5 rem à 0,14 em, 0,5 à 0,16, 0,53125 à 0,1 — là où les volets de
              lecture n'en ont qu'UNE, « RUBRIQUE_AXE », en casse ordinaire. */}
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: TITRE_VOLET, fontWeight: GRAISSE_TITRE_VOLET, color: ENCRE_TITRE, lineHeight: 1.15, letterSpacing: '0.01em' }}>Histoire de l’Église</h1>
          </div>

          {mobile ? (
            <>
              <button onClick={() => setPanneauOuvert(o => !o)} aria-expanded={panneauOuvert} aria-controls="frise-filtres"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 15px', border: 'none', borderBottom: panneauOuvert ? `1px solid ${SEP}` : 'none', background: 'transparent', cursor: 'pointer', fontFamily: SERIF, fontSize: '0.8125rem', color: '#5a5044' }}>
                <span>Filtres et lecture{filtresActifs ? ' (actifs)' : ''}</span>
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
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>

            {/* ⛔ NI COMPTE DE REPÈRES, NI FILET (demande de l'auteur, 2026-09-04 : « y'a un
                double filet en haut de page ; supprimer. Y'a le nombre de repères en haut
                de page : supprimer »). Le compte occupait une ligne pour un chiffre que
                personne ne vient chercher, et son filet DOUBLAIT celui que la première
                carte de la liste porte déjà en tête : deux traits à seize pixels l'un de
                l'autre, sur toute la mesure, avant le premier mot. */}
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
            ) : (
              <ListeFrise items={visibles} mobile={mobile} toutesNotes={notesOuvertes} recherche={recherche.trim()}
                liensParEvenement={liensParEvenement} placesParEvenement={placesParEvenement}
                titresParId={titresParId} allerAEvenement={allerAEvenement} />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

// ── Liste verticale : une carte par événement, sous le repère de sa PÉRIODE. ──
//
// ⛔ Le séparateur se pose au CHANGEMENT de période dans la liste rendue, jamais depuis
// des bornes de dates : la liste suit l'ordre éditorial de la vue (voir
// decouperEnPeriodes). Quinze bornes qui donnent au lecteur le sentiment d'où il est.
function ListeFrise({ items, mobile, toutesNotes, recherche, liensParEvenement, placesParEvenement, titresParId, allerAEvenement }: {
  items: RangFrise[]; mobile: boolean; toutesNotes: boolean; recherche: string
  liensParEvenement: Map<string, LienDEvenement[]>
  placesParEvenement: Map<string, PlaceDansSerie[]>
  titresParId: Map<string, string>
  allerAEvenement: (id: string) => void
}) {
  const tranches = decouperEnPeriodes(items)
  return (
    <>
      {tranches.map((t, i) => (
        <section key={`${t.code ?? 'sans'}-${i}`}>
          {t.nom && (
            /* ⚠️ Collant sous la BARRE, dont la hauteur se compose et ne se recopie
               jamais en pixels (charte, Responsive). Le repère porte le fond de la
               page : sans lui, les cartes défileraient au travers. */
            <h2 style={{
              position: 'sticky', top: HAUTEUR_NAVBAR, zIndex: 2, margin: 0,
              padding: '9px 0 5px', background: FOND,
              fontFamily: SANS, fontSize: '0.5625rem', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)',
            }}>
              {t.nom}
            </h2>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {t.items.map(e => (
              <CarteEvenement key={e.id} e={e} mobile={mobile} toutesNotes={toutesNotes} recherche={recherche}
                liens={liensParEvenement.get(e.id) ?? []}
                places={placesParEvenement.get(e.id) ?? []}
                titresParId={titresParId}
                allerAEvenement={allerAEvenement} />
            ))}
          </ul>
        </section>
      ))}
    </>
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
function CarteEvenement({ e, mobile, toutesNotes, recherche, liens, places, titresParId, allerAEvenement }: {
  e: RangFrise; mobile: boolean; toutesNotes: boolean; recherche: string
  liens: LienDEvenement[]
  places: PlaceDansSerie[]
  titresParId: Map<string, string>
  allerAEvenement: (id: string) => void
}) {
  const [detailOuvert, setDetailOuvert] = useState(false)
  const [noticeOuverte, setNoticeOuverte] = useState(false)
  const c = coulFamille(e.famille)
  const idCarte = `d-${e.id}`
  // ⚠️ Le dépli s'ouvre aussi pour un événement SANS notice qui tient dans une série ou
  // porte des relations : sinon son fil resterait derrière un titre qu'on ne peut pas
  // cliquer, et rien ne dirait qu'il existe.
  const aNotice = !!(
    (e.notice && e.notice.trim())
    || (e.date_precision_affichage && e.date_precision_affichage.trim())
    || (e.note_datation && e.note_datation.trim())
    || places.length > 0
    || liens.length > 0
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

      {/* ⛔ UNE NOTICE SE COMPOSE COMME TOUTES CELLES DU SITE (audit de densité,
          2026-09-05). Celle-ci était le seul texte justifié du site à l'être NU : ni
          césure, ni `inter-word`, ni espace resserrée. Justifié sans césure, rien ne
          borne l'étirement des espaces — mesuré ailleurs dans le dépôt jusqu'à 1,609 em,
          six fois le quart de cadratin —, et le gris se délave. La colonne fait ici
          quelque 460 px pour des notices de 221 signes en médiane, dont un quart passe
          280 et va jusqu'à 776 : ce sont des paragraphes, pas des libellés.
          ⚠️ L'interligne descend de 1,55 à 1,52, le rang des notices du site
          (`.trad-article`, `.auteur-prose`, `.trad-notice`). Il était au-dessus d'elles
          alors que ses textes sont plus courts. */}
      {afficheNotice && noticeCourte && (
        <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.52, margin: '4px 0 0', textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto', WebkitHyphens: 'auto', wordSpacing: '-0.025em', letterSpacing: 0 } as React.CSSProperties}>
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

      {/* ── LE FIL : la série, et où l'on s'y tient ─────────────────────────
          705 événements sur 1 170 appartiennent à une série, chacune avec son ORDRE
          éditorial et un RÔLE par membre — origine, étape, principal, prolongement,
          conclusion. C'est ce qui transforme une liste en récit, pour le moins de
          travail. ⚠️ L'ordre est celui de l'éditeur, non la date : une série fait
          remonter son origine avant son événement principal quelle que soit l'année. */}
      {afficheNotice && places.map(pl => (
        <div key={pl.code} style={{ marginTop: '6px' }}>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>
            {pl.titre} · {pl.rang} sur {pl.total}{pl.role ? ` · ${pl.role}` : ''}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: '2px' }}>
            {pl.precedentId && (
              <LienFil id={pl.precedentId} titre={titresParId.get(pl.precedentId)} sens="avant" aller={allerAEvenement} />
            )}
            {pl.suivantId && (
              <LienFil id={pl.suivantId} titre={titresParId.get(pl.suivantId)} sens="apres" aller={allerAEvenement} />
            )}
          </div>
        </div>
      ))}

      {/* ── AUTOUR : le graphe, en phrases ──────────────────────────────────
          618 relations entre événements, que le site rendait en liste plate.
          ⛔ Surtout PAS de visualisation en réseau : coûteuse, illisible au delà de
          trente nœuds, et elle ne dirait rien de plus que la phrase. */}
      {afficheNotice && liens.length > 0 && (
        <div style={{ marginTop: '6px' }}>
          <p style={{ margin: 0, fontFamily: SANS, fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>Autour</p>
          <ul style={{ listStyle: 'none', margin: '2px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {liens.map((l, i) => (
              <li key={`${l.autreId}-${i}`} style={{ fontFamily: SERIF, fontSize: '0.71875rem', lineHeight: 1.35, color: 'var(--cs-texte-second)' }}>
                <span style={{ color: 'var(--cs-texte-doux)' }}>{l.libelle}</span>{' '}
                <button onClick={() => allerAEvenement(l.autreId)}
                  title="Aller à cet événement dans la frise"
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', color: VERT, textAlign: 'left' }}>
                  {l.autreTitre}
                </button>
              </li>
            ))}
          </ul>
        </div>
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

/** Un pas dans le fil d'une série. ⚠️ Le titre de la cible vient de la frise, non d'une
 *  seconde liste : les 1 170 titres sont déjà là. Un membre que la frise ne porte pas —
 *  cas qui n'existe pas aujourd'hui, la série ne rassemblant que des événements publiés —
 *  ne rend rien plutôt qu'un lien muet. */
function LienFil({ id, titre, sens, aller }: { id: string; titre: string | undefined; sens: 'avant' | 'apres'; aller: (id: string) => void }) {
  if (!titre) return null
  return (
    <button onClick={() => aller(id)} title="Aller à cet événement dans la frise"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: SERIF, fontSize: '0.71875rem', lineHeight: 1.35, color: VERT, textAlign: 'left', maxWidth: '100%', display: 'inline-flex', alignItems: 'baseline', gap: '4px', minWidth: 0 }}>
      {sens === 'avant' && <span aria-hidden style={{ color: 'var(--cs-texte-doux)' }}>‹</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titre}</span>
      {sens === 'apres' && <span aria-hidden style={{ color: 'var(--cs-texte-doux)' }}>›</span>}
    </button>
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
      <div style={{ ...RUBRIQUE_AXE, marginBottom: '7px' }}>{label}</div>
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
