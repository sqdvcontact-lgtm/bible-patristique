import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const R = 'tmp/somme-liens-audit-2026-07-29'
const P = 100
mkdirSync(R, { recursive: true })
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const must = async (query, label) => { const { data, error, count } = await query; if (error) throw new Error(`${label}: ${error.message}`); return { data, count } }
const candidates = Array.from({ length: 50 }, (_, i) => `Question ${81 + i}`)
const segments = []
const pagination = []
for (const question of candidates) for (let from = 0; ; from += P) {
  const { data: page } = await must(sb.from('segments').select('*')
    .eq('id_oeuvre', 'A0013O0002').eq('ref_niv1', 'Prima Pars').eq('ref_niv2', question)
    .order('segment_numero').range(from, from + P - 1), `${question}:${from}`)
  segments.push(...page)
  pagination.push({ objet: 'segments', question, from, to: from + P - 1, lignes: page.length })
  if (page.length < P) break
}
segments.sort((a, b) => a.segment_numero - b.segment_numero)
const questions = candidates.filter((q) => segments.some((s) => s.ref_niv2 === q))
const links = []
for (let off = 0; off < segments.length; off += P) {
  const ids = segments.slice(off, off + P).map((s) => s.id)
  for (let from = 0; ; from += P) {
    const { data: page } = await must(sb.from('liens_bibliques').select('*').in('segment_id', ids).order('id').range(from, from + P - 1), `liens:${off}:${from}`)
    links.push(...page)
    pagination.push({ objet: 'liens', segment_offset: off, from, to: from + P - 1, lignes: page.length })
    if (page.length < P) break
  }
}
links.sort((a, b) => a.id - b.id)
const cols = 'id_verset,ref,"num_TR0001","TR0001","num_TR0003","TR0003","num_TR0004","TR0004"'
const ids = [...new Set(links.map((l) => l.canon_id).filter(Boolean))]
const witnesses = []
for (let from = 0; from < ids.length; from += P) {
  const { data } = await must(sb.from('versets_lecture').select(cols).in('id_verset', ids.slice(from, from + P)), `temoins:${from}`)
  witnesses.push(...data)
}
const { count: markedGlobal } = await must(sb.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', 'A0013O0002').not('liens_revus_le', 'is', null), 'global')
writeFileSync(`${R}/pp-q81-end-raw.json`, JSON.stringify({ exported_at: new Date().toISOString(), candidate_questions: candidates, questions, pagination, segments, links, witnesses, marked_global_live: markedGlobal }, null, 2) + '\n')
console.log(JSON.stringify({
  questions, last_question: questions.at(-1), next_question_segments: segments.filter((s) => s.ref_niv2 === `Question ${Number(questions.at(-1)?.replace('Question ', '')) + 1}`).length,
  segments: segments.length, range: [segments[0]?.segment_numero, segments.at(-1)?.segment_numero],
  links: links.length, witnesses: witnesses.length,
  marked_local: segments.filter((s) => s.liens_revus_le || s.liens_revus_par).length,
  marked_global_live: markedGlobal,
  by_question: Object.fromEntries(candidates.map((q) => [q, segments.filter((s) => s.ref_niv2 === q).length])), pagination,
}, null, 2))
