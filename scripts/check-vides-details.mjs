import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

const cibles = [
  { livre: '1KI', chapitre: 5 },
  { livre: 'NUM', chapitre: 17 },
  { livre: 'NEH', chapitre: 3 },
  { livre: 'LEV', chapitre: 6 },
  { livre: 'EZK', chapitre: 21 },
  { livre: 'JOB', chapitre: 40 },
]

async function main() {
  for (const { livre, chapitre } of cibles) {
    const { data } = await sb.from('versets')
      .select('verset,TR0001,TR0002')
      .eq('livre', livre).eq('chapitre', chapitre)
      .order('verset')
    const vides = data.filter(v => !v.TR0001)
    const max = data.at(-1)?.verset
    console.log(`\n=== ${livre} ch${chapitre} — ${data.length} versets, max_v=${max}, ${vides.length} vides ===`)
    for (const v of vides) {
      const ctx = v.TR0002 ? v.TR0002.slice(0,80) : '(pas de TR0002)'
      console.log(`  v${v.verset}: ${ctx}`)
    }
  }

  // Aussi les petits vides isolés (1 par livre)
  console.log('\n=== VIDES ISOLÉS (1 par livre) ===')
  const isolés = ['2SA','2KI','ISA','JER','DAN','JDG','ECC','1SA','MIC','NAM','HAG','2CO','EPH','1PE','3JN','REV']
  for (const livre of isolés) {
    const { data } = await sb.from('versets')
      .select('verset,chapitre,TR0002')
      .eq('livre', livre)
      .or('TR0001.is.null,TR0001.eq.')
      .order('chapitre').order('verset')
    for (const v of data||[]) {
      const ctx = v.TR0002 ? v.TR0002.slice(0,80) : '(pas de TR0002)'
      console.log(`  ${livre} ${v.chapitre}:${v.verset} → ${ctx}`)
    }
  }
}
main().catch(console.error)
