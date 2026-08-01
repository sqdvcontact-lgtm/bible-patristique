import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('tmp/confessions-import-2026-07-29');
const WORK_ID = 'A0010O0001';
const AUTHOR_ID = 'A0010';
const NOTICE_ID = 2;
const DEPUBLICATION_MARKER = '[Corpus Scriptura:depublie]';
const EXPECTED = {
  master: '3F1951259DC87AD2DDAB62179F2EDEB42165EA0CF4A6075AC198F596908F92BD',
  segments: '3D99B10FD4FF9D7BD5B1F4CE4EEEA0B08BD7689C0C002A41C73BF6A1541ED457',
  metadata: '9A17E22082ED42BDEFD7107647DE1E94821830BA2D9249064F2A9BE315975534',
  audit: '9796A9F1EE6BBFD45CAC1E5FE33C3A6B835194D8A039BB495D6CBA3082EC403A',
  samples: '65FAA00D9750D47F713C21C6AED1F5D17904E2EB4C290FF2968B9D98DC38808F',
  hierarchy: '6D0BA3BDBC89734C04804C51BD7271099EAF438414958F2EC3DBC25865E21577',
};
const FILES = {
  segments: resolve(ROOT, 'confessions-segments-candidate.json'),
  metadata: resolve(ROOT, 'confessions-metadata-candidate.json'),
  audit: resolve(ROOT, 'confessions-audit.json'),
  samples: resolve(ROOT, 'confessions-random-samples.json'),
  hierarchy: resolve(ROOT, 'confessions-hierarchy-map.json'),
};
const MASTER = 'C:/Corpus Scriptura/Augustin/Confessions-Saint-Augustin-Andilly-1649-MASTER.docx';
const SEGMENT_COLUMNS = [
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte', 'ref_niv5_texte',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'texte_original', 'notes',
  'paragraphe', 'rang', 'controle_rang_manuel', 'controle_verifie', 'marquage_source',
  'liens_revus_le', 'liens_revus_par',
];

const sha = (data) => createHash('sha256').update(data).digest('hex').toUpperCase();
const hashFile = (path) => sha(readFileSync(path));
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const stableJson = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const literal = (value) => value === null ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const must = async (promise, label) => {
  const { data, error, count } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data, count };
};
const snapshot = (name, value) => {
  const body = stableJson(value);
  const path = resolve(ROOT, name);
  writeFileSync(path, body, 'utf8');
  writeFileSync(`${path}.sha256`, `${sha(body)}  ${name}\n`, 'utf8');
  return path;
};
const canonicalSegments = (rows) => rows
  .map((row) => Object.fromEntries(SEGMENT_COLUMNS.map((column) => [column, row[column] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const canonicalObject = (row, columns) => Object.fromEntries(columns.map((column) => [column, row?.[column] ?? null]));

for (const [key, path] of Object.entries(FILES)) {
  const actual = hashFile(path);
  if (actual !== EXPECTED[key]) throw new Error(`Artefact non visé ${key}: ${actual}`);
}
if (hashFile(MASTER) !== EXPECTED.master) throw new Error('Le Word maître a changé');

const segments = JSON.parse(readFileSync(FILES.segments, 'utf8'));
const metadata = JSON.parse(readFileSync(FILES.metadata, 'utf8'));
const audit = JSON.parse(readFileSync(FILES.audit, 'utf8'));
const samples = JSON.parse(readFileSync(FILES.samples, 'utf8'));
const hierarchy = JSON.parse(readFileSync(FILES.hierarchy, 'utf8'));
const failed = Object.entries(audit.invariants).filter(([, ok]) => ok !== true).map(([key]) => key);
if (failed.length) throw new Error(`Invariants du candidat en échec: ${failed.join(', ')}`);
if (segments.length !== 10349 || hierarchy.length !== 278 || samples.length !== 73 || samples.some((sample) => sample.recomposition_ok !== true)) {
  throw new Error('Comptes ou sondages du candidat inattendus');
}
if (sha(stableJson(segments)) !== EXPECTED.segments) throw new Error('Empreinte éditoriale interne divergente');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAllSegments() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await must(db.from('segments').select(SEGMENT_COLUMNS.join(',')).eq('id_oeuvre', WORK_ID).order('segment_numero').range(from, from + 999), `segments:${from}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

mkdirSync(ROOT, { recursive: true });
const [{ data: authors }, { data: works }, { data: notices }, liveSegmentResult] = await Promise.all([
  must(db.from('auteurs').select('*').eq('id_auteur', AUTHOR_ID), 'auteur'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('catalogue_notices').select('*').or(`id.eq.${NOTICE_ID},id_ligne.eq.V20-00518`), 'notice'),
  must(db.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', WORK_ID), 'segments cible'),
]);
if (authors.length !== 1 || authors[0].nom !== 'Augustin d’Hippone') throw new Error('Auteur A0010 absent ou inattendu');
const liveSegmentCount = liveSegmentResult.count ?? 0;
const emptyTarget = works.length === 0 && notices.length === 0 && liveSegmentCount === 0;
const resumableStaging = works.length === 1 && works[0].note === DEPUBLICATION_MARKER
  && notices.length === 1 && notices[0].id === NOTICE_ID && notices[0].verifie === false
  && liveSegmentCount === segments.length;
const completedState = works.length === 1 && works[0].note === metadata.publication_patch.note
  && notices.length === 1 && notices[0].id === NOTICE_ID && notices[0].verifie === true && notices[0].presence_sur_le_site === true
  && liveSegmentCount === segments.length;
if (!emptyTarget && !resumableStaging && !completedState) throw new Error(`Préétat cible inattendu: œuvres=${works.length}, notices=${notices.length}, segments=${liveSegmentCount}`);

const beforePath = resolve(ROOT, 'confessions-pre-import.json');
if (emptyTarget) {
  snapshot('confessions-pre-import.json', {
    captured_at: new Date().toISOString(),
    author: authors[0],
    work: null,
    notice: null,
    segments: [],
    artifact_hashes: EXPECTED,
  });
} else if (!existsSync(beforePath)) {
  throw new Error('Sauvegarde du préétat vide introuvable pendant la reprise');
}

if (!APPLY) {
  console.log(JSON.stringify({ ready: true, apply: false, resume: resumableStaging, completed: completedState, target: WORK_ID, segments: segments.length, hierarchy: hierarchy.length, random_samples: samples.length, snapshot: beforePath, hashes: EXPECTED }, null, 2));
  process.exit(0);
}

const backupBody = readFileSync(beforePath);
const journalSubject = 'Confessions d’Augustin - sauvegarde avant nouvel import 1649';
const { data: existingJournals } = await must(db.from('journal_ia').select('id').eq('sujet', journalSubject).order('id', { ascending: false }).limit(1), 'relecture journal');
let journal = existingJournals[0];
if (!journal) {
  ({ data: journal } = await must(db.from('journal_ia').insert({
    sujet: journalSubject,
    probleme: 'Sauvegarde du préétat vide et scellement des artefacts avant import intégral du Word maître.',
    reponse: JSON.stringify({ target: WORK_ID, snapshot: beforePath, snapshot_sha256: sha(backupBody), artifacts: EXPECTED }),
    statut: 'sauvegarde',
  }).select('id').single(), 'journal de sauvegarde'));
}

const workStaging = metadata.oeuvre_staging;
const noticeFinal = metadata.catalogue_notice;
const noticeStaging = { ...noticeFinal, presence_sur_le_site: false, verifie: false };
if (emptyTarget) {
  await must(db.from('oeuvres').insert(workStaging), 'insertion œuvre masquée');
  await must(db.from('catalogue_notices').insert(noticeStaging), 'insertion notice masquée');
}

try {
  if (emptyTarget) {
    const batchSize = 400;
    for (let offset = 0; offset < segments.length; offset += batchSize) {
      const batch = segments.slice(offset, offset + batchSize);
      await must(db.from('segments').insert(batch), `insertion segments ${offset + 1}-${offset + batch.length}`);
    }
  }

  const stagedSegments = await fetchAllSegments();
  const stagedCanonical = canonicalSegments(stagedSegments);
  const expectedCanonical = canonicalSegments(segments);
  if (stableJson(stagedCanonical) !== stableJson(expectedCanonical)) throw new Error('La relecture en base diffère du candidat');
  const [{ data: stagedWork }, { data: stagedNotice }] = await Promise.all([
    must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID).single(), 'œuvre masquée relue'),
    must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID).single(), 'notice masquée relue'),
  ]);
  if (!completedState && (stagedWork.note !== DEPUBLICATION_MARKER || stagedNotice.verifie !== false)) {
    throw new Error('L’œuvre n’est pas restée masquée ou la notice a été validée prématurément pendant la recette');
  }

  const ids = stagedSegments.map((row) => row.id).filter(Boolean);
  let links = 0;
  for (let offset = 0; offset < ids.length; offset += 250) {
    const { count } = await must(db.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids.slice(offset, offset + 250)), `liens:${offset}`);
    links += count ?? 0;
  }
  if (links !== 0) throw new Error(`Des liens ont été créés pendant la passe éditoriale: ${links}`);

  if (!completedState) {
    const finalNote = metadata.publication_patch.note;
    const sql = `do $confessions_publish$ declare n integer; begin
    update oeuvres set note=${literal(finalNote)} where id_oeuvre=${literal(WORK_ID)} and note=${literal(DEPUBLICATION_MARKER)};
    get diagnostics n=row_count; if n<>1 then raise exception 'publication oeuvre: %',n; end if;
    update catalogue_notices set presence_sur_le_site=true, verifie=true where id=${NOTICE_ID} and id_oeuvre_stable=${literal(WORK_ID)} and verifie=false;
    get diagnostics n=row_count; if n<>1 then raise exception 'publication notice: %',n; end if;
    select count(*) into n from segments where id_oeuvre=${literal(WORK_ID)}; if n<>10349 then raise exception 'segments: %',n; end if;
  end $confessions_publish$;`;
    const { error: publishError } = await db.rpc('exec_sql', { sql });
    if (publishError) throw new Error(`Publication transactionnelle annulée: ${publishError.message}`);
  }

  const [postSegments, { data: postWork }, { data: postNotice }] = await Promise.all([
    fetchAllSegments(),
    must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID).single(), 'œuvre finale'),
    must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID).single(), 'notice finale'),
  ]);
  if (stableJson(canonicalSegments(postSegments)) !== stableJson(expectedCanonical)) throw new Error('Dérive après publication');
  const expectedWork = { ...workStaging, ...metadata.publication_patch };
  const expectedNotice = noticeFinal;
  if (stableJson(canonicalObject(postWork, Object.keys(expectedWork))) !== stableJson(expectedWork)) throw new Error('Fiche œuvre finale divergente');
  if (stableJson(canonicalObject(postNotice, Object.keys(expectedNotice))) !== stableJson(expectedNotice)) throw new Error('Notice finale divergente');

  const postPath = snapshot('confessions-post-import.json', {
    captured_at: new Date().toISOString(),
    work: postWork,
    notice: postNotice,
    segments: postSegments,
  });
  console.log(JSON.stringify({
    applied: !completedState,
    idempotent_completed_state: completedState,
    target: WORK_ID,
    segments: postSegments.length,
    editorial_sha256: sha(stableJson(canonicalSegments(postSegments))),
    work_published: postWork.note !== DEPUBLICATION_MARKER,
    notice_published: postNotice.presence_sur_le_site,
    links_bibliques: links,
    journal_id: journal.id,
    before: beforePath,
    after: postPath,
  }, null, 2));
} catch (error) {
  console.error(`IMPORT MASQUÉ INCOMPLET: ${error.message}`);
  process.exitCode = 1;
}
