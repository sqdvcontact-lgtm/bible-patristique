import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const work = path.join(root, 'work', 'boece', 'ceriziers_1646_segmentation_alignement');
const data = path.join(work, '02_DONNEES');
const deliverable = path.join(work, '01_LIVRABLE');
const readJson = name => JSON.parse(fs.readFileSync(path.join(data, name), 'utf8'));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const stable = value => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
};

const base = readJson('ceriziers_import_payload_pre_alignment.json');
const alignmentSet = readJson('ceriziers_mirandol_alignment_set.json');
const alignments = readJson('ceriziers_mirandol_alignment_groups.json').map(group => ({
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
    candidate_group_codes: group.metrics.candidate_group_codes,
    reserve: group.confidence < 0.88 ? 'confiance_algorithmique_initiale_inferieure_a_0_88' : null,
    validated_human: false,
  },
}));
const alignmentMembers = readJson('ceriziers_mirandol_alignment_members.json').map(member => ({
  alignment_set_id: member.alignment_set_code,
  alignment_id: member.alignment_id,
  role: member.role,
  member_order: member.member_order,
  id_texte: member.id_texte,
  segment_key: member.segment_key,
  metadata: {
    segment_numero: member.segment_numero,
    side_internal: member.side,
  },
}));

const docx = path.join(deliverable, 'boece_ceriziers_1646_FRANCAIS_ANCIEN_OCR_CORRIGE_BIBLIO.docx');
const pdf = path.join(deliverable, 'boece_ceriziers_1646_FRANCAIS_ANCIEN_OCR_CORRIGE_BIBLIO_PREUVE.pdf');
const notesPath = path.join(data, 'ceriziers_notes.json');
const segmentationPath = path.join(data, 'ceriziers_segmentation_manifest.json');

const payload = {
  ...base,
  schema: 'la-gueule-ceriziers-private-import-v2',
  generated_at_utc: new Date().toISOString(),
  alignment_set: {
    alignment_set_id: alignmentSet.alignment_set_id,
    id_oeuvre: alignmentSet.id_oeuvre,
    reference_text_id: alignmentSet.reference_text_id,
    aligned_text_id: alignmentSet.aligned_text_id,
    alignment_level: alignmentSet.alignment_level,
    status: alignmentSet.status,
    method: alignmentSet.method,
    metadata: alignmentSet.metadata,
  },
  alignments,
  alignment_members: alignmentMembers,
  source_hashes: {
    ...base.source_hashes,
    corrected_docx_sha256: sha256(docx),
    control_pdf_sha256: sha256(pdf),
    notes_json_sha256: sha256(notesPath),
    segmentation_manifest_sha256: sha256(segmentationPath),
  },
  import_policy: {
    transaction: true,
    idempotent: true,
    advisory_lock: 'ceriziers-1646-private-import-v1',
    bounded_text_id: base.id_texte,
    mirandol_immutable: true,
    private: true,
    copy_biblical_links: false,
    import_latin: false,
  },
};

const errors = [];
if (payload.segments.length !== 1881) errors.push('segments_count');
if (payload.segments.filter(segment => segment.nature === 'vers').length !== 1214) errors.push('verse_count');
if (payload.units.length !== 209) errors.push('units_count');
if (payload.notes.length !== 4 || payload.note_blocks.length !== 4 || payload.note_anchors.length !== 4) errors.push('notes_count');
if (payload.alignments.length !== 268 || payload.alignment_members.length !== 3717) errors.push('alignment_count');
if (payload.segments.some(segment => segment.texte_original != null)) errors.push('latin_present');
if (payload.id_texte !== 'TXT_A0064O0001_FR_1646_CERIZIERS') errors.push('wrong_text_id');
if (payload.alignment_set.reference_text_id !== 'TXT_A0064O0001_FR_1861_MIRANDOL') errors.push('wrong_reference');
if (payload.alignment_set.aligned_text_id !== payload.id_texte) errors.push('wrong_aligned');

const out = path.join(data, 'ceriziers_import_payload.json');
fs.writeFileSync(out, `${JSON.stringify(stable(payload), null, 2)}\n`, 'utf8');
const report = {
  status: errors.length ? 'FAIL' : 'PASS',
  errors,
  payload_sha256: sha256(out),
  counts: {
    units: payload.units.length,
    segments: payload.segments.length,
    verses: payload.segments.filter(segment => segment.nature === 'vers').length,
    notes: payload.notes.length,
    note_blocks: payload.note_blocks.length,
    note_anchors: payload.note_anchors.length,
    alignments: payload.alignments.length,
    alignment_members: payload.alignment_members.length,
  },
  source_hashes: payload.source_hashes,
};
const reportPath = path.join(work, '02_PREUVES', '05_IMPORT_SUPABASE', 'dry_run_payload.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(stable(report), null, 2)}\n`, 'utf8');
if (errors.length) throw new Error(errors.join(', '));
console.log(JSON.stringify(report, null, 2));
