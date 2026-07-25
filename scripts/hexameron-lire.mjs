// Lecture d'une homélie de l'Hexaéméron pour constituer les liens à la main.
// Dump du texte suivi, avec les liens DÉJÀ posés en regard, pour ne pas refaire.
//   node scripts/hexameron-lire.mjs "Première homélie"
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map((l)=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m)=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const HOM = process.argv[2];
if (!HOM) { console.error('usage : node scripts/hexameron-lire.mjs "<homélie>"'); process.exit(1); }
const ABR={GEN:'Gn',EXO:'Ex',LEV:'Lv',NUM:'Nb',DEU:'Dt',JOS:'Jos',JDG:'Jg',RUT:'Rt','1SA':'1S','2SA':'2S','1KI':'1R','2KI':'2R','1CH':'1Ch','2CH':'2Ch',EZR:'Esd',NEH:'Né',EST:'Est',JOB:'Jb',PSA:'Ps',PRO:'Pr',ECC:'Qo',SNG:'Ct',WIS:'Sg',SIR:'Si',ISA:'Is',JER:'Jr',LAM:'Lm',BAR:'Ba',EZK:'Ez',DAN:'Dn',HOS:'Os',JOL:'Jl',AMO:'Am',OBA:'Ab',JON:'Jon',MIC:'Mi',NAM:'Na',HAB:'Ha',ZEP:'So',HAG:'Ag',ZEC:'Za',MAL:'Ml',TOB:'Tb',JDT:'Jdt','1MA':'1M','2MA':'2M',MAT:'Mt',MRK:'Mc',LUK:'Lc',JHN:'Jn',ACT:'Ac',ROM:'Rm','1CO':'1Co','2CO':'2Co',GAL:'Ga',EPH:'Ep',PHP:'Ph',COL:'Col','1TH':'1Th','2TH':'2Th','1TI':'1Tm','2TI':'2Tm',TIT:'Tt',PHM:'Phm',HEB:'He',JAS:'Jc','1PE':'1P','2PE':'2P','1JN':'1Jn','2JN':'2Jn','3JN':'3Jn',JUD:'Jude',REV:'Ap'};
const fr=(c)=>{if(!c)return '(à constituer)';const[b,ch,v]=c.split('.');return `${ABR[b]||b} ${ch}, ${v}`;};
const clean=(t)=>(t||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const T={1:'CIT',2:'reprise',3:'comm',4:'écho'};

let segs=[];
for(let de=0;;de+=1000){const{data}=await sb.from('segments').select('id, segment_numero, segment_texte')
  .eq('id_oeuvre','A0017O0001').eq('ref_niv1',HOM).order('segment_numero').range(de,de+999);
  if(!data?.length)break; segs.push(...data); if(data.length<1000)break;}
const ids=segs.map(s=>s.id);
const liens=[];
for(let i=0;i<ids.length;i+=150){const{data}=await sb.from('liens_bibliques').select('id, segment_id, canon_id, type').in('segment_id',ids.slice(i,i+150));
  liens.push(...(data||[]));}
const parSeg=new Map();
for(const l of liens){let a=parSeg.get(l.segment_id); if(!a)parSeg.set(l.segment_id,a=[]); a.push(l);}

const out=[`# ${HOM} — ${segs.length} segments, ${liens.length} liens déjà posés\n`];
for(const s of segs){
  const d=(parSeg.get(s.id)||[]).map(l=>`${T[l.type]} ${fr(l.canon_id)}`).join(' | ');
  out.push(`[${s.segment_numero}]${d?' «'+d+'»':''} ${clean(s.segment_texte)}`);
}
const f='scripts/_hexameron_lecture.txt';
writeFileSync(f,out.join('\n'),'utf8');
console.log(`${segs.length} segments → ${f}`);
