import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const CIBLES = [
  'SIR.2.4', 'ROM.12.9', 'WIS.12.5', 'SIR.18.1', 'MAT.10.9', 'MAT.10.10',
  'MRK.6.8', 'NUM.15.20', 'NUM.15.21', 'ACT.20.7', 'MAT.18.17', 'MAT.7.15',
  'MAT.24.10', '2TH.2.9', 'MAT.24.21', 'REV.22.20', '1JN.2.17', 'JHN.17.3',
  '1CO.10.3', '1CO.10.4', '1CO.10.17', 'MAT.6.13', 'HEB.10.25', '1CO.15.52',
  'MAT.22.37', 'MAT.22.39', 'PRO.19.17', '1TI.3.2', '1TI.3.3', '1TI.3.8', '1TI.3.10',
]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await db.from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES).order('id_verset')
if (error) throw error
const found = new Map(data.map((row) => [row.id_verset, row]))
for (const target of CIBLES) {
  const row = found.get(target)
  console.log(`\n## ${target}\n${row?.TR0003 ?? row?.TR0001 ?? row?.TR0004 ?? 'ABSENT'}`)
}
