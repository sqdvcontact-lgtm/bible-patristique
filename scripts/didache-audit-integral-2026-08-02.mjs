import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0012O0002'
const ROOT = 'audit/didache-liens-2026-08-02'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const must = async (promise, label) => {
  const { data, error } = await promise
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}
const segments = await must(db.from('segments').select('*').eq('id_oeuvre', OEUVRE).order('segment_numero'), 'segments')
if (segments.length !== 107 || segments.some((row, index) => row.segment_numero !== index + 1)) throw new Error('Segmentation inattendue')
const ids = segments.map((row) => row.id)
const links = await must(db.from('liens_bibliques').select('*').in('segment_id', ids).order('id'), 'liens')
const targets = [...new Set(links.map((row) => row.canon_id).filter(Boolean))]
const witnesses = targets.length
  ? await must(db.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', targets), 'témoins')
  : []
const witnessById = new Map(witnesses.map((row) => [row.id_verset, row]))
const linksBySegment = new Map(ids.map((id) => [id, []]))
for (const link of links) linksBySegment.get(link.segment_id).push(link)
const rows = segments.map((segment) => ({
  ...segment,
  liens: linksBySegment.get(segment.id).map((link) => ({
    ...link,
    temoin: link.canon_id ? witnessById.get(link.canon_id) ?? null : null,
  })),
}))
const zeroLinks = rows.filter((row) => row.liens.length === 0)
const marker = /[«"]|il est écrit|il a été dit|selon qu.il a été dit|l[’']Écriture|l[’']Évangile|le Seigneur a dit|le prophète|l[’']Apôtre/iu
const keyCounts = new Map()
for (const link of links) {
  const key = `${link.segment_id}|${link.type}|${link.canon_id ?? '∅'}|${link.verset_v2_id ?? '∅'}|${link.livre ?? '∅'}|${link.chapitre ?? '∅'}`
  keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1)
}
mkdirSync(ROOT, { recursive: true })
writeFileSync(`${ROOT}/etat-avant.json`, `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
const markdown = rows.flatMap((row) => [
  `## Segment ${row.segment_numero} — ${row.ref_niv1 ?? ''}${row.ref_niv2 ? ` / ${row.ref_niv2}` : ''}`,
  '', row.segment_texte ?? '', row.notes ? `\nNotes : ${JSON.stringify(row.notes)}` : '',
  '', ...(row.liens.length ? row.liens.flatMap((link) => [
    `- T${link.type} ${link.canon_id ?? '(sans cible)'} — ${link.fiabilite} — ${link.motif}`,
    link.temoin ? `  - témoin : ${link.temoin.TR0003 ?? link.temoin.TR0001 ?? link.temoin.TR0004 ?? '(vide)'}` : '',
  ]) : ['- Aucun lien']), '',
]).join('\n')
writeFileSync(`${ROOT}/lecture-integrale.md`, `${markdown}\n`, 'utf8')
console.log(JSON.stringify({
  oeuvre: OEUVRE,
  segments: segments.length,
  segments_revus: segments.filter((row) => row.liens_revus_le).length,
  liens: links.length,
  segments_avec_liens: new Set(links.map((row) => row.segment_id)).size,
  cibles_distinctes: targets.length,
  cibles_absentes: targets.filter((target) => !witnessById.has(target)),
  types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, links.filter((row) => row.type === type).length])),
  fiabilites: Object.fromEntries([...new Set(links.map((row) => row.fiabilite))].map((value) => [value, links.filter((row) => row.fiabilite === value).length])),
  sans_lien: zeroLinks.map((row) => row.segment_numero),
  sans_lien_avec_marqueur: zeroLinks.filter((row) => marker.test(row.segment_texte ?? '')).map((row) => row.segment_numero),
  doublons: [...keyCounts.values()].filter((count) => count > 1).length,
  motifs_vides: links.filter((row) => !row.motif?.trim()).length,
  arbitrages_inattendus: links.filter((row) => row.arbitrage_requis && !['douteux', 'à constituer'].includes(row.fiabilite)).length,
  sans_cible_a_constituer: links.filter((row) => !row.canon_id && !row.verset_v2_id && !row.livre && row.fiabilite === 'à constituer').length,
  output: ROOT,
}, null, 2))
