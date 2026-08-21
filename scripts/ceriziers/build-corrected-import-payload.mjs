import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const name of ['data', 'deliverable']) if (!values[name]) throw new Error(`Argument manquant : --${name}`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}
const options = args();
const read = name => JSON.parse(fs.readFileSync(path.join(options.data, name), 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

const base = read('ceriziers_import_payload_pre_alignment.json');
const set = read('ceriziers_mirandol_alignment_set_corrige.json');
const groups = read('ceriziers_mirandol_alignment_groups_corriges.json');
const members = read('ceriziers_mirandol_alignment_members_corriges.json');
const coverage = read('ceriziers_mirandol_alignment_coverage_corrige.json');
const docx = path.join(options.deliverable, 'boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL.docx');
const pdf = path.join(options.deliverable, 'boece_ceriziers_1646_FRANCAIS_ANCIEN_CORRIGE_FINAL_PREUVE.pdf');
const notes = path.join(options.data, 'ceriziers_notes.json');
const segmentation = path.join(options.data, 'ceriziers_segmentation_manifest.json');
const sourceReading = path.join(options.data, 'lecture_structuree_corrigee.json');

const payload = {
  ...base,
  schema: 'la-gueule-ceriziers-private-correction-v3',
  alignment_set: {
    alignment_set_id: set.alignment_set_id,
    id_oeuvre: set.id_oeuvre,
    reference_text_id: set.reference_text_id,
    aligned_text_id: set.aligned_text_id,
    alignment_level: set.alignment_level,
    status: set.status,
    method: set.method,
    metadata: set.metadata,
  },
  alignments: groups.map(group => ({
    alignment_id: group.alignment_id,
    alignment_set_id: group.alignment_set_code,
    book: group.book_number,
    canonical_division_order: group.canonical_division_order,
    group_order: group.local_order,
    cardinality: group.cardinality,
    status: group.status,
    confidence: group.confidence,
    method: group.method,
    justification: group.justification,
    metadata: {
      division_key: group.division_key,
      division_kind: group.division_kind,
      global_order: group.group_order,
      left_count: group.left_count,
      right_count: group.right_count,
      left_text: group.left_text,
      right_text: group.right_text,
      exception_to_size_rule: group.exception_to_size_rule,
      review_context: group.metrics,
      validated_human: false,
    },
  })),
  alignment_members: members.map(member => ({
    alignment_set_id: member.alignment_set_code,
    alignment_id: member.alignment_id,
    role: member.role,
    member_order: member.member_order,
    id_texte: member.id_texte,
    segment_key: member.segment_key,
    metadata: { segment_numero: member.segment_numero, side_internal: member.side },
  })),
  source_hashes: {
    ...base.source_hashes,
    corrected_docx_sha256: sha(docx),
    control_pdf_sha256: sha(pdf),
    notes_json_sha256: sha(notes),
    segmentation_manifest_sha256: sha(segmentation),
    corrected_source_reading_sha256: sha(sourceReading),
  },
  correction_policy: {
    transaction: true, idempotent: true, reversible: true,
    advisory_lock: 'ceriziers-1646-fine-alignment-correction-v1',
    bounded_text_id: base.id_texte, bounded_alignment_set_id: set.alignment_set_id,
    private: true, mirandol_immutable: true, copy_biblical_links: false,
    validated_human: false,
  },
  alignment_statistics: coverage,
};
delete payload.generated_at_utc;
const errors = [];
if (payload.units.length !== 209 || payload.segments.length !== 1880) errors.push('document_counts');
if (payload.segments.filter(segment => segment.espace_textuel === 'corps').length !== 1823) errors.push('body_count');
if (payload.segments.filter(segment => segment.nature === 'vers').length !== 1213) errors.push('verse_count');
if (payload.segments.some(segment => segment.segment_texte === 'PRO' || segment.segment_texte.includes('¬'))) errors.push('text_corruption');
if (payload.notes.length !== 4 || payload.note_blocks.length !== 4 || payload.note_anchors.length !== 4) errors.push('notes_count');
if (payload.alignment_members.length !== 3716 || coverage.ceriziers_scope_segments_covered_exactly_once !== 1821 || coverage.mirandol_scope_segments_covered_exactly_once !== 1895) errors.push('alignment_coverage');
const sizeExceptions = payload.alignments.filter(group => group.metadata.exception_to_size_rule);
if (payload.alignments.length <= 268 || sizeExceptions.length !== 1
    || sizeExceptions[0].book !== 4 || sizeExceptions[0].canonical_division_order !== 13
    || sizeExceptions[0].metadata.left_count !== 1 || sizeExceptions[0].metadata.right_count !== 6) errors.push('alignment_size_exception');
if (payload.alignments.some(group => group.status === 'validated_human' || group.metadata.validated_human !== false)) errors.push('validated_human');
if (payload.segments.some(segment => segment.texte_original != null)) errors.push('latin_present');
if (payload.id_texte !== 'TXT_A0064O0001_FR_1646_CERIZIERS' || payload.alignment_set.reference_text_id !== 'TXT_A0064O0001_FR_1861_MIRANDOL') errors.push('scope');
if (errors.length) throw new Error(errors.join(', '));
const output = path.join(options.data, 'ceriziers_correction_import_payload.json');
fs.writeFileSync(output, `${JSON.stringify(stable(payload), null, 2)}\n`, 'utf8');
const report = {
  status: 'PASS', payload_sha256: sha(output), payload_bytes: fs.statSync(output).size,
  counts: { units: 209, segments: 1880, body: 1823, verses: 1213, notes: 4, alignment_groups: groups.length, alignment_members: members.length },
  alignment_statistics: coverage, source_hashes: payload.source_hashes,
};
fs.writeFileSync(path.join(options.data, 'ceriziers_correction_import_payload_manifest.json'), `${JSON.stringify(stable(report), null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
