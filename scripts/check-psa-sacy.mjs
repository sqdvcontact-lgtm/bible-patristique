// Check which id_versets in 1CH.5.27-41, MAL.3.19-24, PSA vides
// pour mieux cibler la correction
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)
async function main() {
  // JOL ch4 — versets exactement
  const { data: jol } = await sb.from('versets').select('id_verset,ref,verset').eq('livre','JOL').eq('chapitre',4).order('verset')
  console.log('=== JOL ch4 (21 versets à remplir) ===')
  for (const v of jol??[]) console.log(`  ${v.id_verset}  ref="${v.ref}"  verset=${v.verset}`)

  // MAL ch3 v19-24
  const { data: mal } = await sb.from('versets').select('id_verset,ref,verset').eq('livre','MAL').eq('chapitre',3).gte('verset',19).order('verset')
  console.log('\n=== MAL 3:19-24 (6 versets à remplir) ===')
  for (const v of mal??[]) console.log(`  ${v.id_verset}  ref="${v.ref}"  verset=${v.verset}`)

  // 1CH ch5 v27-41
  const { data: chr } = await sb.from('versets').select('id_verset,ref,verset,TR0001,TR0002').eq('livre','1CH').eq('chapitre',5).gte('verset',27).order('verset')
  console.log('\n=== 1CH 5:27-41 (15 versets à remplir) ===')
  for (const v of chr??[]) console.log(`  ${v.id_verset}  verset=${v.verset}  TR0002="${(v.TR0002||'').slice(0,60)}"`)
}
main().catch(console.error)
