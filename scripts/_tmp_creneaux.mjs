import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const chaps = [['NUM',26],['DEU',5],['JOS',21],['JDG',21],['ISA',8],['ISA',38],['ZEC',4],['WIS',9]]
for (const [lv,c] of chaps){
  const { data, error } = await sb.from('versets_v2').select('canon_id,texte')
    .eq('trad_id','TR0003').eq('livre',lv).like('canon_id', `${lv}.${c}.%`)
  if (error) { console.log('ERR', error.message); continue }
  const rows = data.sort((a,b)=>+a.canon_id.split('.')[2] - +b.canon_id.split('.')[2])
  console.log(`\n===== ${lv} ${c} (${rows.length} créneaux) =====`)
  for (const r of rows) console.log(`${r.canon_id.split('.')[2]}| ${(r.texte||'').trim() || '<<<VIDE>>>'}`)
}
