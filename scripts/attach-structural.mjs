// Rattachements structurels Giguet → canon, quand Giguet et le canon découpent
// différemment : aligne (NW contenu) un chapitre Giguet sur un chapitre canon d'un
// AUTRE livre/numéro. Insère sous le livre canon (pour l'affichage polyglotte),
// v_orig = numéro Giguet d'origine.
//   - Lettre de Jérémie (LJE, 72 v.)  → canon Baruch 6
//   - Malachie ch. 4 (6 v.)           → canon Malachie 3 (slots 19-24)
//   node scripts/attach-structural.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const TRAD='TR0009', GAP=0.12
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
const nettoie = t => (t||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }
function nw(gt,ct){ const n=gt.length,m=ct.length,S=Array.from({length:n+1},()=>new Float64Array(m+1)),T=Array.from({length:n+1},()=>new Int8Array(m+1))
  for(let i=1;i<=n;i++){S[i][0]=-i*GAP;T[i][0]=1} for(let j=1;j<=m;j++){S[0][j]=-j*GAP;T[0][j]=2}
  for(let i=1;i<=n;i++)for(let j=1;j<=m;j++){const d=S[i-1][j-1]+dice(gt[i-1],ct[j-1]),u=S[i-1][j]-GAP,l=S[i][j-1]-GAP;let b=d,t=0;if(u>b){b=u;t=1}if(l>b){b=l;t=2}S[i][j]=b;T[i][j]=t}
  const map=new Array(n).fill(null);let i=n,j=m;while(i>0||j>0){const t=(i>0&&j>0)?T[i][j]:(i>0?1:2);if(t===0){map[i-1]=j-1;i--;j--}else if(t===1)i--;else j--}return map }

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const REMAPS = [
  { nom:'Lettre de Jérémie → Baruch 6', gigLivre:'LJE', gigCh:1, canonLivre:'BAR', canonCh:6, storeLivre:'BAR', storeCh:6 },
  { nom:'Malachie 4 → Malachie 3', gigLivre:'MAL', gigCh:4, canonLivre:'MAL', canonCh:3, storeLivre:'MAL', storeCh:4 },
]

for (const r of REMAPS){
  const gc = (gig[r.gigLivre]||[]).find(c=>c.ch===r.gigCh)
  if(!gc){ console.log(`  ${r.nom}: chapitre Giguet absent`); continue }
  const cc = await all(sb.from('versets_v2').select('canon_id,v_orig,texte').eq('trad_id','TR0003').eq('livre',r.canonLivre).eq('ch_orig',r.canonCh).order('v_orig'))
  const gv = gc.versets.map(v=>({ v:v.v, tok:new Set(norm(v.text)), txt:nettoie(v.text) }))
  const map = nw(gv.map(g=>g.tok), cc.map(c=>new Set(norm(c.texte))))
  const rows = gv.map((g,i)=>({ trad_id:TRAD, livre:r.storeLivre, ch_orig:r.storeCh, v_orig:g.v, texte:g.txt,
    canon_id: map[i]!=null?cc[map[i]].canon_id:null, est_suscription:false, alignement_verifie: map[i]!=null }))
  const nMap=rows.filter(x=>x.canon_id).length
  if(!DRY){
    await sb.from('versets_v2').delete().eq('trad_id',TRAD).eq('livre',r.storeLivre).eq('ch_orig',r.storeCh)
    for(let i=0;i<rows.length;i+=500){const{error}=await sb.from('versets_v2').insert(rows.slice(i,i+500));if(error)throw new Error(r.nom+': '+error.message)}
  }
  console.log(`  ${r.nom}: ${gv.length} v. Giguet → ${nMap} mappés${DRY?' [dry]':''}`)
  for(const i of [0, Math.floor(gv.length/2), gv.length-1]){ const c=map[i]!=null?cc[map[i]]:null
    console.log(`     ${r.storeCh}:${gv[i].v} → ${c?c.canon_id:'vide'}  Gig: ${gv[i].txt.slice(0,40)}${c?'  | can: '+c.texte.slice(0,40):''}`) }
}
