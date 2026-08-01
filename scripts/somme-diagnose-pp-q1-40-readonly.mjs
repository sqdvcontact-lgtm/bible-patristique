import { readFileSync, writeFileSync } from 'node:fs';
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/pp-q1-40-raw.json`, 'utf8'));
const segments = new Map(raw.segments.map((row) => [row.id, row]));
const witnesses = new Map(raw.witnesses.map((row) => [row.id_verset, row]));
const norm = (text) => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stop = new Set('afin alors aussi au aux avec car ce ces cet cette comme dans de des du elle en est et il ils je la le les leur lui mais ne nous on ou par pas pour que qui se ses si son sont sur un une vous'.split(' '));
const tokens = (text) => new Set(norm(text).split(' ').filter((word) => word.length > 3 && !stop.has(word)));
const overlap = (left, right) => {
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const word of a) if (b.has(word)) common += 1;
  return Number((common / Math.min(a.size, b.size)).toFixed(3));
};
const reviews = raw.links.map((link) => {
  const segment = segments.get(link.segment_id);
  const witness = witnesses.get(link.canon_id);
  const scores = witness ? ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({ edition, score: overlap(segment.segment_texte, witness[edition]) })) : [];
  return {
    link_id: link.id, segment_id: link.segment_id, segment_numero: segment.segment_numero,
    question: segment.ref_niv2, type: link.type, target: link.canon_id || link.verset_v2_id || `${link.livre}.${link.chapitre}`,
    fiabilite: link.fiabilite, provenance: link.provenance, arbitrage_requis: link.arbitrage_requis,
    motif: link.motif, segment_texte: segment.segment_texte, witness, scores,
    max_overlap: scores.length ? Math.max(...scores.map((score) => score.score)) : null,
  };
});
const linked = new Set(raw.links.map((link) => link.segment_id));
const cue = /(?:\b(?:écriture|ecriture|évangile|evangile|apôtre|apotre|prophète|prophete|psaume|proverbe|genèse|genese|exode|isaïe|isaie|jérémie|jeremie|job|sagesse|ecclésiastique|ecclesiastique|matthieu|marc|luc|jean|paul|pierre|jacques|jude)\b|(?:il est|on lit|ainsi est-il|comme il est|david).*\b(?:dit|écrit|ecrit)|\bdit (?:le seigneur|dieu|l'apôtre|l’apôtre|l'écriture|l’écriture)|\bselon (?:l'écriture|l’écriture|saint))/i;
const candidates = raw.segments.filter((segment) => !linked.has(segment.id) && cue.test(segment.segment_texte || '')).map((segment) => ({
  segment_id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2, texte: segment.segment_texte,
}));
const quotedUnlinked = raw.segments.filter((segment) => !linked.has(segment.id) && /[«»]/.test(segment.segment_texte || '')).map((segment) => ({
  segment_id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2, texte: segment.segment_texte,
}));
const report = {
  generated_at: new Date().toISOString(),
  stats: {
    reviews: reviews.length,
    hard_types: reviews.filter((review) => review.type >= 2).length,
    type4: reviews.filter((review) => review.type === 4).length,
    chapter_or_special: reviews.filter((review) => !review.target?.includes('.')).length,
    low_overlap_t1: reviews.filter((review) => review.type === 1 && review.max_overlap < 0.08).length,
    cue_candidates: candidates.length,
    quoted_unlinked: quotedUnlinked.length,
  },
  chapter_or_special: reviews.filter((review) => !review.link_id || !raw.links.find((link) => link.id === review.link_id)?.canon_id),
  hard_types: reviews.filter((review) => review.type >= 2),
  low_overlap_t1: reviews.filter((review) => review.type === 1 && review.max_overlap < 0.08),
  cue_candidates: candidates,
  quoted_unlinked: quotedUnlinked,
  all_links: reviews,
};
writeFileSync(`${ROOT}/pp-q1-40-diagnostics.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.stats, null, 2));
