import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve('tmp/eucher-import-2026-07-30');
const WORK_ID = 'A0418O0003';
const AUTHOR_ID = 'A0418';
const TRANSLATION_ID = 'TR_FR_1672_ARNAULD_DANDILLY_DE_CONTEMPTU_MUNDI';
const SOURCE_HASHES = {
  docx: ['C:/Corpus Scriptura/CS - Espace travail IA/Saint_Eucher_Du_mepris_du_monde_1672_transcription.docx', '53D61F41DD610C77875D300F81E0B50E5DE460E133AC215A49776330F706A279'],
  pdf: ['D:/OneDrive/Bureau/Du_mépris_du_monde.pdf', '4799AE77B4225144C33588FB039810EBD2412C94C9891F3E399417D0C972B261'],
};
const expectedSignatures = [
  'A. Debreda Curé de saint André.',
  'T. Fortin Proviseur du College de Harcourt.',
  'Grenet Curé de saint Benoist.',
  'N. Gobillon Curé de saint Laurent.',
];

const sha = (data) => createHash('sha256').update(data).digest('hex').toUpperCase();
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const json = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (query, label) => {
  const { data, error, count } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return { data: data ?? [], count };
};
const probe = async (query) => {
  const { data, error, count } = await query;
  return { data: data ?? [], count, error: error?.message ?? null };
};
const candidate = JSON.parse(readFileSync(resolve(ROOT, 'eucher-segments-candidate.json'), 'utf8'));
const metadata = JSON.parse(readFileSync(resolve(ROOT, 'eucher-metadata-candidate.json'), 'utf8'));
const segmentColumns = Object.keys(candidate[0]);
const canonical = (rows) => rows.map((row) => Object.fromEntries(segmentColumns.map((key) => [key, row[key] ?? null])))
  .sort((a, b) => a.segment_numero - b.segment_numero);

const [workResult, noticesResult, segmentsResult, anonWorkResult, anonMainResult, anonApparatusResult] = await Promise.all([
  must(service.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID), 'œuvre service'),
  must(service.from('catalogue_notices').select('*').eq('id_oeuvre_stable', WORK_ID).order('id'), 'notices de même identifiant'),
  must(service.from('segments').select('*').eq('id_oeuvre', WORK_ID).order('segment_numero').range(0, 999), 'segments service'),
  probe(anon.from('oeuvres').select('id_oeuvre,titre,sous_titre,date_mise_en_ligne').eq('id_oeuvre', WORK_ID)),
  probe(anon.from('segments').select('id', { count: 'exact' }).eq('id_oeuvre', WORK_ID)
    .in('nature', ['texte', 'introduction', 'citation', 'dialogue', 'texte absent']).range(0, 999)),
  probe(anon.from('segments').select('id', { count: 'exact' }).eq('id_oeuvre', WORK_ID)
    .eq('nature', 'apparat_critique').range(0, 999)),
]);
const work = workResult.data[0];
const notices = noticesResult.data;
const segments = canonical(segmentsResult.data);
const expected = canonical(candidate);
const corpus = segments.map((row) => `${row.segment_texte}\n${row.notes ?? ''}`).join('\n');
const noteCalls = [...segments.map((row) => row.segment_texte).join('\n').matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]));
const noteDefs = [...segments.map((row) => row.notes ?? '').join('\n').matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]));
const linkIds = segmentsResult.data.map((row) => row.id);
let linkCount = 0;
for (let i = 0; i < linkIds.length; i += 200) {
  linkCount += (await must(service.from('liens_bibliques').select('id').in('segment_id', linkIds.slice(i, i + 200)), 'liens bibliques')).data.length;
}
const actualSignatures = segments
  .filter((row) => row.ref_niv1 === 'Approbation des docteurs' && row.paragraphe >= 2)
  .map((row) => row.segment_texte);
const titleGroups = Map.groupBy(notices, (notice) => notice.titre_stable);
const sourceHashChecks = Object.fromEntries(Object.entries(SOURCE_HASHES).map(([key, [path, expectedHash]]) => [key, {
  expected: expectedHash,
  actual: sha(readFileSync(path)),
  matches: sha(readFileSync(path)) === expectedHash,
}]));
const checks = {
  source_hashes_unchanged: Object.values(sourceHashChecks).every((entry) => entry.matches),
  one_database_work: workResult.data.length === 1,
  work_public: Boolean(work?.date_mise_en_ligne),
  exact_candidate_reproduction: json(segments) === json(expected),
  anonymous_api_closed_as_configured: [anonWorkResult.error, anonMainResult.error, anonApparatusResult.error]
    .every((error) => error === 'permission denied for table oeuvres' || error === 'permission denied for table segments'),
  segment_count_625: segments.length === 625,
  note_sequence_complete: json([...new Set(noteCalls)].sort((a, b) => a - b)) === json(Array.from({ length: 22 }, (_, i) => i + 1))
    && json([...new Set(noteDefs)].sort((a, b) => a - b)) === json(Array.from({ length: 22 }, (_, i) => i + 1)),
  note_calls_before_punctuation_and_quote: !/[.,;:!?…»]\[\[\d+\]\]/u.test(segments.map((row) => row.segment_texte).join('\n')),
  no_legacy_links: segments.every((row) => !row.lien_1 && !row.lien_2 && !row.lien_3 && !row.lien_4),
  links_not_reviewed: segments.every((row) => !row.liens_revus_le && !row.liens_revus_par),
  no_biblical_links: linkCount === 0,
  no_long_s_or_replacement_character: !/[ſ�]/u.test(corpus),
  no_straight_quotes: !/"/u.test(corpus),
  no_double_spaces: !/ {2,}/u.test(corpus),
  title_page_excluded: !corpus.includes('S. Eucher du mépris du monde'),
  colophon_excluded_from_segments: !corpus.includes('Achevé d’imprimer pour la premiere fois le troisiéme Decembre 1671.'),
  stable_work_id_unique_to_one_title: titleGroups.size === 1,
  notice_source_metadata_current: notices.length === 1
    && notices[0].niveau_verification === metadata.catalogue_notice.niveau_verification,
  approbation_signatures_match_facsimile: json(actualSignatures.map((value) => value.toLocaleLowerCase('fr'))) === json(expectedSignatures.map((value) => value.toLocaleLowerCase('fr'))),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = {
  audited_at: new Date().toISOString(),
  work_id: WORK_ID,
  checks,
  failed,
  database: {
    editorial_sha256: sha(json(segments)),
    candidate_sha256: sha(json(expected)),
    segments: segments.length,
    anon_main_segments: anonMainResult.count,
    anon_apparatus_segments: anonApparatusResult.count,
    anon_errors: {
      work: anonWorkResult.error,
      main_segments: anonMainResult.error,
      apparatus_segments: anonApparatusResult.error,
    },
    notes: noteDefs.length,
    biblical_links: linkCount,
  },
  stable_id_collision: notices.map((notice) => ({
    id: notice.id,
    id_ligne: notice.id_ligne,
    title: notice.titre_stable,
    translation_id: notice.id_traduction,
    presence_sur_le_site: notice.presence_sur_le_site,
    created_at: notice.created_at,
  })),
  facsimile_signature_comparison: { expected: expectedSignatures, actual: actualSignatures },
  source_hashes: sourceHashChecks,
  random_facsimile_pages_seed_20260731: [17, 22, 37, 48, 52, 68, 72, 82, 87, 88, 89, 90, 91],
};
const path = resolve(ROOT, 'eucher-audit-control-2.json');
writeFileSync(path, json(report), 'utf8');
writeFileSync(`${path}.sha256`, `${sha(json(report))}  eucher-audit-control-2.json\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
