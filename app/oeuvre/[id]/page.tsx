import { createClient } from '@supabase/supabase-js'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import OeuvreClient from './OeuvreClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Segment = {
  id: number; segment_numero: number; segment_texte: string
  ref_niv1: string|null; ref_niv2: string|null; ref_niv3: string|null
  ref_niv4: string|null; ref_niv5: string|null
  ref_niv1_texte: string|null; ref_niv2_texte: string|null
  ref_niv3_texte: string|null; ref_niv4_texte: string|null
  lien_1: string|null; lien_2: string|null; lien_3: string|null; lien_4: string|null
  nature: string|null
}

function extraireVersets(s: Segment): string[] {
  return [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).join(';').split(';').map(v=>v.trim()).filter(Boolean)
}

function grouper(segments: Segment[]) {
  type G = { niv1:string; niv2:string; niv3:string; niv4:string
    niv1_texte:string; niv2_texte:string; niv3_texte:string; niv4_texte:string
    items:Segment[] }
  const gs:G[]=[]
  let cur={niv1:'',niv2:'',niv3:'',niv4:'',niv1_texte:'',niv2_texte:'',niv3_texte:'',niv4_texte:'',items:[] as Segment[]}
  for(const s of segments){
    // Ignorer les séparateurs dans le groupement
    if(s.nature==='separateur') continue
    const n1=s.ref_niv1||'',n2=s.ref_niv2||'',n3=s.ref_niv3||'',n4=s.ref_niv4||''
    if(n1!==cur.niv1||n2!==cur.niv2||n3!==cur.niv3||n4!==cur.niv4){
      if(cur.items.length>0)gs.push({...cur})
      cur={niv1:n1,niv2:n2,niv3:n3,niv4:n4,
        niv1_texte:s.ref_niv1_texte||'',niv2_texte:s.ref_niv2_texte||'',
        niv3_texte:s.ref_niv3_texte||'',niv4_texte:s.ref_niv4_texte||'',
        items:[s]}
    }
    else cur.items.push(s)
  }
  if(cur.items.length>0)gs.push({...cur})
  return gs
}

function numerotationLocale(segments: Segment[]): Map<number,number> {
  const map=new Map<number,number>()
  let c=0,n1c=''
  for(const s of segments){
    if(s.nature==='separateur') continue
    const n1=s.ref_niv1||'';if(n1!==n1c){c=0;n1c=n1};map.set(s.id,++c)
  }
  return map
}

const ABREV_FR:Record<string,string>={
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

function detailsRefBiblique(ref:string): { label: string; livre: string; chapitre: string; verset: string } {
  const p=ref.trim().split(' ')
  if(p.length<2)return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv=p[1].split(':')
  const label = cv[1]?`${ABREV_FR[p[0]]||p[0]} ${cv[0]}, ${cv[1]}`:`${ABREV_FR[p[0]]||p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

async function chargerCodesTraductions() {
  const { data } = await supabase.from('traductions').select('trad_id').order('ordre', { ascending: true })
  const codes = (data ?? []).map((t: any) => t.trad_id).filter((code: string) => /^TR\d{4}$/.test(code))
  return codes.length > 0 ? codes : ['TR0001', 'TR0002', 'TR0003', 'TR0004']
}

async function enrichirAvecVersets(segments: Segment[]) {
  const tousIds = new Set<string>()
  segments.forEach(s => extraireVersets(s).forEach(v => tousIds.add(v)))
  const tousIdsArray = Array.from(tousIds)
  if (tousIdsArray.length === 0) return {}

  const codesTraductions = await chargerCodesTraductions()
  const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
  const batchSize = 500
  const batches = Array.from({ length: Math.ceil(tousIdsArray.length / batchSize) }, (_, i) =>
    tousIdsArray.slice(i * batchSize, (i + 1) * batchSize))
  const results = await Promise.all(batches.map(batch =>
    supabase.from('versets').select(selectVersets).in('id_verset', batch)))
  const versetsData = results.flatMap(r => r.data ?? []) as any[]

  const versetMap: Record<string,{label:string;textes:Record<string,string>}> = {}
  versetsData.forEach(v => {
    const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))
    const ref = detailsRefBiblique(v.ref)
    versetMap[v.id_verset] = {
      ...ref,
      textes,
    }
  })
  return versetMap
}

export default async function OeuvrePage({
  params,
  searchParams,
}:{
  params:Promise<{id:string}>
  searchParams?:Promise<{segment?:string}>
}) {
  const {id}=await params
  const sp = searchParams ? await searchParams : {}
  const segmentCibleId = Number(sp.segment ?? '')

  // Admin = connecté avec le compte administrateur (adresse fixe), vérifié
  // côté serveur via la session Supabase Auth — remplace l'ancien cookie
  // bp_admin_session, qui n'est plus jamais posé depuis la suppression de la
  // page de connexion par mot de passe.
  const estAdmin = await verifierEstAdmin()

  // 1. Charger l'œuvre
  const { data: oeuvre } = await supabase
    .from('oeuvres').select('*, auteurs(id_auteur, nom)').eq('id_oeuvre', id).single()

  if (!oeuvre) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f7f4ef'}}>
      <p style={{color:'#8a8278'}}>Œuvre introuvable.</p>
    </div>
  )

  // 2. Récupérer les niv1 distincts ordonnés via RPC
  const { data: niv1Raw, error: rpcError } = await supabase.rpc('get_niv1_list', { p_id_oeuvre: id })
  if (rpcError) {
    console.error('get_niv1_list error:', rpcError)
  }
  const niv1Complet: string[] = (niv1Raw ?? []).map((r: any) => r.ref_niv1).filter(Boolean)

  // Carte niv1 → niv1_texte (label humain) : d'abord via le RPC s'il le fournit,
  // sinon via une petite requête dédiée.
  const niv1TexteMap: Record<string, string> = {}
  ;(niv1Raw ?? []).forEach((r: any) => {
    if (r.ref_niv1 && r.ref_niv1_texte) niv1TexteMap[r.ref_niv1] = r.ref_niv1_texte
  })
  if (Object.keys(niv1TexteMap).length === 0 && niv1Complet.length > 0) {
    const { data: niv1TexteData } = await supabase
      .from('segments')
      .select('ref_niv1, ref_niv1_texte')
      .eq('id_oeuvre', id)
      .in('ref_niv1', niv1Complet)
      .not('ref_niv1_texte', 'is', null)
      .limit(niv1Complet.length * 5)
    ;(niv1TexteData ?? []).forEach((r: any) => {
      if (r.ref_niv1 && r.ref_niv1_texte && !niv1TexteMap[r.ref_niv1])
        niv1TexteMap[r.ref_niv1] = r.ref_niv1_texte
    })
  }

  // Les niv1 entièrement composés d'apparat critique (ex. un glossaire) ne
  // doivent pas apparaître dans le sommaire normal : ils sont déjà accessibles
  // via le bloc « Apparat critique » dédié, sinon ils apparaissent en double.
  const { data: niv1ApparatRaw } = await supabase
    .from('segments').select('ref_niv1').eq('id_oeuvre', id).eq('nature', 'apparat_critique')
  const niv1ApparatSet = new Set((niv1ApparatRaw ?? []).map((r: any) => r.ref_niv1).filter(Boolean))
  const niv1List = niv1Complet.filter(n1 => !niv1ApparatSet.has(n1))
  const { data: segmentCible } = Number.isFinite(segmentCibleId) && segmentCibleId > 0
    ? await supabase
        .from('segments')
        .select('id,ref_niv1,nature')
        .eq('id_oeuvre', id)
        .eq('id', segmentCibleId)
        .maybeSingle()
    : { data: null }
  const vueInitiale = segmentCible?.nature === 'apparat_critique' ? 'apparat' : 'texte'
  const premierNiv1 = vueInitiale === 'texte' && segmentCible?.ref_niv1
    ? segmentCible.ref_niv1
    : niv1List[0] ?? null

  // 3. Charger les segments du premier niv1 + l'apparat
  const SELECT_SEG = 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,lien_1,lien_2,lien_3,lien_4,nature'

  async function chargerTousSegments(filtre: Record<string, string>) {
    const acc: any[] = []
    let from = 0
    while (true) {
      let q = supabase.from('segments').select(SELECT_SEG).eq('id_oeuvre', id).order('id', { ascending: true }).range(from, from + 999)
      for (const [k, v] of Object.entries(filtre)) q = q.eq(k, v)
      const { data: batch } = await q
      if (!batch || batch.length === 0) break
      acc.push(...batch)
      if (batch.length < 1000) break
      from += 1000
    }
    return acc
  }

  const [segmentsTexteRaw, segmentsApparatRaw] = await Promise.all([
    premierNiv1 ? chargerTousSegments({ ref_niv1: premierNiv1 }) : Promise.resolve([]),
    chargerTousSegments({ nature: 'apparat_critique' }),
  ])

  const segmentsTexte = segmentsTexteRaw as Segment[]
  const segmentsApparat = segmentsApparatRaw as Segment[]

  // 4. Versets pour le premier livre seulement
  const versetMap = await enrichirAvecVersets(segmentsTexte)

  const versetParSegment: Record<number, any[]> = {}
  segmentsTexte.forEach(s => {
    versetParSegment[s.id] = extraireVersets(s).map(vid => ({
      id: vid, ...(versetMap[vid] || { label: vid, textes: {} })
    }))
  })

  const auteur = (oeuvre.auteurs as any)?.nom || ''
  const auteurId = (oeuvre.auteurs as any)?.id_auteur?.toString() ?? ''

  const groupes = grouper(segmentsTexte)
  const groupesApparat = grouper(segmentsApparat)
  const numLocaux = numerotationLocale(segmentsTexte)
  const numLocauxApparat = numerotationLocale(segmentsApparat)

  type TocEntry = { niv1:string; niv2:string; anchor:string }
  const tocApparat: TocEntry[] = []
  let la1='', la2=''
  groupesApparat.forEach((g, i) => {
    if (g.niv1 !== la1 || g.niv2 !== la2) { tocApparat.push({niv1:g.niv1,niv2:g.niv2,anchor:`a${i}`}); la1=g.niv1; la2=g.niv2 }
  })

  const segmentsData = segmentsTexte
    .filter(s => s.nature !== 'separateur')
    .map(s => ({
      id: s.id, numero: numLocaux.get(s.id) || s.segment_numero,
      texte: s.segment_texte, versets: versetParSegment[s.id] || [],
    }))

  const groupesData = groupes.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `g${gi}`, itemIds: g.items.map(s => s.id),
  }))

  const segmentsApparatData = segmentsApparat
    .filter(s => s.nature !== 'separateur')
    .map(s => ({
      id: s.id, numero: numLocauxApparat.get(s.id) || s.segment_numero,
      texte: s.segment_texte, versets: [],
    }))

  const groupesApparatData = groupesApparat.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `a${gi}`, itemIds: g.items.map(s => s.id),
  }))

  return (
    <OeuvreClient
      auteur={auteur}
      auteurId={auteurId}
      idOeuvre={id}
      estAdmin={estAdmin}
      niv1List={niv1List}
      niv1TexteMap={niv1TexteMap}
      niveauxSommaire={oeuvre.niveaux_sommaire ?? oeuvre.profondeur_sommaire ?? 1}
      niveauxCorps={oeuvre.niveaux_corps ?? 1}
      txtSommaire={(oeuvre.texte_sommaire ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      txtCorps={(oeuvre.texte_corps ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      afficherNumeros={oeuvre.afficher_numeros !== false}
      oeuvre={{titre:oeuvre.titre,sous_titre:oeuvre.sous_titre,titre_original:oeuvre.titre_original,trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date,editeur:oeuvre.editeur,collection:oeuvre.collection,ville:oeuvre.ville,date_publication:oeuvre.date_publication,id_oeuvre:oeuvre.id_oeuvre}}
      groupes={groupesData} segments={segmentsData}
      tocApparat={tocApparat} groupesApparat={groupesApparatData} segmentsApparat={segmentsApparatData}
      segmentCibleId={Number.isFinite(segmentCibleId) && segmentCibleId > 0 ? segmentCibleId : null}
      vueInitiale={vueInitiale}
    />
  )
}
