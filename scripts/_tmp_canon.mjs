import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: tr } = await sb.from('versets_v2').select('trad_id').limit(20000)
console.log('trads:', [...new Set((tr||[]).map(r=>r.trad_id))].join(' '))
const spans = [['NUM',26,35,40],['JOS',21,34,40],['DEU',5,16,22],['ISA',8,20,24],['ISA',38,18,22],['ZEC',4,9,16],['WIS',9,15,19]]
for (const [lv,c,a,b] of spans){
  const ids = []; for(let v=a; v<=b; v++) ids.push(`${lv}.${c}.${v}`)
  const { data } = await sb.from('versets_v2').select('canon_id,trad_id,texte').in('canon_id', ids)
  console.log(`\n===== ${lv} ${c} =====`)
  for (const id of ids) for (const r of (data||[]).filter(r=>r.canon_id===id).sort((x,y)=>x.trad_id.localeCompare(y.trad_id)))
    console.log(`${id} [${r.trad_id}] ${((r.texte||'').trim()||'<VIDE>').slice(0,150)}`)
}
