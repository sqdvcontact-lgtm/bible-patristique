// Extrait Suzanne et « Bel et le dragon » (pages Wikisource séparées de Giguet) et les
// aligne sur le canon Daniel 13 (Suzanne) / 14 (Bel) par Needleman-Wunsch (contenu).
// Insérés sous livre=DAN, ch_orig=13/14 (là où l'ossature/Crampon les place).
import { readFileSync } from 'node:fs'
import { get } from 'node:https'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const fetch = url => new Promise((res,rej)=>get(url,{headers:{'User-Agent':'research-giguet'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(d));}).on('error',rej))
const clean = h => h
  .replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g,' ').replace(/<span class="pagenum[\s\S]*?<\/span>/g,' ')
  .replace(/<[^>]+>/g,' ').replace(/\.mw-parser-output[^}]*\}/g,' ')
  .replace(/&nbsp;|&#160;/g,' ').replace(/&#8217;|&rsquo;/g,'’').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/\s+/g,' ').trim()
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const GAP = 0.12
function nw(gtok, ctok){
  const n=gtok.length, m=ctok.length
  const S=Array.from({length:n+1},()=>new Float64Array(m+1)), T=Array.from({length:n+1},()=>new Int8Array(m+1))
  for(let i=1;i<=n;i++){S[i][0]=-i*GAP;T[i][0]=1} for(let j=1;j<=m;j++){S[0][j]=-j*GAP;T[0][j]=2}
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){ const diag=S[i-1][j-1]+dice(gtok[i-1],ctok[j-1]), up=S[i-1][j]-GAP, left=S[i][j-1]-GAP
    let b=diag,t=0; if(up>b){b=up;t=1} if(left>b){b=left;t=2} S[i][j]=b;T[i][j]=t }
  const map=new Array(n).fill(null); let i=n,j=m
  while(i>0||j>0){ const t=(i>0&&j>0)?T[i][j]:(i>0?1:2); if(t===0){map[i-1]=j-1;i--;j--}else if(t===1){i--}else{j--} }
  return map
}

function parseVersets(html){
  const blocs=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m=>clean(m[1])).filter(Boolean)
  const versets=[]
  for(const b of blocs){ const m=b.match(/^(\d{1,3})\.\s*([\s\S]*)$/); if(m) versets.push({v:+m[1], text:m[2].trim()}); else if(versets.length) versets[versets.length-1].text+=' '+b }
  return versets
}

const SRC=[
  { page:'Suzanne', ch:13 },
  { page:'Bel_et_le_dragon', ch:14 },
]
for(const {page,ch} of SRC){
  const html=await fetch('https://fr.wikisource.org/w/index.php?title=Traduction_de_la_Septante_et_du_Nouveau_Testament/'+page+'&action=render')
  const gv=parseVersets(html)
  const cc=(await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','DAN').eq('ch_orig',ch).order('v_orig')))
  const map=nw(gv.map(g=>new Set(norm(g.text))), cc.map(c=>new Set(norm(c.texte))))
  const rows=gv.map((g,i)=>({ trad_id:'TR0009', livre:'DAN', ch_orig:ch, v_orig:g.v, texte:g.text,
    canon_id: map[i]!=null?cc[map[i]].canon_id:null, est_suscription:false, alignement_verifie: map[i]!=null }))
  const nMap=rows.filter(r=>r.canon_id).length
  if(!DRY){
    await sb.from('versets_v2').delete().eq('trad_id','TR0009').eq('livre','DAN').eq('ch_orig',ch)
    for(let i=0;i<rows.length;i+=500){ const{error}=await sb.from('versets_v2').insert(rows.slice(i,i+500)); if(error)throw new Error(page+': '+error.message) }
  }
  console.log(`${page} → Daniel ${ch} : ${gv.length} v. Giguet / ${cc.length} v. canon · ${nMap} mappés${DRY?' [dry]':''}`)
  // aperçu des 3 premiers
  for(const {i} of [{i:0},{i:1},{i:2}]){ const c=map[i]!=null?cc[map[i]]:null
    console.log(`   ${ch}:${gv[i].v} → ${c?c.canon_id:'vide'}  Gig: ${gv[i].text.slice(0,42)}${c?'  | can: '+c.texte.slice(0,42):''}`) }
}
