'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

function refFr(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  return cv[1] ? `${ABREV_FR[p[0]] || p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] || p[0]} ${cv[0]}`
}

const TRAD_LABELS: Record<string, string> = {
  TR0001: 'Sacy', TR0002: 'Segond', TR0003: 'Crampon', TR0004: 'Vulgate'
}

type VersetResult = {
  id_verset: string; ref: string; livre: string; chapitre: number; verset: number
  TR0001: string; TR0002: string; TR0003: string; TR0004: string
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
type Onglet = 'bible' | 'patristique' | 'essais'

const PAGE = 30

function highlighter(texte: string, terme: string, mode: Mode): React.ReactNode {
  if (!texte || !terme) return texte
  const sep = '(^|[\\s\\u202f\\u00a0\u00ab\u00bb,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0\u00ab\u00bb,;:!?—.)\\]]|$)' : ''
  try {
    const regex = new RegExp(`${sep}(${terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})${fin}`, 'gi')
    const parts: React.ReactNode[] = []
    let last = 0; let m: RegExpExecArray | null
    while ((m = regex.exec(texte)) !== null) {
      const s = m.index + m[1].length
      if (s > last) parts.push(texte.slice(last, s))
      parts.push(<mark key={s} style={{ background: '#d4edda', color: '#1e2e24', borderRadius: '2px', padding: '0 1px' }}>{m[2]}</mark>)
      last = s + m[2].length
    }
    if (last < texte.length) parts.push(texte.slice(last))
    return parts.length > 0 ? parts : texte
  } catch { return texte }
}

function contientTerme(texte: string, terme: string, mode: Mode): boolean {
  const sep = '(^|[\\s\\u202f\\u00a0\u00ab\u00bb,;:!?—.(\\[])'
  const fin = mode === 'exact' ? '(?=[\\s\\u202f\\u00a0\u00ab\u00bb,;:!?—.)\\]]|$)' : ''
  try {
    return new RegExp(`${sep}${terme.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${fin}`, 'i').test(texte)
  } catch { return false }
}

export default function RechercheClient() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<Mode>('prefixe')
  const [tradBible, setTradBible] = useState<'TR0001'|'TR0002'|'TR0003'|'TR0004'>('TR0001')
  const [versetsRes, setVersetsRes] = useState<VersetResult[]>([])
  const [segmentsRes, setSegmentsRes] = useState<SegmentResult[]>([])
  const [essaisRes, setEssaisRes] = useState<EssaiResult[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [lastQuery, setLastQuery] = useState('')
  const [onglet, setOnglet] = useState<Onglet>('bible')
  const [pageV, setPageV] = useState(0)
  const [pageS, setPageS] = useState(0)
  const [pageE, setPageE] = useState(0)

  const lancer = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true); setDone(false)
    setVersetsRes([]); setSegmentsRes([]); setEssaisRes([])
    setPageV(0); setPageS(0); setPageE(0)

    const [resV, resS, resE] = await Promise.all([
      supabase.rpc('recherche_versets', { p_terme: q, p_trad: tradBible, p_exact: mode === 'exact' }).limit(10000),
      supabase.rpc('recherche_segments', { p_terme: q, p_exact: mode === 'exact' }).limit(10000),
      supabase.from('essais').select('id, titre, sous_titre, resume, contenu, categories').eq('statut', 'publie')
        .or(`titre.ilike.%${q}%,sous_titre.ilike.%${q}%,resume.ilike.%${q}%,contenu.ilike.%${q}%`).limit(200),
    ])

    setVersetsRes((resV.data ?? []) as VersetResult[])
    setEssaisRes((resE.data ?? []) as EssaiResult[])

    const segs = (resS.data ?? []) as any[]
    const oeuvreIds = [...new Set(segs.map((s: any) => s.id_oeuvre))]
    let oeuvreMap: Record<string, { titre: string; auteur: string }> = {}
    if (oeuvreIds.length > 0) {
      const { data: oeuvres } = await supabase
        .from('oeuvres').select('id_oeuvre, titre, auteurs(nom)')
        .in('id_oeuvre', oeuvreIds)
      ;(oeuvres ?? []).forEach((o: any) => {
        oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: o.auteurs?.nom || '' }
      })
    }
    setSegmentsRes(segs.map((s: any) => ({
      ...s,
      auteur_nom: oeuvreMap[s.id_oeuvre]?.auteur || '',
      oeuvre_titre: oeuvreMap[s.id_oeuvre]?.titre || '',
    })))

    setLastQuery(q)
    setLoading(false); setDone(true)
  }

  const versetsPage = versetsRes.slice(pageV * PAGE, (pageV + 1) * PAGE)
  const segmentsPage = segmentsRes.slice(pageS * PAGE, (pageS + 1) * PAGE)
  const essaisPage = essaisRes.slice(pageE * PAGE, (pageE + 1) * PAGE)
  const pageActive = onglet === 'bible' ? pageV : onglet === 'patristique' ? pageS : pageE
  const totalActive = onglet === 'bible' ? versetsRes.length : onglet === 'patristique' ? segmentsRes.length : essaisRes.length
  const setPageActive = onglet === 'bible' ? setPageV : onglet === 'patristique' ? setPageS : setPageE
  const pagesTotal = Math.ceil(totalActive / PAGE)
  const debut = pageActive * PAGE + 1
  const fin = Math.min((pageActive + 1) * PAGE, totalActive)

  return (
    <>
      <style>{`
        .res-card { display: block; text-decoration: none; padding: 9px 13px; background: #fff; border-radius: 6px; border: 1px solid #e4dfd8; transition: border-color 0.12s; }
        .res-card:hover { border-color: #3d6b4f; }
        .res-card--absent { background: #fff8f6; border-color: #f0c4b8; }
        .res-card--absent:hover { border-color: #c0562a; }
        .ong-btn { padding: 9px 20px; font-size: 12px; border: none; border-bottom: 2px solid transparent; cursor: pointer; background: transparent; color: #9a958d; font-weight: 400; transition: color 0.12s; }
        .ong-btn--actif { color: #3d6b4f; font-weight: 600; border-bottom-color: #3d6b4f; }
        .ong-btn:hover { color: #3d6b4f; }
        .pag-btn { font-size: 11px; padding: 5px 14px; border: 1px solid #d6d0c4; border-radius: 20px; background: #fff; color: #3a3530; cursor: pointer; transition: background 0.12s, color 0.12s; }
        .pag-btn:hover:not(:disabled) { background: #3d6b4f; color: #fff; border-color: #3d6b4f; }
        .pag-btn:disabled { color: #c0b8b0; border-color: #e4dfd8; cursor: default; }
        .mode-btn { padding: 5px 14px; font-size: 11px; border: none; cursor: pointer; transition: background 0.12s, color 0.12s; }
        .mode-btn--actif { background: #3d6b4f; color: #fff; font-weight: 500; }
        .mode-btn--inactif { background: #fff; color: #6b6560; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #d6d0c4; border-radius: 3px; }
      `}</style>

      <div style={{ background: '#f7f4ef', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '48px' }}>

        {/* ── En-tête ── */}
        <div style={{ padding: '16px 40px 14px', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
          <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {/* Titre + mode */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: '17px', color: '#1e2e24' }}>Recherche</span>
              <div style={{ display: 'inline-flex', border: '1px solid #d6d0c4', borderRadius: '5px', overflow: 'hidden' }}>
                <button className={`mode-btn ${mode === 'prefixe' ? 'mode-btn--actif' : 'mode-btn--inactif'}`} onClick={() => setMode('prefixe')}>Préfixe</button>
                <button className={`mode-btn ${mode === 'exact' ? 'mode-btn--actif' : 'mode-btn--inactif'}`} onClick={() => setMode('exact')} style={{ borderLeft: '1px solid #d6d0c4' }}>Mot exact</button>
              </div>
              <span style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic' }}>
                {mode === 'prefixe'
                  ? "Trouve les mots commençant par le terme. Plusieurs termes peuvent être combinés."
                  : "Trouve uniquement le mot tel qu'il est écrit, sans extension possible."}
              </span>
            </div>

            {/* Saisie */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lancer()}
                placeholder="Rechercher…"
                autoFocus
                style={{ width: '360px', fontSize: '14px', padding: '7px 12px', border: '1px solid #c8c0b4', borderRadius: '6px', background: '#fff', color: '#2a2520', outline: 'none', fontFamily: "Georgia, serif" }} />
              <button onClick={lancer} disabled={loading || !query.trim()}
                style={{ padding: '7px 20px', borderRadius: '6px', border: 'none', background: query.trim() ? '#3d6b4f' : '#c8c0b4', color: '#fff', fontSize: '13px', cursor: query.trim() ? 'pointer' : 'default', fontWeight: 500 }}>
                {loading ? 'Recherche…' : 'Chercher →'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                <span style={{ fontSize: '11px', color: '#9a958d' }}>Traduction :</span>
                <select value={tradBible} onChange={e => setTradBible(e.target.value as any)}
                  style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid #d6d0c4', borderRadius: '4px', background: '#fff', color: '#2a3d30', outline: 'none' }}>
                  <option value="TR0001">Bible de Sacy</option>
                  <option value="TR0002">Bible Segond</option>
                  <option value="TR0003">Bible Crampon</option>
                  <option value="TR0004">Vulgate</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Corps ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: '820px', width: '100%', margin: '0 auto', padding: '0 40px' }}>

          {/* Onglets */}
          {done && (
            <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
              {([
                { key: 'bible' as Onglet, label: 'Bible', count: versetsRes.length },
                { key: 'patristique' as Onglet, label: 'Tradition patristique', count: segmentsRes.length },
                { key: 'essais' as Onglet, label: 'Essais et méditations', count: essaisRes.length },
              ]).map(o => (
                <button key={o.key}
                  className={`ong-btn${onglet === o.key ? ' ong-btn--actif' : ''}`}
                  onClick={() => setOnglet(o.key)}>
                  {o.label}
                  <span style={{ marginLeft: '5px', fontSize: '10px', color: '#b0a89e', fontWeight: 400 }}>({o.count})</span>
                </button>
              ))}
            </div>
          )}

          {/* Résultats scrollables */}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: '10px' }}>

            {!done && !loading && (
              <p style={{ fontSize: '12px', color: '#b0a89e', fontStyle: 'italic', textAlign: 'center', marginTop: '48px' }}>
                Saisissez un terme et appuyez sur Entrée.
              </p>
            )}

            {done && onglet === 'bible' && (
              versetsRes.length === 0
                ? <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', marginTop: '16px' }}>Aucun verset trouvé.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {versetsPage.map(v => {
                    const texte = v[tradBible] || ''
                    const manque = lastQuery && !contientTerme(texte, lastQuery, mode)
                    return (
                      <a key={v.id_verset}
                        href={`/?livre=${v.livre}&chapitre=${v.chapitre}&verset=${v.verset}`}
                        target="_blank" rel="noopener noreferrer"
                        className={`res-card${manque ? ' res-card--absent' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#3d6b4f' }}>{refFr(v.ref)}</span>
                          <span style={{ fontSize: '9.5px', color: manque ? '#c0562a' : '#b0a89e' }}>
                            {manque ? `absent en ${TRAD_LABELS[tradBible]}` : TRAD_LABELS[tradBible]}
                          </span>
                        </div>
                        <p style={{ fontFamily: "Georgia, serif", fontSize: '12.5px', lineHeight: 1.5, color: '#2a2520', margin: 0 }}>
                          {manque ? texte : highlighter(texte, lastQuery, mode)}
                        </p>
                      </a>
                    )
                  })}
                </div>
            )}

            {done && onglet === 'patristique' && (
              segmentsRes.length === 0
                ? <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', marginTop: '16px' }}>Aucun passage trouvé.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {segmentsPage.map(s => (
                    <a key={s.id} href={`/oeuvre/${s.id_oeuvre}`}
                      target="_blank" rel="noopener noreferrer"
                      className="res-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#3d6b4f' }}>{s.auteur_nom}</span>
                        <span style={{ fontSize: '9.5px', color: '#b0a89e', fontStyle: 'italic' }}>
                          {s.oeuvre_titre}{s.ref_niv1 ? ` — ${s.ref_niv1}` : ''}{s.ref_niv3 ? `, ${s.ref_niv3}` : ''}
                        </span>
                      </div>
                      <p style={{ fontFamily: "Georgia, serif", fontSize: '12.5px', lineHeight: 1.5, color: '#2a2520', margin: 0 }}>
                        {highlighter(s.segment_texte, lastQuery, mode)}
                      </p>
                    </a>
                  ))}
                </div>
            )}

            {done && onglet === 'essais' && (
              essaisRes.length === 0
                ? <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', marginTop: '16px' }}>Aucun essai trouvé.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {essaisPage.map(e => {
                    const extrait = e.contenu.length > 220 ? e.contenu.slice(0, 220) + '…' : e.contenu
                    return (
                      <a key={e.id} href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer" className="res-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10.5px', fontWeight: 600, color: '#3d6b4f' }}>{e.titre}</span>
                          {e.categories?.[0] && <span style={{ fontSize: '9.5px', color: '#b0a89e', fontStyle: 'italic' }}>{e.categories[0]}</span>}
                        </div>
                        {e.sous_titre && <p style={{ fontSize: '11px', color: '#8a8278', fontStyle: 'italic', margin: '0 0 3px' }}>{e.sous_titre}</p>}
                        <p style={{ fontFamily: "Georgia, serif", fontSize: '12.5px', lineHeight: 1.5, color: '#2a2520', margin: 0 }}>
                          {highlighter(e.resume || extrait, lastQuery, mode)}
                        </p>
                      </a>
                    )
                  })}
                </div>
            )}
          </div>

          {/* ── Pagination ── */}
          {done && totalActive > PAGE && (
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 16px', borderTop: '1px solid #e4dfd8' }}>
              <button className="pag-btn" disabled={pageActive === 0} onClick={() => setPageActive(pageActive - 1)}>← Précédent</button>
              <span style={{ fontSize: '11px', color: '#9a958d' }}>{debut}–{fin} sur {totalActive}</span>
              <button className="pag-btn" disabled={pageActive >= pagesTotal - 1} onClick={() => setPageActive(pageActive + 1)}>Suivant →</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}