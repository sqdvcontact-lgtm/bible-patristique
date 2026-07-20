// Vérifier la numérotation des Psaumes dans la DB et cibler les vides
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
  // 1. Vérifier la numérotation en lisant PSA 9 et 10 (zone de divergence Vulgate/Protestant)
  console.log('=== DIAGNOSTIC NUMÉROTATION PSA ===')

  // Si DB = Vulgate: PSA 9 a ~40+ versets (Vg 9 = Prot 9+10 fusionnés)
  // Si DB = Protestant: PSA 9 a 20 versets, PSA 10 a 18 versets
  const { data: psa9 } = await sb.from('versets').select('verset,TR0001').eq('livre','PSA').eq('chapitre',9).order('verset')
  const { data: psa10 } = await sb.from('versets').select('verset,TR0001').eq('livre','PSA').eq('chapitre',10).order('verset')
  const { data: psa11 } = await sb.from('versets').select('verset,TR0001').eq('livre','PSA').eq('chapitre',11).order('verset')

  console.log(`PSA 9 : ${psa9?.length} versets | dernier v=${psa9?.at(-1)?.verset}`)
  console.log(`PSA 10 : ${psa10?.length} versets | dernier v=${psa10?.at(-1)?.verset}`)
  console.log(`PSA 11 : ${psa11?.length} versets | dernier v=${psa11?.at(-1)?.verset}`)

  // Premier verset de PSA 9 pour identifier le psaume
  if (psa9?.length) console.log(`  PSA 9:1 = "${psa9[0].TR0001?.slice(0,100)}"`)
  if (psa10?.length) console.log(`  PSA 10:1 = "${psa10[0].TR0001?.slice(0,100)}"`)
  if (psa11?.length) console.log(`  PSA 11:1 = "${psa11[0].TR0001?.slice(0,100)}"`)

  // 2. PSA 92 : contenu pour identifier
  console.log('\n=== PSA 92 DIAGNOSTIC ===')
  const { data: psa92 } = await sb.from('versets').select('verset,TR0001').eq('livre','PSA').eq('chapitre',92).order('verset')
  console.log(`PSA 92 : ${psa92?.length} versets`)
  for (const v of psa92 || []) {
    const txt = v.TR0001 ? v.TR0001.slice(0,80) : '(vide)'
    console.log(`  v${v.verset}: ${txt}`)
  }

  // 3. Liste de TOUS les PSA versets vides
  console.log('\n=== TOUS LES PSA VIDES ===')
  const { data: psa } = await sb.from('versets')
    .select('chapitre,verset,ref,TR0001')
    .eq('livre','PSA')
    .or('TR0001.is.null,TR0001.eq.')
    .order('chapitre').order('verset')
  console.log(`Total vides : ${psa?.length}`)
  for (const v of psa || []) {
    console.log(`  PSA ${v.chapitre}:${v.verset}  (ref="${v.ref}")`)
  }

  // 4. Nombre total de versets par chapitre pour les chapitres concernés
  const chapsCibles = [12, 25, 52, 60, 62, 63, 66, 81, 83, 92, 116, 132, 136]
  console.log('\n=== DERNIER VERSET PAR CHAPITRE CONCERNÉ ===')
  for (const ch of chapsCibles) {
    const { data } = await sb.from('versets').select('verset').eq('livre','PSA').eq('chapitre',ch).order('verset',{ascending:false}).limit(1)
    const { data: vide } = await sb.from('versets').select('verset').eq('livre','PSA').eq('chapitre',ch).or('TR0001.is.null,TR0001.eq.').order('verset')
    const videsV = (vide||[]).map(v=>v.verset).join(',')
    console.log(`  PSA ${ch}: max_v=${data?.[0]?.verset} | vides=[${videsV}]`)
  }
}

main().catch(console.error)
