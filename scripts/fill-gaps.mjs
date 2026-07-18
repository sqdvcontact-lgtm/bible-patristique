// Dernier passage sûr : rattache un surnuméraire à un slot canon VIDE si (a) le slot est
// dans le MÊME chapitre canon que le ch. d'origine Giguet (gap sauté par NW, sans risque
// de réordre) et Dice≥0.40, ou (b) concordance quasi exacte (Dice≥0.62) n'importe où
// (ex. MAL 4:6 → 3:22). Greedy dédupliqué, slots vides seulement (0 collision).
//   node scripts/fill-gaps.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const SEUIL_MEME = 0.30, SEUIL_EXACT = 0.62
const EXCLURE = new Set(['TOB','JDT','SIR','JOB'])   // recensions/texte trop divergent → surnuméraires assumés
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const refRows = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null))
const refTxt = new Map(refRows.map(r=>[r.canon_id,r.texte]))
const canonPar = {}
for (const r of refRows){ const [c,ch]=r.canon_id.split('.'); (canonPar[c] ??= []).push({ cid:r.canon_id, ch:+ch, tok:new Set(norm(r.texte)) }) }
const G = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,canon_id,texte').eq('trad_id','TR0009'))
const occ = new Set(G.filter(r=>r.canon_id).map(r=>r.canon_id))

const props = []
const parLivre = new Map()
for (const r of G) (parLivre.get(r.livre) ?? parLivre.set(r.livre,[]).get(r.livre)).push(r)
for (const [code, rows] of parLivre){
  if (EXCLURE.has(code)) continue
  const cible = (canonPar[code]||[]).filter(c=>!occ.has(c.cid))
  const sur = rows.filter(r=>!r.canon_id).map(r=>({ r, tok:new Set(norm(r.texte)) }))
  if(!cible.length||!sur.length) continue
  const paires=[]
  for(let i=0;i<sur.length;i++) for(let j=0;j<cible.length;j++){
    const d=dice(sur[i].tok,cible[j].tok)
    const meme = cible[j].ch===sur[i].r.ch_orig
    if ((meme && d>=SEUIL_MEME) || d>=SEUIL_EXACT) paires.push([d,i,j])
  }
  paires.sort((a,b)=>b[0]-a[0])
  const gP=new Array(sur.length).fill(false), cP=new Array(cible.length).fill(false)
  for(const [d,i,j] of paires){ if(gP[i]||cP[j])continue; gP[i]=true;cP[j]=true; props.push({ r:sur[i].r, cid:cible[j].cid, dice:d }) }
}

console.log(`${DRY?'[DRY] ':''}Gaps remplis : ${props.length}`)
const parL={}; for(const p of props){(parL[p.r.livre]??=0);parL[p.r.livre]++}
console.log('Par livre :', JSON.stringify(Object.fromEntries(Object.entries(parL).sort((a,b)=>b[1]-a[1]))))
for (const p of [...props].sort((a,b)=>a.dice-b.dice)) console.log(`  ${p.r.livre} ${p.r.ch_orig}:${p.r.v_orig} → ${p.cid} (${p.dice.toFixed(2)})  « ${p.r.texte.slice(0,30)} » vs « ${(refTxt.get(p.cid)||'').slice(0,30)} »`)

if (!DRY){ for (const p of props) await sb.from('versets_v2').update({ canon_id:p.cid, alignement_verifie:true }).eq('id', p.r.id)
  console.log(`\n${props.length} rattachés.`) }
