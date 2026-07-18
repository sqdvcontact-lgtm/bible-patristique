// Résout les collisions de canon_id dans TR0009 : si 2 versets Giguet pointent le même
// slot canon, on garde celui dont le contenu colle le mieux au référent Crampon et on
// libère l'autre (canon_id → null). Sûr : ne supprime aucun texte.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont dans pour par sur avec son ses cette'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const ref = new Map(); (await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id'))).forEach(r=>ref.set(r.canon_id,new Set(norm(r.texte))))
const G = await all(sb.from('versets_v2').select('id,canon_id,texte,ch_orig,v_orig').eq('trad_id','TR0009').not('canon_id','is',null).order('id'))
const parCanon = new Map()
for (const r of G){ (parCanon.get(r.canon_id)??parCanon.set(r.canon_id,[]).get(r.canon_id)).push(r) }

let libere = 0
for (const [cid, rows] of parCanon){
  if (rows.length < 2) continue
  // fusion LÉGITIME : versets scindés adjacents (même chapitre, v_orig consécutifs) → on garde tout
  const parV = [...rows].sort((a,b)=> a.ch_orig-b.ch_orig || a.v_orig-b.v_orig)
  const adjacent = parV.every((r,i)=> i===0 || (r.ch_orig===parV[i-1].ch_orig && r.v_orig===parV[i-1].v_orig+1))
  if (adjacent) continue
  // collision SUSPECTE (non adjacente) : on garde le meilleur Dice, on libère les autres
  const rt = ref.get(cid) || new Set()
  rows.sort((a,b)=> dice(new Set(norm(b.texte)),rt) - dice(new Set(norm(a.texte)),rt))
  for (const r of rows.slice(1)){ await sb.from('versets_v2').update({ canon_id:null, alignement_verifie:false }).eq('id', r.id); libere++
    console.log(`  ${cid} : gardé « ${rows[0].texte.slice(0,30)}… » (${rows[0].ch_orig}:${rows[0].v_orig}), libéré ${r.ch_orig}:${r.v_orig} « ${r.texte.slice(0,30)}… »`) }
}
console.log(`Collisions suspectes résolues : ${libere} verset(s) libéré(s) (fusions légitimes préservées).`)
