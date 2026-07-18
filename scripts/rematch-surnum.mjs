// Ré-apparie les surnuméraires restants aux slots canon VIDES au niveau du LIVRE (gère
// les gros réordres LXX où le bon slot est loin, ex. 1R 4 → canon 5). Appariement glouton
// par Dice (seuil élevé), slots vides uniquement (0 collision), + filtre de cohérence par
// bloc (un mappage cross-chapitre n'est gardé que s'il fait partie d'un bloc ≥2) pour
// éliminer les faux appariements sur texte formulaire.
//   node scripts/rematch-surnum.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const SEUIL = 0.35, SEUIL_ISOLE = 0.99   // exception isolé désactivée : blocs cohérents uniquement
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const refRows = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null))
const refTxt = new Map(refRows.map(r=>[r.canon_id,r.texte]))
const canonPar = {}
for (const r of refRows){ const [c]=r.canon_id.split('.'); (canonPar[c] ??= []).push({ cid:r.canon_id, ch:+r.canon_id.split('.')[1], tok:new Set(norm(r.texte)) }) }
const G = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,canon_id,texte').eq('trad_id','TR0009'))
const occ = new Set(G.filter(r=>r.canon_id).map(r=>r.canon_id))

const props = []
const parLivre = new Map()
for (const r of G){ (parLivre.get(r.livre) ?? parLivre.set(r.livre,[]).get(r.livre)).push(r) }

for (const [code, rows] of parLivre){
  const cible = (canonPar[code] || []).filter(c => !occ.has(c.cid))   // slots VIDES
  const sur = rows.filter(r => !r.canon_id).map(r => ({ r, tok:new Set(norm(r.texte)) }))
  if (!cible.length || !sur.length) continue
  const paires = []
  for (let i=0;i<sur.length;i++) for (let j=0;j<cible.length;j++){ const d=dice(sur[i].tok, cible[j].tok); if(d>=SEUIL) paires.push([d,i,j]) }
  paires.sort((a,b)=>b[0]-a[0])
  const gPris=new Array(sur.length).fill(false), cPris=new Array(cible.length).fill(false), map=new Array(sur.length).fill(null), sc=new Array(sur.length).fill(0)
  for (const [d,i,j] of paires){ if(gPris[i]||cPris[j])continue; gPris[i]=true;cPris[j]=true;map[i]=cible[j].cid;sc[i]=d }
  // filtre de bloc : mappage cross-chapitre gardé seulement si ≥2 (même ch_orig → même ch_canon)
  const cnt={}
  sur.forEach((s,i)=>{ if(!map[i])return; const tch=+map[i].split('.')[1]; if(tch===s.r.ch_orig)return; cnt[`${s.r.ch_orig}|${tch}`]=(cnt[`${s.r.ch_orig}|${tch}`]||0)+1 })
  // cross-chapitre isolé toléré seulement si Dice très élevé (relocalisation nette d'un verset)
  sur.forEach((s,i)=>{ if(!map[i])return; const tch=+map[i].split('.')[1]; if(tch!==s.r.ch_orig && cnt[`${s.r.ch_orig}|${tch}`]<2 && sc[i]<SEUIL_ISOLE){ map[i]=null } })
  sur.forEach((s,i)=>{ if(map[i]) props.push({ r:s.r, cid:map[i], dice:sc[i] }) })
}

console.log(`${DRY?'[DRY] ':''}Surnuméraires ré-appariés à un slot canon vide : ${props.length}`)
const parL={}; for(const p of props){(parL[p.r.livre]??=0);parL[p.r.livre]++}
console.log('Par livre :', JSON.stringify(Object.fromEntries(Object.entries(parL).sort((a,b)=>b[1]-a[1]))))
console.log('\nÉchantillon (tri Dice croissant, les plus limites) :')
for (const p of [...props].sort((a,b)=>a.dice-b.dice).slice(0,12)) console.log(`  ${p.r.livre} ${p.r.ch_orig}:${p.r.v_orig} → ${p.cid} (${p.dice.toFixed(2)})  « ${p.r.texte.slice(0,32)} » vs « ${(refTxt.get(p.cid)||'').slice(0,32)} »`)

if (!DRY){ for (const p of props) await sb.from('versets_v2').update({ canon_id:p.cid, alignement_verifie:true }).eq('id', p.r.id)
  console.log(`\n${props.length} rattachés.`) }
