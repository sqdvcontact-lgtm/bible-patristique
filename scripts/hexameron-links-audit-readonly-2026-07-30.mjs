import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const WORK = 'A0017O0001';
const OUT = 'audit/hexameron-2026-07-30/links-audit-readonly.json';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
};
const paginate = async (table, select, configure, order) => {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    query = configure(query);
    if (order) query = query.order(order);
    const batch = await must(query, table);
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
};

const allSegments = await paginate('segments',
  'id,segment_numero,segment_texte,nature,ref_niv1,ref_niv2,paragraphe,rang,notes,liens_revus_le,liens_revus_par',
  (q) => q.eq('id_oeuvre', WORK), 'segment_numero');
const body = allSegments.filter((row) => ['texte', 'citation'].includes(row.nature));
const bodyById = new Map(body.map((row) => [row.id, row]));
const links = [];
for (let offset = 0; offset < body.length; offset += 250) {
  links.push(...await must(db.from('liens_bibliques')
    .select('id,segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis,created_at')
    .in('segment_id', body.slice(offset, offset + 250).map((row) => row.id)), 'liens'));
}

const canonicalTargets = [...new Set(links.map((link) => link.canon_id).filter(Boolean))];
const extraTargets = [...new Set(links.map((link) => link.verset_v2_id).filter(Boolean))];
const canonicalRows = [];
for (let offset = 0; offset < canonicalTargets.length; offset += 200) {
  canonicalRows.push(...await must(db.from('versets_lecture').select('id_verset,"TR0001","TR0003","TR0004"')
    .in('id_verset', canonicalTargets.slice(offset, offset + 200)), 'versets_lecture'));
}
const extraRows = [];
for (let offset = 0; offset < extraTargets.length; offset += 200) {
  extraRows.push(...await must(db.from('versets_v2').select('id').in('id', extraTargets.slice(offset, offset + 200)), 'versets_v2'));
}
const canonicalFound = new Set(canonicalRows.map((row) => row.id_verset));
const extraFound = new Set(extraRows.map((row) => row.id));
const target = (link) => link.canon_id ?? link.verset_v2_id ?? `${link.livre}.${link.chapitre}`;
const key = (link) => `${link.segment_id}|${target(link)}|${link.type}`;
const keyCounts = new Map();
for (const link of links) keyCounts.set(key(link), (keyCounts.get(key(link)) ?? 0) + 1);

const groupCount = (values, keyOf) => values.reduce((acc, value) => {
  const key = String(keyOf(value));
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
const linkCountsByHomily = {};
for (const link of links) {
  const homily = bodyById.get(link.segment_id)?.ref_niv1 ?? '?';
  linkCountsByHomily[homily] ??= { total: 0, types: {} };
  linkCountsByHomily[homily].total++;
  linkCountsByHomily[homily].types[link.type] = (linkCountsByHomily[homily].types[link.type] ?? 0) + 1;
}
const markers = /[«»]|il est écrit|l[’']Écriture dit|dit saint Paul|dit le prophète|dit David|selon l[’']Écriture/i;
const linksBySegment = new Map();
for (const link of links) {
  if (!linksBySegment.has(link.segment_id)) linksBySegment.set(link.segment_id, []);
  linksBySegment.get(link.segment_id).push(link);
}
const report = {
  audited_at: new Date().toISOString(),
  counts: {
    all_segments: allSegments.length,
    body_segments: body.length,
    apparatus_segments: allSegments.length - body.length,
    links: links.length,
    linked_segments: linksBySegment.size,
    reviewed_segments: body.filter((row) => row.liens_revus_le).length,
  },
  types: groupCount(links, (link) => link.type),
  reliability: groupCount(links, (link) => link.fiabilite),
  provenance: groupCount(links, (link) => link.provenance),
  by_homily: linkCountsByHomily,
  invalid: {
    foreign_segments: links.filter((link) => !bodyById.has(link.segment_id)).map((link) => link.id),
    invalid_types: links.filter((link) => ![1, 2, 3, 4].includes(link.type)).map((link) => link.id),
    invalid_reliability: links.filter((link) => !['à constituer', 'douteux', 'probable', 'vérifié'].includes(link.fiabilite)).map((link) => link.id),
    missing_motifs: links.filter((link) => !String(link.motif ?? '').trim()).map((link) => link.id),
    duplicate_keys: [...keyCounts].filter(([, count]) => count > 1).map(([value]) => value),
    dead_canonical_targets: canonicalTargets.filter((id) => !canonicalFound.has(id)),
    dead_extra_targets: extraTargets.filter((id) => !extraFound.has(id)),
    wrong_target_cardinality: links.filter((link) => [link.canon_id, link.verset_v2_id, link.livre && link.chapitre]
      .filter(Boolean).length !== (link.fiabilite === 'à constituer' ? 0 : 1)).map((link) => link.id),
    verified_with_arbitration: links.filter((link) => link.fiabilite === 'vérifié' && link.arbitrage_requis).map((link) => link.id),
  },
  diagnostics: {
    type1_without_visible_marker: links.filter((link) => link.type === 1 && !markers.test(bodyById.get(link.segment_id)?.segment_texte ?? ''))
      .map((link) => ({ id: link.id, segment_numero: bodyById.get(link.segment_id)?.segment_numero, target: target(link) })),
    marker_segments_without_link: body.filter((row) => markers.test(row.segment_texte) && !linksBySegment.has(row.id))
      .map((row) => ({ segment_numero: row.segment_numero, text: row.segment_texte })),
    provisional_links: links.filter((link) => link.fiabilite !== 'vérifié')
      .map((link) => ({ id: link.id, segment_numero: bodyById.get(link.segment_id)?.segment_numero, type: link.type,
        fiabilite: link.fiabilite, target: target(link), motif: link.motif })),
  },
  hashes: {
    body_text: createHash('sha256').update(body.map((row) => `${row.id}\t${row.segment_texte}`).join('\n')).digest('hex').toUpperCase(),
    links: createHash('sha256').update(JSON.stringify(links.sort((a, b) => a.id - b.id))).digest('hex').toUpperCase(),
  },
};
mkdirSync('audit/hexameron-2026-07-30', { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ counts: report.counts, types: report.types, reliability: report.reliability,
  provenance: report.provenance, by_homily: report.by_homily,
  invalid_counts: Object.fromEntries(Object.entries(report.invalid).map(([name, values]) => [name, values.length])),
  diagnostic_counts: Object.fromEntries(Object.entries(report.diagnostics).map(([name, values]) => [name, values.length])),
  hashes: report.hashes }, null, 2));
