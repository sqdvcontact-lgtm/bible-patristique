import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const WORK_ID = 'A0418O0003'
const OUT = 'tmp/eucher-links-2026-07-30'
const snapshot = JSON.parse(readFileSync(`${OUT}/pre-links-snapshot.json`, 'utf8'))
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(match => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (query, label) => {
  const { data, error } = await query
  if (error) throw new Error(`${label}: ${error.message}`)
  return data ?? []
}

const segments = await must(db.from('segments')
  .select('id,segment_numero,segment_texte,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', WORK_ID).in('nature', ['texte', 'citation']).order('segment_numero'), 'segments')
const links = []
for (let index = 0; index < segments.length; index += 300) {
  links.push(...await must(db.from('liens_bibliques')
    .select('id,segment_id,canon_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', segments.slice(index, index + 300).map(segment => segment.id)), 'liens'))
}
const targets = [...new Set(links.map(link => link.canon_id).filter(Boolean))]
const verses = await must(db.from('versets_lecture').select('id_verset').in('id_verset', targets), 'versets')
const verseSet = new Set(verses.map(row => row.id_verset))
const key = row => `${row.segment_id}|${row.canon_id ?? ''}|${row.type}`
const expected = new Set(snapshot.proposed_links.map(key))
const actual = new Set(links.map(key))
const hash = createHash('sha256').update(segments.map(s => `${s.segment_numero}\t${s.segment_texte}`).join('\n')).digest('hex').toUpperCase()
const report = {
  work_id: WORK_ID,
  audited_at: new Date().toISOString(),
  body_segments: segments.length,
  reviewed_segments: segments.filter(s => s.liens_revus_le && s.liens_revus_par === 'IA-lecture').length,
  links: links.length,
  types: links.reduce((acc, row) => ({ ...acc, [row.type]: (acc[row.type] ?? 0) + 1 }), {}),
  reliability: links.reduce((acc, row) => ({ ...acc, [row.fiabilite]: (acc[row.fiabilite] ?? 0) + 1 }), {}),
  arbitrations: links.filter(row => row.arbitrage_requis).map(row => ({ id: row.id, segment_id: row.segment_id, canon_id: row.canon_id, motif: row.motif })),
  duplicate_keys: [...actual].filter(k => links.filter(row => key(row) === k).length > 1),
  missing_expected: [...expected].filter(k => !actual.has(k)),
  unexpected: [...actual].filter(k => !expected.has(k)),
  dead_targets: targets.filter(target => !verseSet.has(target)),
  links_without_motif: links.filter(row => !String(row.motif ?? '').trim()).map(row => row.id),
  text_hash_before: snapshot.text_hash,
  text_hash_after: hash,
  text_unchanged: hash === snapshot.text_hash,
}
writeFileSync(`${OUT}/post-links-audit.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
if (report.body_segments !== 547 || report.reviewed_segments !== 547 || report.links !== 40 ||
    report.duplicate_keys.length || report.missing_expected.length || report.unexpected.length ||
    report.dead_targets.length || report.links_without_motif.length || !report.text_unchanged) process.exitCode = 1
