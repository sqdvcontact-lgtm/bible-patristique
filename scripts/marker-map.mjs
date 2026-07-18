// Rattache les surnuméraires portant un renvoi « (N) » (référence propre de Giguet à la
// numérotation Vulgate/canonique) au slot canon correspondant. Le VERSET vient du marqueur
// (fiable) ; le CHAPITRE est inféré du voisin canon mappé (ou ch_orig / ±1). Contrôle de
// contenu léger (Dice≥0.12) juste pour écarter un chapitre inféré manifestement faux.
// Slots vides uniquement (0 collision), greedy dédupliqué.
//   node scripts/marker-map.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const SANITE = 0.12
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const refRows = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null))
const refTok = new Map(refRows.map(r=>[r.canon_id, new Set(norm(r.texte))]))
const refTxt = new Map(refRows.map(r=>[r.canon_id, r.texte]))
const G = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,canon_id,texte').eq('trad_id','TR0009').order('id'))
const occ = new Set(G.filter(r=>r.canon_id).map(r=>r.canon_id))
const byLivre = {}; for (const r of G) (byLivre[r.livre] ??= []).push(r)
for (const l in byLivre) byLivre[l].sort((a,b)=>a.ch_orig-b.ch_orig||a.v_orig-b.v_orig)
function voisinCh(s){ const arr=byLivre[s.livre], i=arr.indexOf(s)
  for(let j=i+1;j<arr.length;j++) if(arr[j].canon_id) return +arr[j].canon_id.split('.')[1]
  for(let j=i-1;j>=0;j--) if(arr[j].canon_id) return +arr[j].canon_id.split('.')[1]
  return s.ch_orig }

const props = []
const prisPar = {}   // canon_id → meilleur {dice}
for (const s of G){
  if (s.canon_id) continue
  const m = s.texte.match(/^\s*\((?:Vulg\.[^)]*?)?(\d{1,3})\s*[.,]?\s*\)/)
  if (!m) continue
  const N = +m[1], chV = voisinCh(s)
  const chaps = [...new Set([chV, s.ch_orig, chV-1, chV+1])]
  const tok = new Set(norm(s.texte))
  let best=0, bestCid=null
  for (const ch of chaps){ const cid=`${s.livre}.${ch}.${N}`; if(!refTok.has(cid)||occ.has(cid))continue
    const d=dice(tok, refTok.get(cid)); if(d>best){best=d;bestCid=cid} }
  if (bestCid && best>=SANITE) props.push({ r:s, cid:bestCid, dice:best })
}
// dédup : un slot pris par le meilleur Dice
props.sort((a,b)=>b.dice-a.dice)
const usedSlot=new Set(), usedId=new Set(), final=[]
for (const p of props){ if(usedSlot.has(p.cid)||usedId.has(p.r.id))continue; usedSlot.add(p.cid);usedId.add(p.r.id); final.push(p) }

console.log(`${DRY?'[DRY] ':''}Surnuméraires à marqueur rattachés : ${final.length}`)
const parL={}; for(const p of final){(parL[p.r.livre]??=0);parL[p.r.livre]++}
console.log('Par livre :', JSON.stringify(Object.fromEntries(Object.entries(parL).sort((a,b)=>b[1]-a[1]))))
console.log('\nÉchantillon (Dice croissant) :')
for (const p of [...final].sort((a,b)=>a.dice-b.dice).slice(0,10)) console.log(`  ${p.r.livre} ${p.r.ch_orig}:${p.r.v_orig} → ${p.cid} (${p.dice.toFixed(2)})  « ${p.r.texte.slice(0,38)} » vs « ${(refTxt.get(p.cid)||'').slice(0,38)} »`)

if (!DRY){ for (const p of final) await sb.from('versets_v2').update({ canon_id:p.cid, alignement_verifie:true }).eq('id', p.r.id)
  console.log(`\n${final.length} rattachés.`) }
