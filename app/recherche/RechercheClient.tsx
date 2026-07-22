'use client'
import { ABREV_FR } from '@/app/lib/bible'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { nettoyerFin } from '@/app/lib/ponctuation'
import { texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'

// ── Graphies & normalisation (hérités de la concordance) ─────────────────────
function normaliser(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[''ʼ]/g, "'")
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

function refFr(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  return cv[1] ? `${ABREV_FR[p[0]] || p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] || p[0]} ${cv[0]}`
}

const NOMS_LIVRES: Record<string, string> = {
  GEN:'Genèse',EXO:'Exode',LEV:'Lévitique',NUM:'Nombres',DEU:'Deutéronome',
  JOS:'Josué',JDG:'Juges',RUT:'Ruth','1SA':'1 Samuel','2SA':'2 Samuel',
  '1KI':'1 Rois','2KI':'2 Rois','1CH':'1 Chroniques','2CH':'2 Chroniques',
  EZR:'Esdras',NEH:'Néhémie',EST:'Esther',JOB:'Job',PSA:'Psaumes',
  PRO:'Proverbes',ECC:'Ecclésiaste',SNG:'Cantique',ISA:'Isaïe',JER:'Jérémie',
  LAM:'Lamentations',EZK:'Ézéchiel',DAN:'Daniel',HOS:'Osée',JOL:'Joël',
  AMO:'Amos',OBA:'Abdias',JON:'Jonas',MIC:'Michée',NAM:'Nahum',HAB:'Habacuc',
  ZEP:'Sophonie',HAG:'Aggée',ZEC:'Zacharie',MAL:'Malachie',
  MAT:'Matthieu',MRK:'Marc',LUK:'Luc',JHN:'Jean',ACT:'Actes',ROM:'Romains',
  '1CO':'1 Corinthiens','2CO':'2 Corinthiens',GAL:'Galates',EPH:'Éphésiens',
  PHP:'Philippiens',COL:'Colossiens','1TH':'1 Thessaloniciens','2TH':'2 Thessaloniciens',
  '1TI':'1 Timothée','2TI':'2 Timothée',TIT:'Tite',PHM:'Philémon',HEB:'Hébreux',
  JAS:'Jacques','1PE':'1 Pierre','2PE':'2 Pierre','1JN':'1 Jean','2JN':'2 Jean',
  '3JN':'3 Jean',JUD:'Jude',REV:'Apocalypse',
}

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001', label: 'Bible de Sacy' },
  { code: 'TR0002', label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
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
function highlighter(texte: string, terme: string, mode: Mode): React.ReactNode {
  if (!texte || !terme) return texte
  const termes = termesRecherche(terme)
  if (!termes.length) return texte
  const sep = '(^|[\\s\\u202f\\u00a0«»,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0«»,;:!?—.)\\]]|$)' : ''
  // On construit le regex sur le texte normalisé pour trouver les positions,
  // puis on surligne les caractères originaux aux mêmes positions.
  try {
    const termesN = termes.map(normaliser).sort((a, b) => b.length - a.length)
    const alt = termesN.map(echapperRegex).join('|')
    const re = new RegExp(`${sep}(${alt})${fin}`, 'gi')
    const texteN = normaliser(texte)
    const parts: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null
    while ((m = re.exec(texteN)) !== null) {
      const s = m.index + m[1].length
      const e = s + m[2].length
      if (s > last) parts.push(texte.slice(last, s))
      parts.push(<mark key={s} style={{ background: '#c9e8d4', color: '#1a2e20', borderRadius: '2px', padding: '0 2px' }}>{texte.slice(s, e)}</mark>)
      last = e
    }
    if (last < texte.length) parts.push(texte.slice(last))
    return parts.length > 1 ? parts : texte
  } catch { return texte }
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

  const [tradScope, setTradScope] = useState<string>('TR0001')
  const [tradAffichage, setTradAffichage] = useState<string>('TR0001')
  const tradBible = tradScope === 'ALL' ? tradAffichage : tradScope

  const [colTrads, setColTrads] = useState<string[]>(['TR0001','TR0002','TR0003','TR0004'])
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
  const dejaLanceRef = useRef('')
  const [sugg, setSugg]         = useState<{ mot: string; freq: number }[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const [tronque, setTronque]   = useState<string[]>([])
  const inputRef   = useRef<HTMLInputElement>(null)
  const suggTimer  = useRef<ReturnType<typeof setTimeout>>(undefined)
  const suggRef    = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const appliquer = (code?: string | null) => {
      if (code && /^TR\d{4}$/.test(code)) { setTradScope(code); setTradAffichage(code) }
    }
    appliquer(localStorage.getItem('traduction_defaut'))
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { data: profil } = await supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle()
      if (profil?.traduction_defaut) { localStorage.setItem('traduction_defaut', profil.traduction_defaut); appliquer(profil.traduction_defaut) }
    })
    supabase.from('traductions').select('trad_id, nom').order('ordre', { ascending: true }).then(({ data }) => {
      if (data?.length) {
        const trads = data.map((t: any) => ({ code: t.trad_id, label: t.nom }))
        setTraductions(trads)
        setColTrads(trads.slice(0, 4).map((t: { code: string }) => t.code))
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
        const [{ data: dataBible }, { data: dataAuteurs }, { data: dataOeuvres }] = await Promise.all([
          supabase.rpc('suggestions_concordance_fr', { p_prefixe: val, p_limit: 8 }).abortSignal(signal),
          supabase.from('auteurs').select('nom').ilike('nom', `%${val}%`).limit(3).abortSignal(signal),
          supabase.from('oeuvres').select('titre').ilike('titre', `%${val}%`).limit(3).abortSignal(signal),
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

    try {
      const termes = termesRecherche(q)
      const fragments = modeActif === 'prefixe' && termes.length > 1
      const chercheTout = scopeActif === 'ALL'
      const termeNorm = normaliser(q)
      const vars = (!fragments && termeNorm.length >= 2) ? graphiesVariantes(termeNorm) : null

      const tradCodes = traductions.map(t => t.code)
      const selVersets = `id_verset, ref, livre, chapitre, verset, ${tradCodes.join(', ')}`
      const TRADS_CONC = new Set(['TR0001', 'TR0002', 'TR0003'])

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

      // Versets, segments et essais lancés en parallèle
      const [segsFromRpc, resV, resE] = await Promise.all([

        // ── Segments ──────────────────────────────────────────────────────────
        (async (): Promise<any[]> => {
          if (fragments) {
            let reqFrag = supabase.from('segments').select('id, segment_texte, id_oeuvre, ref_niv1, ref_niv3') as any
            for (const t of termes) reqFrag = reqFrag.ilike('segment_texte', `%${t}%`)
            const { data } = await reqFrag.limit(10000).abortSignal(signal)
            return data ?? []
          } else if (vars && vars.length > 1) {
            const seenSeg = new Set<number>()
            const resultats = await Promise.all(
              vars.map(v => supabase.rpc('recherche_segments', { p_terme: v, p_exact: modeActif === 'exact' }).limit(10000).abortSignal(signal))
            )
            const merged: any[] = []
            for (const { data } of resultats) {
              for (const row of (data ?? [])) {
                if (!seenSeg.has(row.id)) { seenSeg.add(row.id); merged.push(row) }
              }
            }
            return merged
          } else {
            const { data } = await supabase.rpc('recherche_segments', { p_terme: q, p_exact: modeActif === 'exact' }).limit(10000).abortSignal(signal)
            return data ?? []
          }
        })(),

        // ── Versets ───────────────────────────────────────────────────────────
        (async () => {
          if (!fragments && vars) {
            const trsFiltres = chercheTout
              ? [...TRADS_CONC]
              : TRADS_CONC.has(scopeActif) ? [scopeActif] : null
            if (trsFiltres) {
              const orClause = vars.map(v => `texte_norm.ilike.%${v}%`).join(',')
              const { data: cvData } = await supabase
                .from('concordance_versets').select('id_verset')
                .in('tr', trsFiltres).or(orClause).limit(10000).abortSignal(signal)
              const ids = [...new Set((cvData ?? []).map((r: any) => r.id_verset))]
              if (!ids.length) return { data: [] }
              return supabase.from('versets_lecture').select(selVersets).in('id_verset', ids).limit(10000).abortSignal(signal)
            } else {
              return supabase.from('versets_lecture').select(selVersets)
                .or(vars.map(v => `${scopeActif}.ilike.%${v}%`).join(',')).limit(10000).abortSignal(signal)
            }
          } else if (chercheTout) {
            let r = supabase.from('versets_lecture').select(selVersets)
            if (fragments) {
              for (const t of termes) r = r.or(tradCodes.map(c => `${c}.ilike.%${t}%`).join(','))
            } else {
              r = r.or(tradCodes.map(c => `${c}.ilike.%${q}%`).join(','))
            }
            return r.limit(10000).abortSignal(signal)
          } else {
            let r = supabase.from('versets_lecture').select(selVersets)
            for (const t of termes) r = r.ilike(scopeActif, `%${t}%`)
            return r.limit(10000).abortSignal(signal)
          }
        })(),

        // ── Essais ────────────────────────────────────────────────────────────
        reqE,
      ])

      if (signal.aborted) return

      // Détection troncature — seuils alignés sur les limites réelles
      const limiteE = fragments ? 500 : 200
      const avertissements: string[] = []
      if ((resV.data?.length ?? 0) >= 10000) avertissements.push('Bible')
      if (segsFromRpc.length >= 10000) avertissements.push('Patristique')
      if ((resE.data?.length ?? 0) >= limiteE) avertissements.push('Publications')
      if (avertissements.length) setTronque(avertissements)

      // Filtre client versets
      // `as unknown` d'abord : le client Supabase type `data` comme pouvant être
      // une erreur, et TypeScript refuse la conversion directe faute de
      // recouvrement entre les deux formes. Le `?? []` couvre déjà le cas nul.
      const versetsRaw = (resV.data ?? []) as unknown as VersetResult[]
      let versets: VersetResult[]
      if (chercheTout) {
        versets = (fragments || modeActif === 'exact')
          ? versetsRaw.filter(v => tradCodes.some(c => contientTerme(v[c] ?? '', q, modeActif)))
          : versetsRaw
      } else if (fragments) {
        versets = versetsRaw.filter(v => contientTerme(String(v[scopeActif] ?? ''), q, modeActif))
      } else if (modeActif === 'exact') {
        versets = versetsRaw.filter(v => contientTerme(String(v[scopeActif] ?? ''), q, 'exact'))
      } else {
        versets = versetsRaw
      }
      setVersetsRes(versets)

      // Essais
      const essais = (resE.data ?? []) as EssaiResult[]
      setEssaisRes(fragments ? essais.filter(e => contientTerme([e.titre, e.sous_titre, e.resume, e.contenu].filter(Boolean).join(' '), q, modeActif)) : essais)

      // Segments + oeuvres
      const segs = (segsFromRpc as any[]).filter((s: any) => !fragments || contientTerme(s.segment_texte, q, modeActif))
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
    if (!q) return
    const modeParam: Mode = searchParams.get('mode') === 'exact' ? 'exact' : 'prefixe'
    setQuery(q); setMode(modeParam)
    const cle = `${q}|${modeParam}`
    if (dejaLanceRef.current === cle) return
    dejaLanceRef.current = cle
    void lancer(q, modeParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const versetsPage  = versetsRes.slice(pageV * PAGE, (pageV + 1) * PAGE)
  const segmentsPage = segmentsRes.slice(pageS * PAGE, (pageS + 1) * PAGE)
  const essaisPage   = essaisRes.slice(pageE * PAGE, (pageE + 1) * PAGE)

  const totalActive  = onglet === 'bible' || onglet === 'polyglotte' ? versetsRes.length
    : onglet === 'patristique' ? segmentsRes.length : essaisRes.length
  const pageActive   = onglet === 'patristique' ? pageS : onglet === 'essais' ? pageE : pageV
  const setPageActive = onglet === 'patristique' ? setPageS : onglet === 'essais' ? setPageE : setPageV
  const pagesTotal   = Math.ceil(totalActive / PAGE)
  const debut = pageActive * PAGE + 1
  const fin   = Math.min((pageActive + 1) * PAGE, totalActive)

  return (
    <>
      <style>{`
        .res-card { display:block; text-decoration:none; padding:10px 14px; background:#fff; border-radius:7px; border:1px solid #e4dfd8; transition:border-color 0.12s, box-shadow 0.12s; }
        .res-card:hover { border-color:#3d6b4f; box-shadow:0 1px 6px rgba(61,107,79,0.10); }
        .res-card--absent { background:#fff9f7; border-color:#f0c4b8; }
        .res-card--absent:hover { border-color:#c0562a; }
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
        /* ── Polyglotte ── */
        /* outer sans overflow:hidden → sticky fonctionne */
        .poly-outer { border-radius:0 0 8px 8px; border:1px solid #b0a89c; border-top:none; box-shadow:0 4px 14px rgba(0,0,0,0.13); overflow:hidden; }
        .poly-hd { background:#2c3830; display:grid; gap:0; overflow:hidden; border:1px solid #b0a89c; border-bottom:none; border-radius:8px 8px 0 0; }
        .poly-hd-col { display:flex; align-items:center; gap:6px; padding:0 12px; height:38px; border-right:1px solid #3a4e42; }
        .poly-hd-col:last-child { border-right:none; }
        .poly-hd-sel { font-size:10px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; color:#d4cec6; background:transparent; border:none; outline:none; cursor:pointer; appearance:none; -webkit-appearance:none; padding:2px 18px 2px 0; flex:1; transition:color 0.12s; }
        .poly-hd-sel:hover { color:#a8ccb8; }
        .poly-hd-sel option { background:#2c3830; color:#d4cec6; font-weight:400; text-transform:none; font-size:12px; }
        .poly-hd-sel option:disabled { color:#4e6058; }
        .poly-hd-chevron { color:#5a7a66; pointer-events:none; flex-shrink:0; transition:color 0.12s; }
        .poly-hd-col:hover .poly-hd-chevron { color:#8ab89e; }
        /* Corps : overflow:hidden pour border-radius bas */
        .poly-wrap { }
        /* En-tête livre : séparateur fort entre groupes */
        .poly-livre-hd { padding:5px 14px 5px; background:#bfb8ae; border-bottom:1px solid #b0a89c; display:flex; align-items:center; gap:8px; }
        .poly-livre-sep { height:3px; background:#9a9088; }
        /* Verset */
        .poly-card { background:transparent; border-bottom:1px solid #c8c0b4; }
        .poly-card:last-child { border-bottom:none; }
        .poly-ref { padding:5px 14px; background:#d8d0c4; border-bottom:1px solid #c8c0b4; display:flex; align-items:center; gap:8px; transition:background 0.15s; }
        /* Colonnes : parchemin alternant */
        .poly-col { padding:11px 14px; border-right:1px solid #c8c0b4; background:#eae4da; transition:background 0.15s; }
        .poly-col:last-child { border-right:none; }
        .poly-col-even { background:#e0d9ce; }
        .poly-col--absent { background:#e4cac4; }
        /* Survol : vert pâle partout, rose renforcé sur absents */
        .poly-card--survol .poly-ref { background:#bcd4c8; }
        .poly-col--survol { background:#cce0d2 !important; }
        .poly-col--absent.poly-col--survol { background:#caa09a !important; }
        .ctrl-sel { font-size:11px; padding:4px 8px; border:1px solid #d6d0c4; border-radius:4px; background:#fff; color:#2a3d30; outline:none; cursor:pointer; }
        .ctrl-sel:focus { border-color:#3d6b4f; }
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d6d0c4;border-radius:3px}
      `}</style>

      <div style={{ background:'#f7f4ef', height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', paddingTop:'48px' }}>

        {/* ── En-tête ── */}
        <div style={{ padding:'22px 40px 16px', borderBottom:'1px solid #d6d0c4', background:'#f7f4ef', flexShrink:0 }}>
          <div style={{ maxWidth:'640px', margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center', gap:'14px' }}>

            {/* Titre */}
            <span style={{ fontFamily:"Georgia, serif", fontSize:'13px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#9a958d', fontWeight:400 }}>Recherche</span>

            {/* Champ principal */}
            <div style={{ position:'relative', width:'100%' }}>
              <input ref={inputRef} type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setShowSugg(false); lancer() }
                  if (e.key === 'Escape') setShowSugg(false)
                }}
                onFocus={() => sugg.length > 0 && setShowSugg(true)}
                placeholder="Chercher un mot, une expression…"
                autoFocus
                style={{ width:'100%', fontSize:'16px', padding:'11px 44px 11px 18px', border:'1px solid #c8c0b4', borderRadius:'8px', background:'#fff', color:'#2a2520', outline:'none', fontFamily:"Georgia, serif", boxSizing:'border-box', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }} />
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
                <ul ref={suggRef} style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'#fff', border:'1px solid #c8c0b4', borderRadius:'8px', boxShadow:'0 6px 20px rgba(0,0,0,0.09)', margin:0, padding:'5px 0', listStyle:'none', zIndex:100, maxHeight:'240px', overflowY:'auto' }}>
                  {sugg.map(s => (
                    <li key={s.mot}
                      onMouseDown={e => { e.preventDefault(); setQuery(s.mot); setShowSugg(false); lancer(s.mot) }}
                      style={{ padding:'7px 18px', fontSize:'14px', color:'#2a2520', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"Georgia, serif" }}
                      onMouseEnter={e => (e.currentTarget.style.background='#f4f0ea')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <span>{s.mot}</span>
                      {s.freq > 0 && <span style={{ fontSize:'10px', color:'#c0b8ae' }}>{s.freq}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Contrôles secondaires */}
            <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap', justifyContent:'center' }}>
              {/* Mode */}
              <div style={{ display:'inline-flex', border:'1px solid #d6d0c4', borderRadius:'5px', overflow:'hidden' }}>
                <button className={`mode-btn ${mode==='prefixe'?'mode-btn--actif':'mode-btn--inactif'}`} onClick={()=>setMode('prefixe')}>Préfixe</button>
                <button className={`mode-btn ${mode==='exact'?'mode-btn--actif':'mode-btn--inactif'}`} onClick={()=>setMode('exact')} style={{borderLeft:'1px solid #d6d0c4'}}>Mot exact</button>
              </div>

              {/* Séparateur */}
              <div style={{ width:'1px', height:'18px', background:'#d6d0c4' }} />

              {/* Traduction */}
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                <span style={{ fontSize:'11px', color:'#b0a89e' }}>dans</span>
                <select className="ctrl-sel" value={tradScope}
                  onChange={e => { const v=e.target.value; setTradScope(v); if(v!=='ALL') setTradAffichage(v) }}>
                  {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  <option value="ALL">Toutes les traductions</option>
                </select>
              </div>

              {tradScope==='ALL' && (<>
                <div style={{ width:'1px', height:'18px', background:'#d6d0c4' }} />
                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ fontSize:'11px', color:'#b0a89e' }}>afficher en</span>
                  <select className="ctrl-sel" value={tradAffichage} onChange={e=>setTradAffichage(e.target.value)}>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
              </>)}

              {/* Compteur */}
              {done && (
                <span style={{ fontSize:'10.5px', color:'#b8b0a6', fontStyle:'italic' }}>
                  {versetsRes.length + segmentsRes.length + essaisRes.length} résultat{versetsRes.length + segmentsRes.length + essaisRes.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Corps ── */}
        <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', maxWidth:'1100px', width:'100%', margin:'0 auto', padding:'0 40px' }}>

          {/* Onglets */}
          {done && (
            <div style={{ display:'flex', borderBottom:'2px solid #c8c0b4', flexShrink:0, alignItems:'flex-end', gap:0 }}>
              {/* Groupe Bible */}
              <button className={`ong-btn${onglet==='bible'?' ong-btn--actif':''}`} onClick={()=>setOnglet('bible')}>
                Bible<span className="ong-count">({versetsRes.length})</span>
              </button>
              <button className={`ong-btn${onglet==='polyglotte'?' ong-btn--actif':''}`} onClick={()=>setOnglet('polyglotte')}>
                Polyglotte<span className="ong-count">({versetsRes.length})</span>
              </button>
              {/* Séparateur */}
              <div style={{ width:'1px', height:'28px', background:'#c8c0b4', margin:'0 6px 4px' }} />
              {/* Tradition patristique */}
              <button className={`ong-btn${onglet==='patristique'?' ong-btn--actif':''}`} onClick={()=>setOnglet('patristique')}>
                Tradition patristique<span className="ong-count">({segmentsRes.length})</span>
              </button>
              {/* Séparateur */}
              <div style={{ width:'1px', height:'28px', background:'#c8c0b4', margin:'0 6px 4px' }} />
              {/* Publications */}
              <button className={`ong-btn${onglet==='essais'?' ong-btn--actif':''}`} onClick={()=>setOnglet('essais')}>
                Publications de la communauté<span className="ong-count">({essaisRes.length})</span>
              </button>
            </div>
          )}

          {/* Bannière troncature */}
          {done && tronque.length > 0 && (
            <div style={{ flexShrink:0, background:'#fef8ec', border:'1px solid #e8c96a', borderRadius:'6px', padding:'7px 14px', margin:'10px 0 0', display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'13px' }}>⚠️</span>
              <span style={{ fontSize:'11.5px', color:'#7a5a10' }}>
                Résultats trop nombreux dans {tronque.join(', ')} — seuls les premiers affichés. Affinez votre recherche ou utilisez le mode <strong>Mot exact</strong>.
              </span>
            </div>
          )}

          {/* En-tête polyglotte — hors du scroll pour délimiter proprement */}
          {done && onglet==='polyglotte' && versetsRes.length > 0 && (
            <div className="poly-hd" style={{ gridTemplateColumns:`repeat(${colTrads.length},1fr)`, flexShrink:0, marginTop:'12px' }}>
              {colTrads.map((code, i) => {
                const autresChoisies = new Set(colTrads.filter((_, j) => j !== i))
                const estRecherche = code === tradBible && lastScope !== 'ALL'
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
                    {estRecherche && (
                      <span style={{ fontSize:'8px', color:'#a8d4b8', background:'rgba(168,212,184,0.18)', border:'1px solid rgba(168,212,184,0.35)', borderRadius:'3px', padding:'1px 5px', fontWeight:600, flexShrink:0, letterSpacing:'0.04em', textTransform:'uppercase' }}>recherche</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Résultats */}
          <div style={{ flex:1, overflowY:'auto', scrollbarGutter:'stable', paddingTop: (done && onglet==='polyglotte' && versetsRes.length > 0) ? '0' : '12px', paddingBottom:'4px' }}>

            {!done && !loading && (
              <div style={{ textAlign:'center', marginTop:'80px' }}>
                <p style={{ fontSize:'13px', color:'#c0b8ae', fontStyle:'italic' }}>Saisissez un terme et appuyez sur Entrée</p>
              </div>
            )}
            {loading && (
              <div style={{ textAlign:'center', marginTop:'80px' }}>
                <p style={{ fontSize:'13px', color:'#b0a89e', fontStyle:'italic' }}>Recherche en cours…</p>
              </div>
            )}

            {/* ── Bible ── */}
            {done && onglet==='bible' && (
              versetsRes.length===0
                ? <Vide texte="Aucun verset trouvé." />
                : <>
                  {lastScope==='ALL' && (
                    <p style={{ fontSize:'10.5px', color:'#9a958d', fontStyle:'italic', marginBottom:'10px' }}>
                      Toutes traductions — affiché en {traductions.find(t=>t.code===tradBible)?.label??tradBible}
                    </p>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    {versetsPage.map(v => {
                      const texte = String((v as any)[tradBible]??'')
                      const absent = lastQuery && !contientTerme(texte, lastQuery, mode)
                      return (
                        <a key={v.id_verset}
                          href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}#verset-${v.verset}`}
                          target="_blank" rel="noopener noreferrer"
                          className={`res-card${absent?' res-card--absent':''}`}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'3px' }}>
                            <span style={{ fontSize:'10.5px', fontWeight:600, color:'#3d6b4f', letterSpacing:'0.01em' }}>{refFr(v.ref)}</span>
                            <span style={{ fontSize:'9.5px', color:absent?'#c0562a':'#c0b8ae' }}>
                              {absent ? `absent en ${traductions.find(t=>t.code===tradBible)?.label??tradBible}` : (traductions.find(t=>t.code===tradBible)?.label??tradBible)}
                            </span>
                          </div>
                          <p style={{ fontFamily:"Georgia, serif", fontSize:'12.5px', lineHeight:1.55, color:'#2a2520', margin:0 }}>
                            {absent ? texte : highlighter(texte, lastQuery, mode)}
                          </p>
                        </a>
                      )
                    })}
                  </div>
                </>
            )}

            {/* ── Patristique ── */}
            {done && onglet==='patristique' && (
              segmentsRes.length===0
                ? <Vide texte="Aucun passage trouvé." />
                : <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  {segmentsPage.map(s=>(
                    <a key={s.id} href={`/oeuvre/${encodeURIComponent(s.id_oeuvre)}?segment=${s.id}#segment-${s.id}`}
                      target="_blank" rel="noopener noreferrer" className="res-card">
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'3px' }}>
                        <span style={{ fontSize:'10.5px', fontWeight:600, color:'#3d6b4f' }}>{s.auteur_nom}</span>
                        <span style={{ fontSize:'9.5px', color:'#c0b8ae', fontStyle:'italic' }}>
                          {s.oeuvre_titre}{s.ref_niv1?` — ${s.ref_niv1}`:''}{s.ref_niv3?`, ${s.ref_niv3}`:''}
                        </span>
                      </div>
                      <p style={{ fontFamily:"Georgia, serif", fontSize:'12.5px', lineHeight:1.55, color:'#2a2520', margin:0 }}>
                        {highlighter(nettoyerFin(texteSansEnrichissement(s.segment_texte)), lastQuery, mode)}
                      </p>
                    </a>
                  ))}
                </div>
            )}

            {/* ── Essais ── */}
            {done && onglet==='essais' && (
              essaisRes.length===0
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
                        <p style={{ fontFamily:"Georgia, serif", fontSize:'12.5px', lineHeight:1.55, color:'#2a2520', margin:0 }}>
                          {highlighter(texteAffiche, lastQuery, mode)}
                        </p>
                      </a>
                    )
                  })}
                </div>
            )}

            {/* ── Polyglotte ── */}
            {done && onglet==='polyglotte' && (
              versetsRes.length===0
                ? <Vide texte="Aucun verset trouvé." />
                : <div className="poly-outer">
                  <div className="poly-wrap">
                  {(() => {
                    const livreCompte = new Map<string, number>()
                    for (const v of versetsPage) livreCompte.set(v.livre, (livreCompte.get(v.livre) ?? 0) + 1)
                    const livresVus = new Set<string>()
                    return versetsPage.map(v => {
                      const estNouveauLivre = !livresVus.has(v.livre)
                      if (estNouveauLivre) livresVus.add(v.livre)
                      const survolé = hoveredVerset === v.id_verset
                      const nbLivre = livreCompte.get(v.livre) ?? 0
                      return (
                        <div key={v.id_verset}>
                          {estNouveauLivre && (<>
                            {livresVus.size > 1 && <div className="poly-livre-sep" />}
                            <div className="poly-livre-hd">
                              <span style={{ fontSize:'10px', fontWeight:700, letterSpacing:'0.05em', color:'#3a3530', textTransform:'uppercase', fontFamily:"Georgia, serif" }}>
                                {NOMS_LIVRES[v.livre] ?? v.livre}
                              </span>
                              <span style={{ fontSize:'9px', color:'#6a6460' }}>
                                — {nombreFr(nbLivre)} verset{nbLivre > 1 ? 's' : ''}
                              </span>
                            </div>
                          </>)}
                          <a
                            href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}#verset-${v.verset}`}
                            target="_blank" rel="noopener noreferrer"
                            className={`poly-card${survolé ? ' poly-card--survol' : ''}`}
                            style={{ display:'block', textDecoration:'none' }}
                            onMouseEnter={() => setHoveredVerset(v.id_verset)}
                            onMouseLeave={() => setHoveredVerset(null)}>
                            {/* Référence */}
                            <div className="poly-ref">
                              <span style={{ fontSize:'10.5px', fontWeight:700, color:'#3d6b4f', letterSpacing:'0.04em', fontFamily:"Georgia, serif" }}>{refFr(v.ref)}</span>
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" style={{ color:'#a0988e' }}>
                                <path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            {/* Colonnes */}
                            <div style={{ display:'grid', gridTemplateColumns:`repeat(${colTrads.length},1fr)` }}>
                              {colTrads.map((code, i) => {
                                const texte = texteSansEnrichissement((v as any)[code] ?? '')
                                const absent = texte && lastQuery ? !contientTerme(texte, lastQuery, mode) : false
                                return (
                                  <div key={i} className={`poly-col${i%2===1?' poly-col-even':''}${absent?' poly-col--absent':''}${survolé?' poly-col--survol':''}`}>
                                    {!texte ? (
                                      <span style={{ fontSize:'10px', color:'#b87060', fontStyle:'italic' }}>—</span>
                                    ) : absent ? (
                                      <p style={{ fontFamily:"Georgia, serif", fontSize:'12px', lineHeight:1.6, color:'#2a2520', margin:0 }}>{texte}</p>
                                    ) : (
                                      <p style={{ fontFamily:"Georgia, serif", fontSize:'12px', lineHeight:1.6, color:'#1e1a16', margin:0 }}>
                                        {highlighter(texte, lastQuery, mode)}
                                      </p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </a>
                        </div>
                      )
                    })
                  })()}
                  </div>
                </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {done && totalActive>PAGE && (
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 14px', borderTop:'1px solid #e4dfd8' }}>
              <button className="pag-btn" disabled={pageActive===0} onClick={()=>setPageActive(pageActive-1)}>← Précédent</button>
              <span style={{ fontSize:'11px', color:'#b0a89e' }}>{debut}–{fin} <span style={{ color:'#d6d0c4' }}>sur</span> {totalActive}</span>
              <button className="pag-btn" disabled={pageActive>=pagesTotal-1} onClick={()=>setPageActive(pageActive+1)}>Suivant →</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p style={{ fontSize:'12px', color:'#b0a89e', fontStyle:'italic', marginTop:'24px', textAlign:'center' }}>{texte}</p>
}
