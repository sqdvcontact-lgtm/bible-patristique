import { readFileSync, writeFileSync } from 'node:fs'
const R = 'tmp/somme-liens-audit-2026-07-29'
const raw = JSON.parse(readFileSync(`${R}/pp-q81-end-raw.json`, 'utf8'))
const by = new Map()
for (const link of raw.links) {
  const rows = by.get(link.segment_id) ?? []
  rows.push(`${link.id}:${link.canon_id ?? `${link.livre}.${link.chapitre}`}/T${link.type}`)
  by.set(link.segment_id, rows)
}
writeFileSync(`${R}/pp-q81-end-review.tsv`, raw.segments.map((s) => `${s.segment_numero}\t${s.ref_niv2}\t${by.get(s.id)?.join(',') ?? '-'}\t${(s.segment_texte ?? '').replace(/\s+/g, ' ')}`).join('\n') + '\n')
console.log(JSON.stringify({ segments: raw.segments.length, links: raw.links.length, without_links: raw.segments.filter((s) => !by.has(s.id)).length }, null, 2))
