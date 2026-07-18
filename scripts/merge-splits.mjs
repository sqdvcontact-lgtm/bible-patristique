// Détecte/corrige les surnuméraires qui sont en fait des MOITIÉS de versets scindés :
// quand Giguet scinde en 2 versets ce que le canon garde en 1, l'aligneur NW (1:1)
// orpheline la 2e moitié. On la rattache au slot canon voisin si le contenu concorde
// (fusion many→1). Vrais « plus » LXX (aucune concordance voisine) → restent surnuméraires.
//   node scripts/merge-splits.mjs --dry   (simulation + exemples)
//   node scripts/merge-splits.mjs         (applique)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const SEUIL = 0.30
const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (A,B)=>{ if(!A.size||!B.size)return 0; let i=0; for(const x of A) if(B.has(x)) i++; return 2*i/(A.size+B.size) }
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const ref = new Map()
;(await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null))).forEach(r=>ref.set(r.canon_id, new Set(norm(r.texte))))
const G = await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,canon_id,texte').eq('trad_id','TR0009'))

// groupes par chapitre Giguet
const grp = new Map()
for (const r of G){ const k=`${r.livre} ${r.ch_orig}`; (grp.get(k) ?? grp.set(k,[]).get(k)).push(r) }

const aFusionner = []   // { id, canon_id }
for (const rows of grp.values()){
  rows.sort((a,b)=>a.v_orig-b.v_orig)
  for (let k=0;k<rows.length;k++){
    if (rows[k].canon_id) continue
    // voisins mappés
    let prev=null, next=null
    for (let j=k-1;j>=0;j--) if(rows[j].canon_id){prev=rows[j];break}
    for (let j=k+1;j<rows.length;j++) if(rows[j].canon_id){next=rows[j];break}
    // candidats : slots canon des voisins immédiats + slots VIDES strictement entre eux
    const occupe = new Set(rows.filter(x=>x.canon_id).map(x=>x.canon_id))
    const cand = new Set()
    if (prev) cand.add(prev.canon_id)
    if (next) cand.add(next.canon_id)
    if (prev && next){ const [c,ch,pv]=prev.canon_id.split('.'); const [c2,ch2,nv]=next.canon_id.split('.')
      if (c===c2 && ch===ch2) for(let v=+pv+1; v<+nv; v++) cand.add(`${c}.${ch}.${v}`) }
    const tok = new Set(norm(rows[k].texte))
    let best=0, bestCid=null
    for (const cid of cand){ const rt=ref.get(cid); if(!rt)continue; const d=dice(tok,rt); if(d>best){best=d;bestCid=cid} }
    if (best>=SEUIL) aFusionner.push({ r:rows[k], canon_id:bestCid, dice:best, fusion:occupe.has(bestCid) })
  }
}

const nFus=aFusionner.filter(x=>x.fusion).length
console.log(`Surnuméraires rattachables (Dice≥${SEUIL}) : ${aFusionner.length} — dont fusion (slot occupé) ${nFus}, remplissage (slot vide) ${aFusionner.length-nFus}`)
const parLivre={}; for(const x of aFusionner){(parLivre[x.r.livre]??=0);parLivre[x.r.livre]++}
console.log('Par livre :', JSON.stringify(Object.fromEntries(Object.entries(parLivre).sort((a,b)=>b[1]-a[1]))))
console.log('\nPsaumes concernés :')
for (const x of aFusionner.filter(x=>x.r.livre==='PSA')) console.log(`  PSA ${x.r.ch_orig}:${x.r.v_orig} → ${x.canon_id} (${x.dice.toFixed(2)}, ${x.fusion?'fusion':'remplissage'})  « ${x.r.texte.slice(0,50)} »`)
console.log('\nTop concordance :')
for (const x of [...aFusionner].sort((a,b)=>b.dice-a.dice).slice(0,8)) console.log(`  ${x.r.livre} ${x.r.ch_orig}:${x.r.v_orig} → ${x.canon_id} (${x.dice.toFixed(2)})  « ${x.r.texte.slice(0,40)} »`)

if (!DRY){
  for (let i=0;i<aFusionner.length;i++){ const x=aFusionner[i]
    await sb.from('versets_v2').update({ canon_id:x.canon_id, alignement_verifie:true }).eq('id', x.r.id) }
  console.log(`\n${aFusionner.length} surnuméraires rattachés (fusion many→1).`)
}
