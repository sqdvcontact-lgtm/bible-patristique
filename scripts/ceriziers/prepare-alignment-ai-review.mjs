import fs from 'node:fs';
import path from 'node:path';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const name of ['data', 'snapshot', 'output']) if (!values[name]) throw new Error(`Argument manquant : --${name}`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}

const options = args();
fs.mkdirSync(options.output, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(path.join(options.data, 'ceriziers_segmentation_manifest.json'), 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(options.snapshot, 'utf8'));
const clean = value => String(value ?? '').replace(/\[\[\d+\]\]/gu, '').replace(/\s+/gu, ' ').trim();
const keyOf = segment => `${segment.ref_niv1}|${segment.ref_niv2}`;
const left = manifest.segments.filter(segment => segment.espace_textuel === 'corps' && segment.nature !== 'rubrique' && segment.segment_metadata?.alignment_scope === true);
const right = snapshot.segments.filter(segment => segment.espace_textuel === 'corps' && segment.nature !== 'rubrique');
const leftByDivision = Map.groupBy(left, keyOf);
const rightByDivision = Map.groupBy(right, keyOf);
const order = manifest.divisions.map(division => `${division.book_label}|${division.canonical_roman}`);
const divisions = order.map(divisionKey => {
  const l = leftByDivision.get(divisionKey) ?? [];
  const r = rightByDivision.get(divisionKey) ?? [];
  const kind = l.every(segment => segment.nature === 'vers') && r.every(segment => segment.nature === 'vers') ? 'poesie' : 'prose';
  return {
    division_key: divisionKey,
    kind,
    left: l.map((segment, index) => ({ i: index + 1, key: segment.segment_key, speaker: segment.segment_metadata?.speaker ?? null, text: clean(segment.segment_texte) })),
    right: r.map((segment, index) => ({ i: index + 1, key: segment.segment_key, speaker: /^—/u.test(clean(segment.segment_texte)) ? 'tour_dialogue' : null, text: clean(segment.segment_texte) })),
  };
});
if (divisions.length !== 78) throw new Error(`78 divisions attendues, reçu ${divisions.length}`);

const batches = [];
let current = [];
let size = 0;
for (const division of divisions) {
  const divisionSize = JSON.stringify(division).length;
  if (current.length === 2) {
    batches.push(current);
    current = [];
    size = 0;
  }
  current.push(division);
  size += divisionSize;
}
if (current.length) batches.push(current);

const index = [];
batches.forEach((batch, batchIndex) => {
  const batchId = `CER-MIR-REVIEW-${String(batchIndex + 1).padStart(2, '0')}`;
  const packet = { schema: 'ceriziers-mirandol-semantic-review-input-v1', batch_id: batchId, divisions: batch };
  const file = `batch_${String(batchIndex + 1).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(options.output, file), `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  index.push({ batch_id: batchId, file, divisions: batch.map(item => item.division_key), characters: JSON.stringify(packet).length });
});
fs.writeFileSync(path.join(options.output, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ batches: batches.length, divisions: divisions.length, index }, null, 2));
