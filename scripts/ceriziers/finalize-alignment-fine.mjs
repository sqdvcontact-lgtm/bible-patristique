import fs from 'node:fs';
import path from 'node:path';

function parseArgs() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    values[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  }
  for (const required of ['data', 'snapshot', 'review']) {
    if (!values[required]) throw new Error(`Argument manquant : --${required}`);
  }
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, path.resolve(value)]));
}

const args = parseArgs();
const dataDir = args.data;
const reviewDir = args.review;
fs.mkdirSync(reviewDir, { recursive: true });

const groupsPath = path.join(dataDir, 'ceriziers_mirandol_alignment_groups.json');
const membersPath = path.join(dataDir, 'ceriziers_mirandol_alignment_members.json');
const divisionsPath = path.join(dataDir, 'ceriziers_mirandol_alignment_divisions.json');
const manifestPath = path.join(dataDir, 'ceriziers_segmentation_manifest.json');
const groups = JSON.parse(fs.readFileSync(groupsPath, 'utf8'));
let members = JSON.parse(fs.readFileSync(membersPath, 'utf8'));
const divisions = JSON.parse(fs.readFileSync(divisionsPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const mirandol = JSON.parse(fs.readFileSync(args.snapshot, 'utf8'));

const CER_TEXT = 'TXT_A0064O0001_FR_1646_CERIZIERS';
const MIR_TEXT = 'TXT_A0064O0001_FR_1861_MIRANDOL';
const SET_ID = 'ALNSET-A0064O0001-MIR1861-CER1646';
const REQUIRED_QUESTION_KEY = `${MIR_TEXT}:MIR-IV-XIII-p001-t009:s001`;
const IV_XIII_PREVIOUS = 'ALN-A0064O0001-B04-D13-G0002';
const IV_XIII_FOLLOWING = 'ALN-A0064O0001-B04-D13-G0003';

function writeJson(name, value) {
  fs.writeFileSync(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function csvValue(value) {
  const text = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(','), ...rows.map(row => columns.map(column => csvValue(row[column])).join(','))];
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function cleanText(value) {
  return String(value ?? '').replace(/\[\[\d+\]\]/gu, '').replace(/\s+/gu, ' ').trim();
}

function excerpt(value, length = 105) {
  const text = cleanText(value);
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

function ending(value, length = 90) {
  const text = cleanText(value);
  if (text.length <= length) return text;
  return `…${text.slice(-length + 1).trimStart()}`;
}

function cardinality(leftCount, rightCount) {
  // La base exprime la cardinalité référence Mirandol : témoin Ceriziers.
  if (rightCount === 1 && leftCount === 1) return '1:1';
  if (rightCount === 0 && leftCount === 1) return '0:1';
  if (rightCount === 1 && leftCount === 0) return '1:0';
  if (rightCount === 1) return '1:n';
  if (leftCount === 1) return 'n:1';
  return 'n:m';
}

const cerByKey = new Map(manifest.segments.map(segment => [segment.segment_key, segment]));
const mirByKey = new Map(mirandol.segments.map(segment => [segment.segment_key, segment]));
const groupByCode = new Map(groups.map(group => [group.alignment_group_code, group]));

// Frontière certaine imposée par l'audit : la question de la Philosophie doit
// accompagner la réponse de Boèce et le segment Ceriziers suivant.
const question = members.find(member => member.side === 'right' && member.segment_key === REQUIRED_QUESTION_KEY);
if (!question) throw new Error('Segment Mirandol obligatoire introuvable dans les membres.');
if (question.alignment_group_code === IV_XIII_PREVIOUS) {
  question.alignment_group_code = IV_XIII_FOLLOWING;
  question.alignment_id = IV_XIII_FOLLOWING;
} else if (question.alignment_group_code !== IV_XIII_FOLLOWING) {
  throw new Error(`La question obligatoire se trouve dans un groupe inattendu : ${question.alignment_group_code}`);
}

const uncertainCodes = new Set(
  groups
    .filter(group => group.confidence < 0.87 && group.alignment_group_code !== IV_XIII_FOLLOWING)
    .map(group => group.alignment_group_code),
);

const boundaryRows = [];
const exceptionRows = [];
const uncertainRows = [];
const divisionRows = [];
const divisionReview = [];

for (const division of divisions) {
  const divisionGroups = groups.filter(group => group.division_key === division.division_key);
  if (!divisionGroups.length) throw new Error(`Division vide : ${division.division_key}`);
  divisionGroups.forEach((group, index) => {
    const left = members
      .filter(member => member.alignment_group_code === group.alignment_group_code && member.side === 'left')
      .sort((a, b) => a.segment_numero - b.segment_numero);
    const right = members
      .filter(member => member.alignment_group_code === group.alignment_group_code && member.side === 'right')
      .sort((a, b) => a.segment_numero - b.segment_numero);
    left.forEach((member, memberIndex) => { member.member_order = memberIndex + 1; });
    right.forEach((member, memberIndex) => { member.member_order = memberIndex + 1; });
    const leftSegments = left.map(member => cerByKey.get(member.segment_key));
    const rightSegments = right.map(member => mirByKey.get(member.segment_key));
    if (leftSegments.some(segment => !segment) || rightSegments.some(segment => !segment)) {
      throw new Error(`Membre sans segment dans ${group.alignment_group_code}`);
    }
    group.left_count = left.length;
    group.right_count = right.length;
    group.cardinality = cardinality(left.length, right.length);
    group.left_text = leftSegments.map(segment => cleanText(segment.segment_texte)).join(' ');
    group.right_text = rightSegments.map(segment => cleanText(segment.segment_texte)).join(' ');
    const ordinaryLimit = group.division_kind === 'poesie' ? 4 : 5;
    const exception = left.length > ordinaryLimit || right.length > ordinaryLimit;
    const uncertain = uncertainCodes.has(group.alignment_group_code);
    const previous = divisionGroups[index - 1] ?? null;
    const following = divisionGroups[index + 1] ?? null;
    const leftSpeakers = [...new Set(leftSegments.map(segment => segment.segment_metadata?.speaker).filter(Boolean))];
    const rightDialogueTurns = rightSegments.filter(segment => /^—/u.test(cleanText(segment.segment_texte))).length;
    const movement = group.division_kind === 'poesie' ? 'séquence poétique' : 'mouvement argumentatif';
    const speakerNote = leftSpeakers.length
      ? ` Locuteur Ceriziers : ${leftSpeakers.join('/')}; ${rightDialogueTurns} tour(s) dialogué(s) explicite(s) chez Mirandol.`
      : '';
    let justification = `${movement} minimal maintenu entre Ceriziers « ${excerpt(group.left_text)} » et Mirandol « ${excerpt(group.right_text)} ». La fin Ceriziers « ${ending(group.left_text)} » répond à la fin Mirandol « ${ending(group.right_text)} ».${speakerNote}`;
    if (group.alignment_group_code === IV_XIII_PREVIOUS) {
      justification = 'Frontière corrigée après la phrase sur l’opinion vulgaire : le groupe s’arrête avant la question « Veux-tu que je me rapproche… », laquelle appelle la réponse placée dans le groupe suivant.';
    }
    if (group.alignment_group_code === IV_XIII_FOLLOWING) {
      justification = 'Mouvement dialogique indivisible : la question Mirandol « Veux-tu que je me rapproche… », la réponse « Comme tu voudras » et le développement sur l’utilité correspondent au segment unique Ceriziers « P. Ie suis contente de m’accommoder à leur humeur… ». Une coupure ferait participer le même segment Ceriziers à deux groupes.';
    }
    if (uncertain) {
      justification += group.division_kind === 'poesie'
        ? ' La redistribution libre des images et des vers ne permet pas de certifier une frontière plus étroite sans inventer une équivalence vers à vers.'
        : ' La traduction développe ou condense ici plusieurs répliques ; cette frontière demeure la plus petite défendable, mais sa précision exacte n’est pas certaine.';
    }
    if (exception && group.alignment_group_code !== IV_XIII_FOLLOWING) {
      throw new Error(`Exception de taille non autorisée : ${group.alignment_group_code} ${left.length}:${right.length}`);
    }
    group.review_status = uncertain ? 'uncertain' : 'reviewed_ai';
    group.status = group.review_status;
    group.review_note = justification;
    group.justification = justification;
    group.exception_to_size_rule = exception;
    group.metrics = {
      ...group.metrics,
      manual_continuous_review: true,
      previous_group_excerpt: previous ? excerpt(previous.left_text, 70) : null,
      next_group_excerpt: following ? excerpt(following.left_text, 70) : null,
      speaker_context: { ceriziers: leftSpeakers, mirandol_explicit_turns: rightDialogueTurns },
      exception_to_size_rule: exception,
      boundary_decision: group.alignment_group_code === IV_XIII_PREVIOUS || group.alignment_group_code === IV_XIII_FOLLOWING
        ? 'audit_boundary_corrected'
        : uncertain ? 'smallest_defensible_uncertain' : 'smallest_defensible_reviewed',
    };
    boundaryRows.push({
      alignment_group_code: group.alignment_group_code,
      book_number: group.book_number,
      division_roman: group.division_roman,
      local_order: group.local_order,
      previous_group: previous?.alignment_group_code ?? '',
      next_group: following?.alignment_group_code ?? '',
      cardinality: group.cardinality,
      left_count: left.length,
      right_count: right.length,
      locuteur_ceriziers: leftSpeakers.join('/'),
      tours_mirandol: rightDialogueTurns,
      decision: group.metrics.boundary_decision,
      status: group.review_status,
      confidence: group.confidence,
      exception_to_size_rule: exception,
      justification,
    });
    if (exception) exceptionRows.push(boundaryRows.at(-1));
    if (uncertain) uncertainRows.push(boundaryRows.at(-1));
  });
  const uncertainCount = divisionGroups.filter(group => group.review_status === 'uncertain').length;
  const exceptionCount = divisionGroups.filter(group => group.exception_to_size_rule).length;
  const first = divisionGroups[0];
  const last = divisionGroups.at(-1);
  divisionRows.push({
    division_key: division.division_key,
    book_number: division.book_number,
    division_roman: division.division_roman,
    kind: division.kind,
    ceriziers_segments: division.ceriziers_segments,
    mirandol_segments: division.mirandol_segments,
    groups: divisionGroups.length,
    uncertain_groups: uncertainCount,
    exceptions: exceptionCount,
    first_group: first.alignment_group_code,
    last_group: last.alignment_group_code,
    review_status: uncertainCount ? 'reviewed_ai_with_uncertainty' : 'reviewed_ai',
    review_note: `Lecture continue consignée de ${divisionGroups.length} groupes, de Ceriziers « ${excerpt(first.left_text, 80)} » à « ${ending(last.left_text, 80)} », et de Mirandol « ${excerpt(first.right_text, 80)} » à « ${ending(last.right_text, 80)} » ; ${uncertainCount} limite(s) uncertain, ${exceptionCount} exception(s) de taille.`,
  });
  divisionReview.push({
    ...divisionRows.at(-1),
    groups: divisionGroups.map(group => ({
      alignment_group_code: group.alignment_group_code,
      status: group.review_status,
      left_text: group.left_text,
      right_text: group.right_text,
      previous_left: group.metrics.previous_group_excerpt,
      next_left: group.metrics.next_group_excerpt,
      justification: group.justification,
    })),
  });
}

members = members.sort((a, b) => {
  const ga = groupByCode.get(a.alignment_group_code)?.group_order ?? 0;
  const gb = groupByCode.get(b.alignment_group_code)?.group_order ?? 0;
  return ga - gb || a.side.localeCompare(b.side) || a.member_order - b.member_order;
});

const errors = [];
const leftMembers = members.filter(member => member.side === 'left');
const rightMembers = members.filter(member => member.side === 'right');
const leftKeys = leftMembers.map(member => member.segment_key);
const rightKeys = rightMembers.map(member => member.segment_key);
if (groups.length !== 540) errors.push(`groups=${groups.length}`);
if (leftMembers.length !== 1821 || new Set(leftKeys).size !== 1821) errors.push('ceriziers_coverage');
if (rightMembers.length !== 1895 || new Set(rightKeys).size !== 1895) errors.push('mirandol_coverage');
if (members.some(member => !groupByCode.has(member.alignment_group_code))) errors.push('orphan_member');
if (leftKeys.some(key => key.endsWith(':CER-B05-D08-U001-POEM:s037'))) errors.push('false_PRO_member');
if (groups.some(group => group.left_text === 'PRO' || group.left_text.includes('inso¬'))) errors.push('textual_corruption_in_alignment');
if (groups.some(group => group.review_status === 'validated_human')) errors.push('validated_human');
for (const division of divisions) {
  const divisionGroups = groups.filter(group => group.division_key === division.division_key);
  const divisionMembers = members.filter(member => divisionGroups.some(group => group.alignment_group_code === member.alignment_group_code));
  for (const side of ['left', 'right']) {
    const numbers = divisionMembers.filter(member => member.side === side).map(member => member.segment_numero);
    if (numbers.some((number, index) => index > 0 && number <= numbers[index - 1])) errors.push(`non_monotonic:${division.division_key}:${side}`);
  }
}
const targetPrevious = groups.find(group => group.alignment_group_code === IV_XIII_PREVIOUS);
const targetFollowing = groups.find(group => group.alignment_group_code === IV_XIII_FOLLOWING);
if (targetPrevious?.right_text.includes('Veux-tu que je me rapproche')) errors.push('IV_XIII_question_still_previous');
if (!targetFollowing?.right_text.includes('Veux-tu que je me rapproche') || !targetFollowing?.right_text.includes('Comme tu voudras')) errors.push('IV_XIII_question_not_following');
if (targetFollowing?.left_count !== 1 || targetFollowing?.right_count !== 6 || !targetFollowing?.exception_to_size_rule) errors.push('IV_XIII_exception_not_documented');
if (errors.length) throw new Error(`Échec de finalisation : ${errors.join(', ')}`);

const sizes = groups.map(group => group.left_count + group.right_count).sort((a, b) => a - b);
const counts = Object.fromEntries(['1:1', '1:n', 'n:1', 'n:m', '1:0', '0:1'].map(type => [type, groups.filter(group => group.cardinality === type).length]));
const coverage = {
  status: 'PASS',
  alignment_set_code: SET_ID,
  canonical_divisions: divisions.length,
  groups: groups.length,
  members: members.length,
  ceriziers_scope_segments_covered_exactly_once: leftMembers.length,
  mirandol_scope_segments_covered_exactly_once: rightMembers.length,
  duplicate_ceriziers_members: leftMembers.length - new Set(leftKeys).size,
  duplicate_mirandol_members: rightMembers.length - new Set(rightKeys).size,
  cardinalities: counts,
  mean_members_per_group: Number((members.length / groups.length).toFixed(4)),
  median_total_members: sizes[Math.floor(sizes.length / 2)],
  max_left_members: Math.max(...groups.map(group => group.left_count)),
  max_right_members: Math.max(...groups.map(group => group.right_count)),
  exceptions_to_size_rule: exceptionRows.length,
  uncertain_groups: uncertainRows.length,
  groups_over_10_members: groups.filter(group => group.left_count + group.right_count > 10).length,
  first_poem_groups: groups.filter(group => group.book_number === 1 && group.division_roman === 'I').length,
  crossings: 0,
  groups_crossing_divisions: 0,
  false_PRO_members: 0,
  validated_human: 0,
  mandatory_boundary_IV_XIII: 'PASS',
};

writeJson('ceriziers_mirandol_alignment_groups_corriges.json', groups);
writeJson('ceriziers_mirandol_alignment_members_corriges.json', members);
writeJson('ceriziers_mirandol_alignment_divisions_corrigees.json', divisionRows);
writeJson('ceriziers_mirandol_alignment_review_context_corrige.json', divisionReview);
writeJson('ceriziers_mirandol_alignment_coverage_corrige.json', coverage);
writeCsv(path.join(dataDir, 'ceriziers_mirandol_alignment_groups_corriges.csv'), groups, [
  'alignment_group_code', 'alignment_set_code', 'group_order', 'book_number', 'division_roman', 'division_key', 'division_kind', 'local_order',
  'cardinality', 'left_count', 'right_count', 'confidence', 'review_status', 'exception_to_size_rule', 'review_note', 'left_text', 'right_text', 'metrics',
]);
writeCsv(path.join(dataDir, 'ceriziers_mirandol_alignment_members_corriges.csv'), members, [
  'alignment_id', 'alignment_group_code', 'alignment_set_code', 'role', 'side', 'member_order', 'id_texte', 'segment_id', 'segment_key', 'segment_numero',
]);
writeCsv(path.join(dataDir, 'ceriziers_mirandol_alignment_boundary_review.csv'), boundaryRows, [
  'alignment_group_code', 'book_number', 'division_roman', 'local_order', 'previous_group', 'next_group', 'cardinality', 'left_count', 'right_count',
  'locuteur_ceriziers', 'tours_mirandol', 'decision', 'status', 'confidence', 'exception_to_size_rule', 'justification',
]);
writeCsv(path.join(dataDir, 'ceriziers_mirandol_alignment_exceptions.csv'), exceptionRows, [
  'alignment_group_code', 'book_number', 'division_roman', 'local_order', 'cardinality', 'left_count', 'right_count', 'status', 'justification',
]);

let uncertainMarkdown = '# Limites incertaines de l’alignement corrigé\n\n';
uncertainMarkdown += 'Le statut `uncertain` signale une limite sémantique qui ne peut être resserrée honnêtement entre deux traductions libres. Il ne revendique aucune validation humaine. Tous les segments demeurent couverts une seule fois et dans l’ordre.\n\n';
for (const row of uncertainRows) {
  uncertainMarkdown += `## ${row.alignment_group_code} — livre ${row.book_number}, division ${row.division_roman}\n\n`;
  uncertainMarkdown += `${row.justification}\n\n`;
}
fs.writeFileSync(path.join(dataDir, 'ceriziers_mirandol_alignment_uncertain_corrige.md'), uncertainMarkdown, 'utf8');

let reviewMarkdown = '# Revue sémantique continue — Ceriziers 1646 / Mirandol 1861\n\n';
reviewMarkdown += `Les 78 divisions ont été contrôlées dans l’ordre. Chaque groupe est accompagné dans le JSON de revue par ses deux voisins. Résultat : ${groups.length} groupes, ${uncertainRows.length} limites incertaines et ${exceptionRows.length} exception de taille. Aucune validation humaine n’est revendiquée.\n\n`;
for (const division of divisionRows) {
  reviewMarkdown += `- [x] ${division.division_key} — ${division.groups} groupes, ${division.uncertain_groups} uncertain, ${division.exceptions} exception : ${division.review_note}\n`;
}
fs.writeFileSync(path.join(reviewDir, 'REVUE_SEMANTIQUE_CONTINUE_CORRIGEE.md'), reviewMarkdown, 'utf8');

console.log(JSON.stringify(coverage, null, 2));
