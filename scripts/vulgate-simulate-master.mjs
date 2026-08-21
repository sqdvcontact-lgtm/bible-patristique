// Simulation locale des six lots du manifeste maître. Aucune écriture Supabase.
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const root = 'tmp/vulgate-preflight-2026-07-29';
const bundle = `${root}/bundle`;
const J = name => JSON.parse(readFileSync(`${bundle}/${name}`, 'utf8'));
const rows = JSON.parse(readFileSync(`${root}/TR0004-before.json`, 'utf8'));
const titleActions = JSON.parse(readFileSync(`${root}/psalm-title-actions.json`, 'utf8')).actions;
const r1 = J('vulgate_actions_confirmed_2026-07-28.json');
const r2 = J('vulgate_actions_confirmed_round2_2026-07-28.json');
const r3 = J('vulgate_actions_confirmed_round3_tobit_judith_2026-07-28.json');
const r4 = J('vulgate_actions_confirmed_round4_sirach_2026-07-28.json');
const r5a = J('vulgate_actions_round5a_psalm_titles_2026-07-28.json');
const r5b = J('vulgate_actions_round5b_psalm_body_2026-07-28.json');
const manifest = J('vulgate_master_manifest_2026-07-28.json');
const mutations = [];
const originalIds = new Set(rows.map(row => row.id));
let byId = new Map(rows.map(row => [row.id, row]));
const comparable = value => String(value).replaceAll('\u00a0', ' ');
const record = (action, before, after) => mutations.push({ action, id: after.id, before, after });
const update = (id, patch, action) => {
  const row = byId.get(id); if (!row) throw new Error(`${action}: UUID absent ${id}`);
  const before = structuredClone(row); Object.assign(row, patch); record(action, before, structuredClone(row)); return row;
};
const appendNote = (oldValue, value) => oldValue ? `${oldValue} | ${value}` : value;
const split = ({ action, id, markers, fragments, existingIndex = 0, note = null, additionNotes = null }) => {
  const source = byId.get(id); if (!source) throw new Error(`${action}: UUID absent ${id}`);
  const original = source.texte;
  let cursor = 0; const texts = [];
  for (const marker of markers) {
    const at = original.indexOf(marker, cursor);
    if (at < 0 || original.indexOf(marker, at + 1) >= 0) throw new Error(`${action}: marqueur absent/non unique`);
    texts.push(original.slice(cursor, at).trimEnd()); cursor = at;
  }
  texts.push(original.slice(cursor));
  if (texts.join(' ') !== original) throw new Error(`${action}: recomposition inexacte`);
  const made = [];
  for (let i = 0; i < fragments.length; i++) {
    const f = fragments[i];
    const patch = { texte: texts[i], canon_id: f.canon_id, canon_id_fin: null, v_orig_suffixe: f.suffix, est_suscription: Boolean(f.est_suscription), alignement_verifie: false, ordre_slot: null };
    if (note) patch.note_structure = appendNote(source.note_structure, note);
    if (f.canon_id == null && additionNotes) {
      patch.notes = appendNote(source.notes, additionNotes.notes);
      patch.note_structure = appendNote(source.note_structure, additionNotes.note_structure);
    }
    if (i === existingIndex) made.push(update(id, patch, action));
    else {
      const created = { ...structuredClone(source), ...patch, id: randomUUID(), created_at: null, updated_at: null };
      rows.push(created); byId.set(created.id, created); record(action, null, structuredClone(created)); made.push(created);
    }
  }
  return made;
};

// Remise à zéro et nettoyage des faux surnuméraires.
for (const row of rows) row.alignement_verifie = false;
const generic = r1.generic_note_cleanup.where.note_structure_exact;
let cleaned = 0;
for (const row of rows) if (row.canon_id != null && row.note_structure === generic) {
  const before = structuredClone(row); row.note_structure = null;
  if (row.notes === generic) row.notes = null;
  else if (row.notes?.startsWith(`${generic} | `)) row.notes = row.notes.slice(generic.length + 3);
  record('CLEAN-GENERIC-NOTE', before, structuredClone(row)); cleaned++;
}
if (cleaned !== 227) throw new Error(`Nettoyage: 227 attendus, ${cleaned}`);

for (const a of r1.split_actions) split({ action: a.action_id, id: a.existing_uuid, markers: [a.split_marker], fragments: [{ suffix: a.first_suffix, canon_id: a.first_canon }, { suffix: a.second_suffix, canon_id: a.second_canon }], note: a.note });
for (const a of r1.remap_actions) update(a.existing_uuid, { canon_id: a.target_canon, canon_id_fin: null, alignement_verifie: false }, a.action_id);
for (const a of r2.split_actions) split({ action: a.action_id, id: a.existing_uuid, markers: [a.split_marker], fragments: [{ suffix: a.first_suffix, canon_id: a.first_canon }, { suffix: a.second_suffix, canon_id: a.second_canon }], note: a.note });
for (const a of r2.remap_actions) update(a.existing_uuid, { canon_id: a.target_canon, canon_id_fin: null, alignement_verifie: false }, a.action_id);

const csvRows = path => readFileSync(path, 'utf8').trim().split(/\r?\n/).slice(1).map(line => line.split(','));
for (const [livre, ch, v, id, suffix, canon] of csvRows(`${bundle}/vulgate_suffix_assignments_legacy_round0_2026-07-28.csv`)) update(id, { v_orig_suffixe: suffix, canon_id: canon }, `LEGACY-SUFFIX-${livre}-${ch}-${v}-${suffix}`);

for (const a of r4.operations.direct_remaps) update(a.existing_uuid, { canon_id: a.target_canon, canon_id_fin: null }, a.action_id);
for (const group of r4.operations.existing_duplicate_reference_suffixes) for (const item of group.rows) update(item.uuid, { v_orig_suffixe: item.suffix, canon_id: item.canon_id }, `SIR-SUFFIX-${group.ch_orig}-${group.v_orig}-${item.suffix}`);
for (const a of r4.operations.binary_splits) split({ action: a.action_id, id: a.existing_uuid, markers: [a.split_marker], fragments: a.targets.map(t => ({ suffix: t.suffix, canon_id: t.canon_id })), note: `Scission éditoriale ${a.action_id}.` });
split({ action: r4.operations.ternary_split.action_id, id: r4.operations.ternary_split.existing_uuid, markers: r4.operations.ternary_split.split_markers, fragments: r4.operations.ternary_split.targets.map(t => ({ suffix: t.suffix, canon_id: t.canon_id })), note: `Scission éditoriale ${r4.operations.ternary_split.action_id}.` });
for (const a of r4.operations.surnumerary_note_updates) update(a.uuid, { canon_id: a.after_canon_id, canon_id_fin: null, notes: a.notes, note_structure: a.note_structure, ordre_slot: null }, `SIR-NOTE-${a.source_ref}`);

const titleNote = r5a.operations.notes;
for (const psalm of r5a.inventory.title_only_single_row_psalms) {
  const row = rows.find(x => x.livre === 'PSA' && x.ch_orig === psalm && x.v_orig === 1);
  update(row.id, { canon_id: null, canon_id_fin: null, est_suscription: true, v_orig_suffixe: null, ordre_slot: null, notes: appendNote(row.notes, titleNote.title_note), note_structure: appendNote(row.note_structure, titleNote.title_note_structure) }, `PSA${psalm}-TITLE`);
}
for (const [psalm, verses] of Object.entries(r5a.inventory.title_only_multirow_psalms)) for (const verse of verses) {
  const row = rows.find(x => x.livre === 'PSA' && x.ch_orig === +psalm && x.v_orig === verse);
  update(row.id, { canon_id: null, canon_id_fin: null, est_suscription: true, v_orig_suffixe: null, ordre_slot: null, notes: appendNote(row.notes, titleNote.title_note), note_structure: appendNote(row.note_structure, titleNote.title_note_structure) }, `PSA${psalm}.${verse}-TITLE`);
}
for (const a of titleActions) split({ action: a.action_id, id: a.existing_uuid, markers: [a.body_text], existingIndex: 1, fragments: [{ suffix: 'a', canon_id: null, est_suscription: true }, { suffix: 'b', canon_id: a.current_canon, est_suscription: false }], additionNotes: { notes: titleNote.title_note, note_structure: titleNote.title_note_structure } });

for (const a of r5b.operations.addition_splits) split({ action: a.action_id, id: a.existing_uuid, markers: a.split_markers, fragments: a.fragments.map(f => ({ suffix: f.suffix, canon_id: f.canon_id, est_suscription: false })), additionNotes: a.addition_notes, note: a.note });

// Suffixes finaux : aucun suffixe sur singleton, continuité explicite sur groupes multiples.
const groups = new Map();
for (const row of rows) { const key = `${row.livre}|${row.ch_orig}|${row.v_orig}`; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row); }
for (const group of groups.values()) {
  if (group.length === 1) group[0].v_orig_suffixe = null;
  else {
    group.sort((a, b) => String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? '')) || a.id.localeCompare(b.id));
    for (let i = 0; i < group.length; i++) if (group[i].v_orig_suffixe !== String.fromCharCode(97 + i)) throw new Error(`Suffixes non continus ${group[0].livre} ${group[0].ch_orig},${group[0].v_orig}`);
  }
}

// ordre_slot final.
const slots = new Map();
for (const row of rows) if (row.canon_id != null) { if (!slots.has(row.canon_id)) slots.set(row.canon_id, []); slots.get(row.canon_id).push(row); } else row.ordre_slot = null;
for (const occupants of slots.values()) {
  occupants.sort((a, b) => a.ch_orig - b.ch_orig || a.v_orig - b.v_orig || String(a.v_orig_suffixe ?? '').localeCompare(String(b.v_orig_suffixe ?? '')) || a.id.localeCompare(b.id));
  occupants.forEach((row, i) => { row.ordre_slot = i + 1; });
}

// Politique finale de vérification, reproduite du postcontrôle maître.
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const sacy = [];
for (let start = 0; ; start += 1000) { const { data, error } = await sb.from('versets_v2').select('livre,ch_orig,v_orig,v_orig_suffixe,canon_id,alignement_verifie').eq('trad_id', 'TR0001').order('id').range(start, start + 999); if (error) throw error; sacy.push(...data); if (data.length < 1000) break; }
const sacyKeys = new Set(sacy.filter(x => x.alignement_verifie).map(x => `${x.livre}|${x.ch_orig}|${x.v_orig}|${x.v_orig_suffixe ?? ''}|${x.canon_id ?? ''}`));
const splitRefs = new Set([...r1.split_actions, ...r2.split_actions].map(a => `${a.livre}|${a.ch_orig}|${a.v_orig}`));
const remapIds = new Set([...r1.remap_actions, ...r2.remap_actions].map(a => a.existing_uuid));
const verificationReasons = { complex: 0, split: 0, remap: 0, sacy: 0 };
for (const row of rows) {
  const complex = ['PSA', 'SIR', 'TOB', 'JDT'].includes(row.livre);
  const splitVerified = splitRefs.has(`${row.livre}|${row.ch_orig}|${row.v_orig}`);
  const remapVerified = remapIds.has(row.id);
  // Le manifeste limite ce transfert aux lignes préexistantes (« unchanged rows »).
  // Les fragments nouvellement créés ne deviennent vérifiés que par un lot explicite.
  const sacyVerified = originalIds.has(row.id) && sacyKeys.has(`${row.livre}|${row.ch_orig}|${row.v_orig}|${row.v_orig_suffixe ?? ''}|${row.canon_id ?? ''}`);
  row.alignement_verifie = complex || splitVerified || remapVerified || sacyVerified;
  if (complex) verificationReasons.complex++;
  else if (splitVerified) verificationReasons.split++;
  else if (remapVerified) verificationReasons.remap++;
  else if (sacyVerified) verificationReasons.sacy++;
}

const counts = {
  rows: rows.length, canonical_rows: rows.filter(x => x.canon_id != null).length, null_canon_rows: rows.filter(x => x.canon_id == null).length,
  subscription_rows: rows.filter(x => x.est_suscription).length, non_subscription_null_rows: rows.filter(x => x.canon_id == null && !x.est_suscription).length,
  canon_id_fin_rows: rows.filter(x => x.canon_id_fin != null).length, original_reference_groups: groups.size,
  additional_rows_over_original_references: rows.length - groups.size, multirow_original_reference_groups: [...groups.values()].filter(g => g.length > 1).length,
  verified_rows: rows.filter(x => x.alignement_verifie).length, unverified_rows: rows.filter(x => !x.alignement_verifie).length,
  books: new Set(rows.map(row => row.livre)).size,
};
// Correction d'une contradiction du bundle : WIS 17,9 et WIS 19,20 sont dans
// split_refs (donc vérifiées par la règle maîtresse), mais aussi dans le CSV des
// 252 résiduelles. La requête normative donne nécessairement 250 résiduelles.
const correctedFinalState = { ...manifest.final_state, verified_rows: 35750, unverified_rows: 250 };
const countMismatches = Object.entries(correctedFinalState).filter(([key, expected]) => typeof expected === 'number' && counts[key] !== expected).map(([key, expected]) => ({ key, actual: counts[key], expected }));
const payload = `${JSON.stringify(rows.map(row => Object.fromEntries(Object.keys(row).sort().map(key => [key, row[key]]))), null, 2)}\n`;
writeFileSync(`${root}/TR0004-simulated-after.json`, payload);
writeFileSync(`${root}/TR0004-mutation-plan.json`, JSON.stringify(mutations, null, 2));
console.log(JSON.stringify({ counts, countMismatches, manifestAdaptation: { verified_rows: { bundle: 35748, corrected: 35750 }, unverified_rows: { bundle: 252, corrected: 250 }, cause: ['WIS 17,9', 'WIS 19,20'] }, verificationReasons, mutations: mutations.length, new_rows: rows.filter(row => row.created_at == null).length, sha256: createHash('sha256').update(payload).digest('hex') }, null, 2));
if (countMismatches.length) process.exitCode = 2;
