import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q1-40-raw.json`, 'utf8'));
const bySegment = new Map();
for (const link of raw.links) {
  const list = bySegment.get(link.segment_id) || [];
  list.push(`${link.id}:${link.canon_id || link.verset_v2_id || `${link.livre}.${link.chapitre}`}/T${link.type}`);
  bySegment.set(link.segment_id, list);
}
writeFileSync(
  `${ROOT}/pp-q1-40-review.tsv`,
  `${raw.segments.map((segment) => [
    segment.segment_numero,
    segment.ref_niv2,
    bySegment.get(segment.id)?.join(',') || '-',
    (segment.segment_texte || '').replace(/\s+/g, ' '),
  ].join('\t')).join('\n')}\n`,
);
console.log(JSON.stringify({
  segments: raw.segments.length,
  without_links: raw.segments.filter((segment) => !bySegment.has(segment.id)).length,
  links: raw.links.length,
}, null, 2));
