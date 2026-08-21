import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('tmp/eucher-import-2026-07-30');
const WORK_ID = 'A0418O0003';
const AUTHOR_ID = 'A0418';
const EXPECTED_SEGMENTS = 625;
const EXPECTED_NOTES = 22;
const EXPECTED_HASHES = {
  'eucher-segments-candidate.json': '6DAD3D8A2AFFA69C53AC97A8B7DAA5A6771038D9DB208AFFF7BAF0DA89BAAE08',
  'eucher-alerts.json': '53D6CC097695D84017D98CF5E091032522542E23B64A481433AACA93ABD91D0B',
  'eucher-metadata-candidate.json': '2CDDEA7912A68B2D4213275BDAC579F78AFFDBA69812D85D1FE5E5012610A90A',
  'eucher-audit.json': 'CAE399F1C5805434AAC42E4E9DBA1A8D28332D6BAEB5AB1FB21EC647DDAE4D12',
};
const IMMUTABLE = [
  ['C:/Corpus Scriptura/CS - Espace travail IA/Saint_Eucher_Du_mepris_du_monde_1672_transcription.docx', '53D61F41DD610C77875D300F81E0B50E5DE460E133AC215A49776330F706A279'],
  ['D:/OneDrive/Bureau/Du_mépris_du_monde.pdf', '4799AE77B4225144C33588FB039810EBD2412C94C9891F3E399417D0C972B261'],
];
const SEGMENT_COLUMNS = [
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte', 'ref_niv5_texte',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'texte_original', 'notes',
  'paragraphe', 'rang', 'controle_rang_manuel', 'controle_verifie', 'marquage_source',
  'liens_revus_le', 'liens_revus_par',
];
const SEGMENT_TYPES = [
  'text', 'integer', 'text',
  'text', 'text', 'text', 'text', 'text',
  'text', 'text', 'text', 'text', 'text',
  'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text',
  'integer', 'integer', 'text', 'boolean', 'text',
  'timestamptz', 'text',
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
const countNoteDefinitions = (rows) => rows.reduce((total, row) => {
  const matches = String(row.notes ?? '').match(/\[\[\d+\]\]/g);
  return total + (matches?.length ?? 0);
}, 0);

mkdirSync(ROOT, { recursive: true });
for (const [name, expected] of Object.entries(EXPECTED_HASHES)) {
  const actual = fileHash(resolve(ROOT, name));
  if (actual !== expected) throw new Error(`Artefact non visé : ${name}; attendu ${expected}, obtenu ${actual}`);
}
for (const [path, expected] of IMMUTABLE) {
  const actual = fileHash(resolve(path));
  if (actual !== expected) throw new Error(`Source intangible modifiée : ${path}`);
}

const audit = JSON.parse(readFileSync(resolve(ROOT, 'eucher-audit.json'), 'utf8'));
const failed = Object.entries(audit.invariants).filter(([, ok]) => ok !== true).map(([key]) => key);
if (failed.length) throw new Error(`Invariants du candidat en échec : ${failed.join(', ')}`);
if (audit.stop_before_links !== true) throw new Error('La séparation éditoriale / liens n’est pas attestée.');
const segments = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'eucher-metadata-candidate.json'), 'utf8'));
if (segments.length !== EXPECTED_SEGMENTS || metadata.oeuvre_initiale.id_oeuvre !== WORK_ID) throw new Error('Candidat inattendu.');
if (countNoteDefinitions(segments) !== EXPECTED_NOTES) throw new Error('Nombre de notes du candidat inattendu.');
if (segments.some((row) => row.lien_1 || row.lien_2 || row.lien_3 || row.lien_4 || row.liens_revus_le || row.liens_revus_par)) {
  throw new Error('Le candidat contient un état de liens interdit pendant la phase éditoriale.');
}

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes de .env.local');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const translationId = metadata.catalogue_notice.id_traduction;
const [authors, works, notices, stableNotices, liveSegments] = await Promise.all([
  must(db.from('auteurs').select('*').eq('id_auteur', AUTHOR_ID), 'auteur'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', WORK_ID).eq('id_traduction', translationId), 'notice'),
  must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', WORK_ID), 'notices portant l’identifiant stable'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero'), 'segments'),
]);
if (authors.length !== 1 || authors[0].nom !== 'Eucher de Lyon') throw new Error('Auteur A0418 absent ou inattendu.');
if (stableNotices.some((notice) => notice.titre_stable !== metadata.catalogue_notice.titre_stable
    || notice.id_traduction !== translationId)) {
  throw new Error(`Collision d’identifiant stable ${WORK_ID} avec une autre œuvre du catalogue.`);
}
if (!((works.length === 0 && notices.length === 0 && liveSegments.length === 0)
  || (works.length === 1 && notices.length === 1 && liveSegments.length === EXPECTED_SEGMENTS))) {
  throw new Error(`Préétat partiel interdit : ${works.length} œuvre(s), ${notices.length} notice(s), ${liveSegments.length} segment(s).`);
}

const beforePath = writeSnapshot('eucher-pre-import.json', {
  captured_at: new Date().toISOString(),
  author: authors[0],
  work: works[0] ?? null,
  notice: notices[0] ?? null,
  segments: liveSegments,
});
const workColumns = Object.keys(metadata.oeuvre_initiale);
const noticeColumns = Object.keys(metadata.catalogue_notice);
const expectedSegmentsCanonical = canonicalSegments(segments);
const expectedWork = canonicalWork(metadata.oeuvre_initiale, workColumns);

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true,
    apply: false,
    idempotent_poststate: works.length === 1,
    target: WORK_ID,
    segments: segments.length,
    notes: EXPECTED_NOTES,
    candidate_sha256: EXPECTED_HASHES['eucher-segments-candidate.json'],
    snapshot: beforePath,
  }, null, 2));
  process.exit(0);
}

if (works.length === 0) {
  const payload = JSON.stringify(expectedSegmentsCanonical);
  if (payload.includes('$eucher_segments$')) throw new Error('Collision de délimiteur SQL.');
  const recordShape = SEGMENT_COLUMNS.map((column, index) => `${column} ${SEGMENT_TYPES[index]}`).join(',');
  const sql = `do $eucher_import$
declare n integer;
declare next_line integer;
declare generated_line text;
begin
  lock table catalogue_notices in share row exclusive mode;
  if not exists(select 1 from auteurs where id_auteur=${lit(AUTHOR_ID)} and nom='Eucher de Lyon') then
    raise exception 'Auteur A0418 absent ou inattendu';
  end if;
  if exists(select 1 from oeuvres where id_oeuvre=${lit(WORK_ID)})
     or exists(select 1 from segments where id_oeuvre=${lit(WORK_ID)})
     or exists(select 1 from catalogue_notices where id_oeuvre_stable=${lit(WORK_ID)}) then
    raise exception 'La cible Eucher n est plus vide';
  end if;
  select coalesce(max(substring(id_ligne from '([0-9]+)$')::integer),0)+1 into next_line
    from catalogue_notices where id_ligne ~ '[0-9]+$';
  generated_line := 'V20-' || lpad(next_line::text,5,'0');
  insert into catalogue_notices(id_ligne,${noticeColumns.join(',')})
    values(generated_line,${noticeColumns.map((column) => lit(metadata.catalogue_notice[column])).join(',')});
  insert into oeuvres(${workColumns.join(',')})
    values(${workColumns.map((column) => lit(metadata.oeuvre_initiale[column])).join(',')});
  insert into segments(${SEGMENT_COLUMNS.join(',')})
    select ${SEGMENT_COLUMNS.join(',')} from jsonb_to_recordset($eucher_segments$${payload}$eucher_segments$::jsonb)
      as x(${recordShape});
  get diagnostics n=row_count;
  if n<>${EXPECTED_SEGMENTS} then raise exception '${EXPECTED_SEGMENTS} segments attendus, % insérés',n; end if;
  update catalogue_notices set presence_sur_le_site=false
    where id_oeuvre_stable=${lit(WORK_ID)} and id_traduction=${lit(translationId)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Notice Eucher absente ou dupliquée'; end if;
  select count(*) into n from segments where id_oeuvre=${lit(WORK_ID)};
  if n<>${EXPECTED_SEGMENTS} then raise exception 'Postéat segments invalide : %',n; end if;
  select count(*) into n from segments where id_oeuvre=${lit(WORK_ID)}
    and (lien_1 is not null or lien_2 is not null or lien_3 is not null or lien_4 is not null
      or liens_revus_le is not null or liens_revus_par is not null);
  if n<>0 then raise exception 'Des liens ou états de revue ont été importés : %',n; end if;
  select count(*) into n from oeuvres where id_oeuvre=${lit(WORK_ID)} and note='[Corpus Scriptura:depublie]';
  if n<>1 then raise exception 'Import dépublié non attesté'; end if;
end $eucher_import$;`;
  writeFileSync(resolve(ROOT, 'eucher-import-transaction.sql'), sql, 'utf8');
  writeFileSync(resolve(ROOT, 'eucher-import-transaction.sql.sha256'), `${sha(sql)}  eucher-import-transaction.sql\n`, 'utf8');
  const { error } = await db.rpc('exec_sql', { sql });
  if (error) throw new Error(`Transaction Eucher annulée : ${error.message}`);
}

const [postWorks, postNotices, postSegments] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre après import'),
  must(db.from('catalogue_notices').select('*').eq('id_oeuvre_stable', WORK_ID).eq('id_traduction', translationId), 'notice après import'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero'), 'segments après import'),
]);
if (postWorks.length !== 1 || postNotices.length !== 1 || postSegments.length !== EXPECTED_SEGMENTS) throw new Error('Postéat incomplet.');
const actualWork = canonicalWork(postWorks[0], workColumns);
const actualSegments = canonicalSegments(postSegments);
if (json(actualWork) !== json(expectedWork)) throw new Error('Métadonnées de l’œuvre différentes du candidat.');
if (json(actualSegments) !== json(expectedSegmentsCanonical)) throw new Error('Segments relus en base différents du candidat.');
if (postNotices[0].presence_sur_le_site !== false) throw new Error('Publication prématurée.');
if (countNoteDefinitions(postSegments) !== EXPECTED_NOTES) throw new Error('Nombre de notes différent après relecture en base.');

const segmentIds = postSegments.map((row) => row.id);
let linkCount = 0;
for (let i = 0; i < segmentIds.length; i += 200) {
  const rows = await must(db.from('liens_bibliques').select('id').in('segment_id', segmentIds.slice(i, i + 200)), 'liens bibliques');
  linkCount += rows.length;
}
if (linkCount !== 0) throw new Error(`${linkCount} lien(s) biblique(s) trouvé(s), alors que cette phase doit s’arrêter avant les liens.`);

const postPath = writeSnapshot('eucher-post-import.json', {
  captured_at: new Date().toISOString(),
  work: postWorks[0],
  notice: postNotices[0],
  segments: postSegments,
  link_count: linkCount,
});
console.log(JSON.stringify({
  applied: works.length === 0,
  idempotent: works.length === 1,
  target: WORK_ID,
  notice_id: postNotices[0].id,
  notice_line: postNotices[0].id_ligne,
  segments: postSegments.length,
  notes: countNoteDefinitions(postSegments),
  links: linkCount,
  candidate_editorial_sha256: sha(json(expectedSegmentsCanonical)),
  database_editorial_sha256: sha(json(actualSegments)),
  published: postNotices[0].presence_sur_le_site,
  before: beforePath,
  after: postPath,
}, null, 2));
