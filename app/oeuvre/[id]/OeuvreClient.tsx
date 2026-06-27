'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from "@/app/lib/supabase"
import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee } from './oeuvreTypes'
import { rendreTexteEnrichi, texteSansEnrichissement, normaliserEspaces } from './texteEnrichi'
import ModaleEditionAdmin from './ModaleEditionAdmin'
import PageTitre from './PageTitre'
import OngletCommentaires from './OngletCommentaires'
import { BTN_STYLE, BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import { BoutonCopieVerset, BoutonEnregistrerVerset, BoutonSignalerVerset } from './BoutonsVerset'
import AssocierVerset from './AssocierVerset'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'

// Même table que celle utilisée côté serveur (page.tsx) pour l'affichage
// des références bibliques en français — doit rester identique aux deux endroits.
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

function detailsRefBiblique(ref: string): { label: string; livre: string; chapitre: string; verset: string } {
  const p = ref.trim().split(' ')
  if (p.length < 2) return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv = p[1].split(':')
  const label = cv[1] ? `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001',    label: 'Bible de Sacy' },
  { code: 'TR0002',     label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

async function chargerCodesTraductions() {
  const { data } = await supabase.from('traductions').select('trad_id').order('ordre', { ascending: true })
  const codes = (data ?? []).map((t: any) => t.trad_id).filter((code: string) => /^TR\d{4}$/.test(code))
  return codes.length > 0 ? codes : TRADUCTIONS_FALLBACK.map(t => t.code)
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function OeuvreClient({ auteur, auteurId, idOeuvre, estAdmin: estAdminReel, niv1List: niv1ListProp, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, vueInitiale = 'texte' }: Props) {
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const estAdmin = estAdminReel && !modeUtilisateurStandard
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
  const [navOuverte, setNavOuverte] = useState(true)
  const [panneauOuvert, setPanneauOuvert] = useState(true)
  const [suggestions, setSuggestions] = useState<{ id: number; segment_numero: number; segment_texte: string; reference_manuelle: string | null }[]>([])
  const [suggestionsChargees, setSuggestionsChargees] = useState(false)
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
    if (typeof window !== 'undefined' && window.innerWidth < 880) {
      setNavOuverte(false)
      setPanneauOuvert(false)
    }
  }, [])
  useEffect(() => {
    if (!segmentCibleId) return
    const timer = window.setTimeout(() => {
      document.getElementById(`segment-${segmentCibleId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [segmentCibleId, vue])
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

  // Navigation lazy par niv1
  const niv1List = niv1ListProp
  const [niv1Actif, setNiv1Actif] = useState<string>(niv1List[0] ?? '')
  const [groupes, setGroupes] = useState<GroupeData[]>(groupesInit)
  const [segments, setSegments] = useState<SegData[]>(segmentsInit)
  const [groupesApparat, setGroupesApparat] = useState<GroupeData[]>(groupesApparatInit)
  const [segmentsApparat, setSegmentsApparat] = useState<SegData[]>(segmentsApparatInit)
  const [niv1Loading, setNiv1Loading] = useState(false)
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

  // Liste des niv2 du niv1 actif (sert au sommaire)
  const niv2List = Array.from(new Set(groupes.map(g => g.niv2).filter(Boolean)))

  // Cliquer sur un niv2 ne filtre plus le contenu : on se déplace simplement
  // jusqu'à son ancre, tout le niv1 reste affiché en continu.
  const allerAuNiv2 = (n2: string | null) => {
    setNiv2Actif(n2)
    setVue('texte')
    if (!n2) return
    const ancre = groupes.find(g => g.niv2 === n2)?.anchor
    if (ancre) document.getElementById(ancre)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const chargerNiv1Data = async (n1: string): Promise<{ groupes: GroupeData[]; segments: SegData[] }> => {
    const { data } = await supabase
      .from('segments')
      .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,lien_1,lien_2,lien_3,lien_4,nature')
      .eq('id_oeuvre', idOeuvre)
      .eq('ref_niv1', n1)
      .order('segment_numero')
    const segs = (data ?? []) as any[]

    const tousIds = new Set<string>()
    segs.forEach((s: any) => {
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
    const newSegs: SegData[] = segs.map((s: any) => {
      c++
      const versets = [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean)
        .join(';').split(';').map((x: string) => x.trim()).filter(Boolean)
        .map((vid: string) => ({ id: vid, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))
      return { id: s.id, numero: c, texte: s.segment_texte, versets }
    })

    const newGroupes: GroupeData[] = []
    let cur: any = { niv1:'', niv2:'', niv3:'', niv4:'', itemIds:[] as number[] }
    let gi = 0
    segs.forEach((s: any) => {
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
    const segs = (data ?? []) as any[]

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
      document.getElementById('barre-nav-niv1')?.scrollIntoView({ block: 'start' })
    }

    const enCache = !opts?.forceRefresh ? cacheNiv1Ref.current.get(n1) : undefined
    if (enCache) {
      setGroupes(enCache.groupes)
      setSegments(enCache.segments)
      setNiv1Loading(false)
    } else {
      setNiv1Loading(true)
      const donnees = await chargerNiv1Data(n1)
      cacheNiv1Ref.current.set(n1, donnees)
      setGroupes(donnees.groupes)
      setSegments(donnees.segments)
      setNiv1Loading(false)
    }

    // Préchargement discret des niv1 voisins, en tâche de fond
    const idx = niv1List.indexOf(n1)
    ;[niv1List[idx - 1], niv1List[idx + 1]].forEach(voisin => {
      if (voisin && !cacheNiv1Ref.current.has(voisin)) {
        chargerNiv1Data(voisin).then(d => cacheNiv1Ref.current.set(voisin, d)).catch(() => {})
      }
    })
  }

  // niv2Actif n'est plus un filtre : il indique seulement la position de
  // navigation courante (en-tête + surlignage dans le sommaire). Le niv1
  // reste affiché en entier — cliquer sur un niv2 fait défiler jusqu'à lui.
  const groupesFiltres = groupes
  const segmentsFiltres = segments

  const trad = traductionsBible[tradIndex]?.code ?? 'TR0001'
  const segMap = new Map(segmentsFiltres.map(s => [s.id, s]))
  const segMapApparat = new Map(segmentsApparat.map(s => [s.id, s]))
  const segMapActive = vue === 'texte' ? segMap : segMapApparat
  const segActifData = segActif !== null ? segMapActive.get(segActif) : null
  // idOeuvre vient des Props
  const hasApparat = segmentsApparat.length > 0
  const tocApparatLocal = (() => {
    const vus = new Set<string>()
    const out: { niv1: string; anchor: string }[] = []
    groupesApparat.forEach(g => { if (g.niv1 && !vus.has(g.niv1)) { vus.add(g.niv1); out.push({ niv1: g.niv1, anchor: g.anchor }) } })
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
  const associerVersetLocal = (segId: number) => (_champ: 'lien_1' | 'lien_2' | 'lien_3', verset: typeof segments[number]['versets'][number]) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: [...s.versets, verset] } : s))
  }

  const supprimerLienBiblique = async (segId: number, versetId: string) => {
    if (!estAdmin) return
    if (!confirm('Supprimer ce renvoi biblique ?')) return
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
        <nav style={{ width: '20%', flexShrink: 0, position: 'sticky', top: '48px', alignSelf: 'flex-start', height: 'calc(100vh - 48px)', overflowY: 'auto', borderRight: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #d6d0c4', flexShrink: 0, position: 'relative' }}>
            <button onClick={() => setNavOuverte(false)} title="Fermer le sommaire"
              style={{ position: 'absolute', right: '8px', top: '8px', fontSize: '12px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>✕</button>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '4px' }}>{auteur}</p>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: '#2a3d30', lineHeight: 1.35, marginBottom: oeuvre.titre_original ? '3px' : '0', whiteSpace: 'pre-line', position: 'relative', paddingRight: estAdmin ? '16px' : 0 }}>
              {rendreTexteEnrichi(titreAffiche)}
              {estAdmin && (
                <button onClick={() => setEditionCible({ type: 'titre_oeuvre', texteActuel: titreAffiche })}
                  title="Modifier le titre de l'œuvre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
              )}
            </p>
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

          {/* Apparat critique — sous Du même auteur, au-dessus du sommaire */}
          {hasApparat && (
            <div style={{ flexShrink: 0, padding: '12px 16px 14px', borderBottom: '1px solid #d6d0c4' }}>
              <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '6px' }}>APPARAT CRITIQUE</p>
              {tocApparatLocal.map((entry, i) => (
                <div key={i}>
                  <a href={`#${entry.anchor}`} onClick={() => { setVue('apparat'); setSegActif(null) }} className="toc-lien-n1"
                    style={{ display: 'block', fontSize: '11.5px', fontWeight: vue === 'apparat' ? 600 : 400, color: vue === 'apparat' ? '#3d6b4f' : '#3a3530', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
                    {entry.niv1}
                  </a>
                </div>
              ))}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
            <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '8px' }}>SOMMAIRE</p>

            {niv1List.map(n1 => {
              const estActif = vue === 'texte' && n1 === niv1Actif

              return (
                <div key={n1} style={{ marginBottom: profondeurSommaire >= 2 ? '6px' : '0' }}>
                  {/* Niv1 */}
                  <button onClick={() => changerNiv1(n1)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '11.5px', fontWeight: estActif ? 600 : 400, color: estActif ? '#3d6b4f' : '#3a3530', lineHeight: 1.35 }}>
                    {n1}
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
                                if (ancre) {
                                  const el = document.getElementById(ancre)
                                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
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
        </nav>
        ) : (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'sticky', top: '48px', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 48px)', width: '22px', background: '#faf8f4', border: 'none', borderRight: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl' as any }}>
            ☰
          </button>
        )}

        {/* ── TEXTE CENTRAL ── */}
        <main lang="fr" style={{ flex: 1, minWidth: 0, padding: '0 48px 80px', position: 'relative', overflow: 'visible' }}><div style={{ maxWidth: '560px', margin: '0 auto', position: 'relative', overflow: 'visible' }}>
          <PageTitre auteur={auteur} oeuvre={oeuvre} titre={titreAffiche} estAdmin={estAdmin}
            onModifierTitre={() => setEditionCible({ type: 'titre_oeuvre', texteActuel: titreAffiche })} />

          {/* Navigation précédent/suivant — toujours au niveau 1 */}
          {vue === 'texte' && (
            <div id="barre-nav-niv1" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)', alignItems: 'center', columnGap: '14px', marginBottom: '1.5rem', paddingBottom: '1rem', paddingRight: '92px', borderBottom: '1px solid #ede9e2', minHeight: '32px', scrollMarginTop: '60px' }}>
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev)} disabled={!niv1Prev}
                style={{ justifySelf: 'start', fontSize: '18px', lineHeight: 1, color: niv1Prev ? '#9a958d' : 'transparent', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Prev ? 'auto' : 'none' }}>
                {niv1Prev ? '‹' : ''}
              </button>
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#2a3d30', fontFamily: "Georgia, serif", textAlign: 'center', minWidth: 0, lineHeight: 1.3, whiteSpace: 'normal', overflowWrap: 'break-word', position: 'relative' }}>
                {niv1Loading ? <span style={{ fontSize: '13px', color: '#b0a89e' }}>Chargement…</span> : rendreTexteEnrichi(groupes[0]?.niv1_texte || niv1Actif)}
                {estAdmin && !niv1Loading && (
                  <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: groupes[0] ?? { niv1: niv1Actif, niv2: '', niv3: '', niv4: '', anchor: '', itemIds: [] }, texteActuel: groupes[0]?.niv1_texte || niv1Actif, schemaTexte: true })}
                    title="Modifier ce titre (admin)" style={{ fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', marginLeft: '6px', verticalAlign: 'middle' }}>✎</button>
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
                      <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.1rem', fontWeight: 400, color: '#2a3d30', lineHeight: 1.3, margin: 0, letterSpacing: '0.01em', whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(groupe.niv2)}</h3>
                      {groupe.niv2_texte && txtCorps[1] && <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '0.92rem', fontWeight: 400, color: '#7a7268', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(groupe.niv2_texte)}</p>}
                      {estAdmin && (
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2_texte || groupe.niv2, schemaTexte: !!groupe.niv2_texte })}
                          title="Modifier ce titre (admin)" style={{ position: 'absolute', right: '92px', top: '0.5rem', fontSize: '11px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                      )}
                    </div>
                  )}
                  {showNiv3 && (
                    <div style={{ marginTop: isFirstGroupe ? '0' : '1rem', marginBottom: '0.4rem', paddingLeft: '2px', borderLeft: '2px solid #d6d0c4', position: 'relative', paddingRight: estAdmin ? '20px' : 0 }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#5a5450', lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(groupe.niv3)}</p>
                      {groupe.niv3_texte && txtCorps[2] && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#9a958d', lineHeight: 1.3, margin: '2px 0 0', whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(groupe.niv3_texte)}</p>}
                      {estAdmin && (
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3_texte || groupe.niv3, schemaTexte: !!groupe.niv3_texte })}
                          title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
                      )}
                    </div>
                  )}
                  {showNiv4 && (
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#b0a89e', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: '0.5rem', position: 'relative', paddingRight: estAdmin ? '20px' : 0, whiteSpace: 'pre-line' }}>
                      {rendreTexteEnrichi(groupe.niv4)}
                      {groupe.niv4_texte && txtCorps[3] && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px', fontStyle: 'italic' }}>{rendreTexteEnrichi(groupe.niv4_texte)}</span>}
                      {estAdmin && (
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4_texte || groupe.niv4, schemaTexte: !!groupe.niv4_texte })}
                          title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '9px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', textTransform: 'none' }}>✎</button>
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
                          {rendreTexteEnrichi(normaliserEspaces(s.texte))}
                        </p>
                        <div className="seg-actions" style={{ display: 'flex', flexDirection: 'row', gap: '2px', flexShrink: 0, width: '92px', paddingTop: '2px', justifyContent: 'flex-end', marginRight: '-16px' }}>
                          {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.numero)} onSauvegarde={() => marquerSauvegardeSeg(s.numero)} />}
                          <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvre.titre} sousTitre={oeuvre.sous_titre} tradAuteur={oeuvre.trad_auteur} editeur={oeuvre.editeur} collection={oeuvre.collection} ville={oeuvre.ville} datePublication={oeuvre.date_publication} className="seg-btn-action" />
                          <BoutonSignalerSegment segId={sid} apercu={`§${s.numero} — ${texteSansEnrichissement(s.texte).slice(0,60)}…`} className="seg-btn-action" />
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)" style={{ ...BTN_STYLE }}>✎</button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}

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
                  const showNiv1 = groupe.niv1 && groupe.niv1 !== dniv1
                  if (showNiv1) dniv1 = groupe.niv1
                  const marginTop = isFirst ? '0' : '2.5rem'
                  if (isFirst) isFirst = false
                  return (
                    <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                      {showNiv1 && (
                        <div style={{ position: 'relative', marginTop: marginTop, marginBottom: '0.5rem' }}>
                          <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.45rem', fontWeight: 500, color: '#2a2520', textAlign: 'center', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(groupe.niv1_texte || groupe.niv1)}</h2>
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
                              {rendreTexteEnrichi(normaliserEspaces(s.texte))}
                            </p>
                            {estAdmin && (
                              <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)"
                                style={{ position: 'absolute', right: '-10px', top: '1px', ...BTN_STYLE }}>✎</button>
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
        <aside style={{ width: '288px', flexShrink: 0, position: 'sticky', top: '48px', alignSelf: 'flex-start', height: 'calc(100vh - 48px)', borderLeft: '1px solid #d6d0c4', display: 'flex', flexDirection: 'column', background: '#fff' }}>

          <div style={{ display: 'flex', padding: '0 10px', borderBottom: '1px solid #d6d0c4', flexShrink: 0, overflowX: 'auto' }}>
            {([{ key: 'refs', label: 'Renvois' }, { key: 'commentaires', label: 'Commentaires' }, { key: 'suggestions', label: 'Suggestions' }] as const).map(o => (
              <button key={o.key} onClick={() => setOngletDroit(o.key)} className="onglet-btn"
                style={{ flexShrink: 0, padding: '7px 8px', fontSize: '10px', fontWeight: ongletDroit === o.key ? 600 : 400, color: ongletDroit === o.key ? '#3d6b4f' : '#6b6560', background: 'transparent', border: 'none', borderBottom: ongletDroit === o.key ? '2px solid #3d6b4f' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {o.label}
              </button>
            ))}
            <button onClick={() => setPanneauOuvert(false)} title="Fermer ce panneau"
              style={{ marginLeft: 'auto', flexShrink: 0, padding: '0 2px 0 8px', fontSize: '11px', color: '#b0a89e', background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer' }}>✕</button>
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
                      <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Aucun verset associé.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {segActifData.versets.map(v => (
                          <div key={v.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                <a href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${encodeURIComponent(v.chapitre)}&verset=${encodeURIComponent(v.verset)}&trad=${encodeURIComponent(trad)}`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', margin: 0, textDecoration: 'none' }}>{v.label}</a>
                                {estAdmin && (
                                  <button onClick={() => supprimerLienBiblique(segActifData.id, v.id)} title="Supprimer ce renvoi biblique"
                                    style={{ fontSize: '10px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px', lineHeight: 1 }}>
                                    ✎
                                  </button>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                <BoutonEnregistrerVerset verset={v} trad={trad} userId={userId} />
                                <BoutonCopieVerset texte={v.textes[trad] || v.textes['TR0001'] || ''} label={v.label} />
                                <BoutonSignalerVerset versetId={v.id} label={v.label} />
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
                  <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Cliquez sur un paragraphe pour afficher les versets associés.</p>
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
                          {rendreTexteEnrichi(normaliserEspaces(s.segment_texte))}
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
            style={{ position: 'sticky', top: '48px', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 48px)', width: '22px', background: '#fff', border: 'none', borderLeft: '1px solid #d6d0c4', cursor: 'pointer', color: '#9a958d', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl' as any }}>
            ☰
          </button>
        )}
      </div>

      {editionCible && (
        <ModaleEditionAdmin
          cible={editionCible}
          idOeuvre={idOeuvre}
          onTitreOeuvreModifie={(t) => setTitreAffiche(t)}
          onClose={() => setEditionCible(null)}
          onEnregistre={() => vue === 'apparat' ? chargerApparatData() : changerNiv1(niv1Actif, { forceRefresh: true, conserverPosition: true })}
        />
      )}
      {suggestionSignalee && (
        <ModalSignalement
          titre={`Référence à identifier — segment ${suggestionSignalee.segment_numero}`}
          onClose={() => setSuggestionSignalee(null)}
          onEnvoyer={async (msg) => {
            await insererSignalement({
              id_segment: suggestionSignalee.id,
              message: `Référence à identifier : ${msg || suggestionSignalee.segment_texte.slice(0, 160)}`,
            })
          }}
        />
      )}
    </div>
  )
}
