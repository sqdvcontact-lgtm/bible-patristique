// Répare les caractères de remplacement U+FFFD (�) de la Crampon (TR0003), vestiges d'une
// corruption d'octets UTF-8. Reconstruction par contexte (non ambigu) :
//   lettre�lettre        -> apostrophe ’ (élision)
//   �+ devant ; : ! ?    -> insécable
//   « �+                 -> « + insécable
//   , �+  (isolé)        -> tiret cadratin — (cas JER 29,19)
// --dry pour simuler (affiche les 20 versets corrigés + contrôle des � restants).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const NB=' ', AP='’', TIRET='—', R='�'
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

const fix = t => t
  .replace(new RegExp('([A-Za-zÀ-ÿ])'+R+'+([A-Za-zÀ-ÿ])','g'), '$1'+AP+'$2')  // élision
  .replace(new RegExp('[ \\u00A0]*'+R+'+[ \\u00A0]*([;:!?])','g'), NB+'$1')     // insécable + ponctuation
  .replace(new RegExp('«[ \\u00A0]*'+R+'+[ \\u00A0]*','g'), '«'+NB)             // après «
  .replace(new RegExp(',[ \\u00A0]*'+R+'+[ \\u00A0]*','g'), ', '+TIRET+' ')     // tiret cadratin

const rows = (await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0003'))).filter(r=>/�/.test(r.texte||''))
const upd=[]; let reste=0
for (const r of rows){ const f=fix(r.texte); if(/�/.test(f)){ reste++; console.log('⚠ � RESTANT '+r.canon_id+' : '+f) } if(f!==r.texte) upd.push({id:r.id,canon_id:r.canon_id,texte:f}) }
console.log(`${DRY?'[DRY] ':''}Crampon — ${upd.length} versets réparés · � non résolus : ${reste}`)
if (DRY){ for (const u of upd) console.log('  '+u.canon_id+' : '+u.texte.slice(0,95)) }
else {
  for (let i=0;i<upd.length;i+=25) await Promise.all(upd.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
  const after=(await all(sb.from('versets_v2').select('canon_id').eq('trad_id','TR0003').like('texte','%�%'))).length
  console.log('appliqué. Versets avec � restants (contrôle) : '+after)
}
