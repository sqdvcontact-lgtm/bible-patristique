// Vérif : rejoue l'appariement au niveau du livre et affiche, pour un chapitre Giguet
// donné, le canon assigné + les deux textes. Usage : node scripts/show-manual-align.mjs JER 28
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const [code, chArg] = process.argv.slice(2); const chShow = +chArg
const SEUIL = 0.30
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const gig = JSON.parse(readFileSync('scripts/giguet.json','utf8'))
const plan = JSON.parse(readFileSync('scripts/giguet-plan.json','utf8'))
const ref = new Map(); (await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id'))).forEach(r=>ref.set(r.canon_id,r.texte))
const dejaPris = new Set(); (await all(sb.from('versets_v2').select('canon_id').eq('trad_id','TR0009').not('canon_id','is',null).order('id'))).forEach(r=>dejaPris.add(r.canon_id))

const chsManuels = new Set(Object.entries(plan).filter(([k,p])=>k.startsWith(code+' ')&&p.action==='manual'&&p.raison!=='nocanon').map(([k])=>+k.split(' ')[1]))
const gv=[]; for(const c of gig[code]??[]) if(chsManuels.has(c.ch)) for(const v of c.versets) gv.push({ch:c.ch,label:v.v,text:v.text.replace(/\s+/g,' ').trim(),tok:new Set(norm(v.text))})
const cible=[]; for(const [cid,txt] of ref) if(cid.startsWith(code+'.')&&!dejaPris.has(cid)) cible.push({cid,txt,tok:new Set(norm(txt))})
const paires=[]; for(let i=0;i<gv.length;i++)for(let j=0;j<cible.length;j++){const d=dice(gv[i].tok,cible[j].tok); if(d>=SEUIL)paires.push([d,i,j])}
paires.sort((a,b)=>b[0]-a[0])
const gPris=new Array(gv.length).fill(false),cPris=new Array(cible.length).fill(false),map=new Array(gv.length).fill(null),sc=new Array(gv.length).fill(0)
for(const [d,i,j] of paires){ if(gPris[i]||cPris[j])continue; gPris[i]=true;cPris[j]=true;map[i]={cid:cible[j].cid,txt:cible[j].txt};sc[i]=d }

console.log(`${code} ${chShow} (Giguet) → canon assigné :`)
gv.forEach((g,i)=>{ if(g.ch!==chShow) return
  console.log(`\nG ${g.ch}:${g.label} → ${map[i]?map[i].cid+' (Dice '+sc[i].toFixed(2)+')':'— vide'}`)
  console.log(`   Giguet : ${g.text.slice(0,72)}`)
  if(map[i]) console.log(`   canon  : ${map[i].txt.slice(0,72)}`)
})
