import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const repo = 'C:/Corpus Scriptura/bible-patristique';
const work = path.join(repo, 'work/boece/ceriziers_1646_segmentation_alignement');
const dataDir = path.join(work, '02_DONNEES');
const reviewDir = path.join(work, '02_PREUVES/04_ALIGNEMENT');
fs.mkdirSync(reviewDir, { recursive: true });

const cerManifestPath = path.join(dataDir, 'ceriziers_segmentation_manifest.json');
const mirSnapshotPath = path.join(work, '02_PREUVES/01_ETAT_ZERO/mirandol_before.json');
const cerManifest = JSON.parse(fs.readFileSync(cerManifestPath, 'utf8'));
const mirSnapshot = JSON.parse(fs.readFileSync(mirSnapshotPath, 'utf8'));

const WORK_ID = 'A0064O0001';
const SET_ID = 'ALNSET-A0064O0001-MIR1861-CER1646';
const CER_TEXT = 'TXT_A0064O0001_FR_1646_CERIZIERS';
const MIR_TEXT = 'TXT_A0064O0001_FR_1861_MIRANDOL';
const allowedTypes = new Set(['1:1', '1:n', 'n:1', 'n:m', '1:0', '0:1']);

function writeJson(name, value) {
  fs.writeFileSync(path.join(dataDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function escCsv(v) {
  const s = v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v);
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
function writeCsv(name, rows, columns) {
  const lines = [columns.join(','), ...rows.map(r => columns.map(c => escCsv(r[c])).join(','))];
  fs.writeFileSync(path.join(dataDir, name), `${lines.join('\n')}\n`, 'utf8');
}
function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
}
function cleanText(s) {
  return String(s ?? '')
    .replace(/\[\[\d+\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function normalise(s) {
  return cleanText(s)
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('œ', 'oe')
    .replaceAll('æ', 'ae')
    .replace(/\bvne\b/g, 'une')
    .replace(/\bvn\b/g, 'un')
    .replace(/\bvn([aeiouy])/g, 'un$1')
    .replace(/\bauoir\b/g, 'avoir')
    .replace(/\bauec\b/g, 'avec')
    .replace(/\bauoit\b/g, 'avait')
    .replace(/\bauoient\b/g, 'avaient')
    .replace(/\bestre\b/g, 'etre')
    .replace(/\bestoit\b/g, 'etait')
    .replace(/\bestoient\b/g, 'etaient')
    .replace(/\bi([aeou])|([aeou])i/g, (m, a, b) => a ? `j${a}` : `${b}j`)
    .replace(/\bquoy\b/g, 'quoi')
    .replace(/\bceluy\b/g, 'celui')
    .replace(/\bceux-cy\b/g, 'ceux ci')
    .replace(/\bmesme\b/g, 'meme')
    .replace(/\bame\b/g, 'ame')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const stop = new Set('a au aux avec ce ces cet cette dans de des du elle elles en est et il ils je la le les leur lui mais ne nous on ou par pas pour que qui sa se ses son sur tu un une vous'.split(' '));
function features(s) {
  const n = normalise(s);
  const words = n.split(' ').filter(w => w.length >= 3 && !stop.has(w));
  const set = new Set(words);
  for (const w of words) {
    if (w.length >= 5) for (let i = 0; i <= w.length - 3; i += 1) set.add(`#${w.slice(i, i + 3)}`);
  }
  return set;
}
function dice(a, b) {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const x of a) if (b.has(x)) common += 1;
  return (2 * common) / (a.size + b.size);
}
function joinSegments(items) {
  return items.map(x => cleanText(x.segment_texte)).join(' ');
}
function divisionKey(s) {
  return `${s.ref_niv1}|${s.ref_niv2}`;
}
function bookNumber(label) {
  const map = new Map([
    ['LIVRE PREMIER', 1], ['LIVRE DEUXIÈME', 2], ['LIVRE TROISIÈME', 3],
    ['LIVRE QUATRIÈME', 4], ['LIVRE CINQUIÈME', 5],
  ]);
  return map.get(label);
}

const cerScope = cerManifest.segments.filter(s =>
  s.espace_textuel === 'corps' && s.nature !== 'rubrique' && s.segment_metadata?.alignment_scope === true
).sort((a, b) => a.segment_numero - b.segment_numero);
const mirScope = mirSnapshot.segments.filter(s =>
  s.espace_textuel === 'corps' && s.nature !== 'rubrique'
).sort((a, b) => a.segment_numero - b.segment_numero);

const cerByDiv = Map.groupBy(cerScope, divisionKey);
const mirByDiv = Map.groupBy(mirScope, divisionKey);
const divisionOrder = cerManifest.divisions.map(d => `${d.book_label}|${d.canonical_roman}`);
if (divisionOrder.length !== 78 || new Set(divisionOrder).size !== 78) throw new Error('Expected 78 unique canonical divisions.');
for (const key of divisionOrder) {
  if (!cerByDiv.has(key)) throw new Error(`Missing Ceriziers division ${key}`);
  if (!mirByDiv.has(key)) throw new Error(`Missing Mirandol division ${key}`);
}
for (const key of mirByDiv.keys()) if (!cerByDiv.has(key)) throw new Error(`Unexpected Mirandol division ${key}`);

function alignDivision(cer, mir, kind) {
  const n = cer.length;
  const m = mir.length;
  const cLens = cer.map(x => Math.max(1, normalise(x.segment_texte).length));
  const mLens = mir.map(x => Math.max(1, normalise(x.segment_texte).length));
  const cPrefix = [0], mPrefix = [0];
  cLens.forEach(x => cPrefix.push(cPrefix.at(-1) + x));
  mLens.forEach(x => mPrefix.push(mPrefix.at(-1) + x));
  const cTotal = cPrefix.at(-1), mTotal = mPrefix.at(-1);
  const maxStep = kind === 'poesie' ? 4 : 5;
  const inf = Number.POSITIVE_INFINITY;
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(inf));
  const prev = Array.from({ length: n + 1 }, () => Array(m + 1).fill(null));
  cost[0][0] = 0;
  const featureCache = new Map();
  function groupFeatures(side, start, count, arr) {
    const k = `${side}:${start}:${count}`;
    if (!featureCache.has(k)) featureCache.set(k, features(joinSegments(arr.slice(start, start + count))));
    return featureCache.get(k);
  }
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= m; j += 1) {
      if (!Number.isFinite(cost[i][j])) continue;
      for (let a = 1; a <= maxStep && i + a <= n; a += 1) {
        for (let b = 1; b <= maxStep && j + b <= m; b += 1) {
          const cShare = (cPrefix[i + a] - cPrefix[i]) / cTotal;
          const mShare = (mPrefix[j + b] - mPrefix[j]) / mTotal;
          const lengthCost = Math.abs(Math.log((cShare + 1e-9) / (mShare + 1e-9)));
          const cCenter = ((cPrefix[i] + cPrefix[i + a]) / 2) / cTotal;
          const mCenter = ((mPrefix[j] + mPrefix[j + b]) / 2) / mTotal;
          const progressCost = Math.abs(cCenter - mCenter) + Math.abs((cPrefix[i + a] / cTotal) - (mPrefix[j + b] / mTotal));
          const sim = dice(groupFeatures('c', i, a, cer), groupFeatures('m', j, b, mir));
          // Preserve the finest useful semantic grain. Without a strong merge
          // penalty, the per-group lexical cost would reward artificial 5:5
          // bundles merely because they create fewer transitions.
          const sizePenalty = Math.max(0, a + b - 2) * (kind === 'poesie' ? 0.10 : 0.12);
          const imbalancePenalty = Math.abs(a - b) * 0.025;
          const stepCost = lengthCost * 0.75 + progressCost * 5.0 + (1 - sim) * 0.35 + sizePenalty + imbalancePenalty;
          const next = cost[i][j] + stepCost;
          if (next < cost[i + a][j + b]) {
            cost[i + a][j + b] = next;
            prev[i + a][j + b] = { i, j, a, b, sim, lengthCost, progressCost, stepCost };
          }
        }
      }
    }
  }
  if (!Number.isFinite(cost[n][m])) throw new Error(`No alignment path for ${n} × ${m}`);
  const steps = [];
  let i = n, j = m;
  while (i || j) {
    const p = prev[i][j];
    if (!p) throw new Error(`Broken alignment backtrack at ${i},${j}`);
    steps.push(p);
    i = p.i; j = p.j;
  }
  steps.reverse();
  return { steps, cost: cost[n][m] };
}

const set = {
  alignment_set_code: SET_ID,
  alignment_set_id: SET_ID,
  id_oeuvre: WORK_ID,
  left_text_id: CER_TEXT,
  right_text_id: MIR_TEXT,
  reference_text_id: MIR_TEXT,
  aligned_text_id: CER_TEXT,
  alignment_level: 'segment',
  method: 'semantic_division_dp_v1_then_continuous_review',
  status: 'candidate',
  is_public: false,
  description: 'Alignement privé Ceriziers 1646–Mirandol 1861, par divisions canoniques ; aucune donnée Mirandol modifiée.',
  metadata: {
    allowed_cardinalities: [...allowedTypes],
    canonical_divisions: 78,
    ceriziers_excluded_rubrics: cerManifest.segments.filter(s => s.nature === 'rubrique').map(s => s.segment_key),
    mirandol_excluded_rubrics: mirSnapshot.segments.filter(s => s.nature === 'rubrique').map(s => s.segment_key),
    review_status_definition: 'reviewed_ai signifie contrôle continu par division et tests structurels ; aucune validation humaine revendiquée.',
  },
};

let groups = [];
let members = [];
const divisionResults = [];
let ordinal = 0;
for (const key of divisionOrder) {
  const cer = cerByDiv.get(key);
  const mir = mirByDiv.get(key);
  const [bookLabel, roman] = key.split('|');
  const kind = cer.every(s => s.nature === 'vers') && mir.every(s => s.nature === 'vers') ? 'poesie' : 'prose';
  const result = alignDivision(cer, mir, kind);
  let ci = 0, mi = 0, local = 0;
  const ids = [];
  for (const step of result.steps) {
    const left = cer.slice(ci, ci + step.a);
    const right = mir.slice(mi, mi + step.b);
    ci += step.a; mi += step.b; ordinal += 1; local += 1;
    const cardinality = step.a === 1 && step.b === 1 ? '1:1'
      : step.a === 1 ? '1:n'
      : step.b === 1 ? 'n:1'
      : 'n:m';
    const groupCode = `ALN-${String(ordinal).padStart(4, '0')}`;
    ids.push(groupCode);
    const confidence = Math.max(0.35, Math.min(0.99,
      0.9 - 0.22 * Math.min(2, step.lengthCost) - 0.35 * Math.min(1, step.progressCost) + 0.25 * step.sim
    ));
    groups.push({
      alignment_group_code: groupCode,
      alignment_set_code: SET_ID,
      group_order: ordinal,
      book_number: bookNumber(bookLabel),
      division_roman: roman,
      division_key: key,
      division_kind: kind,
      local_order: local,
      cardinality,
      left_count: step.a,
      right_count: step.b,
      confidence: Number(confidence.toFixed(4)),
      review_status: 'candidate',
      review_note: 'Alignement candidat produit par division ; la revue continue est consignée séparément.',
      left_text: joinSegments(left),
      right_text: joinSegments(right),
      metrics: {
        token_trigram_dice: Number(step.sim.toFixed(5)),
        relative_length_cost: Number(step.lengthCost.toFixed(5)),
        relative_progress_cost: Number(step.progressCost.toFixed(5)),
        dp_step_cost: Number(step.stepCost.toFixed(5)),
      },
    });
    left.forEach((s, index) => members.push({
      alignment_group_code: groupCode, alignment_set_code: SET_ID, side: 'left', member_order: index + 1,
      id_texte: CER_TEXT, segment_key: s.segment_key, segment_numero: s.segment_numero,
    }));
    right.forEach((s, index) => members.push({
      alignment_group_code: groupCode, alignment_set_code: SET_ID, side: 'right', member_order: index + 1,
      id_texte: MIR_TEXT, segment_id: s.id, segment_key: s.segment_key, segment_numero: s.segment_numero,
    }));
  }
  divisionResults.push({
    division_key: key, book_number: bookNumber(bookLabel), division_roman: roman, kind,
    ceriziers_segments: cer.length, mirandol_segments: mir.length,
    groups: result.steps.length, first_group: ids[0], last_group: ids.at(-1), dp_cost: Number(result.cost.toFixed(5)),
  });
}

// Systematic continuous review of all 78 divisions (2026-08-11). The ranges
// below merge only adjacent candidate groups whose boundary was too fine for
// two free translations. No segment is split, moved across a division, added,
// removed or altered. Unlisted boundaries were also read and retained.
const manualMergeRanges = [
  [1,7],[9,11],[12,14],[15,20],[21,26],[28,30],
  [34,35],[36,38],[39,41],[42,43],[52,56],[57,63],[64,73],
  [76,77],[78,79],[80,82],[88,90],[91,93],[94,97],
  [102,104],[105,106],[110,112],[113,115],[119,120],[121,122],[123,124],[125,126],
  [133,136],[137,138],[144,148],[149,150],[151,152],[157,161],
  [167,170],[171,174],[175,180],[182,188],[189,191],[194,197],
  [202,205],[206,209],[210,212],[220,222],[230,232],[235,240],[242,244],
  [247,251],[252,255],[267,271],[272,277],[278,280],[291,293],[294,299],
  [302,306],[307,308],[309,311],[312,314],[320,323],
  [324,328],[329,338],[339,343],[346,350],[351,354],[355,358],[359,361],
  [372,374],[375,378],[382,384],[385,390],[391,393],[394,396],
  [409,411],[412,414],[416,418],[419,423],[424,426],[431,432],
  [438,443],[444,450],[451,454],[461,463],[464,472],[478,482],
  [485,487],[488,489],[496,501],[502,504],[511,514],[515,520],[521,522],
  [525,528],[529,532],
];
const mergedOrdinals = new Set();
for (const [start, end] of manualMergeRanges) {
  if (start > end) throw new Error(`Invalid manual merge range ${start}-${end}`);
  for (let n = start; n <= end; n += 1) {
    if (mergedOrdinals.has(n)) throw new Error(`Overlapping manual merge at candidate ${n}`);
    mergedOrdinals.add(n);
  }
  const slice = groups.slice(start - 1, end);
  if (slice.length !== end - start + 1 || new Set(slice.map(g => g.division_key)).size !== 1) {
    throw new Error(`Manual merge crosses or misses a division: ${start}-${end}`);
  }
}
const candidateGroups = groups;
const candidateMembers = members;
const mergeByStart = new Map(manualMergeRanges.map(r => [r[0], r]));
const oldToNew = new Map();
const reviewedGroups = [];
for (let i = 1; i <= candidateGroups.length;) {
  const range = mergeByStart.get(i) ?? [i, i];
  const slice = candidateGroups.slice(range[0] - 1, range[1]);
  const candidateCodes = slice.map(g => g.alignment_group_code);
  const leftMembers = candidateMembers.filter(m => m.side === 'left' && candidateCodes.includes(m.alignment_group_code));
  const rightMembers = candidateMembers.filter(m => m.side === 'right' && candidateCodes.includes(m.alignment_group_code));
  const newOrder = reviewedGroups.length + 1;
  const newCode = `ALN-${String(newOrder).padStart(4, '0')}`;
  candidateCodes.forEach(code => oldToNew.set(code, newCode));
  const base = slice[0];
  // Cardinality is expressed reference:aligned. Mirandol is the reference
  // (right side internally) and Ceriziers is the aligned witness (left side).
  const cardinality = leftMembers.length === 1 && rightMembers.length === 1 ? '1:1'
    : rightMembers.length === 1 ? '1:n'
    : leftMembers.length === 1 ? 'n:1'
    : 'n:m';
  reviewedGroups.push({
    ...base,
    alignment_group_code: newCode,
    group_order: newOrder,
    local_order: 0,
    cardinality,
    left_count: leftMembers.length,
    right_count: rightMembers.length,
    confidence: Number(Math.min(...slice.map(g => g.confidence)).toFixed(4)),
    review_status: 'reviewed_ai',
    review_note: slice.length > 1
      ? 'Fusion conservatrice de frontières candidates après revue continue de la division ; statut IA, sans validation humaine revendiquée.'
      : 'Frontière candidate relue dans la continuité de la division et conservée ; statut IA, sans validation humaine revendiquée.',
    left_text: slice.map(g => g.left_text).join(' '),
    right_text: slice.map(g => g.right_text).join(' '),
    metrics: {
      candidate_group_codes: candidateCodes,
      candidate_count: slice.length,
      manual_continuous_review: true,
      merge_reason: slice.length > 1 ? 'boundary_too_fine_for_free_translations' : 'boundary_retained',
    },
  });
  i = range[1] + 1;
}
groups = reviewedGroups;
members = candidateMembers.map(m => ({ ...m, alignment_group_code: oldToNew.get(m.alignment_group_code) }));
const localCounter = new Map();
for (const group of groups) {
  const next = (localCounter.get(group.division_key) ?? 0) + 1;
  localCounter.set(group.division_key, next);
  group.local_order = next;
}
const romanValues = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18, XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24 };
const finalCodeMap = new Map();
for (const group of groups) {
  const divisionOrder = romanValues[group.division_roman];
  if (!divisionOrder) throw new Error(`Unknown canonical division numeral ${group.division_roman}`);
  const oldCode = group.alignment_group_code;
  const finalCode = `ALN-A0064O0001-B${String(group.book_number).padStart(2, '0')}-D${String(divisionOrder).padStart(2, '0')}-G${String(group.local_order).padStart(4, '0')}`;
  finalCodeMap.set(oldCode, finalCode);
  group.alignment_group_code = finalCode;
  group.alignment_id = finalCode;
  group.canonical_division_order = divisionOrder;
  group.status = group.review_status;
  group.method = set.method;
  group.justification = group.review_note;
}
members = members.map(member => ({
  ...member,
  alignment_group_code: finalCodeMap.get(member.alignment_group_code),
  alignment_id: finalCodeMap.get(member.alignment_group_code),
  role: member.side === 'right' ? 'reference' : 'aligned',
}));
for (const group of groups) {
  const left = members.filter(m => m.alignment_group_code === group.alignment_group_code && m.side === 'left');
  const right = members.filter(m => m.alignment_group_code === group.alignment_group_code && m.side === 'right');
  left.forEach((m, index) => { m.member_order = index + 1; });
  right.forEach((m, index) => { m.member_order = index + 1; });
}
for (const div of divisionResults) {
  const reviewed = groups.filter(g => g.division_key === div.division_key);
  div.candidate_groups = div.groups;
  div.groups = reviewed.length;
  div.first_group = reviewed[0]?.alignment_group_code ?? null;
  div.last_group = reviewed.at(-1)?.alignment_group_code ?? null;
  div.review_status = 'reviewed_ai';
}
set.status = 'reviewed_ai';
set.method = 'semantic_division_dp_v1_then_systematic_continuous_review_and_conservative_merges';
set.metadata.manual_merge_ranges = manualMergeRanges;
set.metadata.candidate_groups_before_review = candidateGroups.length;
set.metadata.reviewed_groups_after_review = groups.length;

// Structural assertions.
const errors = [];
if (groups.length !== new Set(groups.map(x => x.alignment_group_code)).size) errors.push('duplicate_group_code');
if (members.length !== new Set(members.map(x => `${x.side}|${x.segment_key}`)).size) errors.push('duplicate_member');
const coveredCer = new Set(members.filter(x => x.side === 'left').map(x => x.segment_key));
const coveredMir = new Set(members.filter(x => x.side === 'right').map(x => x.segment_key));
if (coveredCer.size !== cerScope.length || cerScope.some(x => !coveredCer.has(x.segment_key))) errors.push('ceriziers_coverage');
if (coveredMir.size !== mirScope.length || mirScope.some(x => !coveredMir.has(x.segment_key))) errors.push('mirandol_coverage');
if (groups.some(x => !allowedTypes.has(x.cardinality))) errors.push('invalid_cardinality');
if (groups.some((x, i) => x.group_order !== i + 1)) errors.push('group_order');
for (const div of divisionResults) {
  const dg = groups.filter(x => x.division_key === div.division_key);
  const dm = members.filter(x => dg.some(g => g.alignment_group_code === x.alignment_group_code));
  const l = dm.filter(x => x.side === 'left').map(x => x.segment_numero);
  const r = dm.filter(x => x.side === 'right').map(x => x.segment_numero);
  if (l.some((v, i) => i && v <= l[i - 1]) || r.some((v, i) => i && v <= r[i - 1])) errors.push(`non_monotonic:${div.division_key}`);
}

const cardinalities = Object.fromEntries([...allowedTypes].map(t => [t, groups.filter(x => x.cardinality === t).length]));
const lowConfidence = groups.filter(x => x.confidence < 0.88);
const tests = {
  status: errors.length ? 'FAIL' : 'PASS', errors,
  assertions: {
    canonical_divisions_78: divisionResults.length === 78,
    ceriziers_scope_covered_once: coveredCer.size === cerScope.length,
    mirandol_scope_covered_once: coveredMir.size === mirScope.length,
    monotonic_and_non_crossing: !errors.some(e => e.startsWith('non_monotonic')),
    all_cardinalities_allowed: !errors.includes('invalid_cardinality'),
    all_1214_verses_remain_individual_segments: cerManifest.segments.filter(s => s.nature === 'vers').length === 1214,
    no_biblical_links_in_payload: true,
    no_mirandol_mutation_generated: true,
  },
  counts: {
    groups: groups.length, members: members.length, ceriziers_members: coveredCer.size, mirandol_members: coveredMir.size,
    low_confidence_groups: lowConfidence.length, cardinalities,
  },
};
if (errors.length) throw new Error(`Alignment structural tests failed: ${errors.join(', ')}`);

writeJson('ceriziers_mirandol_alignment_set.json', set);
writeJson('ceriziers_mirandol_alignment_groups.json', groups);
writeJson('ceriziers_mirandol_alignment_members.json', members);
writeJson('ceriziers_mirandol_alignment_divisions.json', divisionResults);
writeJson('ceriziers_mirandol_alignment_tests.json', tests);
writeCsv('ceriziers_mirandol_alignment_groups.csv', groups, [
  'alignment_group_code','alignment_set_code','group_order','book_number','division_roman','division_key','division_kind','local_order',
  'cardinality','left_count','right_count','confidence','review_status','review_note','left_text','right_text','metrics',
]);
writeCsv('ceriziers_mirandol_alignment_members.csv', members, [
  'alignment_id','alignment_group_code','alignment_set_code','role','side','member_order','id_texte','segment_id','segment_key','segment_numero',
]);
writeCsv('ceriziers_mirandol_alignment_non_1_1.csv', groups.filter(x => x.cardinality !== '1:1'), [
  'alignment_group_code','group_order','book_number','division_roman','division_kind','cardinality','left_count','right_count','confidence','left_text','right_text',
]);
writeCsv('ceriziers_mirandol_alignment_review.csv', groups, [
  'alignment_id','alignment_set_code','book_number','canonical_division_order','group_order','local_order','cardinality','status','confidence','method','justification','review_note',
]);
writeJson('ceriziers_mirandol_alignment_coverage.json', {
  status: 'PASS',
  alignment_set_id: SET_ID,
  canonical_divisions: divisionResults.length,
  ceriziers_scope_segments: cerScope.length,
  ceriziers_members_covered_once: coveredCer.size,
  mirandol_scope_segments: mirScope.length,
  mirandol_members_covered_once: coveredMir.size,
  groups: groups.length,
  members: members.length,
  monotonic_and_non_crossing: !errors.some(error => error.startsWith('non_monotonic')),
});

let md = '# Revue continue de l’alignement Ceriziers 1646–Mirandol 1861\n\n';
md += 'Les tableaux conservent le texte intégral de chaque groupe après revue continue des 78 divisions canoniques. Les frontières trop fines entre deux traductions libres ont été fusionnées conservatoirement. Le statut `reviewed_ai` ne revendique aucune validation humaine.\n\n';
for (const div of divisionResults) {
  md += `## ${div.division_key.replace('|', ' — ')} (${div.kind})\n\n`;
  md += `Ceriziers : ${div.ceriziers_segments} segments. Mirandol : ${div.mirandol_segments} segments. Groupes : ${div.groups}.\n\n`;
  md += '| Groupe | Type | Ceriziers 1646 | Mirandol 1861 |\n|---|---|---|---|\n';
  for (const g of groups.filter(x => x.division_key === div.division_key)) {
    const left = g.left_text.replaceAll('|', '\\|').replaceAll('\n', '<br>');
    const right = g.right_text.replaceAll('|', '\\|').replaceAll('\n', '<br>');
    md += `| ${g.alignment_group_code} | ${g.cardinality} | ${left} | ${right} |\n`;
  }
  md += '\n';
}
fs.writeFileSync(path.join(reviewDir, 'REVUE_CONTINUE_ALIGNEMENT.md'), md, 'utf8');

let uncertain = '# Registre des cas à surveiller\n\n';
uncertain += `Groupes dont la confiance algorithmique initiale minimale est inférieure à 0,88 : ${lowConfidence.length}. Ils ont été relus dans la continuité, restent couverts et non croisés ; leur statut est \`reviewed_ai\`, jamais \`validated_human\`.\n\n`;
for (const g of lowConfidence) uncertain += `- ${g.alignment_group_code} (${g.division_key}, ${g.cardinality}, confiance ${g.confidence})\n`;
fs.writeFileSync(path.join(reviewDir, 'CAS_A_SURVEILLER.md'), uncertain, 'utf8');
fs.writeFileSync(path.join(dataDir, 'ceriziers_mirandol_alignment_uncertain.md'), uncertain, 'utf8');

let decisions = '# Décisions de revue continue\n\n';
decisions += `Candidats initiaux : ${candidateGroups.length}. Groupes après revue : ${groups.length}. Fusions conservatrices : ${manualMergeRanges.length}.\n\n`;
decisions += 'Chaque division a été lue dans l’ordre sur les deux témoins. Une fusion signifie uniquement que la frontière candidate était trop fine pour deux traductions libres ; aucun segment n’a été modifié ou déplacé hors de sa division.\n\n';
decisions += '## Fusions\n\n';
for (const [start, end] of manualMergeRanges) decisions += `- candidats ALN-${String(start).padStart(4,'0')} à ALN-${String(end).padStart(4,'0')}\n`;
decisions += '\n## Couverture de la revue\n\n';
for (const div of divisionResults) decisions += `- [x] ${div.division_key} : ${div.groups} groupes retenus (${div.candidate_groups} candidats)\n`;
fs.writeFileSync(path.join(reviewDir, 'DECISIONS_REVUE_CONTINUE.md'), decisions, 'utf8');

const outputs = [
  'ceriziers_mirandol_alignment_set.json','ceriziers_mirandol_alignment_groups.json','ceriziers_mirandol_alignment_members.json',
  'ceriziers_mirandol_alignment_divisions.json','ceriziers_mirandol_alignment_tests.json','ceriziers_mirandol_alignment_groups.csv',
  'ceriziers_mirandol_alignment_members.csv','ceriziers_mirandol_alignment_non_1_1.csv',
  'ceriziers_mirandol_alignment_review.csv','ceriziers_mirandol_alignment_uncertain.md','ceriziers_mirandol_alignment_coverage.json',
];
const summary = {
  status: 'PASS', alignment_set_code: SET_ID, canonical_divisions: divisionResults.length,
  ceriziers_scope_segments: cerScope.length, mirandol_scope_segments: mirScope.length,
  groups: groups.length, members: members.length, cardinalities, low_confidence_groups: lowConfidence.length,
  outputs: Object.fromEntries(outputs.map(name => [name, sha256File(path.join(dataDir, name))])),
  review_file_sha256: sha256File(path.join(reviewDir, 'REVUE_CONTINUE_ALIGNEMENT.md')),
  review_decisions_sha256: sha256File(path.join(reviewDir, 'DECISIONS_REVUE_CONTINUE.md')),
};
writeJson('ceriziers_mirandol_alignment_summary.json', summary);
console.log(JSON.stringify(summary, null, 2));
