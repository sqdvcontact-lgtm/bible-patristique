// Correction typographique française de la Segond (TR0002) :
//  1) les 8 citations en “ ” → « » (niveau 1) avec espace insécable intérieure ;
//  2) espace insécable (U+00A0) avant : ; ! ? (tout est collé dans la source ebible).
// Les apostrophes sont déjà courbes ; la Segond 1910 n'a pas de guillemets de discours
// direct — on n'en invente pas. --dry pour simuler.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const NBSP=' '
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

function fix(t){
  let s = t
  // “ ” → « » avec insécable intérieure
  s = s.replace(/“[  ]*/g, '«'+NBSP).replace(/[  ]*”/g, NBSP+'»')
  // insécable avant : ; ! ? collés à un caractère significatif (pas espace, pas ouvrante)
  s = s.replace(/([^\s;:!?«… ])([;:!?])/g, '$1'+NBSP+'$2')
  return s
}

const rows = await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0002'))
const upd=[]
for (const r of rows){ const f=fix(r.texte||''); if(f!==r.texte) upd.push({id:r.id,canon_id:r.canon_id,avant:r.texte,texte:f}) }
console.log(`${DRY?'[DRY] ':''}Segond : ${upd.length} / ${rows.length} versets modifiés.`)

if (DRY){
  const ech = ['EXO.3.14','PSA.56.1','EXO.8.25','PSA.116.10','JHN.3.16','MAT.5.9']
  console.log('\n=== échantillons ===')
  for (const c of ech){ const u=upd.find(x=>x.canon_id===c); if(u){ console.log('■ '+c); console.log('  avant: '+u.avant); console.log('  après: '+u.texte) } }
} else {
  for (let i=0;i<upd.length;i+=25) await Promise.all(upd.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
  console.log('appliqué.')
  // contrôle
  const after = await all(sb.from('versets_v2').select('texte').eq('trad_id','TR0002'))
  let nbsp=0,colGlued=0,g2=0
  for(const r of after){const t=r.texte||'';nbsp+=(t.split(NBSP).length-1);colGlued+=(t.match(/[^\s «…][;:!?]/g)||[]).length;g2+=(t.match(/[“”]/g)||[]).length}
  console.log('après : NBSP='+nbsp+'  ponctuation encore collée='+colGlued+'  “”restants='+g2)
}
