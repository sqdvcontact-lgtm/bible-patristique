import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK = 'A0017O0001'
const APPLY = process.argv.includes('--apply')
const EXPECTED = [855, 1060, 1250, 1365, 1434, 1511, 1697]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('segments')
    .select('id,segment_numero,segment_texte,texte_original,ref_niv1')
    .eq('id_oeuvre', WORK).order('id').range(from, from + 999)
  if (error) throw error
  rows.push(...data)
  if (data.length < 1000) break
}
const originals = rows.filter((row) => row.texte_original?.trim())
const falseOriginals = originals.filter((row) => !/\p{Script=Greek}/u.test(row.texte_original))
if (JSON.stringify(falseOriginals.map((row) => row.segment_numero)) !== JSON.stringify(EXPECTED)) {
  throw new Error(`Préétat faux originaux inattendu : ${JSON.stringify(falseOriginals.map((row) => row.segment_numero))}`)
}
if (falseOriginals.some((row) => !/\((?:Matth|Marc|Rom|4 Rois|Eph|Héb)\./u.test(row.texte_original))) {
  throw new Error('Un faux original n’a pas la forme attendue d’une copie française enrichie d’une référence.')
}
console.log(JSON.stringify({ apply: APPLY, originals_before: originals.length,
  genuine_greek: originals.length - falseOriginals.length,
  cleared_french_reference_copies: falseOriginals.map((row) => row.segment_numero) }, null, 2))
if (!APPLY) process.exit(0)

for (const row of falseOriginals) {
  const { data, error } = await db.from('segments').update({ texte_original: null })
    .eq('id', row.id).eq('texte_original', row.texte_original).select('id')
  if (error) throw error
  if (data.length !== 1) throw new Error(`Écriture segment ${row.segment_numero} : ${data.length}`)
}
const { data: after, error: afterError } = await db.from('segments')
  .select('segment_numero,texte_original').eq('id_oeuvre', WORK).not('texte_original', 'is', null)
if (afterError) throw afterError
if (after.length !== 97 || after.some((row) => !/\p{Script=Greek}/u.test(row.texte_original))) {
  throw new Error(`Postcontrôle grec : ${after.length}`)
}
console.log(JSON.stringify({ applied: true, genuine_greek: after.length, false_originals: 0 }, null, 2))
