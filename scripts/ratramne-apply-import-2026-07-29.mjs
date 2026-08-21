import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('tmp/ratramne-import-2026-07-29');
const WORK_ID = 'A0091O0001';
const AUTHOR_ID = 'A0091';
const NOTICE_ID = 1937;
const EXPECTED_HASHES = {
  'ratramne-segments-candidate.json': 'A4988A73F66AF33F0A8E65DF5AA124388E552C5C986848AB9258D739599583C3',
  'ratramne-alerts.json': '0DD0A28A4C88D3BA007704EF3ECAD8745FF3DC1E76DABBB26DB7C387E37ED12E',
  'ratramne-metadata-candidate.json': '80ECE3626C86C7E11DA466997F572D133D1AAB9FCE00A23C2F92A7AE02A2B480',
  'ratramne-audit.json': 'DFB5CDD894BA783F0517259ABF54945C5EE6630A8A0D87D04880D944CA0B7CCE',
};
const IMMUTABLE = [
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_FRANCAIS_EN_COURS.docx', '69C276229704F7652C31FE26D8F1C110F798AAF41B7D66072FF088F8E647BE82'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_LATIN_EN_COURS.docx', 'A3901891F3EAACCCF251EEC675131C77CFC24ABE27B8C7FCF32F6E66617565B8'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_BILINGUE_CONTROLE.docx', '3F8DFDB5A9111015B2157A92B7E27979FA47BC2111DA29BC01E7B0E16D46C358'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/master/transcription.json', '831603CEAD79C45FF380282FD66F94957B6CDC4F4660D729CA7BE8C8F13A3E04'],
  ['C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/source/du_corps_et_du_sang_du_seigneur_1673.pdf', '5C71131AD8C0DC555E3C57BCBA60BACE67F2F93D546AC2162BBDA80AD97CDD75'],
];
const SEGMENT_COLUMNS = [
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte', 'ref_niv5_texte',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'texte_original', 'notes',
  'paragraphe', 'rang', 'controle_rang_manuel', 'controle_verifie', 'marquage_source',
];
const SEGMENT_TYPES = [
  'text', 'integer', 'text',
  'text', 'text', 'text', 'text', 'text',
  'text', 'text', 'text', 'text', 'text',
  'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text',
  'integer', 'integer', 'text', 'boolean', 'text',
];

const sha = (data) => createHash('sha256').update(data).digest('hex').toUpperCase();
const fileHash = (path) => sha(readFileSync(path));
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const json = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const lit = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return `array[${value.map(lit).join(',')}]::text[]`;
  return `'${String(value).replaceAll("'", "''")}'`;
};
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const canonicalSegments = (rows) => rows
  .map((row) => Object.fromEntries(SEGMENT_COLUMNS.map((column) => [column, row[column] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const canonicalWork = (row, columns) => Object.fromEntries(columns.map((column) => [column, row?.[column] ?? null]));
const writeSnapshot = (name, value) => {
  const payload = json(value);
  const path = resolve(ROOT, name);
  writeFileSync(path, payload, 'utf8');
  writeFileSync(`${path}.sha256`, `${sha(payload)}  ${name}\n`, 'utf8');
  return path;
};

mkdirSync(ROOT, { recursive: true });
for (const [name, expected] of Object.entries(EXPECTED_HASHES)) {
  const actual = fileHash(resolve(ROOT, name));
  if (actual !== expected) throw new Error(`Artefact non visé : ${name}; attendu ${expected}, obtenu ${actual}`);
}
for (const [path, expected] of IMMUTABLE) {
  const actual = fileHash(resolve(path));
  if (actual !== expected) throw new Error(`Source intangible modifiée : ${path}`);
}

const audit = JSON.parse(readFileSync(resolve(ROOT, 'ratramne-audit.json'), 'utf8'));
const failed = Object.entries(audit.invariants).filter(([, ok]) => ok !== true).map(([key]) => key);
if (failed.length) throw new Error(`Invariants du candidat en échec : ${failed.join(', ')}`);
const segments = JSON.parse(readFileSync(resolve(ROOT, 'ratramne-segments-candidate.json'), 'utf8'));
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'ratramne-metadata-candidate.json'), 'utf8'));
if (segments.length !== 568 || metadata.oeuvre.id_oeuvre !== WORK_ID) throw new Error('Candidat inattendu');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes de .env.local');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [authors, works, notices, liveSegments] = await Promise.all([
  must(db.from('auteurs').select('*').eq('id_auteur', AUTHOR_ID), 'auteur'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID), 'notice'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero'), 'segments'),
]);
if (authors.length !== 1 || authors[0].nom !== 'Ratramne de Corbie') throw new Error('Auteur A0091 absent ou inattendu');
if (notices.length !== 1) throw new Error('Notice 1937 absente');
const notice = notices[0];
if (notice.id_ligne !== 'V20-02060' || notice.id_oeuvre_stable !== WORK_ID || notice.presence_sur_le_site !== false) {
  throw new Error('Préétat de la notice 1937 inattendu');
}
if (!((works.length === 0 && liveSegments.length === 0) || (works.length === 1 && liveSegments.length === 568))) {
  throw new Error(`Préétat partiel interdit : ${works.length} œuvre(s), ${liveSegments.length} segment(s)`);
}

const beforePath = writeSnapshot('ratramne-pre-import.json', {
  captured_at: new Date().toISOString(),
  author: authors[0],
  work: works[0] ?? null,
  notice,
  segments: liveSegments,
});

const workColumns = Object.keys(metadata.oeuvre);
const expectedSegments = canonicalSegments(segments);
const expectedWork = canonicalWork(metadata.oeuvre, workColumns);
const noticePatch = metadata.catalogue_notice.patch_after_database_audit;

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true,
    apply: false,
    idempotent_poststate: works.length === 1,
    target: WORK_ID,
    segments: segments.length,
    work_columns: workColumns.length,
    candidate_sha256: EXPECTED_HASHES['ratramne-segments-candidate.json'],
    snapshot: beforePath,
  }, null, 2));
} else {
if (works.length === 0) {
  const payload = JSON.stringify(expectedSegments);
  if (payload.includes('$ratramne_segments$')) throw new Error('Collision de délimiteur SQL');
  const recordShape = SEGMENT_COLUMNS.map((column, index) => `${column} ${SEGMENT_TYPES[index]}`).join(',');
  const noticePreconditions = [
    `id=${NOTICE_ID}`,
    `id_ligne=${lit(notice.id_ligne)}`,
    `id_oeuvre_stable=${lit(notice.id_oeuvre_stable)}`,
    // L'insertion de l'œuvre déclenche trg_sync_presence_catalogue. Exiger ce
    // basculement prouve que le trigger a visé la bonne notice, puis l'UPDATE
    // remet la notice hors publication dans la même transaction.
    `presence_sur_le_site=true`,
  ].join(' and ');
  const sql = `do $ratramne_import$
declare n integer;
begin
  if not exists(select 1 from auteurs where id_auteur=${lit(AUTHOR_ID)} and nom='Ratramne de Corbie') then
    raise exception 'Auteur A0091 absent ou inattendu';
  end if;
  if exists(select 1 from oeuvres where id_oeuvre=${lit(WORK_ID)})
     or exists(select 1 from segments where id_oeuvre=${lit(WORK_ID)}) then
    raise exception 'La cible Ratramne n est plus vide';
  end if;
  insert into oeuvres(${workColumns.join(',')}) values(${workColumns.map((column) => lit(metadata.oeuvre[column])).join(',')});
  insert into segments(${SEGMENT_COLUMNS.join(',')})
  select ${SEGMENT_COLUMNS.join(',')} from jsonb_to_recordset($ratramne_segments$${payload}$ratramne_segments$::jsonb)
    as x(${recordShape});
  get diagnostics n=row_count;
  if n<>568 then raise exception '568 segments attendus, % insérés',n; end if;
  update catalogue_notices
     set decision_import=${lit(noticePatch.decision_import)},
         niveau_verification=${lit(noticePatch.niveau_verification)},
         presence_sur_le_site=false
   where ${noticePreconditions};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Précondition de notice non satisfaite'; end if;
  select count(*) into n from segments where id_oeuvre=${lit(WORK_ID)};
  if n<>568 then raise exception 'Postéat segments invalide : %',n; end if;
  select count(*) into n from segments where id_oeuvre=${lit(WORK_ID)} and texte_original is not null;
  if n<>101 then raise exception 'Postéat latin invalide : %',n; end if;
  select count(*) into n from segments where id_oeuvre=${lit(WORK_ID)} and rang>1 and texte_original is not null;
  if n<>0 then raise exception 'Latin présent après le rang 1 : %',n; end if;
  select count(*) into n from catalogue_notices where id=${NOTICE_ID} and presence_sur_le_site=false;
  if n<>1 then raise exception 'Publication prématurée'; end if;
end $ratramne_import$;`;
  writeFileSync(resolve(ROOT, 'ratramne-import-transaction.sql'), sql, 'utf8');
  writeFileSync(resolve(ROOT, 'ratramne-import-transaction.sql.sha256'), `${sha(sql)}  ratramne-import-transaction.sql\n`, 'utf8');
  const { error } = await db.rpc('exec_sql', { sql });
  if (error) throw new Error(`Transaction Ratramne annulée : ${error.message}`);
}

const [postWorks, postNotices, postSegments] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre après import'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID), 'notice après import'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero'), 'segments après import'),
]);
if (postWorks.length !== 1 || postNotices.length !== 1 || postSegments.length !== 568) throw new Error('Postéat incomplet');
const actualWork = canonicalWork(postWorks[0], workColumns);
const actualSegments = canonicalSegments(postSegments);
if (json(actualWork) !== json(expectedWork)) throw new Error('Métadonnées de l’œuvre différentes du candidat');
if (json(actualSegments) !== json(expectedSegments)) throw new Error('Segments relus en base différents du candidat');
if (postNotices[0].presence_sur_le_site !== false
  || postNotices[0].decision_import !== noticePatch.decision_import
  || postNotices[0].niveau_verification !== noticePatch.niveau_verification) {
  throw new Error('Postéat de la notice non conforme');
}

const postPath = writeSnapshot('ratramne-post-import.json', {
  captured_at: new Date().toISOString(),
  work: postWorks[0],
  notice: postNotices[0],
  segments: postSegments,
});
console.log(JSON.stringify({
  applied: works.length === 0,
  idempotent: works.length === 1,
  target: WORK_ID,
  segments: postSegments.length,
  candidate_editorial_sha256: sha(json(expectedSegments)),
  database_editorial_sha256: sha(json(actualSegments)),
  published: postNotices[0].presence_sur_le_site,
  before: beforePath,
  after: postPath,
}, null, 2));
}
