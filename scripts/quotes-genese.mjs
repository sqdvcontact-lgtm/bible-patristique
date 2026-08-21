// Conversion des guillemets droits " de la Genèse (TR0003) en « » (niveau 1) et " " (niveau 2
// imbriqué), en parcourant le texte en FLUX (les paroles traversent les versets). Règle
// d'ouverture/fermeture : un " précédé de « : » (ou en début, pile vide) OUVRE ; sinon il
// FERME. Espacement français géré (insécable dans « », anglais collés). Repère les
// déséquilibres (fermeture à pile vide, quotes non fermés) pour revue.
//   node scripts/quotes-genese.mjs --dry     (simulation : dump ch. 1-4 + stats + anomalies)
//   node scripts/quotes-genese.mjs           (applique en base)
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const Q = String.fromCharCode(34)
const NBSP=' ', OUV1='«', FER1='»', OUV2='“', FER2='”'
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const rows = (await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0003').like('canon_id','GEN.%')))
  .sort((a,b)=>{const av=a.canon_id.split('.'),bv=b.canon_id.split('.'); return (+av[1]-+bv[1])||(+av[2]-+bv[2])})

let depth = 0
const anomalies = []
const nouveaux = []   // {id, canon_id, avant, apres}
for (const r of rows){
  const t = r.texte || ''
  if (!t.includes(Q)) continue
  let out = ''
  for (let i=0;i<t.length;i++){
    if (t[i] !== Q){ out += t[i]; continue }
    // caractère significatif à gauche (hors espaces)
    let j=i-1; while(j>=0 && (t[j]===' '||t[j]===NBSP)) j--
    const colon = j>=0 && (t[j]===':'||t[j]===';')
    let open
    if (colon) open = true
    else if (depth > 0) open = false
    else { open = true; anomalies.push(`${r.canon_id} : « fermeture » sans ouverture (traité comme ouverture) près de « …${t.slice(Math.max(0,i-15),i+8)}… »`) }
    if (open){ depth++; out += (depth>=2 ? OUV2 : OUV1) }
    else { out += (depth>=2 ? FER2 : FER1); depth-- }
  }
  // espacement : insécable dans « », guillemets anglais collés
  out = out.replace(/«[  ]*/g, OUV1+NBSP).replace(/[  ]*»/g, NBSP+FER1)
  out = out.replace(/[  ]*“[  ]*/g, ' '+OUV2).replace(/[  ]*”[  ]*/g, FER2+' ')
  out = out.replace(/  +/g,' ').replace(/^ | $/g,'')
  if (out !== t) nouveaux.push({ id:r.id, canon_id:r.canon_id, avant:t, apres:out })
}
if (depth !== 0) anomalies.push(`FIN DE LIVRE : ${depth} guillemet(s) non fermé(s) (compte impair / oubli).`)

console.log(`Genèse : ${rows.length} versets, ${nouveaux.length} à modifier. Profondeur finale : ${depth}.`)
console.log(`Anomalies détectées : ${anomalies.length}`)
anomalies.slice(0,25).forEach(a=>console.log('  ⚠ '+a))

if (DRY){
  console.log('\n===== RENDU chapitres 1 à 4 (à valider) =====')
  for (const n of nouveaux.filter(x=>{const c=+x.canon_id.split('.')[1]; return c>=1&&c<=4})) console.log(`  ${n.canon_id}: ${n.apres}`)
} else {
  for (let i=0;i<nouveaux.length;i+=25) await Promise.all(nouveaux.slice(i,i+25).map(n=>sb.from('versets_v2').update({texte:n.apres}).eq('id',n.id)))
  console.log(`\n${nouveaux.length} versets Genèse mis à jour.`)
}
