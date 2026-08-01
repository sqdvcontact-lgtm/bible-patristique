import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const RECORD = process.argv.includes('--record');
const ROOT = resolve('tmp/confessions-import-2026-07-29');
const WORK_ID = 'A0010O0001';
const EXPECTED_SEGMENT_HASH = '71B0AB5314E8704680B5693AF4E876DD4F54A69CFDAA4F38D5ACFCAAA1CB81F8';
const SEGMENT_COLUMNS = [
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte', 'ref_niv5_texte',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'texte_original', 'notes',
  'paragraphe', 'rang', 'controle_rang_manuel', 'controle_verifie', 'marquage_source',
  'liens_revus_le', 'liens_revus_par',
];
const BOOK_COUNTS = {
  'Livre premier': 20,
  'Livre second': 10,
  'Livre troisiesme': 12,
  'Livre quatriesme': 16,
  'Livre cinquiesme': 14,
  'Livre sixiesme': 16,
  'Livre septiesme': 21,
  'Livre huictiesme': 12,
  'Livre neufiesme': 13,
  'Livre dixiesme': 43,
  'Livre unziesme': 31,
  'Livre douziesme': 32,
  'Livre treiziesme': 38,
};

const sha = (data) => createHash('sha256').update(data).digest('hex').toUpperCase();
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const stableJson = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const must = async (promise, label) => {
  const { data, error, count } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data, count };
};
const plain = (text) => text.startsWith('*') && text.endsWith('*') ? text.slice(1, -1) : text;
const canonicalSegments = (rows) => rows
  .map((row) => Object.fromEntries(SEGMENT_COLUMNS.map((column) => [column, row[column] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const canonicalObject = (row, columns) => Object.fromEntries(columns.map((column) => [column, row?.[column] ?? null]));

const candidate = JSON.parse(readFileSync(resolve(ROOT, 'confessions-segments-candidate.json'), 'utf8'));
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'confessions-metadata-candidate.json'), 'utf8'));
const sourceMap = JSON.parse(readFileSync(resolve(ROOT, 'confessions-source-map.json'), 'utf8'));
const hierarchy = JSON.parse(readFileSync(resolve(ROOT, 'confessions-hierarchy-map.json'), 'utf8'));
const samples = JSON.parse(readFileSync(resolve(ROOT, 'confessions-random-samples.json'), 'utf8'));
if (sha(stableJson(candidate)) !== EXPECTED_SEGMENT_HASH) throw new Error('Candidat éditorial non visé');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data } = await must(db.from('segments').select(`id,${SEGMENT_COLUMNS.join(',')}`).eq('id_oeuvre', WORK_ID).order('segment_numero').range(from, from + 999), `segments:${from}`);
  rows.push(...data);
  if (data.length < 1000) break;
}
const [{ data: work }, { data: notice }] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID).single(), 'fiche œuvre'),
  must(db.from('catalogue_notices').select('*').eq('id', 2).single(), 'notice catalogue'),
]);

const checks = {};
const failures = [];
const check = (name, condition, detail = null) => {
  checks[name] = Boolean(condition);
  if (!condition) failures.push({ name, detail });
};

const canonicalDb = canonicalSegments(rows);
const canonicalCandidate = canonicalSegments(candidate);
check('segment_count_10348', rows.length === 10348, rows.length);
check('database_equals_candidate', stableJson(canonicalDb) === stableJson(canonicalCandidate));
check('database_editorial_sha256', sha(stableJson(canonicalDb)) === EXPECTED_SEGMENT_HASH, sha(stableJson(canonicalDb)));
check('segment_numbers_contiguous', rows.every((row, index) => row.segment_numero === index + 1));
check('no_empty_text', rows.every((row) => row.segment_texte.trim().length > 0));
check('no_boundary_spaces', rows.every((row) => row.segment_texte === row.segment_texte.trim()));
check('allowed_natures_only', rows.every((row) => row.nature === 'texte' || row.nature === 'apparat_critique'));
check('no_original_parallel_text', rows.every((row) => row.texte_original === null));
check('no_legacy_links', rows.every((row) => ['lien_1', 'lien_2', 'lien_3', 'lien_4'].every((field) => row[field] === null)));
check('no_link_review_markers', rows.every((row) => row.liens_revus_le === null && row.liens_revus_par === null));
check('no_straight_apostrophes', rows.every((row) => !row.segment_texte.includes("'")));
check('no_corrupt_characters', rows.every((row) => !/[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f]/.test(row.segment_texte)));
check('no_em_or_en_dash', rows.every((row) => !/[—–]/.test(row.segment_texte)));
check('punctuation_spacing', rows.every((row) => !/ [;:!?]/.test(row.segment_texte)));
check('balanced_italic_markup', rows.every((row) => (row.segment_texte.match(/\*/g) ?? []).length % 2 === 0));
check('title_page_material_absent', rows.every((row) => !/(?:M\. DC\. XLIX\.|PAR MONSIEVR|ARNAVLD D’ANDILLY|A PARIS,|Avec Approbation & Privilege)/.test(row.segment_texte)));
check('transcription_wrapper_absent', rows.every((row) => !/Transcription complète|passe 1|pagination matérielle/.test(row.segment_texte)));

const calls = rows.flatMap((row) => [...row.segment_texte.matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1])));
const definitions = rows.flatMap((row) => [...String(row.notes ?? '').matchAll(/^\[\[(\d+)\]\]/gm)].map((match) => Number(match[1])));
check('note_calls_1_to_7', JSON.stringify(calls) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]), calls);
check('note_definitions_1_to_7', JSON.stringify(definitions) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]), definitions);
check('notes_never_after_closing_quote', rows.every((row) => !/[»”"]\s*\[\[\d+\]\]/.test(row.segment_texte)));

const byNumber = new Map(rows.map((row) => [row.segment_numero, row]));
const recompositionFailures = [];
for (const mapping of sourceMap) {
  const relevant = [];
  for (let number = mapping.first_segment_numero; number <= mapping.last_segment_numero; number++) relevant.push(byNumber.get(number));
  const recomposed = relevant.map((row) => plain(row.segment_texte)).join(' ');
  if (recomposed !== mapping.source_clean) recompositionFailures.push(mapping.source_index);
}
check('all_951_source_paragraphs_recompose', sourceMap.length === 951 && recompositionFailures.length === 0, recompositionFailures);

const paragraphGroups = new Map();
for (const row of rows) {
  const key = [row.nature, row.ref_niv1, row.ref_niv2, row.paragraphe].join('\u001f');
  if (!paragraphGroups.has(key)) paragraphGroups.set(key, []);
  paragraphGroups.get(key).push(row.rang);
}
const rankFailures = [];
for (const [key, ranks] of paragraphGroups) {
  const sorted = [...ranks].sort((a, b) => a - b);
  if (JSON.stringify(sorted) !== JSON.stringify(Array.from({ length: sorted.length }, (_, index) => index + 1))) rankFailures.push({ key, ranks: sorted });
}
check('all_ranks_contiguous', rankFailures.length === 0, rankFailures);

const divisionParagraphs = new Map();
for (const row of rows) {
  const key = [row.nature, row.ref_niv1, row.ref_niv2].join('\u001f');
  if (!divisionParagraphs.has(key)) divisionParagraphs.set(key, new Set());
  divisionParagraphs.get(key).add(row.paragraphe);
}
const paragraphSequenceFailures = [];
for (const [key, values] of divisionParagraphs) {
  const sorted = [...values].sort((a, b) => a - b);
  if (JSON.stringify(sorted) !== JSON.stringify(Array.from({ length: sorted.length }, (_, index) => index + 1))) paragraphSequenceFailures.push({ key, paragraphs: sorted });
}
check('paragraph_numbers_contiguous_per_division', paragraphSequenceFailures.length === 0, paragraphSequenceFailures);

const bodyRows = rows.filter((row) => row.nature === 'texte');
const bodyBooks = [...new Set(bodyRows.map((row) => row.ref_niv1))];
check('thirteen_books_in_order', JSON.stringify(bodyBooks) === JSON.stringify(Object.keys(BOOK_COUNTS)), bodyBooks);
const actualChapterCounts = Object.fromEntries(bodyBooks.map((book) => [book, new Set(bodyRows.filter((row) => row.ref_niv1 === book).map((row) => row.ref_niv2)).size]));
check('chapter_counts_by_book', JSON.stringify(actualChapterCounts) === JSON.stringify(BOOK_COUNTS), actualChapterCounts);
const actualHierarchy = [];
const seenHierarchy = new Set();
for (const row of bodyRows) {
  const key = `${row.ref_niv1}\u001f${row.ref_niv2}`;
  if (!seenHierarchy.has(key)) {
    seenHierarchy.add(key);
    actualHierarchy.push({ ref_niv1: row.ref_niv1, ref_niv2: row.ref_niv2, ref_niv2_texte: row.ref_niv2_texte, source_index: hierarchy[actualHierarchy.length]?.source_index });
  }
}
check('all_278_arguments_match_headings', stableJson(actualHierarchy) === stableJson(hierarchy) && hierarchy.length === 278);

const apparatusRows = rows.filter((row) => row.nature === 'apparat_critique');
check('apparatus_divisions_exact', JSON.stringify([...new Set(apparatusRows.map((row) => row.ref_niv1))]) === JSON.stringify(['Avis au lecteur', 'Approbation des docteurs', 'Privilège du Roi']));
check('body_and_apparatus_counts', bodyRows.length === 10211 && apparatusRows.length === 137, { body: bodyRows.length, apparatus: apparatusRows.length });

const sampleFailures = [];
for (const sample of samples) {
  const mapping = sourceMap.find((item) => item.source_index === sample.source_index);
  const recomposed = Array.from({ length: mapping.last_segment_numero - mapping.first_segment_numero + 1 }, (_, index) => plain(byNumber.get(mapping.first_segment_numero + index).segment_texte)).join(' ');
  if (recomposed !== sample.source) sampleFailures.push(sample.source_index);
}
check('all_73_random_samples_match_database', samples.length === 73 && sampleFailures.length === 0, sampleFailures);

let linkCount = 0;
const ids = rows.map((row) => row.id);
for (let offset = 0; offset < ids.length; offset += 250) {
  const { count } = await must(db.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids.slice(offset, offset + 250)), `liens:${offset}`);
  linkCount += count ?? 0;
}
check('links_table_untouched_for_work', linkCount === 0, linkCount);

const expectedWork = { ...metadata.oeuvre_staging, ...metadata.publication_patch };
const expectedNotice = metadata.catalogue_notice;
check('work_sheet_exact', stableJson(canonicalObject(work, Object.keys(expectedWork))) === stableJson(expectedWork));
check('catalogue_notice_exact', stableJson(canonicalObject(notice, Object.keys(expectedNotice))) === stableJson(expectedNotice));
check('work_is_published', work.note !== '[Corpus Scriptura:depublie]');
check('catalogue_notice_is_published_and_verified', notice.presence_sur_le_site === true && notice.verifie === true);
check('nb_signes_matches_all_stored_text', work.nb_signes === rows.reduce((sum, row) => sum + row.segment_texte.length, 0), { stored: work.nb_signes, calculated: rows.reduce((sum, row) => sum + row.segment_texte.length, 0) });

const report = {
  audited_at: new Date().toISOString(),
  work_id: WORK_ID,
  title: work.titre,
  counts: {
    segments: rows.length,
    body_segments: bodyRows.length,
    apparatus_segments: apparatusRows.length,
    source_paragraphs: sourceMap.length,
    books: bodyBooks.length,
    chapters: hierarchy.length,
    notes: definitions.length,
    random_samples: samples.length,
    links_bibliques: linkCount,
  },
  hashes: {
    candidate_editorial_sha256: EXPECTED_SEGMENT_HASH,
    database_editorial_sha256: sha(stableJson(canonicalDb)),
  },
  checks,
  failures,
};
const reportBody = stableJson(report);
const reportPath = resolve(ROOT, 'confessions-post-import-audit.json');
writeFileSync(reportPath, reportBody, 'utf8');
writeFileSync(`${reportPath}.sha256`, `${sha(reportBody)}  confessions-post-import-audit.json\n`, 'utf8');
if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  let journalId = null;
  if (RECORD) {
    const subject = 'Confessions d’Augustin - import 1649 achevé et audité';
    const { data: existing } = await must(db.from('journal_ia').select('id').eq('sujet', subject).order('id', { ascending: false }).limit(1), 'journal final existant');
    if (existing.length) journalId = existing[0].id;
    else {
      const { data: inserted } = await must(db.from('journal_ia').insert({
        sujet: subject,
        probleme: 'Clôture de la phase éditoriale des Confessions, traduction d’Arnauld d’Andilly, seconde édition de 1649.',
        reponse: JSON.stringify({ report: reportPath, report_sha256: sha(reportBody), editorial_sha256: EXPECTED_SEGMENT_HASH, segments: rows.length, paragraphs: sourceMap.length, books: bodyBooks.length, chapters: hierarchy.length, notes: definitions.length, random_samples: samples.length, links_bibliques: linkCount }),
        statut: 'terminé',
      }).select('id').single(), 'journal final');
      journalId = inserted.id;
    }
  }
  console.log(JSON.stringify({ ok: true, report: reportPath, report_sha256: sha(reportBody), journal_id: journalId, ...report.counts, editorial_sha256: report.hashes.database_editorial_sha256 }, null, 2));
}
