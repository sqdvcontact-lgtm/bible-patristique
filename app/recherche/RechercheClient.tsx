'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'

const ABREV_FR: Record<string, string> = {
  GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt',
  '1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',
  EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',
  ISA:'Is',JER:'Jr',LAM:'Lm',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',
  OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',
  MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',
  GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm',
  '2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P',
  '1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap',
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
  try { return termes.every(t => new RegExp(`${sep}${echapperRegex(t)}${fin}`, 'i').test(texte)) }
  catch { return false }
}
function highlighter(texte: string, terme: string, mode: Mode): React.ReactNode {
  if (!texte || !terme) return texte
  const termes = termesRecherche(terme)
  if (!termes.length) return texte
  const sep = '(^|[\\s\\u202f\\u00a0«»,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0«»,;:!?—.)\\]]|$)' : ''
  try {
    const alt = termes.sort((a, b) => b.length - a.length).map(echapperRegex).join('|')
    const re = new RegExp(`${sep}(${alt})${fin}`, 'gi')
    const parts: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null
    while ((m = re.exec(texte)) !== null) {
      const s = m.index + m[1].length
      if (s > last) parts.push(texte.slice(last, s))
      parts.push(<mark key={s} style={{ background: '#c9e8d4', color: '#1a2e20', borderRadius: '2px', padding: '0 2px' }}>{m[2]}</mark>)
      last = s + m[2].length
    }
    if (last < texte.length) parts.push(texte.slice(last))
    return parts.length ? parts : texte
  } catch { return texte }
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

  const lancer = async (queryForce?: string, modeForce?: Mode, scopeForce?: string) => {
    const q = (queryForce ?? query).trim()
    const modeActif = modeForce ?? mode
    const scopeActif = scopeForce ?? tradScope
    if (!q) return
    setLoading(true); setDone(false)
    setVersetsRes([]); setSegmentsRes([]); setEssaisRes([])
    setPageV(0); setPageS(0); setPageE(0)

    const termes = termesRecherche(q)
    const fragments = modeActif === 'prefixe' && termes.length > 1
    const chercheTout = scopeActif === 'ALL'

    const tradCodes = traductions.map(t => t.code)
    const selVersets = `id_verset, ref, livre, chapitre, verset, ${tradCodes.join(', ')}`

    // Versets
    let reqV: any
    if (chercheTout) {
      reqV = supabase.from('versets').select(selVersets)
      if (fragments) {
        for (const t of termes) reqV = reqV.or(tradCodes.map(c => `${c}.ilike.%${t}%`).join(','))
      } else {
        reqV = reqV.or(tradCodes.map(c => `${c}.ilike.%${q}%`).join(','))
      }
      reqV = reqV.limit(10000)
    } else if (fragments) {
      reqV = supabase.from('versets').select(selVersets)
      for (const t of termes) reqV = reqV.ilike(scopeActif, `%${t}%`)
      reqV = reqV.limit(10000)
    } else {
      reqV = supabase.from('versets').select(selVersets).ilike(scopeActif, `%${q}%`).limit(10000)
    }

    // Segments
    let reqS: any = supabase.rpc('recherche_segments', { p_terme: q, p_exact: modeActif === 'exact' }).limit(10000)
    if (fragments) {
      reqS = supabase.from('segments').select('id, segment_texte, id_oeuvre, ref_niv1, ref_niv3')
      for (const t of termes) reqS = reqS.ilike('segment_texte', `%${t}%`)
      reqS = reqS.limit(10000)
    }

    // Essais
    const premierTerme = termes[0]
    const reqE = fragments
      ? supabase.from('essais').select('id, titre, sous_titre, resume, contenu, categories').eq('statut', 'publie')
          .or(`titre.ilike.%${premierTerme}%,sous_titre.ilike.%${premierTerme}%,resume.ilike.%${premierTerme}%,contenu.ilike.%${premierTerme}%`).limit(500)
      : supabase.from('essais').select('id, titre, sous_titre, resume, contenu, categories').eq('statut', 'publie')
          .or(`titre.ilike.%${q}%,sous_titre.ilike.%${q}%,resume.ilike.%${q}%,contenu.ilike.%${q}%`).limit(200)

    const [resV, resS, resE] = await Promise.all([reqV, reqS, reqE])

    // Filtre client versets
    const versetsRaw = (resV.data ?? []) as VersetResult[]
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
    const segsBruts = (resS.data ?? []) as any[]
    const segs = fragments ? segsBruts.filter((s: any) => contientTerme(s.segment_texte, q, modeActif)) : segsBruts
    const oeuvreIds = [...new Set(segs.map((s: any) => s.id_oeuvre))]
    let oeuvreMap: Record<string, { titre: string; auteur: string }> = {}
    if (oeuvreIds.length) {
      const { data: oeuvres } = await supabase.from('oeuvres').select('id_oeuvre, titre, auteurs(nom)').in('id_oeuvre', oeuvreIds)
      ;(oeuvres ?? []).forEach((o: any) => { oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: o.auteurs?.nom || '' } })
    }
    setSegmentsRes(segs.map((s: any) => ({ ...s, auteur_nom: oeuvreMap[s.id_oeuvre]?.auteur || '', oeuvre_titre: oeuvreMap[s.id_oeuvre]?.titre || '' })))

    setLastQuery(q); setLastScope(scopeActif)
    setLoading(false); setDone(true)

    const counts = { bible: versets.length, patristique: segs.length, essais: essais.length }
    setOnglet(prev => {
      if (prev === 'polyglotte') return 'polyglotte'
      const actuel = counts[prev as keyof typeof counts] ?? 0
      if (actuel > 0) return prev
      if (counts.patristique >= counts.bible && counts.patristique >= counts.essais) return 'patristique'
      if (counts.bible >= counts.essais) return 'bible'
      return 'essais'
    })
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
        <div style={{ padding:'14px 40px 12px', borderBottom:'1px solid #d6d0c4', background:'#f7f4ef', flexShrink:0 }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'10px' }}>

            {/* Ligne 1 : titre + mode */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <span style={{ fontFamily:"Georgia, serif", fontSize:'16px', color:'#1e2e24', fontWeight:400 }}>Recherche</span>
              <div style={{ display:'inline-flex', border:'1px solid #d6d0c4', borderRadius:'5px', overflow:'hidden' }}>
                <button className={`mode-btn ${mode==='prefixe'?'mode-btn--actif':'mode-btn--inactif'}`} onClick={()=>setMode('prefixe')}>Préfixe</button>
                <button className={`mode-btn ${mode==='exact'?'mode-btn--actif':'mode-btn--inactif'}`} onClick={()=>setMode('exact')} style={{borderLeft:'1px solid #d6d0c4'}}>Mot exact</button>
              </div>
              <span style={{ fontSize:'10.5px', color:'#b0a89e', fontStyle:'italic' }}>
                {mode==='prefixe' ? 'Mots commençant par le terme — plusieurs termes combinables' : 'Terme exact uniquement'}
              </span>
            </div>

            {/* Ligne 2 : saisie + contrôles */}
            <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
              {/* Champ + bouton effacer */}
              <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                <input type="text" value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && lancer()}
                  placeholder="Rechercher…"
                  autoFocus
                  style={{ width:'300px', fontSize:'14px', padding:'7px 32px 7px 12px', border:'1px solid #c8c0b4', borderRadius:'6px', background:'#fff', color:'#2a2520', outline:'none', fontFamily:"Georgia, serif" }} />
                {query && (
                  <button onClick={() => { setQuery(''); setDone(false); setVersetsRes([]); setSegmentsRes([]); setEssaisRes([]) }}
                    style={{ position:'absolute', right:'8px', background:'none', border:'none', cursor:'pointer', color:'#b0a89e', fontSize:'14px', lineHeight:1, padding:'2px' }} title="Effacer">×</button>
                )}
              </div>

              <button onClick={() => lancer()} disabled={loading || !query.trim()}
                style={{ padding:'7px 22px', borderRadius:'6px', border:'none', background:query.trim()?'#3d6b4f':'#c8c0b4', color:'#fff', fontSize:'13px', cursor:query.trim()?'pointer':'default', fontWeight:500, transition:'background 0.12s' }}>
                {loading ? '…' : 'Chercher →'}
              </button>

              <div style={{ width:'1px', height:'24px', background:'#d6d0c4', margin:'0 2px' }} />

              {/* Périmètre */}
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ fontSize:'11px', color:'#9a958d' }}>Chercher dans</span>
                <select className="ctrl-sel" value={tradScope}
                  onChange={e => { const v=e.target.value; setTradScope(v); if(v!=='ALL') setTradAffichage(v) }}>
                  {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  <option value="ALL">Toutes les traductions</option>
                </select>
              </div>

              {/* Affichage (seulement si ALL) */}
              {tradScope==='ALL' && (
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <span style={{ fontSize:'11px', color:'#9a958d' }}>Afficher en</span>
                  <select className="ctrl-sel" value={tradAffichage} onChange={e=>setTradAffichage(e.target.value)}>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {/* Compteur résultats */}
              {done && (
                <span style={{ marginLeft:'auto', fontSize:'10.5px', color:'#b0a89e', fontStyle:'italic' }}>
                  {versetsRes.length + segmentsRes.length + essaisRes.length} résultats
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
                        {highlighter(s.segment_texte, lastQuery, mode)}
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
                    const extrait = e.contenu.length>220 ? e.contenu.slice(0,220)+'…' : e.contenu
                    return (
                      <a key={e.id} href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer" className="res-card">
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'3px' }}>
                          <span style={{ fontSize:'10.5px', fontWeight:600, color:'#3d6b4f' }}>{e.titre}</span>
                          {e.categories?.[0] && <span style={{ fontSize:'9.5px', color:'#c0b8ae', fontStyle:'italic' }}>{e.categories[0]}</span>}
                        </div>
                        {e.sous_titre && <p style={{ fontSize:'11px', color:'#8a8278', fontStyle:'italic', margin:'0 0 3px' }}>{e.sous_titre}</p>}
                        <p style={{ fontFamily:"Georgia, serif", fontSize:'12.5px', lineHeight:1.55, color:'#2a2520', margin:0 }}>
                          {highlighter(e.resume||extrait, lastQuery, mode)}
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
                    const livresVus = new Set<string>()
                    return versetsPage.map(v => {
                      const estNouveauLivre = !livresVus.has(v.livre)
                      if (estNouveauLivre) livresVus.add(v.livre)
                      const survolé = hoveredVerset === v.id_verset
                      const nbLivre = versetsPage.filter(x => x.livre === v.livre).length
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
                                const texte = (v as any)[code] ?? ''
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
