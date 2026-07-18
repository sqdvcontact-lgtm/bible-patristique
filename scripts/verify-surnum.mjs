// Vérifie TOUS les surnuméraires contre la Crampon + le contexte : pour chacun, cherche
// le meilleur slot canon dans la fenêtre entre ses voisins mappés (Y COMPRIS à travers
// les frontières de chapitre), et le rattache si le contenu concorde. Gère les décalages
// de frontière (ex. Giguet Gn 31:55 = canon 32:1). Distingue slot VIDE (remplissage) et
// OCCUPÉ (fusion, seulement si verset adjacent = vraie scission).
//   node scripts/verify-surnum.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const SEUIL = 0.32, SPAN_MAX = 10
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

// référent Crampon par livre → liste ordonnée {cid, ch, v, tok, txt}
const refRows = await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null))
const refTxt = new Map(refRows.map(r=>[r.canon_id, r.texte]))
const canonPar = {}
for (const r of refRows){ const [code,ch,v]=r.canon_id.split('.'); (canonPar[code] ??= []).push({ cid:r.canon_id, ch:+ch, v:+v, tok:new Set(norm(r.texte)) }) }
for (const code in canonPar) canonPar[code].sort((a,b)=>a.ch-b.ch||a.v-b.v)
const idxDe = {}; for (const code in canonPar){ idxDe[code]=new Map(); canonPar[code].forEach((s,i)=>idxDe[code].set(s.cid,i)) }

const G = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,canon_id,texte').eq('trad_id','TR0009'))
const occupe = new Set(G.filter(r=>r.canon_id).map(r=>r.canon_id))
const grp = new Map()
for (const r of G){ const k=r.livre; (grp.get(k) ?? grp.set(k,[]).get(k)).push(r) }

const props = []
for (const [code, rows] of grp){
  rows.sort((a,b)=>a.ch_orig-b.ch_orig||a.v_orig-b.v_orig)
  const canon = canonPar[code]; if(!canon) continue
  for (let k=0;k<rows.length;k++){
    if (rows[k].canon_id) continue
    let prev=null, next=null
    for (let j=k-1;j>=0;j--) if(rows[j].canon_id){prev=rows[j];break}
    for (let j=k+1;j<rows.length;j++) if(rows[j].canon_id){next=rows[j];break}
    const iP = prev ? idxDe[code].get(prev.canon_id) : null
    const iN = next ? idxDe[code].get(next.canon_id) : null
    let a, b
    if (iP!=null && iN!=null){ a=Math.min(iP,iN); b=Math.max(iP,iN) }
    else if (iP!=null){ a=iP; b=iP+3 } else if (iN!=null){ a=iN-3; b=iN } else continue
    a=Math.max(0,a); b=Math.min(canon.length-1,b)
    if (b-a > SPAN_MAX) continue
    const tok = new Set(norm(rows[k].texte))
    let best=0, bestSlot=null
    for (let i=a;i<=b;i++){ const d=dice(tok, canon[i].tok); if(d>best){best=d;bestSlot=canon[i]} }
    if (best<SEUIL || !bestSlot) continue
    const occ = occupe.has(bestSlot.cid)
    // fusion (slot occupé) : n'accepter que si adjacent à un verset Giguet déjà sur ce slot
    if (occ){
      const surLeSlot = rows.filter(r=>r.canon_id===bestSlot.cid)
      const adj = surLeSlot.some(r=>r.ch_orig===rows[k].ch_orig && Math.abs(r.v_orig-rows[k].v_orig)===1)
      if (!adj) continue
    }
    props.push({ r:rows[k], cid:bestSlot.cid, dice:best, occ, croise: prev && bestSlot.ch!==rows[k].ch_orig })
  }
}

const vide=props.filter(p=>!p.occ).length, fus=props.filter(p=>p.occ).length, cross=props.filter(p=>p.croise).length
console.log(`Surnuméraires rattachables : ${props.length} — remplissage (slot vide) ${vide}, fusion ${fus} · dont ${cross} à travers une frontière de chapitre`)
const parL={}; for(const p of props){(parL[p.r.livre]??=0);parL[p.r.livre]++}
console.log('Par livre :', JSON.stringify(Object.fromEntries(Object.entries(parL).sort((a,b)=>b[1]-a[1]))))
console.log('\nExemples cross-frontière :')
for (const p of props.filter(p=>p.croise).slice(0,10)) console.log(`  ${p.r.livre} ${p.r.ch_orig}:${p.r.v_orig} → ${p.cid} (${p.dice.toFixed(2)})  « ${p.r.texte.slice(0,40)} »`)
console.log('\nÉchantillon (tri Dice) :')
for (const p of [...props].sort((a,b)=>a.dice-b.dice).slice(0,10)) console.log(`  ${p.r.livre} ${p.r.ch_orig}:${p.r.v_orig} → ${p.cid} (${p.dice.toFixed(2)}, ${p.occ?'fusion':'vide'})  « ${p.r.texte.slice(0,38)} » vs « ${(refTxt.get(p.cid)||'').slice(0,38)} »`)

if (!DRY){ for (const p of props) await sb.from('versets_v2').update({ canon_id:p.cid, alignement_verifie:true }).eq('id', p.r.id)
  console.log(`\n${props.length} surnuméraires rattachés.`) }
