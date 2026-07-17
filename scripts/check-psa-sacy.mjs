// Check which id_versets in 1CH.5.27-41, MAL.3.19-24, PSA vides
// pour mieux cibler la correction
import { createClient } from '@supabase/supabase-js'
const sb = createClient(
  'https://oucotpxcjalwgetylfbz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y290cHhjamFsd2dldHlsZmJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMyODUyOCwiZXhwIjoyMDk2OTA0NTI4fQ.qAzdbqG1xqL3zkZ9I-pEwlk5Nek8778-Ph0-HkNxPr0'
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
