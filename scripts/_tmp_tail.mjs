import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
for (const [lv,c,a,b] of [['NUM',26,62,66],['ISA',8,22,24],['ZEC',4,13,16],['JOS',21,41,45],['DEU',5,29,33],['JDG',21,23,25],['WIS',9,17,19]]){
  const ids=[]; for(let v=a;v<=b;v++) ids.push(`${lv}.${c}.${v}`)
  const { data } = await sb.from('versets_v2').select('canon_id,trad_id,texte').in('canon_id', ids)
  console.log(`\n== ${lv} ${c} ==`)
  for (const id of ids){ const rs=(data||[]).filter(r=>r.canon_id===id).sort((x,y)=>x.trad_id.localeCompare(y.trad_id))
    if(!rs.length) console.log(`${id} -- AUCUNE LIGNE --`)
    for (const r of rs) console.log(`${id} [${r.trad_id}] ${((r.texte||'').trim()||'<VIDE>').slice(0,110)}`) }
}
// la table canon elle-meme
const { data: cv, error } = await sb.from('versets_canon').select('*').in('canon_id',['NUM.26.66','ISA.8.24','ZEC.4.15','ZEC.4.16','WIS.9.19','JOS.21.44','JOS.21.45'])
console.log('\n== versets_canon ==\n', error? error.message : JSON.stringify(cv,null,1))
