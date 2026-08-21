// Importe la Bible Segond 1910 (ebible fra-fraLSG, domaine public) dans versets_v2 sous
// TR0002. Le texte ebible est aligné sur vref.txt (numérotation hébraïque/protestante).
//   ch_orig/v_orig = numérotation propre Segond (hébraïque)
//   canon_id       = numérotation catholique/Vulgate (versets_canon), via protVerseCath
// Chaque canon_id est validé contre versets_canon ; les non-appariés sont rapportés.
//   node scripts/import-segond.mjs --dry
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

// ── table d'alignement tirée du canon lui-même : (livre, ch_heb, v_heb) → canon_id ──
// versets_canon porte la numérotation hébraïque de chaque verset : on s'en sert comme clé
// pour aligner Segond (hébreu). Fiable pour TOUS les livres, sans convertisseur manuel.
const canonRows = await all(sb.from('versets_canon').select('id,livre,ch_heb,v_heb'))
const canonSet = new Set(canonRows.map(r=>r.id))
const canonBooks = new Set(canonRows.map(r=>r.livre))
const hebMap = new Map(); const hebCollisions=[]
for (const r of canonRows){
  if (r.ch_heb==null || r.v_heb==null) continue
  const k = `${r.livre}.${r.ch_heb}.${r.v_heb}`
  if (hebMap.has(k)) hebCollisions.push(k+' → '+hebMap.get(k)+' / '+r.id)
  else hebMap.set(k, r.id)
}
console.log('canon : '+canonSet.size+' ids, '+canonBooks.size+' livres, '+hebMap.size+' clés héb'+(hebCollisions.length?' ⚠ collisions:'+hebCollisions.length:''))
if (hebCollisions.length) hebCollisions.slice(0,8).forEach(c=>console.log('  collision '+c))
const toCanon = (book,ch,v)=> hebMap.get(`${book}.${ch}.${v}`) || `${book}.${ch}.${v}`

// ── lecture des fichiers ebible ──
const BASE = 'C:/Users/quins/OneDrive/Bureau/ebible-main/ebible-main/'
const vref = readFileSync(BASE+'metadata/vref.txt','utf8').split(/\r?\n/)
const text = readFileSync(BASE+'corpus/fra-fraLSG.txt','utf8').split(/\r?\n/)

const rows=[], missBook={}, missCanon={}; let vides=0
for (let i=0;i<vref.length;i++){
  const ref=vref[i], txt=(text[i]||'').trim()
  if(!ref) continue
  if(!txt || txt==='<range>'){ vides++; continue }
  const m=ref.match(/^(\S+) (\d+):(\d+)$/); if(!m){ continue }
  const book=m[1], ch=+m[2], v=+m[3]
  const canon_id=toCanon(book,ch,v)
  if(!canonSet.has(canon_id)){
    if(canonBooks.has(book)) (missCanon[book]??=[]).push(`${ref} → ${canon_id}`)   // livre présent, verset mal aligné
    else missBook[book]=(missBook[book]||0)+1                                        // livre absent du canon
    continue
  }
  rows.push({ trad_id:'TR0002', livre:book, ch_orig:ch, v_orig:v, texte:txt, canon_id, est_suscription:false, alignement_verifie:false })
}

console.log('Versets Segond non vides mappés et validés : '+rows.length)
console.log('Lignes vides (livre absent de Segond / <range>) : '+vides)
console.log('Livres hors canon (deutéro non traduits par Segond) : '+Object.entries(missBook).map(([k,v])=>k+':'+v).join(' '))
const mc=Object.entries(missCanon)
console.log('\nMASQUES canon non trouvés (numérotation à revoir) : '+mc.reduce((a,[,v])=>a+v.length,0))
for(const [k,v] of mc){ console.log('  '+k+' ('+v.length+') ex: '+v.slice(0,4).join(' | ')) }
// répartition par livre des versets valides
const parLivre={}; for(const r of rows) parLivre[r.livre]=(parLivre[r.livre]||0)+1
console.log('\nRépartition ('+Object.keys(parLivre).length+' livres) : '+Object.entries(parLivre).map(([k,v])=>k+':'+v).join(' '))

if(!DRY){
  // purge éventuelle + insertion
  await sb.from('versets_v2').delete().eq('trad_id','TR0002')
  let ins=0
  for(let i=0;i<rows.length;i+=500){ const {error}=await sb.from('versets_v2').insert(rows.slice(i,i+500)); if(error){console.error('ERR insert',error.message);break} ins+=rows.slice(i,i+500).length; process.stdout.write('\r inséré '+ins) }
  console.log('\nTerminé : '+ins+' versets Segond insérés sous TR0002.')
}
