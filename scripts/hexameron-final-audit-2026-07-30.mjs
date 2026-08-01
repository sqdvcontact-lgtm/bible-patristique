import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WORK = 'A0017O0001'
const OUT = 'audit/hexameron-2026-07-30/final-audit.json'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

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

const [{ data: work, error: workError }, segments] = await Promise.all([
  db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(),
  all('segments', '*', (query) => query.eq('id_oeuvre', WORK).order('id')),
])
if (workError) throw workError
const links = []
for (let from = 0; from < segments.length; from += 300) {
  const { data, error } = await db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(from, from + 300).map((row) => row.id))
  if (error) throw error
  links.push(...data)
}

const body = segments.filter((row) => ['texte', 'citation'].includes(row.nature))
const apparatus = segments.filter((row) => row.nature === 'apparat_critique')
const segmentById = new Map(segments.map((row) => [row.id, row]))
const failures = []
const checks = {}
const check = (name, condition, details = null) => {
  checks[name] = { ok: Boolean(condition), details }
  if (!condition) failures.push(name)
}
const exactSequence = (values, start) => values.every((value, index) => value === start + index)
const sha = (value) => createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase()

check('work_identity', work.titre === 'Homélies sur l’Hexaéméron'
  && work.sous_titre === 'ou L’Ouvrage des six jours'
  && work.trad_auteur === 'Athanase Auger' && work.editeur === 'François Guyot'
  && work.ville === 'Lyon' && work.date_publication === '1827')
check('work_structure_settings', work.profondeur_sommaire === 1 && work.niveaux_sommaire === 1
  && work.niveaux_corps === 2 && work.texte_sommaire === '1,0,0,0,0'
  && work.texte_corps === '1,0,0,0,0' && work.lecture_texte_entier === false)
check('work_character_count', work.nb_signes === segments.reduce((sum, row) => sum + row.segment_texte.length, 0), work.nb_signes)
check('tenth_homily_notice', /neuf homélies/u.test(work.commentaire_traduction || '')
  && /deux homélies/u.test(work.commentaire_traduction || '')
  && /étrangères à Basile comme à Grégoire de Nysse/u.test(work.commentaire_traduction || ''))

check('segment_counts', segments.length === 1818 && body.length === 1799 && apparatus.length === 19,
  { all: segments.length, body: body.length, apparatus: apparatus.length })
check('segment_numbering', exactSequence(body.map((row) => row.segment_numero).sort((a, b) => a - b), 1)
  && exactSequence(apparatus.map((row) => row.segment_numero).sort((a, b) => a - b), 1800))
check('nature_closed_set', segments.every((row) => ['texte', 'citation', 'apparat_critique'].includes(row.nature)))
check('paragraph_rank_populated', segments.every((row) => Number.isInteger(row.paragraphe) && row.paragraphe > 0
  && Number.isInteger(row.rang) && row.rang > 0))

const rankGroups = new Map()
for (const row of segments) {
  const key = [row.nature, row.ref_niv1, row.ref_niv2, row.ref_niv3, row.ref_niv4, row.paragraphe].join('|')
  if (!rankGroups.has(key)) rankGroups.set(key, [])
  rankGroups.get(key).push(row.rang)
}
const invalidRanks = [...rankGroups.entries()].filter(([, ranks]) => {
  const sorted = [...ranks].sort((a, b) => a - b)
  return !exactSequence(sorted, 1)
})
check('rank_sequences', invalidRanks.length === 0, invalidRanks.slice(0, 20))

const homilies = [
  ['Première homélie', 11], ['Deuxième homélie', 8], ['Troisième homélie', 10],
  ['Quatrième homélie', 7], ['Cinquième homélie', 10], ['Sixième homélie', 11],
  ['Septième homélie', 6], ['Huitième homélie', 8], ['Neuvième homélie', 6],
  ['Dixième homélie (attribution discutée)', 0],
]
const liveHomilies = [...new Set(body.map((row) => row.ref_niv1))]
check('homily_order_and_names', JSON.stringify(liveHomilies) === JSON.stringify(homilies.map(([name]) => name)), liveHomilies)
const sectionAudit = homilies.map(([name, max]) => {
  const rows = body.filter((row) => row.ref_niv1 === name)
  const sections = [...new Set(rows.map((row) => row.ref_niv2))]
  const expected = max ? Array.from({ length: max }, (_, index) => String(index + 1)) : [null]
  return { name, count: rows.length, sections, ok: JSON.stringify(sections) === JSON.stringify(expected) }
})
check('homily_sections', sectionAudit.every((row) => row.ok), sectionAudit)
const titleAudit = homilies.map(([name]) => {
  const titles = [...new Set(body.filter((row) => row.ref_niv1 === name).map((row) => row.ref_niv1_texte).filter(Boolean))]
  return { name, titles, ok: titles.length === 1 }
})
check('homily_titles', titleAudit.every((row) => row.ok), titleAudit)

const calls = []
const definitions = []
for (const row of body) {
  for (const match of row.segment_texte.matchAll(/\[\[(\d+)\]\]/g)) calls.push({ n: Number(match[1]), segment: row.segment_numero })
  for (const match of String(row.notes || '').matchAll(/\[\[(\d+)\]\]/g)) definitions.push({ n: Number(match[1]), segment: row.segment_numero })
}
const noteRange = Array.from({ length: 97 }, (_, index) => index + 1)
check('note_counts', calls.length === 97 && definitions.length === 97, { calls: calls.length, definitions: definitions.length })
check('note_unique_sequence', JSON.stringify(calls.map((row) => row.n).sort((a, b) => a - b)) === JSON.stringify(noteRange)
  && JSON.stringify(definitions.map((row) => row.n).sort((a, b) => a - b)) === JSON.stringify(noteRange))
check('note_call_glued', body.every((row) => !/\s\[\[\d+\]\]/u.test(row.segment_texte)))
check('note_before_punctuation', body.every((row) => !/[,;:.!?»”"]\s*\[\[\d+\]\]/u.test(row.segment_texte)))
check('note_definitions_punctuated', body.filter((row) => row.notes).every((row) => /[.!?…»”)]\s*$/u.test(row.notes)))

const allText = body.map((row) => row.segment_texte).join('\n')
check('no_mojibake_or_replacement', !/(?:�|Ã.|â€|â€™|Â[ ;])/u.test(allText))
check('confirmed_ocr_absent', !/(?:se fit le four|oiseaux qui voient dans le firmament|ne peut atteigne|c’est pour pela|monime apprête)/iu.test(allText))
check('no_fin_segment', body.every((row) => row.segment_texte.trim() !== 'FIN'))

const greek = body.filter((row) => row.texte_original?.trim())
check('greek_count', greek.length === 97, greek.length)
check('greek_clean_markup', greek.every((row) => !/[{}<>�]/u.test(row.texte_original)))
const nonGreekOriginal = greek.filter((row) => !/\p{Script=Greek}/u.test(row.texte_original))
check('greek_script_present', nonGreekOriginal.length === 0,
  nonGreekOriginal.map((row) => ({ segment: row.segment_numero, text: row.texte_original })))

const bodyIds = new Set(body.map((row) => row.id))
check('links_count_and_scope', links.length === 474 && links.every((row) => bodyIds.has(row.segment_id)), links.length)
check('links_metadata', links.every((row) => [1, 2, 3, 4].includes(row.type)
  && ['à constituer', 'douteux', 'probable', 'vérifié'].includes(row.fiabilite)
  && row.provenance === 'lecture' && row.motif?.trim()))
const targetCardinality = (row) => Number(Boolean(row.canon_id)) + Number(Boolean(row.verset_v2_id))
  + Number(Boolean(row.livre && row.chapitre))
check('links_target_cardinality', links.every((row) => targetCardinality(row) === 1
  || (targetCardinality(row) === 0 && row.fiabilite === 'à constituer')))
const linkKeys = links.map((row) => [row.segment_id, row.type, row.canon_id, row.verset_v2_id, row.livre, row.chapitre].join('|'))
check('links_no_duplicates', new Set(linkKeys).size === linkKeys.length)
check('links_review_complete', body.every((row) => row.liens_revus_le && row.liens_revus_par === 'IA-lecture'))
check('apparatus_not_link_reviewed', apparatus.every((row) => !row.liens_revus_le && !row.liens_revus_par))
const unresolved = links.filter((row) => row.fiabilite === 'à constituer')
check('known_lxx_unresolved_only', unresolved.length === 2
  && unresolved.every((row) => [1254, 1255].includes(segmentById.get(row.segment_id)?.segment_numero)
    && /LXX|Septante|Proverbes/u.test(row.motif)), unresolved.map((row) => ({ segment: segmentById.get(row.segment_id)?.segment_numero, motif: row.motif })))

const report = {
  audited_at: new Date().toISOString(),
  work: WORK,
  passed: failures.length === 0,
  failures,
  checks,
  counters: {
    segments: segments.length, body: body.length, apparatus: apparatus.length,
    greek: greek.length, note_calls: calls.length, note_definitions: definitions.length,
    links: links.length, reviewed_body: body.filter((row) => row.liens_revus_le).length,
    link_types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((row) => row.type === type).length])),
    link_reliability: Object.fromEntries(['probable', 'douteux', 'à constituer', 'vérifié'].map((value) => [value, links.filter((row) => row.fiabilite === value).length])),
  },
  hashes: {
    work: sha(JSON.stringify(work)),
    text: sha(segments.map((row) => `${row.id}\t${row.segment_numero}\t${row.segment_texte}`).join('\n')),
    structure: sha(segments.map((row) => `${row.id}\t${row.segment_numero}\t${row.ref_niv1}\t${row.ref_niv2}\t${row.paragraphe}\t${row.rang}\t${row.nature}`).join('\n')),
    greek: sha(greek.map((row) => `${row.id}\t${row.texte_original}`).join('\n')),
    notes: sha(body.filter((row) => row.notes).map((row) => `${row.id}\t${row.notes}`).join('\n')),
    links: sha(links.sort((a, b) => a.id - b.id).map((row) => `${row.id}\t${row.segment_id}\t${row.canon_id}\t${row.type}\t${row.fiabilite}\t${row.motif}`).join('\n')),
  },
}
mkdirSync('audit/hexameron-2026-07-30', { recursive: true })
writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8')
console.log(JSON.stringify({ passed: report.passed, failures, counters: report.counters, hashes: report.hashes, out: OUT }, null, 2))
if (!report.passed) process.exitCode = 1
