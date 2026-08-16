import fs from 'node:fs';
import path from 'node:path';

function args() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  for (const name of ['data', 'snapshot', 'reviews']) if (!values[name]) throw new Error(`Argument manquant : --${name}`);
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}

const options = args();
const manifest = JSON.parse(fs.readFileSync(path.join(options.data, 'ceriziers_segmentation_manifest.json'), 'utf8'));
const mirandol = JSON.parse(fs.readFileSync(options.snapshot, 'utf8'));
const reviewIndex = JSON.parse(fs.readFileSync(path.join(options.reviews, 'index.json'), 'utf8'));
const SET_ID = 'ALNSET-A0064O0001-MIR1861-CER1646';
const CER_TEXT = 'TXT_A0064O0001_FR_1646_CERIZIERS';
const MIR_TEXT = 'TXT_A0064O0001_FR_1861_MIRANDOL';
const clean = value => String(value ?? '').replace(/\[\[\d+\]\]/gu, '').replace(/\s+/gu, ' ').trim();
const excerpt = (value, size = 90) => clean(value).length <= size ? clean(value) : `${clean(value).slice(0, size - 1).trimEnd()}…`;
const endExcerpt = (value, size = 75) => clean(value).length <= size ? clean(value) : `…${clean(value).slice(-size + 1).trimStart()}`;
const divisionKey = segment => `${segment.ref_niv1}|${segment.ref_niv2}`;
const byDivision = (segments) => Map.groupBy(segments, divisionKey);
const cerByDivision = byDivision(manifest.segments.filter(segment => segment.espace_textuel === 'corps' && segment.nature !== 'rubrique' && segment.segment_metadata?.alignment_scope === true));
const mirByDivision = byDivision(mirandol.segments.filter(segment => segment.espace_textuel === 'corps' && segment.nature !== 'rubrique'));
const divisionOrder = manifest.divisions.map(division => `${division.book_label}|${division.canonical_roman}`);
const divisionMeta = new Map(manifest.divisions.map(division => [`${division.book_label}|${division.canonical_roman}`, division]));

function expand(range) {
  if (range == null) return [];
  if (!Array.isArray(range) || !range.length || range.some(value => !Number.isInteger(value))) throw new Error(`Plage invalide : ${JSON.stringify(range)}`);
  if (range.length === 1) return range;
  if (range.length === 2) return Array.from({ length: range[1] - range[0] + 1 }, (_, index) => range[0] + index);
  if (range.some((value, index) => index > 0 && value !== range[index - 1] + 1)) throw new Error(`Liste non consécutive : ${JSON.stringify(range)}`);
  return range;
}
function cardinality(left, right) {
  if (right === 1 && left === 1) return '1:1';
  if (right === 0 && left === 1) return '0:1';
  if (right === 1 && left === 0) return '1:0';
  if (right === 1) return '1:n';
  if (left === 1) return 'n:1';
  return 'n:m';
}
function writeJson(name, value) { fs.writeFileSync(path.join(options.data, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function csvValue(value) {
  const text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
function writeCsv(name, rows, columns) {
  fs.writeFileSync(path.join(options.data, name), `${[columns.join(','), ...rows.map(row => columns.map(column => csvValue(row[column])).join(','))].join('\n')}\n`, 'utf8');
}

const reviewedDivisions = new Map();
for (const item of reviewIndex) {
  const number = item.file.match(/(\d+)/u)?.[1];
  const reviewPath = path.join(options.reviews, `review_${number}.json`);
  if (!fs.existsSync(reviewPath)) throw new Error(`Revue absente : ${reviewPath}`);
  const record = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  if (record.validation?.status !== 'PASS' || record.validated_human !== false) throw new Error(`Revue non validée structurellement : ${reviewPath}`);
  for (const division of record.result.divisions) {
    if (reviewedDivisions.has(division.division_key)) throw new Error(`Division dupliquée : ${division.division_key}`);
    reviewedDivisions.set(division.division_key, { ...division, provider: record.provider, model: record.model, batch_id: record.batch_id });
  }
}
if (reviewedDivisions.size !== 78) throw new Error(`78 divisions revues attendues, reçu ${reviewedDivisions.size}`);
for (const targetedName of fs.readdirSync(options.reviews).filter(name => /^targeted_override_.*\.json$/u.test(name)).sort()) {
  const targeted = JSON.parse(fs.readFileSync(path.join(options.reviews, targetedName), 'utf8'));
  if (targeted.validation?.status !== 'PASS' || targeted.validated_human !== false) {
    throw new Error(`Reprise ciblée non validée structurellement : ${targetedName}`);
  }
  for (const division of targeted.result.divisions) {
    if (!reviewedDivisions.has(division.division_key)) throw new Error(`Reprise ciblée sans division source : ${division.division_key}`);
    reviewedDivisions.set(division.division_key, {
      ...division,
      provider: targeted.provider,
      model: targeted.model,
      batch_id: `${targeted.batch_id}:targeted-override`,
      reason_for_override: `Reprise sémantique ciblée enregistrée dans ${targetedName}`,
    });
  }
}
const overridesPath = path.join(options.reviews, 'manual_overrides.json');
if (fs.existsSync(overridesPath)) {
  const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
  if (overrides.validated_human !== false) throw new Error('Le registre de retouches ne doit revendiquer aucune validation humaine.');
  for (const override of overrides.overrides ?? []) {
    const existing = reviewedDivisions.get(override.division_key);
    if (!existing) throw new Error(`Retouche sans division : ${override.division_key}`);
    reviewedDivisions.set(override.division_key, {
      ...existing,
      groups: override.groups,
      provider: 'codex_targeted_semantic_correction',
      model: 'Codex-GPT-5',
      batch_id: `manual-override:${override.division_key}`,
      reason_for_override: override.reason_for_override,
    });
  }
}

const groups = [];
const members = [];
const boundaryRows = [];
const exceptionRows = [];
const uncertainRows = [];
const divisionRows = [];
let globalOrder = 0;
for (const key of divisionOrder) {
  const leftSegments = cerByDivision.get(key) ?? [];
  const rightSegments = mirByDivision.get(key) ?? [];
  const review = reviewedDivisions.get(key);
  const meta = divisionMeta.get(key);
  const kind = leftSegments.every(segment => segment.nature === 'vers') && rightSegments.every(segment => segment.nature === 'vers') ? 'poesie' : 'prose';
  const bookNumber = meta.book_number;
  const divisionNumber = meta.canonical_number;
  const localGroups = [];
  review.groups.forEach((candidate, localIndex) => {
    const leftIndices = expand(candidate.left);
    const rightIndices = expand(candidate.right);
    const left = leftIndices.map(index => leftSegments[index - 1]);
    const right = rightIndices.map(index => rightSegments[index - 1]);
    if (left.some(segment => !segment) || right.some(segment => !segment)) throw new Error(`Indice hors plage dans ${key}`);
    const limit = kind === 'poesie' ? 4 : 5;
    const exception = left.length > limit || right.length > limit;
    if (exception !== Boolean(candidate.exception_to_size_rule)) throw new Error(`Exception incohérente dans ${key}, groupe ${localIndex + 1}`);
    if (exception && !(key === 'LIVRE QUATRIÈME|XIII' && left.length === 1 && right.length === 6)) {
      throw new Error(`Exception de taille non autorisée dans ${key}, groupe ${localIndex + 1}`);
    }
    if (kind === 'poesie' && exception && left.length === leftSegments.length && right.length === rightSegments.length) {
      throw new Error(`Poème entier interdit comme exception : ${key}`);
    }
    globalOrder += 1;
    const code = `ALN-A0064O0001-B${String(bookNumber).padStart(2, '0')}-D${String(divisionNumber).padStart(2, '0')}-G${String(localIndex + 1).padStart(4, '0')}`;
    const leftText = left.map(segment => clean(segment.segment_texte)).join(' ');
    const rightText = right.map(segment => clean(segment.segment_texte)).join(' ');
    const justification = `${candidate.reason.trim()}. Ceriziers : « ${excerpt(leftText)} » ; Mirandol : « ${excerpt(rightText)} ». Frontière relue dans la continuité de ${key.replace('|', ', division ')}.`;
    const group = {
      alignment_group_code: code, alignment_id: code, alignment_set_code: SET_ID,
      group_order: globalOrder, book_number: bookNumber, canonical_division_order: divisionNumber,
      division_roman: meta.canonical_roman, division_key: key, division_kind: kind, local_order: localIndex + 1,
      cardinality: cardinality(left.length, right.length), left_count: left.length, right_count: right.length,
      confidence: candidate.status === 'uncertain' ? 0.72 : 0.95,
      review_status: candidate.status, status: candidate.status,
      exception_to_size_rule: exception,
      method: 'semantic_bilingual_continuous_review_claude_local_candidates_then_codex_controls_v3',
      review_note: justification, justification, left_text: leftText, right_text: rightText,
      metrics: {
        provider: review.provider, model: review.model, batch_id: review.batch_id,
        candidate_only: true, validated_human: false, manual_continuous_review: true,
        left_local_indices: leftIndices, right_local_indices: rightIndices,
        exception_to_size_rule: exception,
      },
    };
    groups.push(group);
    localGroups.push(group);
    left.forEach((segment, index) => members.push({
      alignment_id: code, alignment_group_code: code, alignment_set_code: SET_ID, role: 'aligned', side: 'left',
      member_order: index + 1, id_texte: CER_TEXT, segment_key: segment.segment_key, segment_numero: segment.segment_numero,
    }));
    right.forEach((segment, index) => members.push({
      alignment_id: code, alignment_group_code: code, alignment_set_code: SET_ID, role: 'reference', side: 'right',
      member_order: index + 1, id_texte: MIR_TEXT, segment_id: segment.id, segment_key: segment.segment_key, segment_numero: segment.segment_numero,
    }));
  });
  for (const [index, group] of localGroups.entries()) {
    const previous = localGroups[index - 1] ?? null;
    const next = localGroups[index + 1] ?? null;
    group.metrics.previous_left_excerpt = previous ? endExcerpt(previous.left_text) : null;
    group.metrics.previous_right_excerpt = previous ? endExcerpt(previous.right_text) : null;
    group.metrics.next_left_excerpt = next ? excerpt(next.left_text) : null;
    group.metrics.next_right_excerpt = next ? excerpt(next.right_text) : null;
    const row = {
      alignment_group_code: group.alignment_group_code, book_number: group.book_number, division_roman: group.division_roman,
      local_order: group.local_order, previous_group: previous?.alignment_group_code ?? '', next_group: next?.alignment_group_code ?? '',
      cardinality: group.cardinality, left_count: group.left_count, right_count: group.right_count,
      status: group.status, confidence: group.confidence, exception_to_size_rule: group.exception_to_size_rule,
      previous_left_excerpt: group.metrics.previous_left_excerpt, previous_right_excerpt: group.metrics.previous_right_excerpt,
      next_left_excerpt: group.metrics.next_left_excerpt, next_right_excerpt: group.metrics.next_right_excerpt,
      justification: group.justification,
    };
    boundaryRows.push(row);
    if (group.exception_to_size_rule) exceptionRows.push(row);
    if (group.status === 'uncertain') uncertainRows.push(row);
  }
  divisionRows.push({
    division_key: key, book_number: bookNumber, division_roman: meta.canonical_roman, kind,
    ceriziers_segments: leftSegments.length, mirandol_segments: rightSegments.length, groups: localGroups.length,
    uncertain_groups: localGroups.filter(group => group.status === 'uncertain').length,
    exceptions: localGroups.filter(group => group.exception_to_size_rule).length,
    first_group: localGroups[0]?.alignment_group_code ?? null, last_group: localGroups.at(-1)?.alignment_group_code ?? null,
    review_status: localGroups.some(group => group.status === 'uncertain') ? 'reviewed_ai_with_uncertainty' : 'reviewed_ai',
  });
}

const leftMembers = members.filter(member => member.side === 'left');
const rightMembers = members.filter(member => member.side === 'right');
const errors = [];
if (leftMembers.length !== 1821 || new Set(leftMembers.map(member => member.segment_key)).size !== 1821) errors.push('ceriziers_coverage');
if (rightMembers.length !== 1895 || new Set(rightMembers.map(member => member.segment_key)).size !== 1895) errors.push('mirandol_coverage');
if (members.some(member => member.segment_key.endsWith('CER-B05-D08-U001-POEM:s037'))) errors.push('false_PRO');
if (groups.some(group => group.left_text.includes('inso¬') || group.left_text === 'PRO')) errors.push('text_corruption');
if (groups.some(group => group.status === 'validated_human')) errors.push('validated_human');
for (const key of divisionOrder) {
  const divisionGroups = groups.filter(group => group.division_key === key);
  for (const side of ['left', 'right']) {
    const numbers = members.filter(member => member.side === side && divisionGroups.some(group => group.alignment_id === member.alignment_id)).map(member => member.segment_numero);
    if (numbers.some((number, index) => index && number <= numbers[index - 1])) errors.push(`non_monotonic:${key}:${side}`);
  }
}
const targetPrevious = groups.find(group => group.division_key === 'LIVRE QUATRIÈME|XIII' && group.right_text.includes('une mauvaise fortune'));
const targetFollowing = groups.find(group => group.division_key === 'LIVRE QUATRIÈME|XIII' && group.right_text.includes('Veux-tu que je me rapproche'));
if (targetPrevious?.right_text.includes('Veux-tu que je me rapproche')) errors.push('IV_XIII_question_previous');
if (!targetFollowing?.left_text.includes('Ie suis contente de m’accommoder') || !targetFollowing?.right_text.includes('Comme tu voudras')) errors.push('IV_XIII_question_not_following');
const sizeExceptions = groups.filter(group => group.exception_to_size_rule);
if (sizeExceptions.length !== 1 || sizeExceptions[0].division_key !== 'LIVRE QUATRIÈME|XIII'
    || sizeExceptions[0].left_count !== 1 || sizeExceptions[0].right_count !== 6) {
  errors.push('size_exception_not_exactly_IV_XIII_1_6');
}
if (errors.length) throw new Error(`Tests bloquants : ${errors.join(', ')}`);

const types = ['1:1', '1:n', 'n:1', 'n:m', '1:0', '0:1'];
const leftSizes = groups.map(group => group.left_count).sort((a, b) => a - b);
const rightSizes = groups.map(group => group.right_count).sort((a, b) => a - b);
const totalSizes = groups.map(group => group.left_count + group.right_count).sort((a, b) => a - b);
const coverage = {
  status: 'PASS', alignment_set_code: SET_ID, canonical_divisions: 78,
  groups: groups.length, members: members.length,
  ceriziers_scope_segments_covered_exactly_once: leftMembers.length,
  mirandol_scope_segments_covered_exactly_once: rightMembers.length,
  cardinalities: Object.fromEntries(types.map(type => [type, groups.filter(group => group.cardinality === type).length])),
  mean_left_members: Number((leftMembers.length / groups.length).toFixed(4)),
  mean_right_members: Number((rightMembers.length / groups.length).toFixed(4)),
  median_left_members: leftSizes[Math.floor(leftSizes.length / 2)],
  median_right_members: rightSizes[Math.floor(rightSizes.length / 2)],
  median_total_members: totalSizes[Math.floor(totalSizes.length / 2)],
  max_left_members: Math.max(...leftSizes), max_right_members: Math.max(...rightSizes),
  exceptions_to_size_rule: exceptionRows.length, uncertain_groups: uncertainRows.length,
  groups_over_10_members: groups.filter(group => group.left_count + group.right_count > 10).length,
  first_poem_groups: groups.filter(group => group.book_number === 1 && group.division_roman === 'I').length,
  crossings: 0, groups_crossing_divisions: 0, duplicate_members: 0, omitted_segments_without_gap: 0,
  false_PRO_members: 0, validated_human: 0, mandatory_boundary_IV_XIII: 'PASS',
};
const alignmentSet = {
  alignment_set_code: SET_ID, alignment_set_id: SET_ID, id_oeuvre: 'A0064O0001',
  left_text_id: CER_TEXT, right_text_id: MIR_TEXT, reference_text_id: MIR_TEXT, aligned_text_id: CER_TEXT,
  alignment_level: 'segment', method: 'semantic_bilingual_continuous_review_claude_local_candidates_then_codex_controls_v3',
  status: 'reviewed_ai', is_public: false,
  description: 'Alignement privé fin Ceriziers 1646–Mirandol 1861 ; limites non certaines conservées comme uncertain.',
  metadata: { canonical_divisions: 78, candidate_layer_groups: 540, final_groups: groups.length, uncertain_groups: uncertainRows.length, exceptions: exceptionRows.length, validated_human: false },
};
writeJson('ceriziers_mirandol_alignment_set_corrige.json', alignmentSet);
writeJson('ceriziers_mirandol_alignment_groups_corriges.json', groups);
writeJson('ceriziers_mirandol_alignment_members_corriges.json', members);
writeJson('ceriziers_mirandol_alignment_divisions_corrigees.json', divisionRows);
writeJson('ceriziers_mirandol_alignment_coverage_corrige.json', coverage);
writeCsv('ceriziers_mirandol_alignment_groups_corriges.csv', groups, ['alignment_group_code','alignment_set_code','group_order','book_number','canonical_division_order','division_roman','division_key','division_kind','local_order','cardinality','left_count','right_count','confidence','review_status','exception_to_size_rule','method','justification','left_text','right_text','metrics']);
writeCsv('ceriziers_mirandol_alignment_members_corriges.csv', members, ['alignment_id','alignment_group_code','alignment_set_code','role','side','member_order','id_texte','segment_id','segment_key','segment_numero']);
writeCsv('ceriziers_mirandol_alignment_boundary_review.csv', boundaryRows, ['alignment_group_code','book_number','division_roman','local_order','previous_group','next_group','cardinality','left_count','right_count','status','confidence','exception_to_size_rule','previous_left_excerpt','previous_right_excerpt','next_left_excerpt','next_right_excerpt','justification']);
writeCsv('ceriziers_mirandol_alignment_exceptions.csv', exceptionRows, ['alignment_group_code','book_number','division_roman','local_order','cardinality','left_count','right_count','status','exception_to_size_rule','justification']);
let uncertain = '# Limites incertaines de l’alignement corrigé\n\n';
uncertain += 'Ces limites restent volontairement `uncertain`. Elles assurent une couverture unique, consécutive et monotone, sans revendiquer de validation humaine.\n\n';
for (const row of uncertainRows) uncertain += `- **${row.alignment_group_code}** — livre ${row.book_number}, division ${row.division_roman} : ${row.justification}\n`;
fs.writeFileSync(path.join(options.data, 'ceriziers_mirandol_alignment_uncertain_corrige.md'), uncertain, 'utf8');
console.log(JSON.stringify(coverage, null, 2));
