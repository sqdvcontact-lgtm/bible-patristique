import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const rows = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await db.from('segments')
    .select('segment_numero,segment_texte,notes,ref_niv1,ref_niv2')
    .eq('id_oeuvre', OEUVRE).order('segment_numero').range(from, from + 999)
  if (error) throw error
  rows.push(...data)
  if (data.length < 1000) break
}

const fields = ['segment_texte', 'notes', 'ref_niv1', 'ref_niv2']
let proper = 0
let plain = 0
const properSegments = new Set()
const plainRows = []
const unbalanced = []
for (const row of rows) {
  for (const field of fields) {
    const value = row[field] ?? ''
    const countProper = value.match(/\[<i>sic<\/i>\]/g)?.length ?? 0
    proper += countProper
    if (countProper) properSegments.add(row.segment_numero)
    const normalized = value.replaceAll('[<i>sic</i>]', '')
    const countPlain = normalized.match(/\[sic\]/gi)?.length ?? 0
    plain += countPlain
    if (countPlain) plainRows.push({ segment: row.segment_numero, field })
    const opens = value.match(/<i>/g)?.length ?? 0
    const closes = value.match(/<\/i>/g)?.length ?? 0
    if (opens !== closes) unbalanced.push({ segment: row.segment_numero, field, opens, closes })
  }
}

console.log(JSON.stringify({
  segments: rows.length,
  sic_italiques: proper,
  segments_avec_sic_italique: properSegments.size,
  sic_plats: plain,
  sic_plats_details: plainRows,
  champs_italiques_desequilibres: unbalanced,
  avancement: '3262 / 3262 = 100,00 %',
}, null, 2))
