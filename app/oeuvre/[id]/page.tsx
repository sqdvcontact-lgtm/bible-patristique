import { createClient } from '@supabase/supabase-js'
import OeuvreClient from './OeuvreClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Segment = {
  id: number; segment_numero: number; segment_texte: string
  ref_niv1: string|null; ref_niv2: string|null; ref_niv3: string|null
  ref_niv4: string|null; ref_niv5: string|null
  lien_1: string|null; lien_2: string|null; lien_3: string|null; lien_4: string|null
}

function extraireVersets(s: Segment): string[] {
  return [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).join(';').split(';').map(v=>v.trim()).filter(Boolean)
}

function grouper(segments: Segment[]) {
  type G = { niv1:string; niv2:string; items:Segment[] }
  const gs:G[]=[]
  let cur={niv1:'',niv2:'',items:[] as Segment[]}
  for(const s of segments){
    const n1=s.ref_niv1||'',n2=s.ref_niv2||''
    if(n1!==cur.niv1||n2!==cur.niv2){if(cur.items.length>0)gs.push({...cur});cur={niv1:n1,niv2:n2,items:[s]}}
    else cur.items.push(s)
  }
  if(cur.items.length>0)gs.push({...cur})
  return gs
}

function numerotationLocale(segments: Segment[]): Map<number,number> {
  const map=new Map<number,number>()
  let c=0,n1c=''
  for(const s of segments){const n1=s.ref_niv1||'';if(n1!==n1c){c=0;n1c=n1};map.set(s.id,++c)}
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

function refFr(ref:string):string{
  const p=ref.trim().split(' ')
  if(p.length<2)return ref
  const cv=p[1].split(':')
  return cv[1]?`${ABREV_FR[p[0]]||p[0]} ${cv[0]}, ${cv[1]}`:`${ABREV_FR[p[0]]||p[0]} ${cv[0]}`
}

export default async function OeuvrePage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params

  const {data:oeuvre}=await supabase.from('oeuvres').select('*, auteurs(nom)').eq('id_oeuvre',id).single()
  const {data:segments}=await supabase.from('segments').select('*').eq('id_oeuvre',id).order('segment_numero')

  if(!oeuvre)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f7f4ef'}}>
      <p style={{color:'#8a8278'}}>Œuvre introuvable.</p>
    </div>
  )

  const tousIds=new Set<string>()
  segments?.forEach(s=>extraireVersets(s).forEach(v=>tousIds.add(v)))

  const {data:versetsData}=await supabase
    .from('versets')
    .select('id_verset, ref, trad_sacy, trad_lsg, trad_crampon, trad_vulgate')
    .in('id_verset',Array.from(tousIds))

  const versetMap:Record<string,{label:string;textes:Record<string,string>;livre:string;chapitre:string;verset:string}>= {}
  versetsData?.forEach(v=>{
    const p=v.ref.trim().split(' ')
    const cv=(p[1]||'1:1').split(':')
    versetMap[v.id_verset]={
      label:refFr(v.ref),
      textes:{trad_sacy:v.trad_sacy||'',trad_lsg:v.trad_lsg||'',trad_crampon:v.trad_crampon||'',trad_vulgate:v.trad_vulgate||''},
      livre:p[0], chapitre:cv[0], verset:cv[1]||'1',
    }
  })

  const versetParSegment:Record<number,any[]>={}
  segments?.forEach(s=>{
    versetParSegment[s.id]=extraireVersets(s).map(vid=>({id:vid,...(versetMap[vid]||{label:vid,textes:{},livre:'',chapitre:'1',verset:'1'})}))
  })

  const auteur=(oeuvre.auteurs as any)?.nom||''
  const groupes=grouper(segments||[])
  const numLocaux=numerotationLocale(segments||[])

  type TocEntry={niv1:string;niv2:string;anchor:string}
  const toc:TocEntry[]=[]
  let ln1='',ln2=''
  groupes.forEach((g,i)=>{
    if(g.niv1!==ln1||g.niv2!==ln2){toc.push({niv1:g.niv1,niv2:g.niv2,anchor:`g${i}`});ln1=g.niv1;ln2=g.niv2}
  })

  const segmentsData=segments?.map(s=>({
    id:s.id, numero:numLocaux.get(s.id)||s.segment_numero,
    texte:s.segment_texte, versets:versetParSegment[s.id]||[],
  }))||[]

  const groupesData=groupes.map((g,gi)=>({
    niv1:g.niv1, niv2:g.niv2, anchor:`g${gi}`, itemIds:g.items.map(s=>s.id),
  }))

  return(
    <OeuvreClient
      auteur={auteur}
      oeuvre={{titre:oeuvre.titre,titre_original:oeuvre.titre_original,trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date}}
      toc={toc} groupes={groupesData} segments={segmentsData}
    />
  )
}