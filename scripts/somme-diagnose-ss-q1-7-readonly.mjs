import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const raw = JSON.parse(readFileSync(`${ROOT}/ss-q1-7-raw.json`, 'utf8'));
const segmentsById = new Map(raw.segments.map((segment) => [segment.id, segment]));
const witnessesById = new Map(raw.witnesses.map((witness) => [witness.id_verset, witness]));
const linksBySegment = new Map();
for (const link of raw.links) {
  const links = linksBySegment.get(link.segment_id) || [];
  links.push(`${link.id}:${link.canon_id || link.verset_v2_id || `${link.livre}.${link.chapitre}`}/T${link.type}`);
  linksBySegment.set(link.segment_id, links);
}
writeFileSync(`${ROOT}/ss-q1-7-review.tsv`, raw.segments.map((segment) => [
  segment.segment_numero, segment.ref_niv2, segment.ref_niv3, linksBySegment.get(segment.id)?.join(',') || '-',
  String(segment.segment_texte || '').replace(/\s+/g, ' '),
].join('\t')).join('\n') + '\n');

const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stop = new Set('afin alors aussi avec cette comme dans elle elles encore entre leur leurs mais nous pour quand sans selon sont sous tout tous toute vous votre'.split(' '));
const tokens = (value) => new Set(normalize(value).split(' ').filter((token) => token.length > 3 && !stop.has(token)));
const overlap = (left, right) => {
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) if (b.has(token)) common += 1;
  return Number((common / Math.min(a.size, b.size)).toFixed(3));
};
const reviews = raw.links.map((link) => {
  const segment = segmentsById.get(link.segment_id);
  const witness = witnessesById.get(link.canon_id);
  const scores = witness ? ['TR0001', 'TR0003', 'TR0004'].map((edition) => ({ edition, score: overlap(segment.segment_texte, witness[edition]) })) : [];
  return {
    link_id: link.id, segment_id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2,
    type: link.type, target: link.canon_id || link.verset_v2_id || `${link.livre}.${link.chapitre}`,
    avant: link, texte: segment.segment_texte, witness, scores,
    max_overlap: scores.length ? Math.max(...scores.map((score) => score.score)) : null,
  };
});
const linked = new Set(raw.links.map((link) => link.segment_id));
const cue = /(?:\b(?:Écriture|Ecriture|Évangile|Evangile|Apôtre|Apotre|prophète|prophete|psaume|proverbe|genèse|genese|exode|isaïe|isaie|jérémie|jeremie|job|sagesse|ecclésiastique|ecclesiastique|matthieu|marc|luc|jean|paul|pierre|jacques|jude)\b|(?:il est|on lit|ainsi est-il|comme il est|david).*\b(?:dit|écrit|ecrit)|\bdit (?:le seigneur|dieu|l'apôtre|l’apôtre|l'écriture|l’écriture))/i;
const candidates = raw.segments.filter((segment) => !linked.has(segment.id) && cue.test(segment.segment_texte || '')).map((segment) => ({
  segment_id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2, article: segment.ref_niv3, texte: segment.segment_texte,
}));
const quoted = raw.segments.filter((segment) => !linked.has(segment.id) && /[«»]/.test(segment.segment_texte || '')).map((segment) => ({
  segment_id: segment.id, segment_numero: segment.segment_numero, question: segment.ref_niv2, article: segment.ref_niv3, texte: segment.segment_texte,
}));
const output = {
  stats: {
    segments: raw.segments.length, links: reviews.length, without: raw.segments.length - linked.size,
    hard: reviews.filter((review) => review.type >= 2).length, type4: reviews.filter((review) => review.type === 4).length,
    low_t1: reviews.filter((review) => review.type === 1 && review.max_overlap < 0.08).length,
    candidates: candidates.length, quoted: quoted.length,
  },
  hard: reviews.filter((review) => review.type >= 2),
  low_t1: reviews.filter((review) => review.type === 1 && review.max_overlap < 0.08),
  special: reviews.filter((review) => review.avant.verset_v2_id || review.avant.livre || review.avant.chapitre),
  candidates, quoted, reviews,
};
writeFileSync(`${ROOT}/ss-q1-7-diagnostics.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.stats, null, 2));
