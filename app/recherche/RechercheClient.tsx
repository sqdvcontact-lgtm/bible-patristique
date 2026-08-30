'use client'
import { LIVRES } from '@/app/lib/bible'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { useSearchParams } from 'next/navigation'
import IconeChevron from '@/app/components/IconeChevron'
import { supabase } from '@/app/lib/supabase'
import { nettoyerFin } from '@/app/lib/ponctuation'
import { texteSansEnrichissement, rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { cesurerGrec, codeLangue, copierSansCesures } from '@/app/lib/grec'
import { siglesTraductions } from '@/app/lib/sigleTraduction'
import { codesTraductionsLecture } from '@/app/lib/traductions'

// ── Graphies & normalisation (hérités de la concordance) ─────────────────────
function normaliser(s: string): string {
  return (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[''ʼ]/g, "'")
}
function graphiesVariantes(base: string): string[] {
  const v = new Set([base])
  if (base.includes('j'))          v.add(base.replaceAll('j', 'i'))
  if (/^i[aeiouy]/.test(base))     v.add('j' + base.slice(1))
  if (base.includes('v'))          v.add(base.replaceAll('v', 'u'))
  if (base.includes('u'))          v.add(base.replaceAll('u', 'v'))
  return [...v].filter(s => s.length >= 2)
}

// (`refFr` et son `abrevFr` composaient la référence entière — « Ps 18, 2 » — sur chaque
// carte de résultat. Le nom du livre étant monté dans la rubrique de groupe, la ligne ne
// porte plus que « 18, 2 » et l'abréviation n'a plus d'emploi ici. `nombreFr`, lui, était
// mort depuis plus longtemps encore. Tous trois sont partis avec les cartes.)

// Noms des livres DÉRIVÉS de `LIVRES` (app/lib/bible.ts), comme le fait déjà `app/page.tsx`.
// Une table écrite à la main ici a dérivé : il y manquait les deutérocanoniques, et
// l'en-tête de la Polyglotte affichait le code brut (« SIR » au lieu de « Siracide »).
// Une seule source, donc : tout livre ajouté à LIVRES est nommé partout du même coup.
const NOMS_LIVRES: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

// Ordre canonique (Genèse → Apocalypse, puis apocryphes) DÉRIVÉ de `LIVRES` : l'index dans
// le tableau est le rang du livre. Sert à trier les résultats de recherche biblique.
const ORDRE_LIVRE: Record<string, number> = Object.fromEntries(LIVRES.map((l, i) => [l.code, i]))
function comparerVersets(a: VersetResult, b: VersetResult): number {
  return (ORDRE_LIVRE[a.livre] ?? 9999) - (ORDRE_LIVRE[b.livre] ?? 9999)
    || a.chapitre - b.chapitre || a.verset - b.verset
}

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001', label: 'Bible de Sacy', lang: 'fr' },
  { code: 'TR0002', label: 'Bible Segond', lang: 'fr' },
  { code: 'TR0003', label: 'Bible Crampon', lang: 'fr' },
  { code: 'TR0004', label: 'Vulgate', lang: 'la' },
]

type VersetResult = {
  id_verset: string; ref: string; livre: string; chapitre: number; verset: number
  [key: string]: any
}
type SegmentResult = {
  id: number; segment_texte: string; id_oeuvre: string; id_texte: string
  ref_niv1: string | null; ref_niv3: string | null
  auteur_nom: string; oeuvre_titre: string
  texte_original?: string | null; langue?: string; matchFr?: boolean; matchOrig?: boolean
}
type EssaiResult = {
  id: number; titre: string; sous_titre: string | null; resume: string | null; contenu: string; categories: string[]
}
type Mode = 'prefixe' | 'exact'
type Onglet = 'bible' | 'patristique' | 'essais' | 'polyglotte'

const PAGE = 20

// ── Recherche enregistrée ────────────────────────────────────────────────────
// Une seule recherche mémorisée à la fois (localStorage, donc valable aussi pour un
// visiteur non connecté). On y consigne tout ce qu'il faut pour retrouver l'écran à
// l'identique : le(s) mot(s), le mode, les traductions, l'onglet, la page et la position
// de défilement. Enregistrée à la demande, puis rafraîchie automatiquement de temps à autre.
const CLE_RECHERCHE_SAUVEE = 'cs-recherche-sauvee'
type RechercheSauvee = {
  query: string; mode: Mode
  tradScope: string; tradAffichage: string; colTrads: string[]
  onglet: Onglet
  pageV: number; pageS: number; pageE: number
  scrollTop: number
  ts: number
}

function termesRecherche(terme: string): string[] {
  return terme.trim().split(/\s+/).filter(Boolean)
}
function echapperRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function contientTerme(texte: string, terme: string, mode: Mode): boolean {
  const termes = termesRecherche(terme)
  if (!termes.length) return false
  const sep = '(^|[\\s\\u202f\\u00a0«»,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0«»,;:!?—.)\\]]|$)' : ''
  const texteN = normaliser(texte)
  try {
    return termes.every(t => {
      const tN = normaliser(t)
      return new RegExp(`${sep}${echapperRegex(tN)}${fin}`, 'i').test(texteN)
    })
  }
  catch { return false }
}
// Surligne les occurrences du terme dans UN run de texte plat. Renvoie toujours des nœuds
// CLÉS (préfixe `kb`) — pour pouvoir être imbriqué dans l'enrichissement sans collision de clé.
// On construit le regex sur le texte normalisé pour trouver les positions, puis on surligne
// les caractères originaux aux mêmes positions.
//
// ⛔ Le surlignage SORT du jeu des familles de corpus. Il portait --cs-vert-clair, c'est-à-dire
// la teinte de la Bible : dans un résultat patristique, il aurait désormais dit « Bible ».
// Il prend donc --cs-vise-fond, le jeton qui dit déjà « le verset que vous cherchiez », le
// même dans les quatre onglets. Mesuré 13,6 sur son fond.
//
// ⚠️ Le surlignage NE SE RESSERRE PAS quand tout le reste se resserre : c'est le seul objet
// de la page qu'on cherche des yeux, et le comprimer le rendrait plus difficile à trouver.
//
// (Une variante ROUGE a existé, pour le verset dont la traduction affichée ne porte pas le
// mot. Plus rien ne l'appelait depuis que la ligne d'en-tête dit où le mot se trouve ; c'est
// maintenant le sigle barré et le fond d'absence qui le disent.)
function surligneParts(texte: string, terme: string, mode: Mode, kb: string): React.ReactNode[] {
  const termes = termesRecherche(terme)
  if (!texte || !termes.length) return [texte]
  const sep = '(^|[\\s\\u202f\\u00a0«»,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0«»,;:!?—.)\\]]|$)' : ''
  const style = { background: 'var(--cs-vise-fond)', color: 'var(--cs-texte-fort)', fontWeight: 700, borderRadius: '4px', padding: '0 2px' }
  try {
    const termesN = termes.map(normaliser).sort((a, b) => b.length - a.length)
    const alt = termesN.map(echapperRegex).join('|')
    const re = new RegExp(`${sep}(${alt})${fin}`, 'gi')
    const texteN = normaliser(texte)
    const parts: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null
    while ((m = re.exec(texteN)) !== null) {
      const s = m.index + m[1].length
      const e = s + m[2].length
      if (s > last) parts.push(<Fragment key={`${kb}t${last}`}>{texte.slice(last, s)}</Fragment>)
      parts.push(<mark key={`${kb}m${s}`} style={style}>{texte.slice(s, e)}</mark>)
      last = e
    }
    if (last < texte.length) parts.push(<Fragment key={`${kb}t${last}`}>{texte.slice(last)}</Fragment>)
    return parts.length ? parts : [texte]
  } catch { return [texte] }
}

function highlighter(texte: string, terme: string, mode: Mode): React.ReactNode {
  if (!texte || !terme) return texte
  const parts = surligneParts(texte, terme, mode, 'h')
  return parts.length > 1 ? <>{parts}</> : texte
}

// Enrichissement (gras, italique, `<i>` de Sacy…) ET surlignage du mot cherché, ensemble :
// on passe le surligneur en `transform` de rendreTexteEnrichi. Sans cela, la recherche
// affichait soit les balises en clair (onglet Bible), soit un texte appauvri (Polyglotte).
function rendreEtSurligner(texte: string, terme: string, mode: Mode): React.ReactNode {
  if (!texte) return texte
  return rendreTexteEnrichi(texte, (s, key) => surligneParts(s, terme, mode, key))
}

// ── Les trois FAMILLES DE CORPUS ────────────────────────────────────────────
// Quatre onglets, trois corpus : la Polyglotte est une autre VUE sur les mêmes versets
// que la Bible, et partage donc sa teinte. Les valeurs vivent dans `app/globals.css`
// (§ familles de corpus) et se transposent seules au Cuir ; ici on ne nomme que le rôle.
//
// Le fond lavé d'un groupe et son filet ne sont PAS des jetons : ils se dérivent de
// l'encre par `color-mix`, en CSS, à partir de la variable `--fam` posée sur le groupe.
// Une famille se dit donc en un seul endroit, et tout le reste suit.
const FAMILLES: Record<Onglet, { encre: string; aplat: string }> = {
  bible:       { encre: 'var(--cs-ecriture)',   aplat: 'var(--cs-ecriture-aplat)' },
  polyglotte:  { encre: 'var(--cs-ecriture)',   aplat: 'var(--cs-ecriture-aplat)' },
  patristique: { encre: 'var(--cs-peres)',      aplat: 'var(--cs-peres-aplat)' },
  essais:      { encre: 'var(--cs-communaute)', aplat: 'var(--cs-communaute-aplat)' },
}

/** Le style qui pose une famille sur un groupe ; tout le CSS du groupe en dérive. */
function styleFamille(onglet: Onglet): React.CSSProperties {
  const f = FAMILLES[onglet]
  return { '--fam': f.encre, '--fam-aplat': f.aplat } as React.CSSProperties
}

// Regroupe une liste DÉJÀ TRIÉE en tranches consécutives de même clé. Consécutives, et
// non par table de hachage : les listes arrivent dans l'ordre canonique (Genèse →
// Apocalypse) ou alphabétique d'auteur, et cet ordre est précisément ce qu'on montre.
// Un regroupement par clé le casserait en ramenant ensemble des tranches éloignées.
function grouperConsecutifs<T>(liste: T[], cle: (x: T) => string): { cle: string; items: T[] }[] {
  const tranches: { cle: string; items: T[] }[] = []
  for (const item of liste) {
    const k = cle(item)
    const derniere = tranches[tranches.length - 1]
    if (derniere && derniere.cle === k) derniere.items.push(item)
    else tranches.push({ cle: k, items: [item] })
  }
  return tranches
}

// PostgREST plafonne CHAQUE réponse à 1000 lignes (réglage max-rows), quel que soit le
// `.limit()` demandé : c'est ce plafond qui bornait la recherche à mille résultats. Pour
// le dépasser, on pagine par `.range()` jusqu'à un plafond de sécurité.
async function pagine<T = any>(make: (de: number, a: number) => any, signal: AbortSignal, cap = 6000): Promise<T[]> {
  const out: T[] = []
  for (let de = 0; de < cap; de += 1000) {
    const { data, error } = await make(de, de + 999).abortSignal(signal)
    if (error || signal.aborted) break
    const lot = (data ?? []) as T[]
    out.push(...lot)
    if (lot.length < 1000) break
  }
  return out
}

// Nombre d'occurrences du terme (mot entier / début de mot) dans un texte — sert au
// décompte par livre/œuvre/publication affiché dans le volet gauche.
function compterOccurrences(texte: string, terme: string, mode: Mode): number {
  const termes = termesRecherche(terme)
  if (!texte || !termes.length) return 0
  const sep = '(^|[\\s\\u202f\\u00a0«»,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0«»,;:!?—.)\\]]|$)' : ''
  try {
    const termesN = termes.map(normaliser).sort((a, b) => b.length - a.length)
    const alt = termesN.map(echapperRegex).join('|')
    const re = new RegExp(`${sep}(${alt})${fin}`, 'gi')
    const texteN = normaliser(texte)
    let c = 0; while (re.exec(texteN) !== null) c++
    return c
  } catch { return 0 }
}

// Date courte d'un enregistrement, compacte pour tenir à droite du bouton (« 27 juil. 14:32 »).
function formatDateCourt(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function snippetEssai(texte: string, terme: string, max = 220): string {
  const termes = termesRecherche(terme)
  let idx = -1
  for (const t of termes) {
    const i = normaliser(texte).indexOf(normaliser(t))
    if (i >= 0 && (idx < 0 || i < idx)) idx = i
  }
  if (idx < 0) return texte.length > max ? texte.slice(0, max) + '…' : texte
  const debut = Math.max(0, idx - 60)
  const fin = Math.min(texte.length, debut + max)
  return (debut > 0 ? '…' : '') + texte.slice(debut, fin) + (fin < texte.length ? '…' : '')
}

export default function RechercheClient() {
  // ≤ 900px : le formulaire et les résultats s'empilent (le côte-à-côte
  // écraserait les deux). Voir AGENTS § Responsive mobile.
  const mobile = useEstMobile(900)
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'exact' ? 'exact' : 'prefixe')

  // Par défaut : on cherche dans TOUTES les bibles (scope ALL) et l'on affiche dans la
  // traduction préférée (ou Sacy à défaut). La préférence ne pilote donc que l'affichage,
  // jamais le périmètre de recherche.
  const [tradScope, setTradScope] = useState<string>('ALL')
  const [tradAffichage, setTradAffichage] = useState<string>('TR0001')
  // L'affichage suit TOUJOURS « Afficher en » (tradAffichage), indépendamment du périmètre
  // de recherche : le sélecteur « Afficher en » reste ainsi présent et actif en permanence,
  // même quand on restreint la recherche à une seule bible.
  const tradBible = tradAffichage

  // Polyglotte de recherche : TROIS colonnes au maximum (au modèle de la page Polyglotte).
  const [colTrads, setColTrads] = useState<string[]>(['TR0001','TR0002','TR0003'])
  const [traductions, setTraductions] = useState(TRADUCTIONS_FALLBACK)
  const [versetsRes, setVersetsRes] = useState<VersetResult[]>([])
  const [segmentsRes, setSegmentsRes] = useState<SegmentResult[]>([])
  const [essaisRes, setEssaisRes] = useState<EssaiResult[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [lastQuery, setLastQuery] = useState('')
  const [lastScope, setLastScope] = useState<string>('TR0001')
  const [onglet, setOnglet] = useState<Onglet>('bible')
  const [pageV, setPageV] = useState(0)
  const [pageS, setPageS] = useState(0)
  const [pageE, setPageE] = useState(0)
  const [hoveredVerset, setHoveredVerset] = useState<string | null>(null)
  // Signature du dernier `searchParams` traité (q|mode). L'effet ci-dessous ne réagit
  // QU'À un vrai changement d'URL : sans ce garde, un simple re-rendu (survol, chargement
  // des traductions, suggestions…) rejouait l'effet, et sa branche « pas de q » effaçait
  // les résultats d'une recherche lancée au clavier — laquelle ne met rien dans l'URL.
  const paramsSigRef = useRef<string | null>(null)
  const [sugg, setSugg]         = useState<{ mot: string; freq: number }[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [tronque, setTronque]   = useState<string[]>([])
  const inputRef   = useRef<HTMLInputElement>(null)
  const suggTimer  = useRef<ReturnType<typeof setTimeout>>(undefined)
  const suggRef    = useRef<HTMLUListElement>(null)
  // Recherche enregistrée : présence d'une sauvegarde (pour révéler « Reprendre »), zone
  // de défilement des résultats (pour restituer la position), et petit accusé « enregistré ».
  const [rechercheSauvee, setRechercheSauvee] = useState<RechercheSauvee | null>(null)
  const [vientDEnregistrer, setVientDEnregistrer] = useState(false)
  // Confirmation d'écrasement : ouverte quand on clique « Enregistrer » alors qu'une autre
  // recherche est déjà mémorisée (mot différent). L'enregistrement n'a lieu qu'après un « oui ».
  const [confirmEcrasement, setConfirmEcrasement] = useState(false)
  // Filtres du volet gauche : restreindre les résultats à un livre / une œuvre / une
  // publication. `null` = pas de filtre. Un second clic sur la même ligne l'annule.
  const [filtres, setFiltres] = useState<{ livre: string | null; oeuvre: string | null; essai: number | null }>({ livre: null, oeuvre: null, essai: null })
  const zoneResultatsRef = useRef<HTMLDivElement>(null)
  // Miroir de l'état courant, lu par l'enregistrement automatique (dont l'intervalle,
  // fermé sur un vieux rendu, ne verrait sinon que des valeurs périmées).
  const etatRef = useRef<Omit<RechercheSauvee, 'scrollTop' | 'ts'> | null>(null)

  useEffect(() => {
    // La préférence de l'utilisateur règle À LA FOIS l'affichage ET le périmètre par défaut :
    // « Chercher dans » vaut par défaut la bible favorite (et non plus « toutes les bibles »).
    const appliquer = (code?: string | null) => {
      if (code && /^TR\d{4}$/.test(code)) { setTradAffichage(code); setTradScope(code) }
    }
    appliquer(localStorage.getItem('traduction_defaut'))
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { data: profil } = await supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle()
      if (profil?.traduction_defaut) { localStorage.setItem('traduction_defaut', profil.traduction_defaut); appliquer(profil.traduction_defaut) }
    })
    // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx.
    //
    // ⛔ ET LE FILTRE PAR COLONNES RÉELLES, qui manquait ici — c'est le piège que la
    // charte nomme « traductions lisibles vs colonnes de versets_lecture ». La liste
    // servait telle quelle à composer `selVersets`, lequel nomme une colonne par
    // traduction. Or `est_biblique` rend NEUF lignes et la vue n'a que CINQ colonnes :
    // TR0009 (entrée le 3 août 2026), TR0010, TR0011 et TR0012 sont des segmentations
    // éditoriales, dont le texte se recompose ailleurs. PostgREST refusait donc la
    // requête ENTIÈRE — « column versets_lecture.TR0009 does not exist », 400, `data`
    // nul — et les onglets Bible et Polyglotte ne rendaient plus RIEN, en silence,
    // depuis cette date. Le même défaut avait déjà vidé l'apparat biblique de toutes
    // les œuvres ; `codesTraductionsLecture` est le remède, il n'était pas appelé ici.
    //
    // ⚠️ Le filtre se corrige tout seul : le jour où une de ces bibles est matérialisée
    // dans la vue, elle reparaît dans les menus sans qu'on touche à ce fichier.
    void (async () => {
      const { data } = await supabase
        .from('traductions').select('trad_id, nom, langue')
        .eq('est_biblique', true).order('ordre', { ascending: true })
      if (!data?.length) return
      const lisibles = new Set(await codesTraductionsLecture(supabase))
      const trads = (data as { trad_id: string; nom: string; langue: string }[])
        .filter(t => lisibles.has(t.trad_id))
        .map(t => ({ code: t.trad_id, label: t.nom, lang: codeLangue(t.langue) }))
      if (!trads.length) return
      setTraductions(trads)
      setColTrads(trads.slice(0, 3).map(t => t.code))
    })()
  }, [])

  // Fermer suggestions au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!suggRef.current?.contains(e.target as Node) && e.target !== inputRef.current) setShowSugg(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const suggAbortRef = useRef<AbortController | null>(null)

  // Autocomplétion (même RPC que la concordance)
  useEffect(() => {
    const val = normaliser(query)
    if (val.length < 2) { setSugg([]); setShowSugg(false); return }
    clearTimeout(suggTimer.current)
    suggTimer.current = setTimeout(async () => {
      suggAbortRef.current?.abort()
      suggAbortRef.current = new AbortController()
      const signal = suggAbortRef.current.signal
      try {
        // Auteurs et œuvres : PRÉFIXE DE MOT, non sous-chaîne. « am » doit ramener
        // « Ambroise », jamais « Ratramme de Corbie » (am au milieu). Un mot commence en
        // tête de champ, après une espace ou une apostrophe. (Les mots de la Bible passent
        // déjà par une RPC préfixe.)
        const valOr = val.replace(/,/g, ' ').trim()
        const prefixeOr = (col: string) => [`${col}.ilike.${valOr}%`, `${col}.ilike.% ${valOr}%`, `${col}.ilike.%'${valOr}%`, `${col}.ilike.%’${valOr}%`].join(',')
        const [{ data: dataBible }, { data: dataAuteurs }, { data: dataOeuvres }] = await Promise.all([
          supabase.rpc('suggestions_concordance_fr', { p_prefixe: val, p_limit: 8 }).abortSignal(signal),
          supabase.from('auteurs').select('nom').or(prefixeOr('nom')).limit(3).abortSignal(signal),
          supabase.from('oeuvres').select('titre').or(prefixeOr('titre')).limit(3).abortSignal(signal),
        ])
        if (signal.aborted) return
        const suggsBible: { mot: string; freq: number }[] = dataBible ?? []
        const seen = new Set(suggsBible.map(s => s.mot.toLowerCase()))
        const suggsExtra: { mot: string; freq: number }[] = [
          ...((dataAuteurs ?? []) as { nom: string }[]).map(a => ({ mot: a.nom, freq: 0 })),
          ...((dataOeuvres ?? []) as { titre: string }[]).map(o => ({ mot: o.titre, freq: 0 })),
        ].filter(s => { const k = s.mot.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
        const merged = [...suggsBible, ...suggsExtra].slice(0, 10)
        if (merged.length) { setSugg(merged); setShowSugg(true) } else { setSugg([]); setShowSugg(false) }
      } catch (err: any) {
        if (err?.name !== 'AbortError') { setSugg([]); setShowSugg(false) }
      }
    }, 180)
    return () => { clearTimeout(suggTimer.current); suggAbortRef.current?.abort() }
  }, [query])

  const lancerAbortRef = useRef<AbortController | null>(null)

  const lancer = async (queryForce?: string, modeForce?: Mode, scopeForce?: string) => {
    const q = (queryForce ?? query).trim()
    const modeActif = modeForce ?? mode
    const scopeActif = scopeForce ?? tradScope
    if (!q) return

    lancerAbortRef.current?.abort()
    lancerAbortRef.current = new AbortController()
    const signal = lancerAbortRef.current.signal

    setLoading(true); setDone(false); setTronque([])
    setVersetsRes([]); setSegmentsRes([]); setEssaisRes([])
    setPageV(0); setPageS(0); setPageE(0)
    setFiltres({ livre: null, oeuvre: null, essai: null })

    try {
      const termes = termesRecherche(q)
      const fragments = modeActif === 'prefixe' && termes.length > 1
      const chercheTout = scopeActif === 'ALL'
      const termeNorm = normaliser(q)
      const vars = (!fragments && termeNorm.length >= 2) ? graphiesVariantes(termeNorm) : null

      const tradCodes = traductions.map(t => t.code)
      // On récupère aussi les num_TRxxxx : les références d'ORIGINE de chaque édition,
      // affichées en lettrine dans l'onglet Polyglotte, comme sur la page Polyglotte.
      const selVersets = `id_verset, ref, livre, chapitre, verset, ${tradCodes.join(', ')}, ${tradCodes.map(c => 'num_' + c).join(', ')}`

      // Essais — construit sans await, part immédiatement en parallèle
      const reqE = (() => {
        let r = supabase.from('essais').select('id, titre, sous_titre, resume, contenu, categories').eq('statut', 'publie')
        if (fragments) {
          for (const t of termes) r = r.or(`titre.ilike.%${t}%,sous_titre.ilike.%${t}%,resume.ilike.%${t}%,contenu.ilike.%${t}%`)
          r = r.limit(500)
        } else {
          r = r.or(`titre.ilike.%${q}%,sous_titre.ilike.%${q}%,resume.ilike.%${q}%,contenu.ilike.%${q}%`).limit(200)
        }
        return r.abortSignal(signal)
      })()

      // Versets, segments et essais lancés en parallèle. Versets et segments sont
      // PAGINÉS (voir `pagine`) pour dépasser le plafond de 1000 de PostgREST.
      const [segsFromRpc, versetsArr, resE] = await Promise.all([

        // ── Segments ──────────────────────────────────────────────────────────
        (async (): Promise<any[]> => {
          const { data: textesDefaut } = await supabase.from('oeuvre_textes').select('id_texte').eq('is_default', true)
          const idsTextesDefaut = (textesDefaut ?? []).map((row: any) => row.id_texte)
          // 1) Matches dans le TEXTE FRANÇAIS (segment_texte).
          const frRows: any[] = await (async () => {
            if (fragments) {
              return pagine((de, a) => {
                let r = supabase.from('segments').select('id, segment_texte, id_oeuvre, id_texte, ref_niv1, ref_niv3').in('id_texte', idsTextesDefaut) as any
                for (const t of termes) r = r.ilike('segment_texte', `%${t}%`)
                return r.range(de, a)
              }, signal)
            } else if (vars && vars.length > 1) {
              const seenSeg = new Set<number>(); const acc: any[] = []
              for (const v of vars) {
                const rows = await pagine((de, a) => supabase.rpc('recherche_segments', { p_terme: v, p_exact: modeActif === 'exact', p_id_texte: null }).range(de, a), signal)
                for (const row of rows) if (!seenSeg.has(row.id)) { seenSeg.add(row.id); acc.push(row) }
              }
              return acc
            } else {
              return pagine((de, a) => supabase.rpc('recherche_segments', { p_terme: q, p_exact: modeActif === 'exact', p_id_texte: null }).range(de, a), signal)
            }
          })()

          // 2) Matches dans le TEXTE ORIGINAL (latin/grec). Même barre : la requête interroge
          //    aussi l'original. Un mot grec ne matche que l'original ; un mot commun au latin
          //    et au français fait remonter les deux, fusionnés par segment.
          const origRows: any[] = await (async () => {
            if (fragments) {
              return pagine((de, a) => {
                let r = supabase.from('segments').select('id, segment_texte, texte_original, id_oeuvre, id_texte, ref_niv1, ref_niv3').in('id_texte', idsTextesDefaut) as any
                for (const t of termes) r = r.ilike('texte_original', `%${t}%`)
                return r.range(de, a)
              }, signal)
            }
            const cands = vars && vars.length ? vars : [q]
            const seen = new Set<number>(); const acc: any[] = []
            for (const v of cands) {
              const rows = await pagine((de, a) => supabase.rpc('recherche_segments_original', { p_terme: v, p_exact: modeActif === 'exact', p_id_texte: null }).range(de, a), signal)
              for (const row of rows) if (!seen.has(row.id)) { seen.add(row.id); acc.push(row) }
            }
            return acc
          })()

          // 3) Fusion par id : un segment peut matcher côté français, côté original, ou les deux.
          const byId = new Map<number, any>()
          for (const r of frRows) byId.set(r.id, { ...r, matchFr: true })
          for (const r of origRows) {
            const e = byId.get(r.id)
            if (e) { e.texte_original = r.texte_original ?? e.texte_original; e.matchOrig = true }
            else byId.set(r.id, { ...r, matchOrig: true })
          }
          return [...byId.values()]
        })(),

        // ── Versets ───────────────────────────────────────────────────────────
        // L'ancien chemin passait par `concordance_versets` — relique du modèle d'avant
        // la bascule du 20/07 (30 lignes, identifiants périmés `B001714`) : elle renvoyait
        // 0, d'où « aucun mot n'était trouvé ». Un mot seul passe désormais par la fonction
        // `recherche_versets`, qui compare via `unaccent` — on trouve donc « vérité » même
        // en tapant « verite ». Le filtre client affine ensuite en mot entier / début de mot.
        (async (): Promise<any[]> => {
          if (!fragments) {
            return pagine((de, a) => supabase.rpc('recherche_versets', { p_terme: q, p_scope: chercheTout ? 'ALL' : scopeActif }).range(de, a), signal)
          }
          // Fragments (plusieurs mots, mode début de mot) : requête directe, chaque mot
          // requis. Accent-sensible ici — cas plus rare, la recherche d'un mot prime.
          const cols = chercheTout ? tradCodes : [scopeActif]
          return pagine((de, a) => {
            let r = supabase.from('versets_lecture').select(selVersets)
            for (const t of termes) r = r.or(cols.map(c => `${c}.ilike.%${t}%`).join(','))
            return r.range(de, a)
          }, signal)
        })(),

        // ── Essais ────────────────────────────────────────────────────────────
        reqE,
      ])

      if (signal.aborted) return

      // Détection troncature — seuils alignés sur le plafond de pagination (6000)
      const limiteE = fragments ? 500 : 200
      const avertissements: string[] = []
      if (versetsArr.length >= 6000) avertissements.push('Bible')
      if (segsFromRpc.length >= 6000) avertissements.push('Pères de l’Église')
      if ((resE.data?.length ?? 0) >= limiteE) avertissements.push('Publications')
      if (avertissements.length) setTronque(avertissements)

      // Filtre client versets : mot entier ou début de mot, INSENSIBLE AUX ACCENTS
      // (contientTerme normalise les deux côtés). Colonnes : toutes les bibles si ALL,
      // sinon la seule choisie. Ce filtre resserre le résultat de recherche_versets
      // (qui, lui, fait une simple sous-chaîne) sur la frontière de mot voulue.
      const versetsRaw = versetsArr as unknown as VersetResult[]
      const colsFiltre = chercheTout ? tradCodes : [scopeActif]
      const versets = versetsRaw.filter(v => colsFiltre.some(c => contientTerme(String(v[c] ?? ''), q, modeActif)))
      setVersetsRes(versets)

      // Essais
      const essais = (resE.data ?? []) as EssaiResult[]
      setEssaisRes(fragments ? essais.filter(e => contientTerme([e.titre, e.sous_titre, e.resume, e.contenu].filter(Boolean).join(' '), q, modeActif)) : essais)

      // Segments + oeuvres. On resserre TOUJOURS sur la frontière de mot (comme les
      // versets) : la RPC fait une simple sous-chaîne, donc « am » remonterait « Ratramme ».
      // En début-de-mot/exact single-word, on teste chaque graphie variante (i/j, u/v) pour
      // ne pas perdre les appariements orthographiques anciens.
      const candidatsSeg = fragments ? [q] : (vars && vars.length ? vars : [q])
      const segs = (segsFromRpc as any[]).filter((s: any) =>
        (s.matchFr && candidatsSeg.some(mv => contientTerme(s.segment_texte ?? '', mv, modeActif)))
        || (s.matchOrig && candidatsSeg.some(mv => contientTerme(s.texte_original ?? '', mv, modeActif))))
      const oeuvreIds = [...new Set(segs.map((s: any) => s.id_oeuvre))]
      const oeuvreMap: Record<string, { titre: string; auteur: string; langue: string }> = {}
      if (oeuvreIds.length) {
        const { data: oeuvres } = await supabase.from('oeuvres').select('id_oeuvre, titre, note, langue_originale, auteurs!oeuvres_id_auteur_fkey(nom)')
          .in('id_oeuvre', oeuvreIds).limit(oeuvreIds.length).abortSignal(signal)
        if (signal.aborted) return
        ;((oeuvres ?? []) as any[]).filter(estOeuvrePubliee).forEach((o: any) => { oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: o.auteurs?.nom || '', langue: o.langue_originale || '' } })
      }
      const segsPublies = segs.filter((s: any) => oeuvreMap[s.id_oeuvre])
      setSegmentsRes(segsPublies.map((s: any) => ({ ...s, auteur_nom: oeuvreMap[s.id_oeuvre]?.auteur || '', oeuvre_titre: oeuvreMap[s.id_oeuvre]?.titre || '', langue: oeuvreMap[s.id_oeuvre]?.langue || '' })))

      setLastQuery(q); setLastScope(scopeActif)
      setLoading(false); setDone(true)

      const counts = { bible: versets.length, patristique: segsPublies.length, essais: essais.length }
      setOnglet(prev => {
        if (prev === 'polyglotte') return 'polyglotte'
        if (Object.values(counts).every(c => c === 0)) return prev
        const actuel = counts[prev as keyof typeof counts] ?? 0
        if (actuel > 0) return prev
        if (counts.patristique >= counts.bible && counts.patristique >= counts.essais) return 'patristique'
        if (counts.bible >= counts.essais) return 'bible'
        return 'essais'
      })
    } catch (err: any) {
      if (err?.name === 'AbortError' || signal.aborted) return
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    const modeParam: Mode = searchParams.get('mode') === 'exact' ? 'exact' : 'prefixe'
    // On n'agit que si l'URL a RÉELLEMENT changé depuis la dernière fois. Un re-rendu qui
    // rejoue l'effet sans changement d'URL ne touche donc à rien : c'est ce qui protège
    // une recherche lancée au clavier (sans `q` dans l'URL) contre l'effacement.
    const sig = `${q ?? ''}|${modeParam}`
    if (paramsSigRef.current === sig) return
    paramsSigRef.current = sig
    // Arrivée sur « /recherche » SANS terme (« Nouvelle recherche ») : page vierge, on
    // repart de zéro plutôt que de garder les résultats précédents à l'écran.
    if (!q) {
      lancerAbortRef.current?.abort()
      setQuery(''); setDone(false); setLoading(false); setTronque([])
      setVersetsRes([]); setSegmentsRes([]); setEssaisRes([])
      setPageV(0); setPageS(0); setPageE(0)
      return
    }
    setQuery(q); setMode(modeParam)
    void lancer(q, modeParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Recherche enregistrée ───────────────────────────────────────────────────
  // Miroir de l'état courant (mis à jour à chaque rendu, pas dans un effet).
  etatRef.current = { query: lastQuery, mode, tradScope, tradAffichage, colTrads, onglet, pageV, pageS, pageE }

  // Au montage : présence d'une recherche enregistrée → le bouton « Reprendre » paraît.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE_RECHERCHE_SAUVEE)
      if (brut) { const s = JSON.parse(brut) as RechercheSauvee; if (s?.query) setRechercheSauvee(s) }
    } catch { /* stockage indisponible */ }
  }, [])

  // Écrit réellement la sauvegarde (écrase la précédente s'il y en avait une).
  const ecrireRecherche = () => {
    if (!lastQuery) return
    const snap: RechercheSauvee = {
      query: lastQuery, mode, tradScope, tradAffichage, colTrads: [...colTrads],
      onglet, pageV, pageS, pageE,
      scrollTop: zoneResultatsRef.current?.scrollTop ?? 0, ts: Date.now(),
    }
    try { localStorage.setItem(CLE_RECHERCHE_SAUVEE, JSON.stringify(snap)) } catch { /* ignore */ }
    setRechercheSauvee(snap)
    setVientDEnregistrer(true)
    setTimeout(() => setVientDEnregistrer(false), 2000)
  }

  // Clic sur « Enregistrer » : si une AUTRE recherche est déjà mémorisée (mot différent),
  // on demande confirmation dans une fenêtre avant d'écraser ; sinon on enregistre direct.
  const enregistrerRecherche = () => {
    if (!lastQuery) return
    if (rechercheSauvee && rechercheSauvee.query !== lastQuery) { setConfirmEcrasement(true); return }
    ecrireRecherche()
  }

  // Enregistrement automatique : tant qu'une recherche est mémorisée ET que celle affichée
  // est la même, on rafraîchit page + position sans rien écraser d'autre.
  useEffect(() => {
    if (!rechercheSauvee) return
    const id = window.setInterval(() => {
      const e = etatRef.current
      if (!e?.query || e.query !== rechercheSauvee.query) return
      const snap: RechercheSauvee = { ...e, colTrads: [...e.colTrads], scrollTop: zoneResultatsRef.current?.scrollTop ?? 0, ts: Date.now() }
      try { localStorage.setItem(CLE_RECHERCHE_SAUVEE, JSON.stringify(snap)) } catch { /* ignore */ }
    }, 6000)
    return () => window.clearInterval(id)
  }, [rechercheSauvee])

  const reprendreRecherche = async () => {
    let snap: RechercheSauvee | null = rechercheSauvee
    try { const brut = localStorage.getItem(CLE_RECHERCHE_SAUVEE); if (brut) snap = JSON.parse(brut) } catch { /* ignore */ }
    if (!snap?.query) return
    setMode(snap.mode)
    setTradScope(snap.tradScope)
    setTradAffichage(snap.tradAffichage)
    if (snap.colTrads?.length) setColTrads(snap.colTrads)
    setQuery(snap.query)
    await lancer(snap.query, snap.mode, snap.tradScope)
    // `lancer` a remis les pages à zéro et choisi un onglet au jugé : on rétablit l'état
    // exact qui avait été enregistré, puis la position de défilement une fois le DOM peint.
    setOnglet(snap.onglet)
    setPageV(snap.pageV); setPageS(snap.pageS); setPageE(snap.pageE)
    const cible = snap.scrollTop
    setTimeout(() => { if (zoneResultatsRef.current) zoneResultatsRef.current.scrollTop = cible }, 120)
  }

  // Résultats bibliques TRIÉS dans l'ordre canonique (Genèse → Apocalypse, puis chapitre,
  // puis verset), pour l'onglet Bible ET l'onglet Polyglotte. L'ancien tri « mot absent de
  // la traduction affichée → en bas » est abandonné au profit de l'ordre biblique demandé.
  const versetsTries = useMemo(() => [...versetsRes].sort(comparerVersets), [versetsRes])

  // Le SIGLE de chaque bible, calculé une fois sur la liste ENTIÈRE : c'est à cette
  // condition seulement que deux bibles ne peuvent pas recevoir le même (voir
  // `app/lib/sigleTraduction.ts`). Le nom entier reste porté en `title` sur chaque sigle.
  const siglesParCode = useMemo(() => {
    const sigles = siglesTraductions(traductions.map(t => t.label))
    return Object.fromEntries(traductions.map((t, i) => [t.code, sigles[i]])) as Record<string, string>
  }, [traductions])

  // Résultats patristiques TRIÉS par nom d'auteur (alphabétique), puis œuvre, puis segment.
  const segmentsTries = useMemo(() => [...segmentsRes].sort((a, b) =>
    a.auteur_nom.localeCompare(b.auteur_nom, 'fr') ||
    a.oeuvre_titre.localeCompare(b.oeuvre_titre, 'fr') ||
    a.id - b.id), [segmentsRes])

  // ── Répartitions pour le volet gauche (nombre d'occurrences par regroupement) ──
  // Bible / Polyglotte : par livre, dans l'ordre canonique.
  const repartitionLivres = useMemo(() => {
    const m = new Map<string, number>()
    for (const v of versetsRes) m.set(v.livre, (m.get(v.livre) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => (ORDRE_LIVRE[a[0]] ?? 9999) - (ORDRE_LIVRE[b[0]] ?? 9999))
  }, [versetsRes])
  // Pères de l'Église : par œuvre (auteur + titre), triée par auteur.
  const repartitionOeuvres = useMemo(() => {
    const m = new Map<string, { auteur: string; titre: string; n: number }>()
    for (const s of segmentsRes) {
      const k = s.auteur_nom + '¦' + s.oeuvre_titre
      const e = m.get(k) ?? { auteur: s.auteur_nom, titre: s.oeuvre_titre, n: 0 }
      e.n++; m.set(k, e)
    }
    return [...m.values()].sort((a, b) =>
      a.auteur.localeCompare(b.auteur, 'fr') || a.titre.localeCompare(b.titre, 'fr'))
  }, [segmentsRes])
  // Publications de la communauté : par publication, occurrences décroissantes.
  const repartitionEssais = useMemo(() =>
    essaisRes.map(e => ({
      id: e.id, titre: e.titre,
      n: compterOccurrences([e.titre, e.sous_titre, e.resume, e.contenu].filter(Boolean).join(' '), lastQuery, mode) || 1,
    })).sort((a, b) => b.n - a.n), [essaisRes, lastQuery, mode])

  // Listes FILTRÉES par le volet gauche (livre / œuvre / publication). Sans filtre,
  // ce sont les listes triées complètes.
  const versetsFiltres = useMemo(() => filtres.livre ? versetsTries.filter(v => v.livre === filtres.livre) : versetsTries, [versetsTries, filtres.livre])
  const segmentsFiltres = useMemo(() => filtres.oeuvre ? segmentsTries.filter(s => (s.auteur_nom + '¦' + s.oeuvre_titre) === filtres.oeuvre) : segmentsTries, [segmentsTries, filtres.oeuvre])
  const essaisFiltres = useMemo(() => filtres.essai != null ? essaisRes.filter(e => e.id === filtres.essai) : essaisRes, [essaisRes, filtres.essai])

  const versetsPage      = versetsFiltres.slice(pageV * PAGE, (pageV + 1) * PAGE)
  const versetsPageBible = versetsFiltres.slice(pageV * PAGE, (pageV + 1) * PAGE)
  const segmentsPage = segmentsFiltres.slice(pageS * PAGE, (pageS + 1) * PAGE)
  const essaisPage   = essaisFiltres.slice(pageE * PAGE, (pageE + 1) * PAGE)

  const totalActive  = onglet === 'bible' || onglet === 'polyglotte' ? versetsFiltres.length
    : onglet === 'patristique' ? segmentsFiltres.length : essaisFiltres.length
  const pageActive   = onglet === 'patristique' ? pageS : onglet === 'essais' ? pageE : pageV
  const setPageActive = onglet === 'patristique' ? setPageS : onglet === 'essais' ? setPageE : setPageV
  const pagesTotal   = Math.ceil(totalActive / PAGE)
  const debut = pageActive * PAGE + 1
  const fin   = Math.min((pageActive + 1) * PAGE, totalActive)

  // Maintien enfoncé sur « Précédent »/« Suivant » : les pages défilent vite. Un premier
  // pas immédiat, puis, après une courte retenue, une répétition rapide jusqu'au relâché.
  const repeatRef = useRef<{ tempo?: ReturnType<typeof setTimeout>; boucle?: ReturnType<typeof setInterval> }>({})
  const arreterDefilement = () => {
    if (repeatRef.current.tempo) clearTimeout(repeatRef.current.tempo)
    if (repeatRef.current.boucle) clearInterval(repeatRef.current.boucle)
    repeatRef.current = {}
  }
  const demarrerDefilement = (dir: 1 | -1) => {
    arreterDefilement()
    const pas = () => setPageActive(p => Math.max(0, Math.min(pagesTotal - 1, p + dir)))
    pas() // premier pas immédiat (= un simple clic)
    repeatRef.current.tempo = setTimeout(() => {
      repeatRef.current.boucle = setInterval(pas, 70)
    }, 300)
  }
  useEffect(() => arreterDefilement, [])

  return (
    <>
      <style>{`
        /* ── UN GROUPE, PAS DES CARTES ──────────────────────────────────────────────
           Les résultats étaient vingt cartes indépendantes, chacune avec son cadre, son
           rayon, son ombre et son survol, et toutes de la même couleur. Elles répétaient
           en outre à chaque ligne ce que le TRI disait déjà : le même livre vingt fois,
           le même auteur et la même œuvre à chaque passage.

           Un groupe est désormais UN SEUL objet : une rubrique en aplat qui porte le
           commun (le livre, l'auteur et l'œuvre, la publication), puis un bloc lavé de la
           même famille dont les lignes se séparent d'un filet. Rien n'est retranché ;
           ce qui était répété est REMONTÉ d'un cran.

           ⛔ Pas de liseré au flanc des lignes. Il a été essayé et refusé : un trait de
           trois pixels dit moins bien la famille qu'un fond qui la porte sur toute la
           hauteur du groupe, et il ajoute un objet là où l'on en retire.

           La famille se pose UNE fois, par --fam et --fam-aplat (voir styleFamille).
           Le lavis et le filet s'en dérivent par color-mix : ils suivent donc les deux
           thèmes sans être nommés, et montent tout seuls sur le sol sombre du Cuir, comme
           la charte l'exige d'un carton posé sur un fond sombre. */
        .grp { border-radius:8px; }
        .grp + .grp { margin-top:4px; }
        .grp-hd { display:flex; align-items:baseline; gap:8px; padding:1px 10px 2px; line-height:1.25; border-radius:8px 8px 0 0; background:var(--fam-aplat); color:var(--cs-sur-aplat); font-family:var(--font-source-serif), Georgia, serif; }
        .grp-hd .nom { font-size:0.75rem; font-weight:600; letter-spacing:0.035em; }
        .grp-hd .compl { min-width:0; font-size:0.6875rem; font-style:italic; opacity:0.84; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .grp-hd .n { margin-left:auto; flex-shrink:0; font-size:0.625rem; font-weight:400; font-variant-numeric:tabular-nums; opacity:0.74; }
        .grp-corps { border:1px solid color-mix(in srgb, var(--fam) 22%, var(--cs-surface)); border-top:none; border-radius:0 0 8px 8px; background:color-mix(in srgb, var(--fam) 7%, var(--cs-surface)); overflow:hidden; }
        .grp-ligne { display:block; text-decoration:none; padding:4px 10px 5px; transition:background 0.1s; }
        .grp-ligne + .grp-ligne { border-top:1px solid color-mix(in srgb, var(--fam) 22%, var(--cs-surface)); }
        .grp-ligne:hover { background:color-mix(in srgb, var(--fam) 14%, var(--cs-surface)); }
        /* Le verset dont la traduction AFFICHÉE ne porte pas le mot : le fond d'absence,
           et le sigle barré sur la ligne du haut disent lequel. */
        .grp-ligne--absent { background:var(--cs-danger-fond); }
        .grp-ligne--absent:hover { background:var(--cs-danger-fond); }
        /* ── Sigles de bible ──
           Sept noms entiers ne tiennent pas sur une ligne et repoussaient le verset à un
           troisième rang ; sept sigles y tiennent. Le nom entier reste en title. */
        .sigles { display:inline-flex; gap:4px; flex-wrap:wrap; align-items:baseline; }
        .sigle { font-size:0.5625rem; font-weight:600; letter-spacing:0.03em; line-height:1.55; padding:0 4px; border-radius:4px; color:var(--cs-texte-doux); background:color-mix(in srgb, var(--fam) 12%, var(--cs-surface)); }
        .sigle--affichee { color:var(--fam); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--fam) 34%, var(--cs-surface)); }
        .sigle--absente { color:var(--cs-texte-faible); background:transparent; text-decoration:line-through; }
        /* Lignes de répartition cliquables (filtre par livre / œuvre / publication). */
        .brk-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; width:100%; text-align:left; border:none; background:transparent; cursor:pointer; padding:2px 6px; border-radius:4px; font-size:0.6875rem; color:var(--cs-texte-second); line-height:1.4; font-family:inherit; transition:background 0.1s; }
        .brk-row:hover { background:color-mix(in srgb, var(--fam) 10%, var(--cs-surface)); }
        .brk-row--actif { background:color-mix(in srgb, var(--fam) 15%, var(--cs-surface)); color:var(--fam); font-weight:600; }
        .brk-row--actif:hover { background:color-mix(in srgb, var(--fam) 21%, var(--cs-surface)); }
        .brk-count { flex-shrink:0; font-size:0.59375rem; color:var(--cs-texte-faible); font-variant-numeric:tabular-nums; }
        .brk-row--actif .brk-count { color:var(--fam); }
        /* ── Onglets VERTICAUX du volet gauche ──
           Une pastille carrée devant chaque libellé donne la clef du code de couleurs :
           c'est le seul endroit de la page où les trois familles se voient ENSEMBLE, et
           donc le seul où l'on peut apprendre ce qu'elles disent.
           ⛔ Le liseré de 3 px qui marquait l'onglet actif est retiré : le lavis fait le
           même travail, se voit mieux, et n'ajoute pas un objet à la page.
           (Les anciennes classes .ong-btn et .ong-count, d'une barre d'onglets
           HORIZONTALE qui n'existe plus, ont disparu avec elles.) */
        .ong-vert { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 20px; border:none; background:transparent; color:var(--cs-texte-second); font-weight:400; font-size:0.78125rem; cursor:pointer; text-align:left; font-family:var(--font-source-serif), Georgia, serif; transition:background 0.12s, color 0.12s; }
        .ong-vert:hover { background:color-mix(in srgb, var(--fam) 8%, var(--cs-surface)); }
        .ong-vert--actif { background:color-mix(in srgb, var(--fam) 11%, var(--cs-surface)); color:var(--fam); font-weight:600; }
        .ong-vert .lib { display:flex; align-items:center; gap:8px; min-width:0; line-height:1.25; }
        .ong-vert .pastille { width:7px; height:7px; flex-shrink:0; border-radius:4px; background:var(--fam); }
        .ong-count { flex-shrink:0; font-size:0.625rem; font-weight:400; color:var(--cs-texte-faible); font-variant-numeric:tabular-nums; }
        .ong-vert--actif .ong-count { color:var(--fam); }
        .pag-btn { font-size:0.6875rem; padding:5px 16px; border:1px solid var(--cs-bord); border-radius:999px; background:var(--cs-surface); color:var(--cs-texte); cursor:pointer; transition:background 0.12s,color 0.12s; }
        .pag-btn:hover:not(:disabled) { background:var(--cs-vert-aplat); color:var(--cs-sur-aplat); border-color:var(--cs-vert-aplat); }
        .pag-btn:disabled { color:#c8c0b8; border-color:var(--cs-fond-doux); cursor:default; }
        .mode-btn { padding:5px 14px; font-size:0.6875rem; border:none; cursor:pointer; transition:background 0.12s,color 0.12s; }
        .mode-btn--actif { background:var(--cs-vert-aplat); color:var(--cs-sur-aplat); font-weight:500; }
        .mode-btn--inactif { background:var(--cs-surface); color:var(--cs-texte-second); }
        .mode-btn--inactif:hover { background:var(--cs-fond-doux); }
        /* ── Polyglotte : palette de la page « Polyglotte » (vert), 3 colonnes ── */
        .poly-outer { border-radius:0 0 8px 8px; border:1px solid var(--cs-bord); border-top:none; box-shadow:var(--cs-ombre-flottante); overflow:hidden; }
        .poly-hd { background:var(--cs-vert-aplat-profond); display:grid; gap:0; overflow:hidden; border-radius:8px 8px 0 0; }
        .poly-hd-col { display:flex; align-items:center; gap:6px; padding:0 12px; height:38px; border-right:1px solid rgba(255,255,255,0.14); }
        .poly-hd-col:last-child { border-right:none; }
        .poly-hd-sel { font-size:0.625rem; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; text-align:center; text-align-last:center; color:rgba(255,255,255,0.9); background:transparent; border:none; outline:none; cursor:pointer; appearance:none; -webkit-appearance:none; padding:2px 16px; flex:1; transition:color 0.12s; }
        .poly-hd-sel:hover { color:var(--cs-vert-clair); }
        .poly-hd-sel option { background:var(--cs-encre); color:var(--cs-vert-pale); font-weight:400; text-transform:none; font-size:0.75rem; }
        .poly-hd-sel option:disabled { color:#6a8474; }
        .poly-hd-chevron { color:var(--cs-vert); pointer-events:none; flex-shrink:0; transition:color 0.12s; }
        .poly-hd-col:hover .poly-hd-chevron { color:var(--cs-vert-clair); }
        /* ── Corps de la Polyglotte : classes REPRISES TELLES QUELLES de la page de
           lecture (app/polyglotte/page.tsx) — grille, lettrine, césure, espacement. ── */
        .poly-livre-hd { margin:0; padding:2px 12px; font-family:var(--font-source-serif), Georgia, serif; font-size:0.78125rem; line-height:1.35; color:var(--cs-encre); background:var(--cs-vert-clair); border-top:1px solid var(--cs-vert-clair); border-bottom:1px solid var(--cs-vert-clair); text-align:center; }
        .poly-row { display:grid; border-top:1px solid var(--cs-vert-pale); font-size:0.8125rem; text-decoration:none; }
        .poly-num { padding:5px 4px; text-align:center; font-weight:700; font-size:0.71875rem; line-height:1.15; color:var(--cs-vert); border-right:1px solid var(--cs-vert-pale); white-space:nowrap; }
        .poly-texte-cell { min-width:0; padding:5px 10px 6px; border-left:1px solid var(--cs-vert-pale); text-align:justify; text-align-last:left; hyphens:auto; -webkit-hyphens:auto; hyphenate-limit-chars:5 2 2; word-spacing:-0.06em; letter-spacing:-0.01em; line-height:1.26; font-family:var(--font-source-sans), Arial, sans-serif; font-size:0.75rem; color:var(--cs-encre-fonce); }
        .poly-texte-cell::after { content:""; display:block; clear:both; }
        .poly-texte-cell--absent { background:var(--cs-danger-fond); color:#7a1d16; }
        .poly-lettrine { float:left; display:flex; flex-direction:column; align-items:flex-end; margin:0 8px 0 0; padding:0 7px 0 0; border-right:1px solid rgba(var(--cs-vert-rgb),0.22); font-family:var(--font-source-sans), Arial, sans-serif; font-weight:400; letter-spacing:0.03em; font-variant-numeric:tabular-nums; color:#6f8f7b; text-align:right; }
        .poly-lettrine-item { position:relative; display:flex; align-items:center; justify-content:flex-end; height:1.26em; }
        .poly-lettrine-ref { display:block; white-space:nowrap; font-size:0.53125rem; line-height:1; }
        .poly-lettrine-ch { font-weight:400; color:#a9bcb0; }
        .ctrl-sel { font-size:0.6875rem; padding:4px 8px; border:1px solid var(--cs-bord); border-radius:4px; background:var(--cs-surface); color:var(--cs-encre); outline:none; cursor:pointer; }
        .ctrl-sel:focus { border-color:var(--cs-vert); }
        /* Info-bulle « Explicitations » : au survol du « ? », les deux modes expliqués. */
        .expl-wrap { position:relative; display:inline-flex; }
        .expl-badge { width:13px; height:13px; border-radius:50%; border:1px solid #b6ccbd; color:var(--cs-vert); background:var(--cs-vert-pale); font-size:0.53125rem; font-weight:700; line-height:1; display:inline-flex; align-items:center; justify-content:center; cursor:help; }
        .expl-tip { position:absolute; top:calc(100% + 7px); left:-4px; width:250px; background:var(--cs-surface); border:1px solid var(--cs-bord); border-radius:8px; box-shadow:var(--cs-ombre-modale); padding:9px 11px; font-size:0.65625rem; line-height:1.5; color:#5a5248; text-transform:none; letter-spacing:0; font-weight:400; z-index:200; opacity:0; visibility:hidden; transform:translateY(-3px); transition:opacity 0.14s, transform 0.14s; pointer-events:none; }
        .expl-wrap:hover .expl-tip { opacity:1; visibility:visible; transform:translateY(0); }
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--cs-bord);border-radius:4px}
      `}</style>

      {/* Le layout global (`app/layout.tsx`) décale DÉJÀ le contenu de HAUTEUR_NAVBAR sous
          la navbar. On ne rajoute donc PAS de paddingTop ici (sinon double décalage, gros
          blanc en haut) : on prend simplement toute la hauteur restante sous la navbar. */}
      <div style={mobile
        ? { background:'var(--cs-fond)', display:'flex', flexDirection:'column' }
        : { background:'var(--cs-fond)', height:'calc(100dvh - 3.5rem)', display:'flex', overflow:'hidden' }}>

        {/* ── VOLET GAUCHE : intitulé · recherche · options · onglets. Collé sous la
            navbar, pleine hauteur. Le bloc du haut est fixe ; les onglets, en dessous,
            prennent le reste et défilent si besoin. */}
        <aside style={mobile
          ? { width:'100%', borderBottom:'1px solid var(--cs-bord)', background:'var(--cs-fond-clair)', display:'flex', flexDirection:'column' }
          : { width:'clamp(300px, 22vw, 440px)', flexShrink:0, borderRight:'1px solid var(--cs-bord)', background:'var(--cs-fond-clair)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flexShrink:0, padding:'9px 20px 12px', display:'flex', flexDirection:'column', alignItems:'stretch', gap:'9px' }}>

            {/* Titre + nombre total de résultats, sur la même ligne, en tête du volet. */}
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px' }}>
              <span style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.75rem', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--cs-texte-doux)', fontWeight:400 }}>Recherche</span>
              {done && (() => {
                const total = versetsRes.length + segmentsRes.length + essaisRes.length
                return <span style={{ fontSize:'0.65625rem', color:'var(--cs-texte-faible)', fontStyle:'italic', flexShrink:0 }}>{total} résultat{total > 1 ? 's' : ''}</span>
              })()}
            </div>

            {/* Champ principal */}
            <div style={{ position:'relative', width:'100%' }}>
              <input ref={inputRef} value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setShowSugg(false); lancer() }
                  if (e.key === 'Escape') setShowSugg(false)
                }}
                onFocus={() => sugg.length > 0 && setShowSugg(true)}
                placeholder="Chercher un mot, une expression…"
                autoFocus
                /* Sans cela le navigateur pré-remplissait le champ avec une saisie passée
                   (« Am imp »…). `type=search` + autoComplete off + name neutre le coupent. */
                type="search"
                name="cs-recherche"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                style={{ width:'100%', fontSize:'0.84375rem', padding:'8px 38px 8px 14px', border:'1px solid var(--cs-bord)', borderRadius:'8px', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', outline:'none', fontFamily:"var(--font-source-serif), Georgia, serif", boxSizing:'border-box', boxShadow:'var(--cs-ombre-posee)' }} />
              {query ? (
                <button onClick={() => { setQuery(''); setSugg([]); setDone(false); setVersetsRes([]); setSegmentsRes([]); setEssaisRes([]); setShowSugg(false) }}
                  style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--cs-texte-faible)', fontSize:'1rem', lineHeight:1, padding:0 }} title="Effacer">×</button>
              ) : (
                <svg style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', color:'var(--cs-bord)', pointerEvents:'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              )}
              {showSugg && sugg.length > 0 && (
                <ul ref={suggRef} style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--cs-surface)', border:'1px solid var(--cs-bord)', borderRadius:'8px', boxShadow:'var(--cs-ombre-flottante)', margin:0, padding:'5px 0 0', listStyle:'none', zIndex:100, maxHeight:'300px', overflowY:'auto' }}>
                  {sugg.map(s => (
                    <li key={s.mot}
                      onMouseDown={e => { e.preventDefault(); setQuery(s.mot); setShowSugg(false); lancer(s.mot) }}
                      style={{ padding:'7px 18px', fontSize:'0.875rem', color:'var(--cs-texte-fort)', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"var(--font-source-serif), Georgia, serif" }}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--cs-fond)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <span>{s.mot}</span>
                      {s.freq > 0 && <span style={{ fontSize:'0.625rem', color:'var(--cs-texte-faible)' }}>{s.freq}</span>}
                    </li>
                  ))}
                  {/* Tout rechercher : lance la recherche par DÉBUT DE MOT sur ce qui est
                      tapé, ce qui couvre d'un coup tous les mots proposés dans la liste
                      (ils commencent tous par le préfixe). Légèrement mis en évidence. */}
                  <li
                    onMouseDown={e => { e.preventDefault(); setShowSugg(false); setMode('prefixe'); lancer(query, 'prefixe') }}
                    style={{ marginTop:'4px', borderTop:'1px solid var(--cs-fond-doux)', padding:'9px 18px', fontSize:'0.78125rem', fontWeight:600, color:'var(--cs-vert-fonce)', background:'var(--cs-vert-pale)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', letterSpacing:'0.01em' }}
                    onMouseEnter={e => (e.currentTarget.style.background='var(--cs-fond-doux)')}
                    onMouseLeave={e => (e.currentTarget.style.background='var(--cs-vert-pale)')}>
                    <span>Tout rechercher</span>
                    <span style={{ fontSize:'0.8125rem' }}>↵</span>
                  </li>
                </ul>
              )}
            </div>

            {/* Contrôles, en colonne dans le volet */}
            <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
              {/* Mode + « Explicitations » en INFO-BULLE au survol du « ? » : les deux
                  explications ensemble, ce qui évite l'encart qui alourdissait le volet. */}
              <div>
                <p style={{ fontSize:'0.5625rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--cs-texte-doux)', margin:'0 0 5px', display:'flex', alignItems:'center', gap:'3px' }}>
                  Mode
                  <span className="expl-wrap">
                    <span className="expl-badge">?</span>
                    <span className="expl-tip">
                      <span style={{ display:'block', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', fontSize:'0.53125rem', color:'var(--cs-texte-doux)', marginBottom:'7px' }}>Les deux modes</span>

                      <span style={{ display:'block', marginBottom:'8px' }}>
                        <span style={{ display:'block', fontWeight:700, color:'var(--cs-vert-fonce)', marginBottom:'1px' }}>Début de mot</span>
                        <span style={{ display:'block' }}>Trouve les mots qui commencent par ce que vous tapez ; plusieurs termes à la fois sont admis.</span>
                        <span style={{ display:'block', fontStyle:'italic', color:'var(--cs-texte-gris)', marginTop:'2px' }}>« glo » ramène gloire, glorieux, glorifier ; « glo mis » ramène les passages où figurent ensemble un mot en glo- et un mot en mis-.</span>
                      </span>

                      <span style={{ display:'block' }}>
                        <span style={{ display:'block', fontWeight:700, color:'var(--cs-vert-fonce)', marginBottom:'1px' }}>Mot exact</span>
                        <span style={{ display:'block' }}>Ne trouve que le mot entier ; plusieurs mots entiers, non consécutifs, sont admis.</span>
                        <span style={{ display:'block', fontStyle:'italic', color:'var(--cs-texte-gris)', marginTop:'2px' }}>« gloire » ne ramène ni glorieux ni gloires ; « gloire Dieu » ramène les passages contenant l’un et l’autre.</span>
                      </span>
                    </span>
                  </span>
                </p>
                <div style={{ display:'flex', border:'1px solid var(--cs-bord)', borderRadius:'4px', overflow:'hidden' }}>
                  <button className={`mode-btn ${mode==='prefixe'?'mode-btn--actif':'mode-btn--inactif'}`} style={{ flex:1 }} onClick={()=>setMode('prefixe')}>Début de mot</button>
                  <button className={`mode-btn ${mode==='exact'?'mode-btn--actif':'mode-btn--inactif'}`} style={{ flex:1, borderLeft:'1px solid var(--cs-bord)' }} onClick={()=>setMode('exact')}>Mot exact</button>
                </div>
              </div>
              {/* « Chercher dans » (périmètre) et « Afficher en » (traduction montrée),
                  côte à côte pour tenir sur une seule ligne. « Afficher en » ne disparaît
                  jamais : il commande l'affichage quel que soit le périmètre. */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div>
                  <p style={{ fontSize:'0.5625rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--cs-texte-doux)', margin:'0 0 4px' }}>Chercher dans</p>
                  <select className="ctrl-sel" style={{ width:'100%' }} value={tradScope}
                    onChange={e => { const v=e.target.value; setTradScope(v); if(v!=='ALL') setTradAffichage(v) }}>
                    <option value="ALL">Toutes les bibles</option>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:'0.5625rem', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--cs-texte-doux)', margin:'0 0 4px' }}>Afficher en</p>
                  <select className="ctrl-sel" style={{ width:'100%' }} value={tradAffichage} onChange={e=>setTradAffichage(e.target.value)}>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              {/* Enregistrer ma recherche : dès qu'il y a des résultats. Un clic mémorise
                  mot(s), page et position ; « Reprendre » (juste dessous) y ramène. Le libellé
                  passe brièvement à « Recherche enregistrée » en accusé de réception. */}
              {/* Enregistrer / Reprendre : deux boutons de même hauteur, resserrés. Un clic
                  « Enregistrer » mémorise mot(s), page et position ; si une AUTRE recherche est
                  déjà mémorisée, une fenêtre demande d'abord confirmation d'écrasement. */}
              {((done && (versetsRes.length + segmentsRes.length + essaisRes.length) > 0) || rechercheSauvee) && (
                <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'2px' }}>
                  {done && (versetsRes.length + segmentsRes.length + essaisRes.length) > 0 && (
                    <button onClick={enregistrerRecherche} title="Mémoriser cette recherche pour la reprendre plus tard, au même endroit"
                      style={{ display:'flex', alignItems:'center', gap:'7px', width:'100%', textAlign:'left', fontSize:'0.6875rem', color:'var(--cs-vert)', background:'rgba(var(--cs-vert-rgb),0.06)', border:'1px solid var(--cs-bord)', borderRadius:'8px', padding:'5px 10px', cursor:'pointer', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(var(--cs-vert-rgb),0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background='rgba(var(--cs-vert-rgb),0.06)')}>
                      <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                        <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {vientDEnregistrer ? 'Recherche enregistrée' : 'Enregistrer ma recherche'}
                      </span>
                    </button>
                  )}
                  {/* Reprendre : même hauteur que « Enregistrer », date d'enregistrement à droite. */}
                  {rechercheSauvee && (
                    <button onClick={reprendreRecherche} title={`Reprendre « ${rechercheSauvee.query} » là où vous en étiez`}
                      style={{ display:'flex', alignItems:'center', gap:'7px', width:'100%', textAlign:'left', fontSize:'0.6875rem', color:'var(--cs-vert)', background:'rgba(var(--cs-vert-rgb),0.06)', border:'1px solid var(--cs-bord)', borderRadius:'8px', padding:'5px 10px', cursor:'pointer', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(var(--cs-vert-rgb),0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background='rgba(var(--cs-vert-rgb),0.06)')}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                        <path d="M2.5 7a4.5 4.5 0 1 1 1.3 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                        <path d="M2.2 4.2v2.6h2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        Reprendre ma recherche
                        <span style={{ color:'var(--cs-texte-doux)', fontStyle:'italic' }}> {rechercheSauvee.query}</span>
                      </span>
                      {rechercheSauvee.ts ? <span style={{ flexShrink:0, color:'var(--cs-texte-faible)', fontStyle:'italic', fontSize:'0.59375rem' }}>{formatDateCourt(rechercheSauvee.ts)}</span> : null}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Onglets VERTICAUX : prennent tout l'espace restant (flex:1, minHeight:0) et
              défilent si l'écran est court. Les libellés longs passent à la ligne au lieu
              d'être coupés. */}
          {done && (
            <nav style={{ flex:1, minHeight:0, maxHeight: mobile ? '45vh' : undefined, overflowY:'auto', borderTop:'1px solid var(--cs-bord-clair)', padding:'6px 0 10px' }}>
              {([
                { k:'bible', label:'Bible', n:versetsRes.length },
                { k:'polyglotte', label:'Polyglotte', n:versetsRes.length },
                { k:'patristique', label:'Pères de l’Église', n:segmentsRes.length },
                { k:'essais', label:'Publications de la communauté', n:essaisRes.length },
              ] as { k:Onglet; label:string; n:number }[]).map(o => {
                const actif = onglet===o.k
                return (
                  <Fragment key={o.k}>
                    {/* La famille se pose sur l'onglet ET sur sa répartition : le survol,
                        l'état actif et la ligne filtrée en dérivent tous par `color-mix`. */}
                    <button className={`ong-vert${actif ? ' ong-vert--actif' : ''}`} style={styleFamille(o.k)} onClick={()=>setOnglet(o.k)}>
                      <span className="lib"><span className="pastille" aria-hidden="true" />{o.label}</span>
                      <span className="ong-count">{o.n}</span>
                    </button>
                    {/* Répartition détaillée sous l'onglet actif : livres (Bible/Polyglotte),
                        œuvres (Pères), publications (communauté), avec le nombre d'occurrences.
                        Chaque ligne est CLIQUABLE : elle restreint les résultats à ce
                        regroupement ; un second clic sur la même ligne annule le filtre. */}
                    {actif && o.n > 0 && (
                      <div style={{ ...styleFamille(o.k), padding:'2px 14px 8px 26px', display:'flex', flexDirection:'column', gap:'1px' }}>
                        {(o.k==='bible' || o.k==='polyglotte') && repartitionLivres.map(([code, n]) => {
                          const sel = filtres.livre === code
                          return (
                            <button key={code} className={`brk-row${sel ? ' brk-row--actif' : ''}`}
                              onClick={() => { setFiltres(f => ({ ...f, livre: f.livre === code ? null : code })); setPageV(0) }}
                              title={sel ? 'Retirer le filtre' : `N'afficher que ${NOMS_LIVRES[code] ?? code}`}>
                              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{NOMS_LIVRES[code] ?? code}</span>
                              <span className="brk-count">{n}</span>
                            </button>
                          )
                        })}
                        {o.k==='patristique' && repartitionOeuvres.map((r, i) => {
                          const cle = r.auteur + '¦' + r.titre
                          const sel = filtres.oeuvre === cle
                          return (
                            <button key={i} className={`brk-row${sel ? ' brk-row--actif' : ''}`}
                              onClick={() => { setFiltres(f => ({ ...f, oeuvre: f.oeuvre === cle ? null : cle })); setPageS(0) }}
                              title={sel ? 'Retirer le filtre' : `N'afficher que ${r.auteur}${r.titre ? ' — ' + r.titre : ''}`}>
                              <span style={{ minWidth:0 }}>
                                <span style={{ color: sel ? 'inherit' : 'var(--cs-texte)' }}>{r.auteur}</span>
                                {r.titre && <span style={{ color: sel ? 'inherit' : 'var(--cs-texte-doux)', fontStyle:'italic' }}> — {r.titre}</span>}
                              </span>
                              <span className="brk-count">{r.n}</span>
                            </button>
                          )
                        })}
                        {o.k==='essais' && repartitionEssais.map(r => {
                          const sel = filtres.essai === r.id
                          return (
                            <button key={r.id} className={`brk-row${sel ? ' brk-row--actif' : ''}`}
                              onClick={() => { setFiltres(f => ({ ...f, essai: f.essai === r.id ? null : r.id })); setPageE(0) }}
                              title={sel ? 'Retirer le filtre' : `N'afficher que « ${r.titre} »`}>
                              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titre}</span>
                              <span className="brk-count">{r.n}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </nav>
          )}
        </aside>

        {/* ── TABLEAU DE RÉSULTATS : tout l'espace libre ── */}
        <main style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow: mobile ? 'visible' : 'hidden' }}>

          {/* Bannière troncature */}
          {done && tronque.length > 0 && (
            <div style={{ flexShrink:0, background:'var(--cs-danger-fond)', border:'1px solid #e8c96a', borderRadius:'8px', padding:'7px 14px', margin:'12px 24px 0', display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'0.8125rem' }}>⚠️</span>
              <span style={{ fontSize:'0.71875rem', color:'#7a5a10' }}>
                Résultats trop nombreux dans {tronque.join(', ')} — seuls les premiers affichés. Affinez votre recherche ou utilisez le mode <strong>Mot exact</strong>.
              </span>
            </div>
          )}

          {/* En-tête polyglotte — hors du scroll (badge « recherche » retiré) */}
          {done && onglet==='polyglotte' && versetsRes.length > 0 && (
            <div className="poly-hd" style={{ gridTemplateColumns:`46px repeat(${colTrads.length},minmax(0,1fr))`, flexShrink:0, margin:'12px 22px 0' }}>
              {/* Cellule vide au-dessus de la colonne canonique (46px), pour aligner l'en-tête
                  sur la grille du corps. */}
              <div style={{ borderRight:'1px solid rgba(255,255,255,0.14)' }} />
              {colTrads.map((code, i) => {
                const autresChoisies = new Set(colTrads.filter((_, j) => j !== i))
                return (
                  <div key={i} className="poly-hd-col">
                    <div style={{ position:'relative', flex:1, display:'flex', alignItems:'center' }}>
                      <select className="poly-hd-sel" value={code}
                        onChange={e => setColTrads(prev => prev.map((c,j) => j===i ? e.target.value : c))}>
                        {traductions.map(t => (
                          <option key={t.code} value={t.code} disabled={autresChoisies.has(t.code)}>
                            {t.label}{autresChoisies.has(t.code) ? ' ✕' : ''}
                          </option>
                        ))}
                      </select>
                      <svg className="poly-hd-chevron" width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ position:'absolute', right:0 }}>
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Résultats */}
          <div ref={zoneResultatsRef} style={{ flex:1, minHeight: mobile ? '40vh' : undefined, overflowY: mobile ? 'visible' : 'auto', scrollbarGutter:'stable', padding: (done && onglet==='polyglotte' && versetsRes.length > 0) ? '0 22px 4px' : '6px 22px 4px' }}>

            {!done && !loading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                ...(mobile ? { marginTop:'40px', marginBottom:'24px' } : { height:'100%' }) }}>
                {/* Un désert et une fosse tiennent la page tant qu'aucune requête n'est lancée.

                    La pose est celle de la tour de Babel sur le Polyglotte, et pour la même
                    raison : sur PC cette colonne fait TOUTE la hauteur sous la navbar et se
                    trouve entièrement vide, l'intitulé, la recherche et les onglets vivant dans
                    le volet de gauche. C'est donc un écran d'attente, non un blanc de pied de
                    page — d'où la même mesure, la même opacité et la même invite en sérif
                    italique. Un cul-de-lampe discret posé en haut de la colonne y flottait.

                    ⚠️ Le centrage vertical vient du flux, la zone étant de hauteur définie sur
                    PC. En MOBILE elle ne l'est pas (minHeight en vh, débordement visible) : un
                    « height: 100 % » s'y effondrerait, et le groupe reprend donc des marges.

                    ⛔ Aucune LARGEUR posée, deux MAXIMA seulement (charte). Le plafond de hauteur
                    est l'autre moitié du réglage et vaut pour les écrans BAS : la planche est
                    large de 1600 sur 780, donc à 816 px elle en ferait 398 de haut, ce qui ne
                    tient plus sous une fenêtre de 720 px. Les deux dimensions restant
                    automatiques, le navigateur applique les maxima l'un après l'autre en tenant
                    le rapport (CSS 2.1, § 10.4). */}
                <img className="cs-ornement" src="/ornements/desert-fosse.png" alt="" aria-hidden="true"
                  style={{ maxWidth:'min(68rem, 96%)', maxHeight:'calc(100dvh - 3.5rem - 15rem)', opacity:0.72, marginBottom:'16px' }} />
                <p style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.9375rem', fontStyle:'italic', color:'var(--cs-texte-doux)', letterSpacing:'0.02em', margin:0 }}>Lancez une recherche</p>
              </div>
            )}
            {loading && (
              <div style={{ textAlign:'center', marginTop:'80px' }}>
                <p style={{ fontSize:'0.8125rem', color:'var(--cs-texte-faible)', fontStyle:'italic' }}>Recherche en cours…</p>
              </div>
            )}

            {/* ── Bible ── */}
            {done && onglet==='bible' && (
              versetsFiltres.length===0
                ? <Vide texte="Aucun verset trouvé." />
                : <div style={styleFamille('bible')}>
                  {/* Un groupe par LIVRE. Les versets arrivant dans l'ordre canonique, une
                      tranche consécutive est exactement un livre. Le nom du livre monte donc
                      dans la rubrique et la référence de chaque ligne retombe à « 18, 2 ».
                      ⛔ Aucun COMPTE dans la rubrique : celui de la page mentirait sur le
                      livre, celui du livre mentirait sur la page. Les comptes complets vivent
                      dans le volet gauche, et le total sous la pagination. */}
                  {grouperConsecutifs(versetsPageBible, v => v.livre).map(tranche => (
                    <div className="grp" key={tranche.cle}>
                      <div className="grp-hd">
                        <span className="nom">{NOMS_LIVRES[tranche.cle] ?? tranche.cle}</span>
                      </div>
                      <div className="grp-corps">
                        {tranche.items.map(v => {
                          const texte = String((v as any)[tradBible]??'')
                          const labelDisplay = traductions.find(t=>t.code===tradBible)?.label ?? tradBible
                          const displayLeMot = !!(lastQuery && contientTerme(texte, lastQuery, mode))
                          // TOUTES les bibles qui portent le mot, en SIGLES sur la ligne du haut.
                          // Celle qui est affichée porte un filet ; elle est barrée quand le mot
                          // n'y figure pas, et la ligne prend alors le fond d'absence.
                          const contientDans = lastQuery
                            ? traductions.filter(t => contientTerme(String((v as any)[t.code]??''), lastQuery, mode))
                            : []
                          return (
                            <a key={v.id_verset}
                              // Lien vers la page Bible : livre, chapitre, verset ET la traduction
                              // choisie, avec l'ancre du verset pour l'y amener et l'y sélectionner.
                              href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}&trad=${tradBible}#verset-${v.verset}`}
                              target="_blank" rel="noopener noreferrer"
                              className={`grp-ligne${!displayLeMot && contientDans.length ? ' grp-ligne--absent' : ''}`}>
                              <div style={{ display:'flex', alignItems:'baseline', gap:'7px', flexWrap:'wrap' }}>
                                <span style={{ fontSize:'0.65625rem', fontWeight:600, color:'var(--cs-texte-second)', letterSpacing:'0.01em', fontVariantNumeric:'tabular-nums' }}>{v.chapitre}, {v.verset}</span>
                                <span className="sigles">
                                  <span className={`sigle ${displayLeMot ? 'sigle--affichee' : 'sigle--absente'}`} title={labelDisplay}>{siglesParCode[tradBible] ?? tradBible}</span>
                                  {contientDans.filter(t => t.code !== tradBible).map(t => (
                                    <span key={t.code} className="sigle" title={t.label}>{siglesParCode[t.code] ?? t.label}</span>
                                  ))}
                                </span>
                              </div>
                              {/* Toujours le texte de la traduction CHOISIE, SANS SÉRIF. Surligné si le
                                  mot y est ; sinon montré tel quel (la ligne du haut dit où il se trouve). */}
                              <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.32, color:'var(--cs-texte-fort)', margin:0 }}>
                                {texte
                                  ? rendreEtSurligner(texte, lastQuery, mode)
                                  : <span style={{ color:'var(--cs-texte-faible)', fontStyle:'italic' }}>Ce verset n’existe pas dans {labelDisplay}.</span>}
                              </p>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
            )}

            {/* ── Patristique ── */}
            {done && onglet==='patristique' && (
              segmentsFiltres.length===0
                ? <Vide texte="Aucun passage trouvé." />
                : <div style={styleFamille('patristique')}>
                  {/* Un groupe par ŒUVRE (auteur puis titre). Les segments arrivent triés par
                      nom d'auteur puis par œuvre : une tranche consécutive est exactement une
                      œuvre. L'auteur et le titre cessent donc d'être répétés à chaque passage,
                      et la ligne ne porte plus que sa cote. */}
                  {grouperConsecutifs(segmentsPage, s => s.auteur_nom + '¦' + (s.oeuvre_titre ?? '')).map(tranche => (
                    <div className="grp" key={tranche.cle}>
                      <div className="grp-hd">
                        <span className="nom">{tranche.items[0].auteur_nom}</span>
                        {tranche.items[0].oeuvre_titre && <span className="compl">{tranche.items[0].oeuvre_titre}</span>}
                      </div>
                      <div className="grp-corps">
                        {tranche.items.map(s=>(
                          <a key={s.id} href={`/oeuvre/${encodeURIComponent(s.id_oeuvre)}?texte=${encodeURIComponent(s.id_texte)}&segment=${s.id}#segment-${s.id}`}
                            target="_blank" rel="noopener noreferrer" className="grp-ligne">
                            {/* Le niveau 1 seul, et seulement s'il existe : le reste est dans la rubrique. */}
                            {s.ref_niv1 && (
                              <div style={{ display:'flex', alignItems:'baseline', gap:'7px', flexWrap:'wrap' }}>
                                <span style={{ fontSize:'0.65625rem', fontWeight:600, color:'var(--cs-texte-second)' }}>{s.ref_niv1}</span>
                              </div>
                            )}
                            {/* Résultat latin/grec : on n'affiche QUE l'original (badge de langue,
                                latin en italiques, grec en romain). Sinon, le texte français. */}
                            {s.matchOrig && s.texte_original ? (
                              <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.32, color:'var(--cs-texte-fort)', margin:0 }}>
                                <span style={{ display:'inline-block', fontStyle:'normal', fontSize:'0.5rem', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--fam)', background:'color-mix(in srgb, var(--fam) 14%, var(--cs-surface))', borderRadius:'4px', padding:'0 5px', marginRight:'6px', verticalAlign:'1px' }}>{s.langue || 'Original'}</span>
                                <span style={{ fontStyle: s.langue === 'Latin' ? 'italic' : 'normal' }}>
                                  {rendreEtSurligner(nettoyerFin(s.texte_original), lastQuery, mode)}
                                </span>
                              </p>
                            ) : (
                              <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.32, color:'var(--cs-texte-fort)', margin:0 }}>
                                {rendreEtSurligner(nettoyerFin(s.segment_texte), lastQuery, mode)}
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            )}

            {/* ── Essais ── */}
            {done && onglet==='essais' && (
              essaisFiltres.length===0
                ? <Vide texte="Aucun essai trouvé." />
                : <div style={styleFamille('essais')}>
                  {/* Une publication est déjà un groupe à elle seule : son titre monte dans la
                      rubrique avec sa catégorie, et la ligne garde le sous-titre et l'extrait. */}
                  {essaisPage.map(e=>{
                    const extrait = snippetEssai(e.contenu, lastQuery)
                    const texteAffiche = (e.resume && contientTerme(e.resume, lastQuery, mode)) ? e.resume : extrait
                    return (
                      <div className="grp" key={e.id}>
                        <div className="grp-hd">
                          <span className="nom">{e.titre}</span>
                          {e.categories?.[0] && <span className="compl">{e.categories[0]}</span>}
                        </div>
                        <div className="grp-corps">
                          <a href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer" className="grp-ligne">
                            {e.sous_titre && <p style={{ fontSize:'0.6875rem', color:'var(--cs-texte-gris)', fontStyle:'italic', margin:'0 0 2px' }}>{e.sous_titre}</p>}
                            <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.42, color:'var(--cs-texte-fort)', margin:0 }}>
                              {highlighter(texteAffiche, lastQuery, mode)}
                            </p>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
            )}

            {/* ── Polyglotte — structure REPRISE de la page de lecture : grille avec colonne
                de numéro canonique (46px) + une colonne par traduction, lettrine de référence
                d'origine, texte justifié et césuré, zébrage vert, en-tête de livre = NOM SEUL. */}
            {done && onglet==='polyglotte' && (
              versetsFiltres.length===0
                ? <Vide texte="Aucun verset trouvé." />
                : (() => {
                    const polyTmpl = `46px ${colTrads.map(() => 'minmax(0, 1fr)').join(' ')}`
                    const livresVus = new Set<string>()
                    return (
                      <div className="poly-outer">
                        {versetsPage.map((v, idx) => {
                          const estNouveauLivre = !livresVus.has(v.livre)
                          if (estNouveauLivre) livresVus.add(v.livre)
                          // Pas d'alternance : un fond uniforme, très clair. Le zébrage
                          // n'apporte rien ici et brouillait la lecture des colonnes.
                          const fond = 'var(--cs-surface)'
                          return (
                            <Fragment key={v.id_verset}>
                              {/* En-tête de livre : NOM SEUL, centré sur les colonnes de
                                  TRADUCTION uniquement (la colonne canonique de 46 px est
                                  exclue du centrage), comme sur la page Polyglotte. */}
                              {estNouveauLivre && (
                                <div className="poly-livre-hd" style={{ display:'grid', gridTemplateColumns:polyTmpl, padding:0 }}>
                                  <div />
                                  <div style={{ gridColumn:'2 / -1', textAlign:'center', padding:'2px 12px' }}>{NOMS_LIVRES[v.livre] ?? v.livre}</div>
                                </div>
                              )}
                              <a className="poly-row" style={{ gridTemplateColumns:polyTmpl, background:fond }}
                                href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}&trad=${tradBible}#verset-${v.verset}`}
                                target="_blank" rel="noopener noreferrer">
                                {/* Colonne canonique */}
                                <div className="poly-num">{v.chapitre}, {v.verset}</div>
                                {/* Une colonne par traduction */}
                                {colTrads.map((code, i) => {
                                  const lang = traductions.find(t => t.code === code)?.lang ?? 'fr'
                                  // `original` garde l'enrichissement (`<i>` de Sacy, etc.) pour l'affichage ;
                                  // `brut` (dépouillé) sert à détecter l'absence du mot et à césurer le grec.
                                  const original = String((v as any)[code] ?? '')
                                  const brut = texteSansEnrichissement(original)
                                  const numOrig = String((v as any)['num_' + code] ?? '').trim()
                                  const absent = brut && lastQuery ? !contientTerme(brut, lastQuery, mode) : false
                                  return (
                                    <div key={i} lang={lang} onCopy={copierSansCesures} className={`poly-texte-cell${absent ? ' poly-texte-cell--absent' : ''}`}>
                                      {/* Lettrine : référence(s) d'origine de l'édition (num_TRxxxx),
                                          « ch, v » séparées par « · » si plusieurs versets réunis. */}
                                      {brut && numOrig && (
                                        <span className="poly-lettrine">
                                          {numOrig.split('·').map(s => s.trim()).filter(Boolean).map((nn, k) => {
                                            const m = nn.match(/^(\d+)\s*,\s*(.+)$/)
                                            return (
                                              <span key={k} className="poly-lettrine-item">
                                                <span className="poly-lettrine-ref">
                                                  {m ? <><span className="poly-lettrine-ch">{m[1]},</span> {m[2]}</> : nn}
                                                </span>
                                              </span>
                                            )
                                          })}
                                        </span>
                                      )}
                                      {!brut ? <span style={{ display:'block', textAlign:'center', textAlignLast:'center', color:'#8aa593', fontStyle:'italic', fontSize:'0.6875rem' }}>Absent dans cette traduction</span>
                                        : lang === 'grc' ? (absent ? cesurerGrec(brut) : highlighter(cesurerGrec(brut), lastQuery, mode))
                                        : rendreEtSurligner(original, lastQuery, mode)}
                                    </div>
                                  )
                                })}
                              </a>
                            </Fragment>
                          )
                        })}
                      </div>
                    )
                  })()
            )}
          </div>

          {/* ── Pagination ── */}
          {done && totalActive>PAGE && (
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 24px 14px', borderTop:'1px solid var(--cs-bord-clair)' }}>
              {/* Maintien enfoncé = défilement rapide (souris ET tactile). */}
              <button className="pag-btn" disabled={pageActive===0} style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}
                onMouseDown={()=>demarrerDefilement(-1)} onMouseUp={arreterDefilement} onMouseLeave={arreterDefilement}
                onTouchStart={e=>{e.preventDefault();demarrerDefilement(-1)}} onTouchEnd={arreterDefilement}><IconeChevron dir="left" size={12} />Précédent</button>
              <span style={{ fontSize:'0.6875rem', color:'var(--cs-texte-faible)' }}>{debut}–{fin} <span style={{ color:'var(--cs-bord)' }}>sur</span> {totalActive}</span>
              <button className="pag-btn" disabled={pageActive>=pagesTotal-1} style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}
                onMouseDown={()=>demarrerDefilement(1)} onMouseUp={arreterDefilement} onMouseLeave={arreterDefilement}
                onTouchStart={e=>{e.preventDefault();demarrerDefilement(1)}} onTouchEnd={arreterDefilement}>Suivant<IconeChevron dir="right" size={12} /></button>
            </div>
          )}
        </main>
      </div>

      {/* Fenêtre de confirmation d'écrasement : s'ouvre APRÈS un clic sur « Enregistrer »
          quand une autre recherche est déjà mémorisée. « Écraser » remplace la précédente. */}
      {confirmEcrasement && rechercheSauvee && (
        <div onClick={() => setConfirmEcrasement(false)}
          style={{ position:'fixed', inset:0, background:'rgba(30,28,24,0.38)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'var(--cs-fond-clair)', border:'1px solid var(--cs-bord)', borderRadius:'8px', boxShadow:'var(--cs-ombre-modale)', padding:'20px 22px', maxWidth:'21.25rem', width:'100%' }}>
            <p style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.875rem', fontWeight:600, color:'var(--cs-encre)', margin:'0 0 8px' }}>Écraser la recherche précédente ?</p>
            <p style={{ fontSize:'0.75rem', color:'var(--cs-texte-second)', lineHeight:1.5, margin:'0 0 16px' }}>
              Une recherche est déjà enregistrée (« {rechercheSauvee.query} », {formatDateCourt(rechercheSauvee.ts)}).
              L’enregistrer maintenant remplacera cette sauvegarde par « {lastQuery} ».
            </p>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmEcrasement(false)}
                style={{ fontSize:'0.71875rem', padding:'6px 14px', border:'1px solid var(--cs-bord)', borderRadius:'8px', background:'var(--cs-surface)', color:'var(--cs-texte-second)', cursor:'pointer' }}>Annuler</button>
              <button onClick={() => { ecrireRecherche(); setConfirmEcrasement(false) }}
                style={{ fontSize:'0.71875rem', padding:'6px 14px', border:'none', borderRadius:'8px', background:'var(--cs-vert-aplat)', color:'var(--cs-sur-aplat)', fontWeight:600, cursor:'pointer' }}>Écraser</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p style={{ fontSize:'0.75rem', color:'var(--cs-texte-faible)', fontStyle:'italic', marginTop:'24px', textAlign:'center' }}>{texte}</p>
}
