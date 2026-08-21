// Charge la Genèse transcrite (fac-similé 1730) dans versets_v2 sous TR0001,
// en remplacement du brouillon OCR. Corrections vérifiées + typographie française.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const NB = ' '

let versets = JSON.parse(readFileSync(D+'genese_transcrite.json','utf8'))

// ── 1. corrections de lecture u/n, vérifiées sur l'image (page 33, Gn 29,3) ──
const LECTURES = [[/\blorsqne\b/g,'lorsque'],[/\btons\b/g,'tous'],[/\bplns\b/g,'plus'],
                  [/\bjonr\b/g,'jour'],[/\bensemb!e\b/g,'ensemble']]
let corr = 0
for (const v of versets) for (const [re,bon] of LECTURES){
  const n = v.texte.replace(re,bon); if(n!==v.texte){ corr++; v.texte = n }
}

// ── 2. VERSIFICATION PROPRE À L'ÉDITION DE 1730 (vérifiée sur le fac-similé) ──
// Cette édition ne suit pas exactement le découpage de la Vulgate : elle fusionne
// certains versets et suit l'hébreu en Gn 31. On respecte SON découpage dans
// ch_orig/v_orig, et on le rattache au canon par cette table.
//   Gn 5  : 31 v. — le v.31 couvre Vulg. 5,31-32 (« Or Noé ayant cinq cens ans… »)
//   Gn 31 : 55 v. — division hébraïque ; le v.55 est Vulg. 32,1
//   Gn 32 : 32 v. — décalés de +1 par rapport à la Vulgate
//   Gn 37 : 35 v. — le v.28 couvre Vulg. 37,28-29 ; la suite décale de +1
//   Gn 49 : 32 v. — le v.30 absorbe Vulg. 49,32 ; le v.32 est Vulg. 49,33
//   Gn 50 : 25 v. — le v.26 de la Vulgate n'est pas imprimé
const canonId = v => {
  if (v.ch === 31 && v.v === 55) return 'GEN.32.1'
  if (v.ch === 32) return `GEN.32.${v.v + 1}`
  if (v.ch === 37 && v.v >= 29) return `GEN.37.${v.v + 1}`
  if (v.ch === 49 && v.v === 32) return 'GEN.49.33'
  return `GEN.${v.ch}.${v.v}`
}
// versets de l'édition qui recouvrent DEUX slots du canon
const COUVRE_DEUX = { '5.31':'GEN.5.32', '37.28':'GEN.37.29' }

// ── 4. typographie française ──
const typo = t => t
  .replace(/\s*([;:!?])/g, NB+'$1')
  .replace(/«\s*/g,'«'+NB).replace(/\s*»/g, NB+'»')
  .replace(/'/g,'’')
  .replace(/ {2,}/g,' ').trim()

// ── 5. lignes ──
const canon = new Set((await (async()=>{const o=[];let f=0;while(true){
  const {data}=await sb.from('versets_canon').select('id').like('id','GEN.%').order('id').range(f,f+999)
  o.push(...data); if(data.length<1000)break; f+=1000} return o})()).map(r=>r.id))

const lignes = [], hors = []
for (const v of versets){
  const cid = canonId(v)
  if (!canon.has(cid)) { hors.push(`${v.ch},${v.v}`); continue }
  const fin = COUVRE_DEUX[`${v.ch}.${v.v}`] ?? null
  lignes.push({ trad_id:'TR0001', livre:'GEN', ch_orig:v.ch, v_orig:v.v,
    texte: typo(v.texte), canon_id: cid, canon_id_fin: fin, est_suscription:false,
    notes: fin ? 'Verset unique dans l’édition de 1730, couvrant deux versets de la Vulgate.' : null,
    alignement_verifie: true })
}
const uniq = new Map(); for (const l of lignes) if(!uniq.has(l.canon_id)) uniq.set(l.canon_id,l)
const finales = [...uniq.values()]

console.log(`${DRY?'[DRY] ':''}Genèse Sacy (transcription) — ${finales.length} versets`)
console.log(`  corrections de lecture u/n appliquées : ${corr}`)
console.log(`  alignement vérifié : ${finales.filter(l=>l.alignement_verifie).length}`)
console.log(`  versets couvrant deux slots du canon : ${finales.filter(l=>l.canon_id_fin).length}`)
console.log(`  versets portant une italique : ${finales.filter(l=>/<i>/.test(l.texte)).length}`)
if (hors.length) console.log(`  hors canon, écartés : ${hors.join(' ')}`)

if (!DRY){
  await sb.from('versets_v2').delete().eq('trad_id','TR0001').like('canon_id','GEN.%')
  let n=0
  for (let i=0;i<finales.length;i+=500){
    const {error} = await sb.from('versets_v2').insert(finales.slice(i,i+500))
    if (error){ console.error('ERR '+error.message); break }
    n += finales.slice(i,i+500).length
  }
  console.log('inséré : '+n)
}
