import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = resolve('audit/heptateuque-import-2026-08-02');
const CANDIDATE_ROOT = resolve('scripts/heptateuque/segmentation-candidate');
const WORK_ID = 'A0010O0023';
const AUTHOR_ID = 'A0010';
const NOTICE_ID = 130;
const EXPECTED_SEGMENTS = 3262;
const EXPECTED_PARAGRAPHS = 787;
const EXPECTED_NOTES = 900;
const DEPUBLICATION_MARKER = '[Corpus Scriptura:depublie]';
const EXPECTED_HASHES = {
  'segments-candidate.json': '1701DDFA0D8ECEF21C49D1E53ACF4550B0864757597FB5BB2081B6A0D77CDF34',
  'segments-candidate.csv': 'F663BEA8CE207153F1BCFAE95B51C043CAAA524F75BAA36F513341A520052D12',
  'source-map.json': '2A18D72C4F45E7A2DD22AB6F05FEFAC1415EC89B510E03FEFC21F90424269ED3',
  'alerts.json': '721E31D349F4E836A479D02BEF19F4429C56777547663585CB199824D3660E9C',
  'review-decisions.json': 'F60652B3C8F84489CF697D49E7BDBC4DBF4E9D0902C8617FCC816B88E8E102B2',
  'audit.json': '47125724C0B7AC5361FE7EBCCBABA3B8A246A13283065BF2222804EC88A48443',
  'editorial-audit.json': 'A898F0E07ADE2361755577EE0DC7473D7B51FF4FCA94806512E2DCCA5282E7EC',
  'controle-segmentation.xlsx': '59C6E75A96542BA8575C98EFD3EADF9E5BF90DB5CD299DBB9B2E427DCBA80938',
};
const SEGMENT_COLUMNS = [
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte', 'ref_niv5_texte',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'texte_original', 'notes',
  'paragraphe', 'rang', 'page', 'controle_rang_manuel', 'controle_verifie', 'marquage_source',
  'liens_revus_le', 'liens_revus_par',
];
const SEGMENT_TYPES = [
  'text', 'integer', 'text',
  'text', 'text', 'text', 'text', 'text',
  'text', 'text', 'text', 'text', 'text',
  'text', 'text', 'text', 'text', 'text', 'text', 'text', 'text',
  'integer', 'integer', 'integer', 'text', 'boolean', 'text',
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
  const { data, error, count } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data, count };
};
const canonicalSegments = (rows) => rows
  .map((row) => Object.fromEntries(SEGMENT_COLUMNS.map((column) => [column, row[column] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const canonicalObject = (row, columns) => Object.fromEntries(columns.map((column) => [column, row?.[column] ?? null]));
const snapshot = (name, value) => {
  const payload = json(value);
  const path = resolve(ROOT, name);
  writeFileSync(path, payload, 'utf8');
  writeFileSync(`${path}.sha256`, `${sha(payload)}  ${name}\n`, 'utf8');
  return path;
};
const noteNumbers = (rows, field) => new Set(rows.flatMap((row) =>
  [...String(field(row) ?? '').matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]))));

mkdirSync(ROOT, { recursive: true });
for (const [name, expected] of Object.entries(EXPECTED_HASHES)) {
  const actual = fileHash(resolve(CANDIDATE_ROOT, name));
  if (actual !== expected) throw new Error(`Artefact non visé : ${name}; attendu ${expected}, obtenu ${actual}`);
}

const rawSegments = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, 'segments-candidate.json'), 'utf8'));
const audit = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, 'audit.json'), 'utf8'));
const editorialAudit = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, 'editorial-audit.json'), 'utf8'));
const review = JSON.parse(readFileSync(resolve(CANDIDATE_ROOT, 'review-decisions.json'), 'utf8'));
if (!audit.passed || audit.failures.length || !editorialAudit.passed || editorialAudit.failures.length || review.remaining !== 0) {
  throw new Error('Les audits finaux du candidat ne sont pas clos.');
}
if (rawSegments.length !== EXPECTED_SEGMENTS || audit.paragraphs !== EXPECTED_PARAGRAPHS || audit.notes !== EXPECTED_NOTES) {
  throw new Error('Comptes du candidat inattendus.');
}
if (rawSegments.some((row) => row.id_oeuvre !== WORK_ID || !Number.isInteger(row.page)
    || row.page < 383 || row.page > 597 || !Number.isInteger(row.paragraphe) || !Number.isInteger(row.rang))) {
  throw new Error('Identité, page, paragraphe ou rang invalide dans le candidat.');
}
if (rawSegments.some((row) => row.lien_1 || row.lien_2 || row.lien_3 || row.lien_4
    || row.liens_revus_le || row.liens_revus_par)) {
  throw new Error('Le candidat contient des liens ou un état de revue interdit pendant la phase A.');
}

const segments = canonicalSegments(rawSegments);
const noteCalls = noteNumbers(rawSegments, (row) => `${row.segment_texte ?? ''} ${row.ref_niv1_texte ?? ''} ${row.ref_niv2_texte ?? ''}`);
const noteDefinitions = noteNumbers(rawSegments, (row) => row.notes);
if (noteCalls.size !== EXPECTED_NOTES || noteDefinitions.size !== EXPECTED_NOTES
    || Math.min(...noteCalls) !== 1 || Math.max(...noteCalls) !== EXPECTED_NOTES
    || [...noteCalls].some((number) => !noteDefinitions.has(number))) {
  throw new Error('Appels ou définitions de notes incohérents.');
}

const finalNote = 'Édition de référence : Œuvres complètes de saint Augustin, sous la direction de M. Raulx, tome IV, Bar-le-Duc, L. Guérin & Cie, 1866, p. 383-597. Traduction de l’abbé Pognon. Les sept livres des Questions sur l’Heptateuque sont complets ; l’introduction et l’apparat final sont conservés.';
const workStaging = {
  id_oeuvre: WORK_ID,
  id_auteur: AUTHOR_ID,
  titre: 'Questions sur l’Heptateuque',
  titre_original: 'Quaestiones in Heptateuchum',
  langue_originale: 'Latin',
  langue_trad: 'Français',
  date_approx: '419-420',
  composition_debut_annee: 419,
  composition_debut_precision: 'exacte',
  composition_fin_annee: 420,
  composition_fin_precision: 'exacte',
  genre: 'Questions bibliques',
  genres: ['Questions bibliques', 'Exégèse'],
  trad_auteur: 'Abbé Pognon',
  note: DEPUBLICATION_MARKER,
  editeur: 'L. Guérin & Cie',
  collection: 'Œuvres complètes de saint Augustin, tome IV',
  ville: 'Bar-le-Duc',
  date_publication: '1866',
  publication_debut_annee: 1866,
  publication_debut_precision: 'exacte',
  url_source: 'https://fr.wikisource.org/wiki/Livre:Augustin_-_Œuvres_complètes,_éd._Raulx,_tome_IV.djvu',
  niveaux_sommaire: 2,
  niveaux_corps: 2,
  profondeur_sommaire: 2,
  texte_sommaire: '1,1,0,0,0',
  texte_corps: '1,1,0,0,0',
  afficher_numeros: false,
  lecture_texte_entier: false,
  nb_signes: rawSegments.reduce((sum, row) => sum + String(row.segment_texte ?? '').length, 0),
};
const workColumns = Object.keys(workStaging);

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes.');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAllSegments() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await must(db.from('segments').select(SEGMENT_COLUMNS.join(','))
      .eq('id_oeuvre', WORK_ID).order('segment_numero').range(from, from + 999), `segments:${from}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const [{ data: authors }, { data: works }, { data: notices }, liveSegments, pageProbe] = await Promise.all([
  must(db.from('auteurs').select('*').eq('id_auteur', AUTHOR_ID), 'auteur'),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID).eq('id_oeuvre_stable', WORK_ID), 'notice'),
  fetchAllSegments(),
  must(db.from('segments').select('page').limit(1), 'colonne page'),
]);
if (!pageProbe.data) throw new Error('La colonne page n’est pas exposée par le schéma courant.');
if (authors.length !== 1 || authors[0].nom !== 'Augustin d’Hippone') throw new Error('Auteur A0010 absent ou inattendu.');
if (notices.length !== 1 || notices[0].id_ligne !== 'V20-00611') throw new Error('Notice de catalogue absente ou inattendue.');
const emptyState = works.length === 0 && liveSegments.length === 0 && notices[0].presence_sur_le_site === false;
const stagingState = works.length === 1 && works[0].note === DEPUBLICATION_MARKER
  && liveSegments.length <= EXPECTED_SEGMENTS
  && (notices[0].presence_sur_le_site === false
    || (liveSegments.length === EXPECTED_SEGMENTS && notices[0].presence_sur_le_site === true));
const completedState = works.length === 1 && liveSegments.length === EXPECTED_SEGMENTS
  && works[0].note === finalNote && notices[0].presence_sur_le_site === true;
if (!emptyState && !stagingState && !completedState) {
  throw new Error(`Préétat partiel interdit : œuvres=${works.length}, segments=${liveSegments.length}, publié=${notices[0].presence_sur_le_site}`);
}
if (stagingState && json(canonicalSegments(liveSegments)) !== json(canonicalSegments(segments.slice(0, liveSegments.length)))) {
  throw new Error('Le préétat masqué ne correspond pas au préfixe du candidat.');
}

const beforePath = resolve(ROOT, 'heptateuque-pre-import.json');
if (emptyState) {
  snapshot('heptateuque-pre-import.json', {
    captured_at: new Date().toISOString(),
    author: authors[0],
    work: null,
    notice: notices[0],
    segments: [],
    artifact_hashes: EXPECTED_HASHES,
  });
} else if (!existsSync(beforePath)) {
  throw new Error('Sauvegarde du préétat introuvable pour la reprise idempotente.');
}

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true,
    apply: false,
    completed: completedState,
    resumable_staging: stagingState,
    target: WORK_ID,
    segments: segments.length,
    paragraphs: EXPECTED_PARAGRAPHS,
    notes: EXPECTED_NOTES,
    pages: [Math.min(...segments.map((row) => row.page)), Math.max(...segments.map((row) => row.page))],
    links: 0,
    snapshot: beforePath,
  }, null, 2));
} else {
if (emptyState) {
  const sql = `do $heptateuque_stage$
declare n integer;
begin
  if not exists(select 1 from auteurs where id_auteur=${lit(AUTHOR_ID)} and nom=${lit('Augustin d’Hippone')}) then
    raise exception 'Auteur A0010 absent ou inattendu';
  end if;
  if exists(select 1 from oeuvres where id_oeuvre=${lit(WORK_ID)})
     or exists(select 1 from segments where id_oeuvre=${lit(WORK_ID)}) then
    raise exception 'La cible Heptateuque n est plus vide';
  end if;
  if not exists(select 1 from catalogue_notices where id=${NOTICE_ID}
      and id_oeuvre_stable=${lit(WORK_ID)} and id_ligne='V20-00611' and presence_sur_le_site=false) then
    raise exception 'Notice initiale absente ou déjà publiée';
  end if;
  insert into oeuvres(${workColumns.join(',')})
    values(${workColumns.map((column) => lit(workStaging[column])).join(',')});
  update catalogue_notices set presence_sur_le_site=false
    where id=${NOTICE_ID} and id_oeuvre_stable=${lit(WORK_ID)} and presence_sur_le_site=true;
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Le déclencheur de catalogue n a pas visé la notice attendue'; end if;
end $heptateuque_stage$;`;
  writeFileSync(resolve(ROOT, 'heptateuque-stage-transaction.sql'), sql, 'utf8');
  writeFileSync(resolve(ROOT, 'heptateuque-stage-transaction.sql.sha256'), `${sha(sql)}  heptateuque-stage-transaction.sql\n`, 'utf8');
  const { error } = await db.rpc('exec_sql', { sql });
  if (error) throw new Error(`Création de l’état masqué annulée : ${error.message}`);
}

if (!completedState) {
  const start = liveSegments.length;
  const batchSize = 250;
  for (let offset = start; offset < segments.length; offset += batchSize) {
    const batch = segments.slice(offset, offset + batchSize);
    await must(db.from('segments').insert(batch), `insertion segments ${offset + 1}-${offset + batch.length}`);
    await must(db.from('catalogue_notices').update({ presence_sur_le_site: false })
      .eq('id', NOTICE_ID).eq('id_oeuvre_stable', WORK_ID), `maintien masqué après lot ${offset + 1}`);
  }
}

const stagedSegments = await fetchAllSegments();
const expectedCanonical = canonicalSegments(segments);
const stagedCanonical = canonicalSegments(stagedSegments);
if (json(stagedCanonical) !== json(expectedCanonical)) throw new Error('La relecture intégrale en base diffère du candidat.');
const [{ data: stagedWorks }, { data: stagedNotices }] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre masquée'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID), 'notice masquée'),
]);
if (stagedWorks.length !== 1 || stagedNotices.length !== 1) throw new Error('Postétat masqué incomplet.');

const { data: stagedIds } = await must(db.from('segments').select('id').eq('id_oeuvre', WORK_ID)
  .order('segment_numero'), 'identifiants des segments');
const ids = stagedIds.map((row) => row.id);
let links = 0;
for (let offset = 0; offset < ids.length; offset += 250) {
  const { count } = await must(db.from('liens_bibliques').select('id', { count: 'exact', head: true })
    .in('segment_id', ids.slice(offset, offset + 250)), `liens:${offset}`);
  links += count ?? 0;
}
if (links !== 0) throw new Error(`${links} lien(s) trouvé(s) avant la phase B.`);

if (!completedState) {
  const publishSql = `do $heptateuque_publish$
declare n integer;
begin
  update oeuvres set note=${lit(finalNote)}
    where id_oeuvre=${lit(WORK_ID)} and note=${lit(DEPUBLICATION_MARKER)};
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Publication oeuvre : %',n; end if;
  select count(*) into n from catalogue_notices
    where id=${NOTICE_ID} and id_oeuvre_stable=${lit(WORK_ID)} and presence_sur_le_site=true;
  if n<>1 then raise exception 'Déclencheur de publication notice : %',n; end if;
  select count(*) into n from segments where id_oeuvre=${lit(WORK_ID)};
  if n<>${EXPECTED_SEGMENTS} then raise exception 'Segments avant publication : %',n; end if;
end $heptateuque_publish$;`;
  const { error } = await db.rpc('exec_sql', { sql: publishSql });
  if (error) throw new Error(`Publication transactionnelle annulée : ${error.message}`);
}

const [postSegments, { data: postWorks }, { data: postNotices }] = await Promise.all([
  fetchAllSegments(),
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre finale'),
  must(db.from('catalogue_notices').select('*').eq('id', NOTICE_ID), 'notice finale'),
]);
if (postWorks.length !== 1 || postNotices.length !== 1 || postSegments.length !== EXPECTED_SEGMENTS) {
  throw new Error('Postétat final incomplet.');
}
if (json(canonicalSegments(postSegments)) !== json(expectedCanonical)) throw new Error('Dérive après publication.');
const expectedWork = { ...workStaging, note: finalNote };
if (json(canonicalObject(postWorks[0], Object.keys(expectedWork))) !== json(expectedWork)) {
  throw new Error('Métadonnées finales différentes du candidat.');
}
if (postNotices[0].presence_sur_le_site !== true) throw new Error('Notice non publiée après recette.');

const postPath = snapshot('heptateuque-post-import.json', {
  captured_at: new Date().toISOString(),
  work: postWorks[0],
  notice: postNotices[0],
  segments: postSegments,
  links,
});
console.log(JSON.stringify({
  applied: !completedState,
  idempotent_completed_state: completedState,
  target: WORK_ID,
  segments: postSegments.length,
  paragraphs: EXPECTED_PARAGRAPHS,
  notes: EXPECTED_NOTES,
  pages: [Math.min(...postSegments.map((row) => row.page)), Math.max(...postSegments.map((row) => row.page))],
  links,
  candidate_editorial_sha256: sha(json(expectedCanonical)),
  database_editorial_sha256: sha(json(canonicalSegments(postSegments))),
  published: postNotices[0].presence_sur_le_site,
  before: beforePath,
  after: postPath,
}, null, 2));
}
