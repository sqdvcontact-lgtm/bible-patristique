// Affiche un chapitre du Siracide de Sacy en regard du référent Crampon (TR0003).
// Adapté de psautier-regard.mjs. Le Siracide comporte trop de surnuméraires
// (stiques propres à la Vulgate) pour un appariement par rang : on imprime les
// deux colonnes l'une après l'autre, en entier.
//   LARG=110 FULL=1 node scripts/siracide-regard.mjs 1 2 3
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const LARG = parseInt(process.env.LARG || '110')
const S = JSON.parse(readFileSync(D + 'sir_SIR_transcrit.json', 'utf8'))

for (const arg of process.argv.slice(2)){
  const c = parseInt(arg)
  const { data, error } = await sb.from('versets_v2').select('canon_id,texte')
    .eq('trad_id','TR0003').eq('livre','SIR').like('canon_id', `SIR.${c}.%`)
  if (error) { console.error(error); process.exit(1) }
  const ref = data.filter(r => r.canon_id.split('.')[1] === String(c))
    .sort((a,b)=>+a.canon_id.split('.')[2] - +b.canon_id.split('.')[2])
  const sac = S.filter(v => v.ch === c).sort((a,b)=>a.v-b.v)
  console.log(`\n${'═'.repeat(LARG)}\nSIRACIDE ${c}   —   Sacy : ${sac.length} versets   |   référent : ${ref.length} créneaux`)
  const cut = t => (process.env.FULL ? t : t.slice(0, LARG - 12))
  console.log('── SACY ' + '─'.repeat(Math.max(0,LARG-8)))
  for (const a of sac) console.log(`  S ${String(a.v).padStart(3)} │ ${cut(a.texte.replace(/<\/?i>/g,''))}`)
  console.log('\n── RÉFÉRENT (Crampon) ' + '─'.repeat(Math.max(0,LARG-22)))
  for (const b of ref) console.log(`  R ${String(b.canon_id.split('.')[2]).padStart(3)} │ ${cut(((b.texte||'').trim())||'‹VIDE›')}`)
}
