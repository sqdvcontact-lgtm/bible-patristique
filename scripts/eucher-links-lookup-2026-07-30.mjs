import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const ids = [
  'GEN.2.7', 'GEN.2.21', 'GEN.3.19', 'JAS.1.17', 'LUK.1.17', 'MAT.16.26',
  '2CO.5.20', 'EPH.6.10', '1TI.6.10', 'PSA.38.7', 'PSA.38.10',
  'MAL.3.1', 'MAT.7.14', 'MAT.11.12', 'MAT.11.30', '1CO.2.7',
  'PSA.138.7', 'PSA.138.8', 'PSA.138.9', 'PSA.138.10', 'PSA.138.11',
  'PSA.115.3', 'ROM.15.19', '1JN.2.15', '1PE.2.11', '1CO.10.11', '1CO.10.12',
  'ROM.8.24', 'ROM.8.25', '1TI.3.16', 'PHP.2.9', 'PHP.2.10', 'PHP.2.11',
  'PHP.3.19', 'MAT.5.45', '1CO.2.9', 'REV.17.14', 'REV.19.16', '1TI.6.15',
  'GEN.1.27', 'PSA.115.12', 'ISA.28.25', 'AMO.4.12', 'MAT.22.39', 'MAT.5.44',
  '1CO.10.31', 'MAT.6.20', 'LUK.12.33',
  'EPH.6.20', 'PHP.1.23',
]
const { data, error } = await db.from('versets_lecture')
  .select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', ids).order('id_verset')
if (error) throw error
for (const row of data ?? []) {
  console.log(`\n## ${row.id_verset} ${row.ref ?? ''}`)
  console.log(`Sacy: ${row.TR0001 ?? ''}`)
  console.log(`Crampon: ${row.TR0003 ?? ''}`)
  console.log(`Vulgate: ${row.TR0004 ?? ''}`)
}
console.log(`\nFound ${data?.length ?? 0}/${ids.length}`)
