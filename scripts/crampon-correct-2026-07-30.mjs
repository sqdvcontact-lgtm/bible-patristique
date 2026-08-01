import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const TRAD = 'TR0003';
const APPLY = process.argv.includes('--apply');
const OUT = 'audit/crampon-2026-07-30';
const SOURCE = 'La Sainte Bible, Crampon, édition révisée de 1923, fac-similé Gallica bpt6k318720w';
const SOURCE_URL = 'https://gallica.bnf.fr/ark:/12148/bpt6k318720w';
const BASELINE_PATH = `${OUT}/TR0003-before.json`;
const METADATA_PATH = `${OUT}/metadata-before.json`;
const PLAN_PATH = `${OUT}/correction-plan.json`;
const JOURNAL_PATH = `${OUT}/correction-journal.json`;
const INSERTS = [
  {
    id: '1881fc75-4ab5-4ffb-b12e-e04184ebe281', trad_id: TRAD, livre: 'JOS', ch_orig: 21, v_orig: 36, v_orig_suffixe: null,
    texte: 'Et de la tribu de Ruben, Bosor et sa banlieue, Jassa et sa banlieue,', canon_id: 'JOS.21.36', canon_id_fin: null,
    notes: null, note_edition: null, note_structure: null, note_travail: null, alignement_verifie: true, est_suscription: false,
  },
  {
    id: '7ebd3b6f-3799-440e-84eb-1bcbc998bb82', trad_id: TRAD, livre: 'JOS', ch_orig: 21, v_orig: 37, v_orig_suffixe: null,
    texte: 'Cédémoth et sa banlieue, Méphaath et sa banlieue : quatre villes.', canon_id: 'JOS.21.37', canon_id_fin: null,
    notes: null, note_edition: null, note_structure: null, note_travail: null, alignement_verifie: true, est_suscription: false,
  },
];
const RENUMBER = new Map([
  ['4a199a62-e3b5-457b-a465-76167419d9fb', [36, 38]], ['26478a6a-a36b-4c4a-88bd-20435d6601b8', [37, 39]],
  ['33095b98-3351-4e31-808d-22acff8a9885', [38, 40]], ['fca1cd31-05cd-49a5-8b6e-554f9b5ac3ab', [39, 41]],
  ['162b71d2-66ca-435e-929a-9295c2becd6f', [40, 42]], ['e4deae7b-d3e6-4c5b-816f-3c7befade0cb', [41, 43]],
  ['6c4d06d2-d754-46f3-abb5-2f429cd825eb', [42, 44]], ['366a8b5f-4995-4f8f-99b6-484887a7c423', [43, 45]],
]);
const TARGETED = new Map([
  ['deacd3e1-bf92-41c6-bc24-a963f3f6b0be', {
    replace: [['» Note : Yahweh-Nessi : c’est-à-dire : Yahweh - ma bannière', '»']],
    note_edition: 'Yahweh-Nessi, c.-à-d. Yahweh - ma - bannière.', type: 'extraction_note_edition', page: 80,
  }],
  ['7ef41261-75f3-425f-a9ef-11b40cbb7279', { replace: [['Esprit- Saint', 'Esprit-Saint']], type: 'espace_apres_trait_union' }],
  ['18d0d945-df7f-4d05-a16b-0ceb7e34b9a0', { replace: [['Abel- Méhula', 'Abel-Méhula']], type: 'espace_apres_trait_union' }],
  ['64695790-203b-49f4-8208-7efabbb376a2', { replace: [['Jésus- Christ', 'Jésus-Christ']], type: 'espace_apres_trait_union' }],
  ['b14af086-ce21-4555-90ad-bef4c1efe85c', { replace: [['Esprit- Saint', 'Esprit-Saint']], type: 'espace_apres_trait_union' }],
  ['7f242712-485b-4322-a26a-8c93a8f6ccfb', { replace: [['Esprit- Saint', 'Esprit-Saint']], type: 'espace_apres_trait_union' }],
  ['e0fa95e1-02d5-4fb4-987f-f31b529c2c46', { replace: [['Esprit- Saint', 'Esprit-Saint']], type: 'espace_apres_trait_union' }],
  ['f3975203-86cf-40ac-b50a-83fef297cada', { replace: [['[ mes frères]', '[mes frères]']], type: 'espace_crochet' }],
  ['a5f4007e-bac6-48bc-929f-9a82658e2ad1', { replace: [['[ formés', '[formés']], type: 'espace_crochet' }],
  ['ccb00451-4452-4199-980f-2c321226cc75', { replace: [['Amen ! ]', 'Amen !]']], type: 'espace_crochet' }],
  ['cfab7cf5-81ab-4323-94c1-0f0073c8431c', { replace: [['remontés remontés', 'remontés']], type: 'mot_repete' }],
  ['7a34a88e-95a2-4da6-b0db-c93745aa45a4', { replace: [['dupent dupent', 'dupent']], type: 'mot_repete' }],
  ['869ab022-9153-4e63-bda9-f05075298559', { replace: [['vos vos', 'vos']], type: 'mot_repete' }],
  ['aefe635d-33ce-4583-a584-33f80c51d0d8', { replace: [['parce qui vous vous êtes', 'parce que vous vous êtes']], type: 'ocr_confirme' }],
  ['96664528-ad98-4992-84d1-c2f3dbee1caa', { replace: [[' »Jésus', ' » Jésus']], type: 'espace_apres_guillemet', page: 1550 }],
  ['432983cf-b1f9-429c-9b53-4f53696f064e', { replace: [[' »et il', ' » et il']], type: 'espace_apres_guillemet', page: 936 }],
  ['1ce7eba9-81ee-4243-89cd-0f292c339d6f', { replace: [['vos gardez', 'vos gardes']], type: 'ocr_collationne', page: 232 }],
  ['c596720b-b540-405d-828a-9dfb81ed4929', { replace: [['vous mêmes', 'vous-mêmes']], type: 'ocr_collationne', page: 1262 }],
  ['746200e2-b9b4-40f9-9f0e-051b85d2617a', { replace: [['œuvres seront dévoilés', 'œuvres seront dévoilées']], type: 'ocr_collationne', page: 927 }],
  ['6238a0f8-9c99-4270-b6af-401278803c52', { replace: [['il l’a remplit de ses biens', 'il la remplit de ses biens']], type: 'ocr_collationne', page: 935 }],
  ['32f3101b-d7fc-4fec-b04a-3fa7881548ab', { replace: [['oreilles en on entendu', 'oreilles en ont entendu']], type: 'ocr_collationne', page: 934 }],
  ['d738518f-5f8c-432d-9893-619a5dfb5979', {
    replace: [['rendre la tache agréable', 'rendre la tâche agréable']], note_edition: 'Leçon de l’édition imprimée : « tache ».',
    type: 'coquille_imprimee_corrigee', page: 605,
  }],
  ['1bb1b73f-c623-4961-8358-cf37aadda8c8', {
    replace: [['mais vous vous êtes au Christ', 'mais vous êtes au Christ']], note_edition: 'Leçon de l’édition imprimée : « mais vous vous êtes au Christ ».',
    type: 'coquille_imprimee_corrigee', page: 1632,
  }],
  ['55f811b1-6156-4e8f-80c8-17333bdf79a9', {
    replace: [['comme il n’est est point arrivé', 'comme il n’est point arrivé']], note_edition: 'Leçon de l’édition imprimée : « comme il n’est est point arrivé ».',
    type: 'coquille_imprimee_corrigee', page: 560,
  }],
]);

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => JSON.stringify(value);
async function all(table, select, configure, order = 'id') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    if (configure) query = configure(query);
    if (order) query = query.order(order);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
const normalizeNote = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
const equivalentNote = (row) => {
  const note = normalizeNote(row.notes), structure = normalizeNote(row.note_structure), travail = normalizeNote(row.note_travail);
  if (!note) return false;
  if ([structure, travail].some((other) => other && (other === note || other.includes(note) || note.includes(other)))) return true;
  if (note === normalizeNote('Verset propre aux éditions latines, hors ossature canonique AELF. Aligné entre éditions sur sa numérotation d’origine.')) {
    return structure.includes('ne se lit que dans les éditions latines') && structure.includes('conserve ici le numéro que lui donne son édition');
  }
  if (note.startsWith(normalizeNote('Le rattachement au canon avance d’un cran à partir du verset 17, 14'))) {
    return structure.includes('cette édition compte un verset de moins') && structure.includes("les numéros affichés restent ceux de l'édition");
  }
  return false;
};
const ref = (row) => `${row.livre} ${row.ch_orig},${row.v_orig}${row.v_orig_suffixe ?? ''}`;
const sourceFor = (page) => page ? `${SOURCE}, page numérisée ${page}` : SOURCE;

async function guardedUpdate(row, patch) {
  let query = db.from('versets_v2').update(patch).eq('id', row.id).eq('trad_id', TRAD);
  for (const field of Object.keys(patch)) query = row[field] == null ? query.is(field, null) : query.eq(field, row[field]);
  const { data, error } = await query.select('id');
  if (error) throw error;
  if (data.length !== 1) throw new Error(`Précondition non satisfaite pour ${row.id}`);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
const metadataBefore = JSON.parse(readFileSync(METADATA_PATH, 'utf8'));
const [liveRows, metadataLive, otherTranslations] = await Promise.all([
  all('versets_v2', '*', (q) => q.eq('trad_id', TRAD)),
  db.from('traductions').select('*').eq('trad_id', TRAD).single().then(({ data, error }) => { if (error) throw error; return data; }),
  all('versets_v2', 'id,trad_id,livre,ch_orig,v_orig,v_orig_suffixe,texte,canon_id,canon_id_fin,notes,note_edition,note_structure,note_travail,alignement_verifie', (q) => q.neq('trad_id', TRAD)),
]);
const baselineProjection = baseline.map((row) => ({ id: row.id, trad_id: row.trad_id, livre: row.livre, ch_orig: row.ch_orig, v_orig: row.v_orig, v_orig_suffixe: row.v_orig_suffixe, texte: row.texte, canon_id: row.canon_id, canon_id_fin: row.canon_id_fin, notes: row.notes, note_edition: row.note_edition, note_structure: row.note_structure, note_travail: row.note_travail, alignement_verifie: row.alignement_verifie }));
const liveProjection = liveRows.map((row) => ({ id: row.id, trad_id: row.trad_id, livre: row.livre, ch_orig: row.ch_orig, v_orig: row.v_orig, v_orig_suffixe: row.v_orig_suffixe, texte: row.texte, canon_id: row.canon_id, canon_id_fin: row.canon_id_fin, notes: row.notes, note_edition: row.note_edition, note_structure: row.note_structure, note_travail: row.note_travail, alignement_verifie: row.alignement_verifie }));
if (hash(stable(baselineProjection)) !== hash(stable(liveProjection))) throw new Error('La base TR0003 a changé depuis le snapshot initial');
if (stable(metadataBefore) !== stable(metadataLive)) throw new Error('La notice TR0003 a changé depuis le snapshot initial');
const otherHashBefore = hash(stable(otherTranslations));

const byId = new Map(liveRows.map((row) => [row.id, row]));
const patches = new Map();
const correctionTypes = new Map();
const pages = new Map();
for (const row of liveRows) {
  const after = row.texte.replace(/([\p{L}])’ +([\p{L}])/gu, '$1’$2');
  if (after !== row.texte) {
    patches.set(row.id, { texte: after });
    correctionTypes.set(row.id, new Set(['espace_apres_apostrophe']));
  }
}
for (const [id, spec] of TARGETED) {
  const row = byId.get(id);
  if (!row) throw new Error(`UUID ciblé absent : ${id}`);
  const patch = patches.get(id) ?? {};
  let text = patch.texte ?? row.texte;
  for (const [before, after] of spec.replace) {
    if (!text.includes(before)) throw new Error(`${ref(row)} : forme attendue absente : ${before}`);
    text = text.replace(before, after);
  }
  if (text !== row.texte) patch.texte = text;
  if (spec.note_edition != null) {
    if (row.note_edition != null) throw new Error(`${ref(row)} : note_edition déjà occupée`);
    patch.note_edition = spec.note_edition;
  }
  patches.set(id, patch);
  if (!correctionTypes.has(id)) correctionTypes.set(id, new Set());
  correctionTypes.get(id).add(spec.type);
  if (spec.page) pages.set(id, spec.page);
}
const noteCleanup = liveRows.filter((row) => row.notes != null);
const unsafeNotes = noteCleanup.filter((row) => !equivalentNote(row));
if (unsafeNotes.length) throw new Error(`${unsafeNotes.length} note(s) générique(s) sans équivalent`);
for (const row of noteCleanup) {
  const patch = patches.get(row.id) ?? {};
  patch.notes = null;
  patches.set(row.id, patch);
  if (!correctionTypes.has(row.id)) correctionTypes.set(row.id, new Set());
  correctionTypes.get(row.id).add('assainissement_notes_generiques');
}
for (const [id, [before, after]] of RENUMBER) {
  const row = byId.get(id);
  if (!row || row.v_orig !== before || row.livre !== 'JOS' || row.ch_orig !== 21) throw new Error(`Précondition de renumérotation échouée : ${id}`);
  const patch = patches.get(id) ?? {};
  patch.v_orig = after;
  patches.set(id, patch);
  if (!correctionTypes.has(id)) correctionTypes.set(id, new Set());
  correctionTypes.get(id).add('retablissement_numerotation_native');
}

const completion = new Date().toISOString();
const editorialPolicy = 'Numérotation principalement hébraïque, avec exceptions liées aux traditions latines de Tobie et Judith, aux livres deutérocanoniques et à plusieurs variantes du texte reçu dans le Nouveau Testament. Les coquilles manifestes de l’imprimé sont corrigées dans le texte de lecture ; la leçon imprimée est alors conservée dans note_edition.';
const metadataPatch = {
  nom: 'Bible Crampon', auteur: 'Augustin Crampon', dates: '1826–1894', date_publication: '1923',
  publication_debut_annee: 1923, publication_debut_precision: 'exacte', publication_fin_annee: 1923, publication_fin_precision: 'exacte',
  source_edition: 'La Sainte Bible, traduction d’après les textes originaux par l’abbé A. Crampon, édition révisée par des Pères de la Compagnie de Jésus avec la collaboration de professeurs de Saint-Sulpice, Société de Saint-Jean l’Évangéliste, Desclée et Cie, Paris–Tournai–Rome, 1923.',
  source_url: SOURCE_URL, import_maj_le: completion,
  commentaire_editorial: `${metadataBefore.commentaire_editorial}\n<h1>Principes d’établissement du texte</h1>\n${editorialPolicy}`,
};
const journal = [];
for (const [id, patch] of patches) {
  const row = byId.get(id);
  for (const [field, after] of Object.entries(patch)) journal.push({
    id, référence: ref(row), champ: field, valeur_avant: row[field], valeur_après: after,
    type_correction: [...correctionTypes.get(id)].join(' + '), source_consultée: sourceFor(pages.get(id)),
    contrôle_effectué: pages.has(id) ? 'Collation visuelle du fac-similé haute définition et précondition UUID/valeur.' : 'Précondition UUID/valeur, règle bornée et contrôle de résidu.',
  });
}
for (const row of INSERTS) journal.push({ id: row.id, référence: ref(row), champ: 'ligne', valeur_avant: null, valeur_après: row, type_correction: 'restauration_verset', source_consultée: sourceFor(245), contrôle_effectué: 'Collation visuelle de la page et contrôle de couverture canonique.' });
for (const [field, after] of Object.entries(metadataPatch)) if (metadataBefore[field] !== after) journal.push({ id: TRAD, référence: TRAD, champ: field, valeur_avant: metadataBefore[field], valeur_après: after, type_correction: 'mise_a_jour_notice', source_consultée: SOURCE_URL, contrôle_effectué: 'Diff intégral de la notice et préservation de est_referent.' });
const plan = {
  generated_at: completion, mode: APPLY ? 'apply' : 'dry-run', translation: TRAD,
  baseline: { rows: baseline.length, sha256: hash(stable(baselineProjection)), other_translations_rows: otherTranslations.length, other_translations_sha256: otherHashBefore },
  changes: { rows_patched: patches.size, text_rows_modified: [...patches].filter(([id, patch]) => patch.texte != null && patch.texte !== byId.get(id).texte).length, notes_cleared: noteCleanup.length, numbering_fields_modified: RENUMBER.size, rows_inserted: INSERTS.length, metadata_fields_modified: Object.keys(metadataPatch).filter((field) => metadataBefore[field] !== metadataPatch[field]).length },
  inserted_rows: INSERTS, numbering_changes: [...RENUMBER].map(([id, [before, after]]) => ({ id, before, after })), metadata_before: metadataBefore, metadata_after: { ...metadataBefore, ...metadataPatch }, journal,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(PLAN_PATH, `${JSON.stringify(plan, null, 2)}\n`, 'utf8');
writeFileSync(JOURNAL_PATH, `${JSON.stringify(journal, null, 2)}\n`, 'utf8');
if (!APPLY) {
  console.log(JSON.stringify({ mode: 'dry-run', output: PLAN_PATH, changes: plan.changes, journal_entries: journal.length, unsafe_generic_notes: unsafeNotes.length }, null, 2));
  process.exit(0);
}

const backupPayload = { baseline_sha256: plan.baseline.sha256, baseline_path: BASELINE_PATH, metadata_path: METADATA_PATH, plan_path: PLAN_PATH, journal_path: JOURNAL_PATH, inserted_rows: INSERTS };
const { data: auditRow, error: auditError } = await db.from('journal_ia').insert({
  sujet: 'Correction éditoriale de la Bible Crampon 1923 (TR0003)',
  probleme: 'Snapshot complet et journal avant/après précédant les corrections OCR, typographiques, structurelles et documentaires du cahier du 30 juillet 2026.',
  reponse: JSON.stringify(backupPayload), statut: 'sauvegarde',
}).select('id').single();
if (auditError) throw auditError;
let done = 0;
for (const [id, patch] of patches) {
  await guardedUpdate(byId.get(id), patch);
  done++;
  if (done % 75 === 0) console.log(JSON.stringify({ progress: `${done}/${patches.size}` }));
}
const { data: inserted, error: insertError } = await db.from('versets_v2').insert(INSERTS).select('id');
if (insertError) throw insertError;
if (inserted.length !== INSERTS.length) throw new Error('Insertion incomplète de Josué 21,36-37');
let metadataQuery = db.from('traductions').update(metadataPatch).eq('trad_id', TRAD).eq('est_referent', metadataBefore.est_referent);
const { data: updatedMetadata, error: metadataError } = await metadataQuery.select('*');
if (metadataError) throw metadataError;
if (updatedMetadata.length !== 1) throw new Error('Mise à jour de la notice non effectuée');
console.log(JSON.stringify({ mode: 'applied', journal_ia_id: auditRow.id, patched_rows: done, inserted_rows: inserted.length, metadata_updated: 1, other_translations_sha256_before: otherHashBefore }, null, 2));
