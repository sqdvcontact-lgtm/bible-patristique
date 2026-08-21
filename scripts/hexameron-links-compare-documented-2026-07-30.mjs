import { readFileSync, readdirSync } from 'node:fs'
import vm from 'node:vm'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const homilyFilter = Number(process.argv.find((arg) => arg.startsWith('--hom='))?.split('=')[1] || 0)

const scripts = readdirSync('scripts')
  .filter((name) => /^hexameron-lecture-hom\d+\.mjs$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))

const documented = []
for (const name of scripts) {
  const source = readFileSync(`scripts/${name}`, 'utf8')
  const start = source.indexOf('const L = [')
  const tail = source.slice(start).match(/\r?\n\]\r?\n\r?\n\/\/ segment_numero/)
  if (start < 0 || !tail) throw new Error(`Table L introuvable dans ${name}`)
  const end = start + tail.index
  const literal = source.slice(start + 'const L = '.length, end + tail[0].indexOf(']') + 1)
  const rows = vm.runInNewContext(literal)
  for (const [segmentNumero, canonId, type, fiabilite, motif] of rows) {
    documented.push({ script: name, segmentNumero, canonId, type, fiabilite, motif })
  }
}

async function all(table, select, configure) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999)
    query = configure(query)
    const { data, error } = await query
    if (error) throw error
    rows.push(...data)
    if (data.length < 1000) return rows
  }
}

const segments = await all(
  'segments',
  'id,segment_numero,ref_niv1,ref_niv2,segment_texte,nature',
  (query) => query.eq('id_oeuvre', 'A0017O0001').order('id'),
)
const segmentById = new Map(segments.map((segment) => [segment.id, segment]))
const ids = segments.map((segment) => segment.id)
const links = []
for (let offset = 0; offset < ids.length; offset += 300) {
  const { data, error } = await db.from('liens_bibliques')
    .select('id,segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,provenance,motif,arbitrage_requis')
    .in('segment_id', ids.slice(offset, offset + 300))
  if (error) throw error
  links.push(...data)
}

const wantedMotifs = new Map(documented.map((row) => [row.motif, row]))
const liveMotifs = new Set(links.map((row) => row.motif))
const undocumented = links.filter((row) => !wantedMotifs.has(row.motif)).map((row) => {
  const segment = segmentById.get(row.segment_id)
  return {
    ...row,
    segment_numero: segment?.segment_numero,
    ref_niv1: segment?.ref_niv1,
    ref_niv2: segment?.ref_niv2,
    texte: segment?.segment_texte,
  }
}).sort((a, b) => a.segment_numero - b.segment_numero || a.type - b.type)
const documentedMissing = documented.filter((row) => !liveMotifs.has(row.motif))
const homilyNames = [
  'Première homélie', 'Deuxième homélie', 'Troisième homélie', 'Quatrième homélie',
  'Cinquième homélie', 'Sixième homélie', 'Septième homélie', 'Huitième homélie',
  'Neuvième homélie', 'Dixième homélie (attribution discutée)',
]
const displayed = homilyFilter
  ? undocumented.filter((row) => row.ref_niv1 === homilyNames[homilyFilter - 1])
  : undocumented

console.log(JSON.stringify({
  scripts: scripts.length,
  documented: documented.length,
  live: links.length,
  undocumented: undocumented.length,
  documented_missing: documentedMissing.length,
  displayed_filter: homilyFilter || null,
  undocumented_links: displayed,
  documented_missing_rows: documentedMissing,
}, null, 2))
