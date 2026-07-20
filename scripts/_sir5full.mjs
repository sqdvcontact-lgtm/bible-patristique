import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const S = JSON.parse(readFileSync(D + 'sir_SIR_transcrit.json', 'utf8'))
const c = parseInt(process.argv[2])
const a1 = parseInt(process.argv[3]||'0'), a2 = parseInt(process.argv[4]||'999')
const { data } = await sb.from('versets_v2').select('canon_id,texte').eq('trad_id','TR0003').eq('livre','SIR').like('canon_id', `SIR.${c}.%`)
const ref = data.sort((a,b)=>+a.canon_id.split('.')[2] - +b.canon_id.split('.')[2])
console.log('=== SACY ===')
for (const v of S.filter(v=>v.ch===c && v.v>=a1 && v.v<=a2).sort((a,b)=>a.v-b.v)) console.log(`S${v.v}: ${v.texte.replace(/<\/?i>/g,'')}\n`)
console.log('=== REF ===')
for (const r of ref) { const n=+r.canon_id.split('.')[2]; if(n>=a1&&n<=a2) console.log(`R${n}: ${r.texte||''}\n`) }
