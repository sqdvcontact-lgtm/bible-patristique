import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
for (const [lv,c] of [['NUM',26],['ISA',8],['ZEC',4],['WIS',9],['JOS',21],['DEU',5],['JDG',21]]){
  const { data } = await sb.from('versets_canon').select('id,ch_heb,v_heb,est_suscription,commentaire_ia')
    .eq('livre',lv).eq('ch_canon',c).order('v_canon')
  const rows=data||[]
  console.log(`\n== ${lv} ${c} : ${rows.length} versets canon ==`)
  for(const r of rows.slice(-6)) console.log(` ${r.id}  heb=${r.ch_heb}.${r.v_heb} susc=${r.est_suscription} com=${r.commentaire_ia??''}`)
}
