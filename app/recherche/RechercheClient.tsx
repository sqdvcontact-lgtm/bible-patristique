'use client'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { nettoyerFin } from '@/app/lib/ponctuation'
import { texteSansEnrichissement, rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { cesurerGrec, codeLangue } from '@/app/lib/grec'

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

const NOMBRES_FR = ['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix',
  'onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf','vingt']
function nombreFr(n: number): string {
  return n <= 20 ? NOMBRES_FR[n] : String(n)
}

// Abréviation française, avec une espace après le numéro de livre : « 1Co » → « 1 Co »,
// « 2P » → « 2 P ». On ne touche pas la table ABREV_FR (partagée par tout le site) ;
// l'espacement est propre à l'affichage des résultats de recherche.
function abrevFr(code: string): string {
  return (ABREV_FR[code] || code).replace(/^([1-3])(\p{L})/u, '$1 $2')
}
function refFr(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  return cv[1] ? `${abrevFr(p[0])} ${cv[0]}, ${cv[1]}` : `${abrevFr(p[0])} ${cv[0]}`
}

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
  id: number; segment_texte: string; id_oeuvre: string
  ref_niv1: string | null; ref_niv3: string | null
  auteur_nom: string; oeuvre_titre: string
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
// `rouge` : surligne l'occurrence en rouge au lieu du vert. Sert dans l'onglet Bible
// quand le mot cherché est ABSENT de la traduction affichée mais présent ailleurs : on
// montre alors le verset d'une traduction qui le porte, l'occurrence en rouge.
// Surligne les occurrences du terme dans UN run de texte plat. Renvoie toujours des nœuds
// CLÉS (préfixe `kb`) — pour pouvoir être imbriqué dans l'enrichissement sans collision de clé.
// On construit le regex sur le texte normalisé pour trouver les positions, puis on surligne
// les caractères originaux aux mêmes positions.
function surligneParts(texte: string, terme: string, mode: Mode, rouge: boolean, kb: string): React.ReactNode[] {
  const termes = termesRecherche(terme)
  if (!texte || !termes.length) return [texte]
  const sep = '(^|[\\s\\u202f\\u00a0«»,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0«»,;:!?—.)\\]]|$)' : ''
  const style = rouge
    ? { background: '#f6cfca', color: '#8a1710', fontWeight: 700, borderRadius: '2px', padding: '0 2px' }
    : { background: '#b2ddc2', color: '#12401f', fontWeight: 700, borderRadius: '2px', padding: '0 2px' }
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

function highlighter(texte: string, terme: string, mode: Mode, rouge = false): React.ReactNode {
  if (!texte || !terme) return texte
  const parts = surligneParts(texte, terme, mode, rouge, 'h')
  return parts.length > 1 ? <>{parts}</> : texte
}

// Enrichissement (gras, italique, `<i>` de Sacy…) ET surlignage du mot cherché, ensemble :
// on passe le surligneur en `transform` de rendreTexteEnrichi. Sans cela, la recherche
// affichait soit les balises en clair (onglet Bible), soit un texte appauvri (Polyglotte).
function rendreEtSurligner(texte: string, terme: string, mode: Mode, rouge = false): React.ReactNode {
  if (!texte) return texte
  return rendreTexteEnrichi(texte, (s, key) => surligneParts(s, terme, mode, rouge, key))
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
    supabase.from('traductions').select('trad_id, nom, langue').order('ordre', { ascending: true }).then(({ data }) => {
      if (data?.length) {
        const trads = data.map((t: any) => ({ code: t.trad_id, label: t.nom, lang: codeLangue(t.langue) }))
        setTraductions(trads)
        setColTrads(trads.slice(0, 3).map((t: { code: string }) => t.code))
      }
    })
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
          if (fragments) {
            return pagine((de, a) => {
              let r = supabase.from('segments').select('id, segment_texte, id_oeuvre, ref_niv1, ref_niv3') as any
              for (const t of termes) r = r.ilike('segment_texte', `%${t}%`)
              return r.range(de, a)
            }, signal)
          } else if (vars && vars.length > 1) {
            const seenSeg = new Set<number>()
            const merged: any[] = []
            for (const v of vars) {
              const rows = await pagine((de, a) => supabase.rpc('recherche_segments', { p_terme: v, p_exact: modeActif === 'exact' }).range(de, a), signal)
              for (const row of rows) if (!seenSeg.has(row.id)) { seenSeg.add(row.id); merged.push(row) }
            }
            return merged
          } else {
            return pagine((de, a) => supabase.rpc('recherche_segments', { p_terme: q, p_exact: modeActif === 'exact' }).range(de, a), signal)
          }
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
        candidatsSeg.some(mv => contientTerme(s.segment_texte ?? '', mv, modeActif)))
      const oeuvreIds = [...new Set(segs.map((s: any) => s.id_oeuvre))]
      let oeuvreMap: Record<string, { titre: string; auteur: string }> = {}
      if (oeuvreIds.length) {
        const { data: oeuvres } = await supabase.from('oeuvres').select('id_oeuvre, titre, note, auteurs(nom)')
          .in('id_oeuvre', oeuvreIds).limit(oeuvreIds.length).abortSignal(signal)
        if (signal.aborted) return
        ;((oeuvres ?? []) as any[]).filter(estOeuvrePubliee).forEach((o: any) => { oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: o.auteurs?.nom || '' } })
      }
      const segsPublies = segs.filter((s: any) => oeuvreMap[s.id_oeuvre])
      setSegmentsRes(segsPublies.map((s: any) => ({ ...s, auteur_nom: oeuvreMap[s.id_oeuvre]?.auteur || '', oeuvre_titre: oeuvreMap[s.id_oeuvre]?.titre || '' })))

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
        .res-card { display:block; text-decoration:none; padding:6px 12px; background:#fff; border-radius:7px; border:1px solid #e4dfd8; transition:border-color 0.12s, box-shadow 0.12s; }
        .res-card:hover { border-color:#3d6b4f; box-shadow:0 1px 6px rgba(61,107,79,0.10); }
        .res-card--absent { background:#fff9f7; border-color:#f0c4b8; }
        .res-card--absent:hover { border-color:#c0562a; }
        /* Lignes de répartition cliquables (filtre par livre / œuvre / publication). */
        .brk-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; width:100%; text-align:left; border:none; background:transparent; cursor:pointer; padding:2px 6px; border-radius:4px; font-size:11px; color:#6b6560; line-height:1.4; font-family:inherit; transition:background 0.1s; }
        .brk-row:hover { background:rgba(61,107,79,0.08); }
        .brk-row--actif { background:rgba(61,107,79,0.15); color:#2a3d30; font-weight:600; }
        .brk-row--actif:hover { background:rgba(61,107,79,0.2); }
        .brk-count { flex-shrink:0; font-size:9.5px; color:#b0a89e; }
        .brk-row--actif .brk-count { color:#6a9a7a; }
        .ong-btn { padding:8px 16px; font-size:11.5px; border:none; border-bottom:3px solid transparent; cursor:pointer; background:transparent; color:#8a8278; font-weight:400; transition:color 0.12s, border-color 0.12s; white-space:nowrap; margin-bottom:-2px; }
        .ong-btn--actif { color:#2a3d30; font-weight:600; border-bottom-color:#3d6b4f; }
        .ong-btn:not(.ong-btn--actif):hover { color:#3d6b4f; border-bottom-color:#c0d8c8; }
        .ong-count { margin-left:5px; font-size:9.5px; color:#c0b8ae; font-weight:400; }
        .ong-btn--actif .ong-count { color:#6a9a7a; }
        .pag-btn { font-size:11px; padding:5px 16px; border:1px solid #d6d0c4; border-radius:20px; background:#fff; color:#3a3530; cursor:pointer; transition:background 0.12s,color 0.12s; }
        .pag-btn:hover:not(:disabled) { background:#3d6b4f; color:#fff; border-color:#3d6b4f; }
        .pag-btn:disabled { color:#c8c0b8; border-color:#ece8e2; cursor:default; }
        .mode-btn { padding:5px 14px; font-size:11px; border:none; cursor:pointer; transition:background 0.12s,color 0.12s; }
        .mode-btn--actif { background:#3d6b4f; color:#fff; font-weight:500; }
        .mode-btn--inactif { background:#fff; color:#6b6560; }
        .mode-btn--inactif:hover { background:#f0ece6; }
        /* ── Polyglotte : palette de la page « Polyglotte » (vert), 3 colonnes ── */
        .poly-outer { border-radius:0 0 8px 8px; border:1px solid #cdd8cf; border-top:none; box-shadow:0 4px 14px rgba(30,46,38,0.10); overflow:hidden; }
        .poly-hd { background:#2b4536; display:grid; gap:0; overflow:hidden; border-radius:8px 8px 0 0; }
        .poly-hd-col { display:flex; align-items:center; gap:6px; padding:0 12px; height:38px; border-right:1px solid rgba(255,255,255,0.14); }
        .poly-hd-col:last-child { border-right:none; }
        .poly-hd-sel { font-size:10px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; text-align:center; text-align-last:center; color:rgba(255,255,255,0.9); background:transparent; border:none; outline:none; cursor:pointer; appearance:none; -webkit-appearance:none; padding:2px 16px; flex:1; transition:color 0.12s; }
        .poly-hd-sel:hover { color:#a8ccb8; }
        .poly-hd-sel option { background:#2b4536; color:#e4ede7; font-weight:400; text-transform:none; font-size:12px; }
        .poly-hd-sel option:disabled { color:#6a8474; }
        .poly-hd-chevron { color:#6a8c76; pointer-events:none; flex-shrink:0; transition:color 0.12s; }
        .poly-hd-col:hover .poly-hd-chevron { color:#a8ccb8; }
        /* ── Corps de la Polyglotte : classes REPRISES TELLES QUELLES de la page de
           lecture (app/polyglotte/page.tsx) — grille, lettrine, césure, espacement. ── */
        .poly-livre-hd { margin:0; padding:2px 12px; font-family:var(--font-source-serif), Georgia, serif; font-size:12.5px; line-height:1.35; color:#1f3b2b; background:#b7d3bf; border-top:1px solid #9fc2ac; border-bottom:1px solid #9fc2ac; text-align:center; }
        .poly-row { display:grid; border-top:1px solid #dfe8e0; font-size:13px; text-decoration:none; }
        .poly-num { padding:5px 4px; text-align:center; font-weight:700; font-size:11.5px; line-height:1.15; color:#3d6b4f; border-right:1px solid #dfe8e0; white-space:nowrap; }
        .poly-texte-cell { min-width:0; padding:5px 10px 6px; border-left:1px solid #dfe8e0; text-align:justify; text-align-last:left; hyphens:auto; -webkit-hyphens:auto; hyphenate-limit-chars:5 2 2; word-spacing:-0.06em; letter-spacing:-0.01em; line-height:1.26; font-family:var(--font-source-serif), Georgia, serif; font-size:12px; color:#2a302b; }
        .poly-texte-cell::after { content:""; display:block; clear:both; }
        .poly-texte-cell--absent { background:#fbeceb; color:#7a1d16; }
        .poly-lettrine { float:left; display:flex; flex-direction:column; align-items:flex-end; margin:0 8px 0 0; padding:0 7px 0 0; border-right:1px solid rgba(61,107,79,0.22); font-family:var(--font-source-sans), Arial, sans-serif; font-weight:400; letter-spacing:0.03em; font-variant-numeric:tabular-nums; color:#6f8f7b; text-align:right; }
        .poly-lettrine-item { position:relative; display:flex; align-items:center; justify-content:flex-end; height:1.26em; }
        .poly-lettrine-ref { display:block; white-space:nowrap; font-size:8.5px; line-height:1; }
        .poly-lettrine-ch { font-weight:400; color:#a9bcb0; }
        .ctrl-sel { font-size:11px; padding:4px 8px; border:1px solid #d6d0c4; border-radius:4px; background:#fff; color:#2a3d30; outline:none; cursor:pointer; }
        .ctrl-sel:focus { border-color:#3d6b4f; }
        /* Info-bulle « Explicitations » : au survol du « ? », les deux modes expliqués. */
        .expl-wrap { position:relative; display:inline-flex; }
        .expl-badge { width:13px; height:13px; border-radius:50%; border:1px solid #b6ccbd; color:#3d6b4f; background:#f2f8f4; font-size:8.5px; font-weight:700; line-height:1; display:inline-flex; align-items:center; justify-content:center; cursor:help; }
        .expl-tip { position:absolute; top:calc(100% + 7px); left:-4px; width:250px; background:#fff; border:1px solid #d6d0c4; border-radius:7px; box-shadow:0 10px 28px rgba(30,46,38,0.14); padding:9px 11px; font-size:10.5px; line-height:1.5; color:#5a5248; text-transform:none; letter-spacing:0; font-weight:400; z-index:200; opacity:0; visibility:hidden; transform:translateY(-3px); transition:opacity 0.14s, transform 0.14s; pointer-events:none; }
        .expl-wrap:hover .expl-tip { opacity:1; visibility:visible; transform:translateY(0); }
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d6d0c4;border-radius:3px}
      `}</style>

      {/* Le layout global (`app/layout.tsx`) décale DÉJÀ le contenu de HAUTEUR_NAVBAR sous
          la navbar. On ne rajoute donc PAS de paddingTop ici (sinon double décalage, gros
          blanc en haut) : on prend simplement toute la hauteur restante sous la navbar. */}
      <div style={{ background:'#f7f4ef', height:'calc(100dvh - 48px)', display:'flex', overflow:'hidden' }}>

        {/* ── VOLET GAUCHE : intitulé · recherche · options · onglets. Collé sous la
            navbar, pleine hauteur. Le bloc du haut est fixe ; les onglets, en dessous,
            prennent le reste et défilent si besoin. */}
        <aside style={{ width:'340px', flexShrink:0, borderRight:'1px solid #d6d0c4', background:'#fbf9f4', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flexShrink:0, padding:'9px 20px 12px', display:'flex', flexDirection:'column', alignItems:'stretch', gap:'9px' }}>

            {/* Titre + nombre total de résultats, sur la même ligne, en tête du volet. */}
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px' }}>
              <span style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'12px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#9a958d', fontWeight:400 }}>Recherche</span>
              {done && (() => {
                const total = versetsRes.length + segmentsRes.length + essaisRes.length
                return <span style={{ fontSize:'10.5px', color:'#b8b0a6', fontStyle:'italic', flexShrink:0 }}>{total} résultat{total > 1 ? 's' : ''}</span>
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
                style={{ width:'100%', fontSize:'13.5px', padding:'8px 38px 8px 14px', border:'1px solid #c8c0b4', borderRadius:'7px', background:'#fff', color:'#2a2520', outline:'none', fontFamily:"var(--font-source-serif), Georgia, serif", boxSizing:'border-box', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }} />
              {query ? (
                <button onClick={() => { setQuery(''); setSugg([]); setDone(false); setVersetsRes([]); setSegmentsRes([]); setEssaisRes([]); setShowSugg(false) }}
                  style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#c0b8ae', fontSize:'16px', lineHeight:1, padding:0 }} title="Effacer">×</button>
              ) : (
                <svg style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', color:'#c8c0b4', pointerEvents:'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              )}
              {showSugg && sugg.length > 0 && (
                <ul ref={suggRef} style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'#fff', border:'1px solid #c8c0b4', borderRadius:'8px', boxShadow:'0 6px 20px rgba(0,0,0,0.09)', margin:0, padding:'5px 0 0', listStyle:'none', zIndex:100, maxHeight:'300px', overflowY:'auto' }}>
                  {sugg.map(s => (
                    <li key={s.mot}
                      onMouseDown={e => { e.preventDefault(); setQuery(s.mot); setShowSugg(false); lancer(s.mot) }}
                      style={{ padding:'7px 18px', fontSize:'14px', color:'#2a2520', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"var(--font-source-serif), Georgia, serif" }}
                      onMouseEnter={e => (e.currentTarget.style.background='#f4f0ea')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <span>{s.mot}</span>
                      {s.freq > 0 && <span style={{ fontSize:'10px', color:'#c0b8ae' }}>{s.freq}</span>}
                    </li>
                  ))}
                  {/* Tout rechercher : lance la recherche par DÉBUT DE MOT sur ce qui est
                      tapé, ce qui couvre d'un coup tous les mots proposés dans la liste
                      (ils commencent tous par le préfixe). Légèrement mis en évidence. */}
                  <li
                    onMouseDown={e => { e.preventDefault(); setShowSugg(false); setMode('prefixe'); lancer(query, 'prefixe') }}
                    style={{ marginTop:'4px', borderTop:'1px solid #ede9e2', padding:'9px 18px', fontSize:'12.5px', fontWeight:600, color:'#2f6046', background:'#f2f8f4', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', letterSpacing:'0.01em' }}
                    onMouseEnter={e => (e.currentTarget.style.background='#e7f2ea')}
                    onMouseLeave={e => (e.currentTarget.style.background='#f2f8f4')}>
                    <span>Tout rechercher</span>
                    <span style={{ fontSize:'13px' }}>↵</span>
                  </li>
                </ul>
              )}
            </div>

            {/* Contrôles, en colonne dans le volet */}
            <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
              {/* Mode + « Explicitations » en INFO-BULLE au survol du « ? » : les deux
                  explications ensemble, ce qui évite l'encart qui alourdissait le volet. */}
              <div>
                <p style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#9a958d', margin:'0 0 5px', display:'flex', alignItems:'center', gap:'3px' }}>
                  Mode
                  <span className="expl-wrap">
                    <span className="expl-badge">?</span>
                    <span className="expl-tip">
                      <span style={{ display:'block', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', fontSize:'8.5px', color:'#9a958d', marginBottom:'4px' }}>Explicitations</span>
                      <span style={{ display:'block', marginBottom:'6px' }}><strong style={{ color:'#2f6046' }}>Début de mot</strong> — trouve les mots qui <em>commencent</em> par ce que vous tapez : « glo » ramène <em>gloire</em>, <em>glorieux</em>, <em>glorifier</em>. Vous pouvez en chercher <strong>plusieurs à la fois</strong> : « glo mis » ramène les passages où figurent ensemble un mot en <em>glo-</em> et un mot en <em>mis-</em>.</span>
                      <span style={{ display:'block' }}><strong style={{ color:'#2f6046' }}>Mot exact</strong> — ne trouve que le mot <em>entier</em> : « gloire » ne ramène ni <em>glorieux</em> ni <em>gloires</em>. Vous pouvez chercher <strong>plusieurs mots entiers</strong> qui ne se suivent pas : « gloire Dieu » ramène les passages contenant l'un et l'autre.</span>
                    </span>
                  </span>
                </p>
                <div style={{ display:'flex', border:'1px solid #d6d0c4', borderRadius:'5px', overflow:'hidden' }}>
                  <button className={`mode-btn ${mode==='prefixe'?'mode-btn--actif':'mode-btn--inactif'}`} style={{ flex:1 }} onClick={()=>setMode('prefixe')}>Début de mot</button>
                  <button className={`mode-btn ${mode==='exact'?'mode-btn--actif':'mode-btn--inactif'}`} style={{ flex:1, borderLeft:'1px solid #d6d0c4' }} onClick={()=>setMode('exact')}>Mot exact</button>
                </div>
              </div>
              {/* « Chercher dans » (périmètre) et « Afficher en » (traduction montrée),
                  côte à côte pour tenir sur une seule ligne. « Afficher en » ne disparaît
                  jamais : il commande l'affichage quel que soit le périmètre. */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div>
                  <p style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9a958d', margin:'0 0 4px' }}>Chercher dans</p>
                  <select className="ctrl-sel" style={{ width:'100%' }} value={tradScope}
                    onChange={e => { const v=e.target.value; setTradScope(v); if(v!=='ALL') setTradAffichage(v) }}>
                    <option value="ALL">Toutes les bibles</option>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize:'9px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9a958d', margin:'0 0 4px' }}>Afficher en</p>
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
                      style={{ display:'flex', alignItems:'center', gap:'7px', width:'100%', textAlign:'left', fontSize:'11px', color:'#3d6b4f', background:'rgba(61,107,79,0.06)', border:'1px solid #cdd8cf', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(61,107,79,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background='rgba(61,107,79,0.06)')}>
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
                      style={{ display:'flex', alignItems:'center', gap:'7px', width:'100%', textAlign:'left', fontSize:'11px', color:'#3d6b4f', background:'rgba(61,107,79,0.06)', border:'1px solid #cdd8cf', borderRadius:'6px', padding:'5px 10px', cursor:'pointer', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(61,107,79,0.12)')}
                      onMouseLeave={e => (e.currentTarget.style.background='rgba(61,107,79,0.06)')}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                        <path d="M2.5 7a4.5 4.5 0 1 1 1.3 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                        <path d="M2.2 4.2v2.6h2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        Reprendre ma recherche
                        <span style={{ color:'#9a958d', fontStyle:'italic' }}> {rechercheSauvee.query}</span>
                      </span>
                      {rechercheSauvee.ts ? <span style={{ flexShrink:0, color:'#b8b0a6', fontStyle:'italic', fontSize:'9.5px' }}>{formatDateCourt(rechercheSauvee.ts)}</span> : null}
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
            <nav style={{ flex:1, minHeight:0, overflowY:'auto', borderTop:'1px solid #e4dfd8', padding:'6px 0 10px' }}>
              {([
                { k:'bible', label:'Bible', n:versetsRes.length },
                { k:'polyglotte', label:'Polyglotte', n:versetsRes.length },
                { k:'patristique', label:'Pères de l’Église', n:segmentsRes.length },
                { k:'essais', label:'Publications de la communauté', n:essaisRes.length },
              ] as { k:Onglet; label:string; n:number }[]).map(o => {
                const actif = onglet===o.k
                return (
                  <Fragment key={o.k}>
                    <button onClick={()=>setOnglet(o.k)}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px', padding:'9px 20px', border:'none', borderLeft:`3px solid ${actif?'#3d6b4f':'transparent'}`, background:actif?'rgba(61,107,79,0.07)':'transparent', color:actif?'#2a3d30':'#6b6560', fontWeight:actif?600:400, fontSize:'12.5px', cursor:'pointer', textAlign:'left', fontFamily:"var(--font-source-serif), Georgia, serif", transition:'background 0.12s, color 0.12s' }}>
                      <span style={{ whiteSpace:'normal', lineHeight:1.25 }}>{o.label}</span>
                      <span style={{ flexShrink:0, fontSize:'10px', color:actif?'#6a9a7a':'#c0b8ae', fontWeight:400 }}>{o.n}</span>
                    </button>
                    {/* Répartition détaillée sous l'onglet actif : livres (Bible/Polyglotte),
                        œuvres (Pères), publications (communauté), avec le nombre d'occurrences.
                        Chaque ligne est CLIQUABLE : elle restreint les résultats à ce
                        regroupement ; un second clic sur la même ligne annule le filtre. */}
                    {actif && o.n > 0 && (
                      <div style={{ padding:'2px 14px 8px 26px', display:'flex', flexDirection:'column', gap:'1px' }}>
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
                                <span style={{ color: sel ? 'inherit' : '#4a453f' }}>{r.auteur}</span>
                                {r.titre && <span style={{ color: sel ? 'inherit' : '#9a958d', fontStyle:'italic' }}> — {r.titre}</span>}
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
        <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Bannière troncature */}
          {done && tronque.length > 0 && (
            <div style={{ flexShrink:0, background:'#fef8ec', border:'1px solid #e8c96a', borderRadius:'6px', padding:'7px 14px', margin:'12px 24px 0', display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'13px' }}>⚠️</span>
              <span style={{ fontSize:'11.5px', color:'#7a5a10' }}>
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
          <div ref={zoneResultatsRef} style={{ flex:1, overflowY:'auto', scrollbarGutter:'stable', padding: (done && onglet==='polyglotte' && versetsRes.length > 0) ? '0 22px 4px' : '6px 22px 4px' }}>

            {!done && !loading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:'70px' }}>
                {/* Cul-de-lampe (cristaux enflammés) au-dessus de l'invite. `multiply` fond
                    le fond blanc du dessin dans le papier de la page. */}
                <img src="/ornements/cul-de-lampe-cristaux.png" alt="" aria-hidden="true"
                  style={{ width:'min(300px, 56%)', height:'auto', opacity:0.5, mixBlendMode:'multiply', marginBottom:'22px' }} />
                <p style={{ fontSize:'13px', color:'#c0b8ae', fontStyle:'italic', letterSpacing:'0.02em' }}>Lancez une recherche</p>
              </div>
            )}
            {loading && (
              <div style={{ textAlign:'center', marginTop:'80px' }}>
                <p style={{ fontSize:'13px', color:'#b0a89e', fontStyle:'italic' }}>Recherche en cours…</p>
              </div>
            )}

            {/* ── Bible ── */}
            {done && onglet==='bible' && (
              versetsFiltres.length===0
                ? <Vide texte="Aucun verset trouvé." />
                : <>
                  <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                    {versetsPageBible.map(v => {
                      const texte = String((v as any)[tradBible]??'')
                      const labelDisplay = traductions.find(t=>t.code===tradBible)?.label ?? tradBible
                      const displayLeMot = !!(lastQuery && contientTerme(texte, lastQuery, mode))
                      // TOUTES les traductions qui contiennent le mot, listées sur la ligne du
                      // haut. La traduction affichée est barrée si le mot n'y figure pas ; les
                      // traductions qui le portent s'affichent alors en rouge discret.
                      const contientDans = lastQuery
                        ? traductions.filter(t => contientTerme(String((v as any)[t.code]??''), lastQuery, mode))
                        : []
                      return (
                        <a key={v.id_verset}
                          // Lien vers la page Bible : livre, chapitre, verset ET la traduction
                          // choisie, avec l'ancre du verset pour l'y amener et l'y sélectionner.
                          href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}&trad=${tradBible}#verset-${v.verset}`}
                          target="_blank" rel="noopener noreferrer"
                          className={`res-card${!displayLeMot && contientDans.length ? ' res-card--absent' : ''}`}>
                          {/* Référence (couleur neutre, pas verte), traduction affichée (barrée si
                              le mot y est absent) puis TOUTES les traductions qui contiennent le mot. */}
                          <div style={{ display:'flex', alignItems:'baseline', gap:'8px', flexWrap:'wrap', marginBottom:'2px' }}>
                            <span style={{ fontSize:'10.5px', fontWeight:600, color:'#5a5248', letterSpacing:'0.01em' }}>{refFr(v.ref)}</span>
                            <span style={{ fontSize:'9.5px', color:'#c0b8ae', textDecoration: displayLeMot ? 'none' : 'line-through' }}>{labelDisplay}</span>
                            {contientDans.length > 0 && (
                              <span style={{ fontSize:'9.5px', color: displayLeMot ? '#9a958d' : '#bd6a60', fontWeight: displayLeMot ? 400 : 600 }}>
                                {contientDans.map(t=>t.label).join(', ')}
                              </span>
                            )}
                          </div>
                          {/* Toujours le texte de la traduction CHOISIE, SANS SÉRIF. Surligné si le
                              mot y est ; sinon montré tel quel (la ligne du haut dit où il se trouve). */}
                          <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'12.5px', lineHeight:1.4, color:'#2a2520', margin:0 }}>
                            {texte
                              ? rendreEtSurligner(texte, lastQuery, mode)
                              : <span style={{ color:'#b0a89e', fontStyle:'italic' }}>Ce verset n’existe pas dans {labelDisplay}.</span>}
                          </p>
                        </a>
                      )
                    })}
                  </div>
                </>
            )}

            {/* ── Patristique ── */}
            {done && onglet==='patristique' && (
              segmentsFiltres.length===0
                ? <Vide texte="Aucun passage trouvé." />
                : <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                  {segmentsPage.map(s=>(
                    <a key={s.id} href={`/oeuvre/${encodeURIComponent(s.id_oeuvre)}?segment=${s.id}#segment-${s.id}`}
                      target="_blank" rel="noopener noreferrer" className="res-card">
                      {/* Auteur, titre de l'œuvre PUIS niveau 1, tout sur une même ligne, séparés
                          par une espace claire (plus de point médian). Le niveau 1 ne paraît que
                          s'il existe. Résultats triés par nom d'auteur (alphabétique). */}
                      <div style={{ display:'flex', alignItems:'baseline', gap:'8px', flexWrap:'wrap', marginBottom:'2px' }}>
                        <span style={{ fontSize:'10.5px', fontWeight:600, color:'#3d6b4f' }}>{s.auteur_nom}</span>
                        {s.oeuvre_titre && <span style={{ fontSize:'9.5px', color:'#9a958d', fontStyle:'italic' }}>{s.oeuvre_titre}</span>}
                        {s.ref_niv1 && <span style={{ fontSize:'9.5px', color:'#c0b8ae' }}>{s.ref_niv1}</span>}
                      </div>
                      <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'12.5px', lineHeight:1.4, color:'#2a2520', margin:0 }}>
                        {rendreEtSurligner(nettoyerFin(s.segment_texte), lastQuery, mode)}
                      </p>
                    </a>
                  ))}
                </div>
            )}

            {/* ── Essais ── */}
            {done && onglet==='essais' && (
              essaisFiltres.length===0
                ? <Vide texte="Aucun essai trouvé." />
                : <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  {essaisPage.map(e=>{
                    const extrait = snippetEssai(e.contenu, lastQuery)
                    const texteAffiche = (e.resume && contientTerme(e.resume, lastQuery, mode)) ? e.resume : extrait
                    return (
                      <a key={e.id} href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer" className="res-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'3px' }}>
                          <span style={{ fontSize:'10.5px', fontWeight:600, color:'#3d6b4f' }}>{e.titre}</span>
                          {e.categories?.[0] && <span style={{ fontSize:'9.5px', color:'#c0b8ae', fontStyle:'italic' }}>{e.categories[0]}</span>}
                        </div>
                        {e.sous_titre && <p style={{ fontSize:'11px', color:'#8a8278', fontStyle:'italic', margin:'0 0 3px' }}>{e.sous_titre}</p>}
                        <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'12.5px', lineHeight:1.55, color:'#2a2520', margin:0 }}>
                          {highlighter(texteAffiche, lastQuery, mode)}
                        </p>
                      </a>
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
                          const fond = '#fbfdfb'
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
                                    <div key={i} lang={lang} className={`poly-texte-cell${absent ? ' poly-texte-cell--absent' : ''}`}>
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
                                      {!brut ? <span style={{ display:'block', textAlign:'center', textAlignLast:'center', color:'#8aa593', fontStyle:'italic', fontSize:'11px' }}>Absent dans cette traduction</span>
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
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 24px 14px', borderTop:'1px solid #e4dfd8' }}>
              {/* Maintien enfoncé = défilement rapide (souris ET tactile). */}
              <button className="pag-btn" disabled={pageActive===0}
                onMouseDown={()=>demarrerDefilement(-1)} onMouseUp={arreterDefilement} onMouseLeave={arreterDefilement}
                onTouchStart={e=>{e.preventDefault();demarrerDefilement(-1)}} onTouchEnd={arreterDefilement}>← Précédent</button>
              <span style={{ fontSize:'11px', color:'#b0a89e' }}>{debut}–{fin} <span style={{ color:'#d6d0c4' }}>sur</span> {totalActive}</span>
              <button className="pag-btn" disabled={pageActive>=pagesTotal-1}
                onMouseDown={()=>demarrerDefilement(1)} onMouseUp={arreterDefilement} onMouseLeave={arreterDefilement}
                onTouchStart={e=>{e.preventDefault();demarrerDefilement(1)}} onTouchEnd={arreterDefilement}>Suivant →</button>
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
            style={{ background:'#fbf9f4', border:'1px solid #d6d0c4', borderRadius:'10px', boxShadow:'0 14px 40px rgba(30,46,38,0.25)', padding:'20px 22px', maxWidth:'340px', width:'100%' }}>
            <p style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'14px', fontWeight:600, color:'#2a3d30', margin:'0 0 8px' }}>Écraser la recherche précédente ?</p>
            <p style={{ fontSize:'12px', color:'#6b6560', lineHeight:1.5, margin:'0 0 16px' }}>
              Une recherche est déjà enregistrée (« {rechercheSauvee.query} », {formatDateCourt(rechercheSauvee.ts)}).
              L'enregistrer maintenant remplacera cette sauvegarde par « {lastQuery} ».
            </p>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmEcrasement(false)}
                style={{ fontSize:'11.5px', padding:'6px 14px', border:'1px solid #d6d0c4', borderRadius:'6px', background:'#fff', color:'#6b6560', cursor:'pointer' }}>Annuler</button>
              <button onClick={() => { ecrireRecherche(); setConfirmEcrasement(false) }}
                style={{ fontSize:'11.5px', padding:'6px 14px', border:'none', borderRadius:'6px', background:'#3d6b4f', color:'#fff', fontWeight:600, cursor:'pointer' }}>Écraser</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p style={{ fontSize:'12px', color:'#b0a89e', fontStyle:'italic', marginTop:'24px', textAlign:'center' }}>{texte}</p>
}
