'use client'

import { useState, useEffect, type CSSProperties } from 'react'
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
const NB_CHAPITRES: Record<string, number> = {
  GEN:50,EXO:40,LEV:27,NUM:36,DEU:34,JOS:24,JDG:21,RUT:4,
  '1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,
  EZR:10,NEH:13,EST:16,JOB:42,PSA:150,PRO:31,ECC:12,SNG:8,
  ISA:66,JER:52,LAM:5,EZK:48,DAN:14,HOS:14,JOL:3,AMO:9,
  OBA:1,JON:4,MIC:7,NAM:3,HAB:3,ZEP:3,HAG:2,ZEC:14,MAL:4,
  MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,ROM:16,'1CO':16,'2CO':13,
  GAL:6,EPH:6,PHP:4,COL:4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,
  TIT:3,PHM:1,HEB:13,JAS:5,'1PE':5,'2PE':3,'1JN':5,'2JN':1,
  '3JN':1,JUD:1,REV:22,
}

type Choix = { label: string; type: 'verset' | 'segment'; id: string }
type Props = { onChoisir: (c: Choix) => void; onFermer: () => void }

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function correspondDebutsDeMots(texte: string, requete: string): boolean {
  const termes = sansAccents(requete).trim().split(/\s+/).filter(Boolean)
  if (termes.length === 0) return true
  const mots = sansAccents(texte).match(/[\p{L}\p{N}]+/gu) ?? []
  return termes.every(t => mots.some(m => m.startsWith(t)))
}

function labelVerset(livre: string, chapitre: number | string, verset: number | string): string {
  return `${ABREV_FR[livre] ?? livre} ${chapitre}, ${verset}`
}

function refsSegment(s: { ref_niv1?: string | null; ref_niv2?: string | null; ref_niv3?: string | null; ref_niv4?: string | null; ref_niv5?: string | null; segment_numero: number }): string {
  const refs = [s.ref_niv1, s.ref_niv2, s.ref_niv3, s.ref_niv4, s.ref_niv5].filter(Boolean).join(', ')
  return refs ? `${refs}, §${s.segment_numero}` : `§${s.segment_numero}`
}

function BoutonsChoix({ onAbrege, onComplet }: { onAbrege: () => void; onComplet: () => void }) {
  return (
    <span style={{ display: 'flex', gap: '5px', flexShrink: 0, alignSelf: 'flex-start' }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onAbrege() }} style={petitChoixStyle}>Référence abrégée</button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onComplet() }} style={petitChoixStyle}>Citation complète</button>
    </span>
  )
}

const petitChoixStyle: CSSProperties = {
  fontSize: '10px', padding: '3px 7px', borderRadius: '4px', border: '1px solid #d6d0c4',
  background: '#fff', color: '#3d6b4f', cursor: 'pointer', whiteSpace: 'nowrap',
}

export default function SelecteurCitation({ onChoisir, onFermer }: Props) {
  const [source, setSource] = useState<'bible' | 'patristique'>('bible')
  const [mode, setMode] = useState<'parcourir' | 'mes-citations'>('parcourir')

  return (
    <div onClick={onFermer} style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,22,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth: '720px', height: '78vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid #e4dfd8' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['bible', 'patristique'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: source === s ? '#3d6b4f' : '#e4dfd8', color: source === s ? '#fff' : '#6b6560', fontWeight: source === s ? 600 : 400 }}>
                {s === 'bible' ? 'Bible' : 'Patristique'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['parcourir', 'mes-citations'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ fontSize: '11px', padding: '5px 11px', borderRadius: '12px', border: `1px solid ${mode === m ? '#3d6b4f' : '#d6d0c4'}`, cursor: 'pointer', background: mode === m ? 'rgba(61,107,79,0.10)' : '#fff', color: mode === m ? '#3d6b4f' : '#8a8278' }}>
                {m === 'parcourir' ? 'Parcourir' : 'Mes citations'}
              </button>
            ))}
          </div>
          <button onClick={onFermer} style={{ fontSize: '15px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {mode === 'parcourir'
            ? (source === 'bible' ? <ParcourirBible onChoisir={onChoisir} /> : <ParcourirPatristique onChoisir={onChoisir} />)
            : <MesCitations source={source} onChoisir={onChoisir} />}
        </div>
      </div>
    </div>
  )
}

function ParcourirBible({ onChoisir }: { onChoisir: (c: Choix) => void }) {
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState<number | null>(null)
  const [versets, setVersets] = useState<{ id_verset: string; verset: number; texte: string }[]>([])
  const [chargement, setChargement] = useState(false)

  const choisirChapitre = async (c: number) => {
    setChapitre(c); setChargement(true)
    const { data } = await supabase.from('versets').select('id_verset, verset, TR0002').eq('livre', livre).eq('chapitre', c).order('verset')
    setVersets((data ?? []).map((v: any) => ({ id_verset: v.id_verset, verset: v.verset, texte: v.TR0002 ?? '' })))
    setChargement(false)
  }

  if (!livre) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
      {Object.keys(ABREV_FR).map(l => (
        <button key={l} onClick={() => setLivre(l)} style={{ fontSize: '12px', padding: '8px 4px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>{ABREV_FR[l]}</button>
      ))}
    </div>
  )

  if (chapitre === null) return (
    <div>
      <button onClick={() => setLivre('')} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>← Livres</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '5px' }}>
        {Array.from({ length: NB_CHAPITRES[livre] }, (_, i) => i + 1).map(c => (
          <button key={c} onClick={() => choisirChapitre(c)} style={{ fontSize: '11.5px', padding: '6px 0', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>{c}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <button onClick={() => setChapitre(null)} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>← {ABREV_FR[livre]}, chapitres</button>
      {chargement ? <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {versets.map(v => {
            const ref = labelVerset(livre, chapitre, v.verset)
            return (
            <div key={v.id_verset}
              style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#3d6b4f', flexShrink: 0 }}>{v.verset}</span>
              <span style={{ fontSize: '12.5px', color: '#2a2520', lineHeight: 1.5, flex: 1 }}>{v.texte}</span>
              <BoutonsChoix
                onAbrege={() => onChoisir({ label: ref, type: 'verset', id: v.id_verset })}
                onComplet={() => onChoisir({ label: `« ${v.texte} » (${ref})`, type: 'verset', id: v.id_verset })}
              />
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function ParcourirPatristique({ onChoisir }: { onChoisir: (c: Choix) => void }) {
  const [auteurs, setAuteurs] = useState<{ id_auteur: string; nom: string }[]>([])
  const [auteur, setAuteur] = useState('')
  const [oeuvres, setOeuvres] = useState<{ id_oeuvre: string; titre: string }[]>([])
  const [oeuvre, setOeuvre] = useState('')
  const [segments, setSegments] = useState<{ id: number; segment_numero: number; segment_texte: string; ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null; ref_niv5: string | null }[]>([])
  const [chargement, setChargement] = useState(false)
  const [recherche, setRecherche] = useState('')

  useEffect(() => { supabase.from('auteurs').select('id_auteur, nom').order('nom').then(({ data }) => setAuteurs(data ?? [])) }, [])

  const choisirAuteur = async (id: string) => {
    setAuteur(id); setOeuvre('')
    const { data } = await supabase.from('oeuvres').select('id_oeuvre, titre').eq('id_auteur', id).order('titre')
    setOeuvres(data ?? [])
  }
  const choisirOeuvre = async (id: string) => {
    setOeuvre(id); setRecherche(''); setChargement(true)
    const { data } = await supabase.from('segments').select('id, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5').eq('id_oeuvre', id).eq('nature', 'texte').order('segment_numero')
    setSegments(data ?? [])
    setChargement(false)
  }

  const indexOeuvre = oeuvres.findIndex(o => o.id_oeuvre === oeuvre)
  const oeuvrePrecedente = indexOeuvre > 0 ? oeuvres[indexOeuvre - 1] : null
  const oeuvreSuivante = indexOeuvre >= 0 && indexOeuvre < oeuvres.length - 1 ? oeuvres[indexOeuvre + 1] : null
  const q = sansAccents(recherche.trim())
  const segmentsFiltres = q
    ? segments.filter(s => correspondDebutsDeMots(s.segment_texte, recherche) || String(s.segment_numero).startsWith(q))
    : segments

  if (!auteur) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {auteurs.map(a => (
        <button key={a.id_auteur} onClick={() => choisirAuteur(a.id_auteur)} style={{ textAlign: 'left', fontSize: '13px', padding: '7px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>{a.nom}</button>
      ))}
    </div>
  )

  if (!oeuvre) return (
    <div>
      <button onClick={() => setAuteur('')} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '10px' }}>← Auteurs</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {oeuvres.map(o => (
          <button key={o.id_oeuvre} onClick={() => choisirOeuvre(o.id_oeuvre)} style={{ textAlign: 'left', fontSize: '13px', padding: '7px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', color: '#2a3d30', cursor: 'pointer' }}>{o.titre}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <button onClick={() => setOeuvre('')} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Œuvres</button>
        <button onClick={() => oeuvrePrecedente && choisirOeuvre(oeuvrePrecedente.id_oeuvre)} disabled={!oeuvrePrecedente}
          style={{ marginLeft: 'auto', fontSize: '11px', color: oeuvrePrecedente ? '#3d6b4f' : '#c8c0b4', background: 'none', border: '1px solid #d6d0c4', borderRadius: '4px', cursor: oeuvrePrecedente ? 'pointer' : 'default', padding: '3px 8px' }}>Précédent</button>
        <button onClick={() => oeuvreSuivante && choisirOeuvre(oeuvreSuivante.id_oeuvre)} disabled={!oeuvreSuivante}
          style={{ fontSize: '11px', color: oeuvreSuivante ? '#3d6b4f' : '#c8c0b4', background: 'none', border: '1px solid #d6d0c4', borderRadius: '4px', cursor: oeuvreSuivante ? 'pointer' : 'default', padding: '3px 8px' }}>Suivant</button>
      </div>
      <input value={recherche} onChange={e => setRecherche(e.target.value)}
        placeholder="Recherche dans cette œuvre…"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: '12px', padding: '7px 10px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#faf8f4', color: '#2a2520', marginBottom: '10px', outline: 'none' }} />
      {chargement ? <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {segmentsFiltres.map(s => {
            const auteurNom = auteurs.find(a => a.id_auteur === auteur)?.nom ?? ''
            const oeuvreTitre = oeuvres.find(o => o.id_oeuvre === oeuvre)?.titre ?? ''
            return (
              <div key={s.id}
                style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#3d6b4f', flexShrink: 0 }}>§{s.segment_numero}</span>
                <span style={{ fontSize: '12.5px', color: '#2a2520', lineHeight: 1.5, flex: 1 }}>{s.segment_texte.slice(0, 200)}{s.segment_texte.length > 200 ? '…' : ''}</span>
                <BoutonsChoix
                  onAbrege={() => onChoisir({ label: `${auteurNom}, ${oeuvreTitre}, ${refsSegment(s)}`, type: 'segment', id: String(s.id) })}
                  onComplet={() => onChoisir({ label: `« ${s.segment_texte} »`, type: 'segment', id: String(s.id) })}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MesCitations({ source, onChoisir }: { source: 'bible' | 'patristique'; onChoisir: (c: Choix) => void }) {
  const [items, setItems] = useState<any[] | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) { setItems([]); return }
      const { data: prelevements } = await supabase.from('prelevements').select('*').eq('user_id', uid)
        .eq('type', source === 'bible' ? 'biblique' : 'patristique')
        .order('created_at', { ascending: false })
      setItems(prelevements ?? [])
    })
  }, [source])

  if (items === null) return <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>
  if (items.length === 0) return <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Aucune citation enregistrée dans « Mes citations » pour l'instant.</p>

  const choisir = async (it: any, complet = false) => {
    if (source === 'bible') {
      const { data } = await supabase.from('versets').select('id_verset').eq('livre', it.ref_livre).eq('chapitre', it.ref_chapitre).eq('verset', it.ref_verset).single()
      const ref = labelVerset(it.ref_livre, it.ref_chapitre, it.ref_verset)
      const texte = it.texte ?? ''
      if (data) onChoisir({ label: complet ? `« ${texte} » (${ref})` : ref, type: 'verset', id: data.id_verset })
    } else {
      const { data } = await supabase.from('segments').select('id, segment_numero, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5').eq('id_oeuvre', it.id_oeuvre).eq('segment_numero', it.segment_numero).single()
      if (data) {
        const auteur = it.auteur ?? it.auteur_nom ?? ''
        const titre = it.titre_oeuvre ?? ''
        const ref = `${auteur}, ${titre}, ${refsSegment(data)}`
        onChoisir({ label: complet ? `« ${it.texte ?? ''} »` : ref, type: 'segment', id: String(data.id) })
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map(it => {
        const label = source === 'bible'
          ? labelVerset(it.ref_livre, it.ref_chapitre, it.ref_verset)
          : `${it.auteur ?? it.auteur_nom ?? ''}, ${it.titre_oeuvre ?? ''} §${it.segment_numero}`
        return (
          <div key={it.id}
            style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '5px', border: '1px solid #ede9e2', background: '#fff', alignItems: 'flex-start' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#3d6b4f' }}>{label}</span>
              <span style={{ display: 'block', fontSize: '12.5px', color: '#2a2520', lineHeight: 1.5 }}>{it.texte?.slice(0, 200)}</span>
            </span>
            <BoutonsChoix onAbrege={() => choisir(it, false)} onComplet={() => choisir(it, true)} />
          </div>
        )
      })}
    </div>
  )
}
