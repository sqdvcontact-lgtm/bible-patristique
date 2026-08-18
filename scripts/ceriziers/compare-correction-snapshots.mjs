import fs from 'node:fs';
import path from 'node:path';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const key of ['before', 'after', 'out']) if (!values[key]) throw new Error(`Argument manquant : --${key}`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}
const options = args();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const beforeMir = read(path.join(options.before, 'mirandol', 'mirandol_before_manifest.json'));
const afterMir = read(path.join(options.after, 'mirandol', 'mirandol_after_manifest.json'));
const beforeCer = read(path.join(options.before, 'ceriziers', 'ceriziers_before.json'));
const afterCer = read(path.join(options.after, 'ceriziers', 'ceriziers_after.json'));
const errors = [];

if (JSON.stringify(beforeMir.collection_sha256) !== JSON.stringify(afterMir.collection_sha256)) errors.push('mirandol_collection_hashes');
if (beforeMir.counts.segments !== 1896 || afterMir.counts.segments !== 1896
    || beforeMir.counts.units !== 475 || afterMir.counts.units !== 475
    || beforeMir.counts.notes !== 138 || afterMir.counts.notes !== 138
    || beforeMir.counts.biblical_links !== 20 || afterMir.counts.biblical_links !== 20
    || beforeMir.counts.latin_rank_1 !== 474 || afterMir.counts.latin_rank_1 !== 474
    || beforeMir.counts.latin_rank_gt_1 !== 0 || afterMir.counts.latin_rank_gt_1 !== 0) errors.push('mirandol_counts');

const beforeByKey = new Map(beforeCer.segments.map(segment => [segment.segment_key, segment]));
const afterByKey = new Map(afterCer.segments.map(segment => [segment.segment_key, segment]));
const removed = beforeCer.segments.filter(segment => !afterByKey.has(segment.segment_key));
const added = afterCer.segments.filter(segment => !beforeByKey.has(segment.segment_key));
const textChanges = [];
const renumbered = [];
for (const [key, before] of beforeByKey) {
  const after = afterByKey.get(key);
  if (!after) continue;
  if (before.segment_texte !== after.segment_texte) textChanges.push({ key, before: before.segment_texte, after: after.segment_texte });
  if (before.segment_numero !== after.segment_numero) renumbered.push({ key, before: before.segment_numero, after: after.segment_numero });
  const expectedNumber = before.segment_numero > 1813 ? before.segment_numero - 1 : before.segment_numero;
  if (after.segment_numero !== expectedNumber) errors.push(`renumbering:${key}`);
}
if (removed.length !== 1 || removed[0].segment_key !== 'TXT_A0064O0001_FR_1646_CERIZIERS:CER-B05-D08-U001-POEM:s037'
    || removed[0].segment_texte !== 'PRO' || added.length !== 0) errors.push('false_PRO_removal');
if (textChanges.length !== 1 || textChanges[0].key !== 'TXT_A0064O0001_FR_1646_CERIZIERS:CER-B01-D06-B001-U001:s009'
    || !textChanges[0].before.endsWith('brauons son inso¬') || !textChanges[0].after.endsWith('brauons son insolence.')) errors.push('insolence_change');

const note = (snapshot, key) => snapshot.notes.find(item => item.note_key === key)?.metadata ?? {};
for (const [key, expected] of Object.entries({
  'CER-NOTE-003': ['II. PROSE.', 'III. PROSE.', 'V'],
  'CER-NOTE-004': ['V. PROSE.', 'VI. PROSE.', 'XI'],
})) {
  const metadata = note(afterCer, key);
  if ([metadata.printed_reading, metadata.semantic_reading, metadata.canonical_division_ref].some((value, index) => value !== expected[index])) errors.push(`note:${key}`);
}
if (afterCer.counts.units !== 209 || afterCer.counts.segments !== 1880 || afterCer.counts.body !== 1823
    || afterCer.counts.verses !== 1213 || afterCer.counts.notes !== 4 || afterCer.counts.note_blocks !== 4
    || afterCer.counts.note_anchors !== 4 || afterCer.counts.alignment_members !== 3716
    || afterCer.text.is_public !== false || afterCer.text.is_default !== false || afterCer.text.statut !== 'review') errors.push('ceriziers_after_counts_or_status');

const report = {
  status: errors.length ? 'FAIL' : 'PASS', errors,
  mirandol: { collection_hashes_identical: errors.includes('mirandol_collection_hashes') === false, counts: afterMir.counts },
  ceriziers: {
    before_counts: beforeCer.counts, after_counts: afterCer.counts,
    removed_segments: removed.map(segment => ({ segment_key: segment.segment_key, segment_numero: segment.segment_numero, segment_texte: segment.segment_texte })),
    added_segments: added.length, text_changes: textChanges, renumbered_segments: renumbered.length,
    publication: { statut: afterCer.text.statut, is_public: afterCer.text.is_public, is_default: afterCer.text.is_default },
  },
};
fs.mkdirSync(options.out, { recursive: true });
fs.writeFileSync(path.join(options.out, 'comparaison_snapshots_avant_apres.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
