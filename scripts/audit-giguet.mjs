// Audit de l'intégration Giguet (TR0009) dans versets_v2.
// Contrôles : comptes, couverture, collisions de canon_id, texte vide/résidus HTML,
// cohérence avec le plan (intégrés vs manuels), qualité d'alignement (Dice vs Crampon).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const STOP = new Set('le la les un une des de du au aux et a à ou où que qui quoi dont ne pas plus est sont était fut il ils elle elles je tu nous vous on ce ces cet cette se sa son ses leur leurs mon ma mes ton ta tes en dans pour par sur avec sans vers dès lors ainsi car mais donc or me te lui eux moi toi comme quand si tout tous toute toutes'.split(/\s+/))
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!STOP.has(w))
const dice = (a,b)=>{const A=new Set(a),B=new Set(b);if(!A.size||!B.size)return 0;let i=0;for(const x of A)if(B.has(x))i++;return 2*i/(A.size+B.size)}

async function all(q) { const out=[]; let from=0; while(true){ const {data,error}=await q.range(from,from+999); if(error)throw error; out.push(...data); if(data.length<1000)break; from+=1000 } return out }

// données
const G = await all(sb.from('versets_v2').select('canon_id,livre,ch_orig,v_orig,texte,alignement_verifie,est_suscription').eq('trad_id','TR0009').order('id'))
const ref = new Map(); (await all(sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').not('canon_id','is',null).order('id'))).forEach(r=>ref.set(r.canon_id,r.texte))
const plan = JSON.parse(readFileSync('scripts/giguet-plan.json','utf8'))

console.log('════ AUDIT GIGUET (TR0009) ════\n')

// 1. comptes globaux
const mapped = G.filter(r=>r.canon_id)
const surnum = G.filter(r=>!r.canon_id)
const verif = G.filter(r=>r.alignement_verifie)
console.log('1. COMPTES')
console.log(`   versets total : ${G.length}`)
console.log(`   mappés canon  : ${mapped.length}   hors ossature (surnuméraires) : ${surnum.length}`)
console.log(`   alignement_verifie=true : ${verif.length}   suscriptions : ${G.filter(r=>r.est_suscription).length}`)

// 2. collisions : un canon_id porté par >1 verset Giguet. Légitime si versets scindés
// ADJACENTS (même chapitre, v_orig consécutifs = fusion many→1) ; suspect sinon.
const parCanon = new Map()
for (const r of mapped) (parCanon.get(r.canon_id) ?? parCanon.set(r.canon_id, []).get(r.canon_id)).push(r)
const cols = [...parCanon].filter(([,rows]) => rows.length > 1)
let legit = 0; const suspect = []
for (const [cid, rows] of cols) {
  rows.sort((a,b) => a.ch_orig-b.ch_orig || a.v_orig-b.v_orig)
  const adj = rows.every((r,i) => i===0 || (r.ch_orig===rows[i-1].ch_orig && r.v_orig===rows[i-1].v_orig+1))
  if (adj) legit++; else suspect.push(`${cid} (${rows.map(r=>r.ch_orig+':'+r.v_orig).join(',')})`)
}
console.log(`\n2. COLLISIONS canon_id : ${cols.length} — fusions légitimes (versets scindés adjacents) ${legit}, suspectes ${suspect.length}`)
for (const s of suspect.slice(0,15)) console.log(`   ⚠ ${s}`)

// 3. qualité texte
const vides = G.filter(r=>!r.texte || !r.texte.trim())
const htmlres = G.filter(r=>/<[a-z/]|mw-parser|&nbsp;|\[\d+\]/i.test(r.texte||''))
console.log(`\n3. TEXTE  vides : ${vides.length}   résidus HTML/wiki : ${htmlres.length}`)
for (const r of htmlres.slice(0,6)) console.log(`   ${r.livre} ${r.ch_orig}:${r.v_orig} → ${(r.texte||'').slice(0,60)}`)

// 4. cohérence avec le plan
const chIntegres = new Set(G.map(r=>`${r.livre} ${r.ch_orig}`))
let manqueAttendu=[], presentInterdit=[]
for (const [k,p] of Object.entries(plan)) {
  const doitEtre = p.action==='integrate' || p.action==='shift'
  const present = chIntegres.has(k)
  if (doitEtre && !present) manqueAttendu.push(k)
  if (!doitEtre && present) presentInterdit.push(`${k} (${p.action})`)
}
console.log(`\n4. COHÉRENCE PLAN`)
console.log(`   chapitres attendus absents : ${manqueAttendu.length}${manqueAttendu.length?' → '+manqueAttendu.slice(0,10).join(', '):''}`)
console.log(`   chapitres manuels présents à tort : ${presentInterdit.length}${presentInterdit.length?' → '+presentInterdit.slice(0,10).join(', '):''}`)

// 5. couverture par livre (versets Giguet mappés / slots canon du livre, sur les livres couverts)
const canonParLivre = {}
;(await all(sb.from('versets_canon').select('id,livre').order('id'))).forEach(r=>{ canonParLivre[r.livre]=(canonParLivre[r.livre]||0)+1 })
const gParLivre = {}
for (const r of mapped) gParLivre[r.livre]=(gParLivre[r.livre]||0)+1
console.log(`\n5. COUVERTURE par livre (Giguet mappés / slots canon) — livres couverts par Giguet`)
const couverts = Object.keys(gParLivre).sort((a,b)=> (gParLivre[a]/canonParLivre[a]) - (gParLivre[b]/canonParLivre[b]))
for (const l of couverts) {
  const pct = Math.round(100*gParLivre[l]/canonParLivre[l])
  if (pct < 85) console.log(`   ⚠ ${l}: ${gParLivre[l]}/${canonParLivre[l]} (${pct}%) — manque des chapitres (manuels)`)
}
const bien = couverts.filter(l=>gParLivre[l]/canonParLivre[l]>=0.85).length
console.log(`   (${bien} livres à ≥85% de couverture)`)

// 6. qualité d'alignement (Dice moyen sur échantillon des mappés)
let sum=0,n=0,bas=0
for (const r of mapped) {
  const rt = ref.get(r.canon_id); if(!rt) continue
  const d = dice(norm(r.texte), norm(rt)); sum+=d; n++; if(d<0.12) bas++
}
console.log(`\n6. QUALITÉ ALIGNEMENT (Dice Giguet↔Crampon sur ${n} versets mappés)`)
console.log(`   Dice moyen : ${(sum/n).toFixed(3)}   versets à Dice<0.12 : ${bas} (${(100*bas/n).toFixed(1)}%)`)

// 7. livres AT sans aucune intégration (attendus mais absents)
const AT = new Set(Object.keys(canonParLivre))
const sansGiguet = [...AT].filter(l=>!gParLivre[l])
console.log(`\n7. LIVRES canon sans aucun verset Giguet : ${sansGiguet.length}${sansGiguet.length?' → '+sansGiguet.join(', '):''}`)
