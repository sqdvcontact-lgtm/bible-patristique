import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const { createClient } = await import('@supabase/supabase-js').catch(() => import('../node_modules/.ignored/@supabase/supabase-js/dist/index.mjs'));

const WORK = 'A0091O0001';
const ROOT = 'tmp/ratramne-import-2026-07-29';
const candidate = JSON.parse(readFileSync(`${ROOT}/ratramne-segments-candidate.json`, 'utf8'));
const candidateAudit = JSON.parse(readFileSync(`${ROOT}/ratramne-audit.json`, 'utf8'));
const candidateMetadata = JSON.parse(readFileSync(`${ROOT}/ratramne-metadata-candidate.json`, 'utf8'));
const alerts = JSON.parse(readFileSync(`${ROOT}/ratramne-alerts.json`, 'utf8'));
const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const candidateHash = sha(readFileSync(`${ROOT}/ratramne-segments-candidate.json`));
const alertsHash = sha(readFileSync(`${ROOT}/ratramne-alerts.json`));

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; };
const [work, author, notice, rows, charte] = await Promise.all([
  must(db.from('oeuvres').select('*').eq('id_oeuvre', WORK).single(), 'œuvre'),
  must(db.from('auteurs').select('*').eq('id_auteur', 'A0091').single(), 'auteur'),
  must(db.from('catalogue_notices').select('*').eq('id', 1937).single(), 'notice'),
  must(db.from('segments').select('*').eq('id_oeuvre', WORK).order('segment_numero'), 'segments'),
  must(db.from('parametres').select('*').eq('cle', 'charte_ia').single(), 'charte'),
]);
const ids = rows.map((row) => row.id);
const links = [];
for (let index = 0; index < ids.length; index += 200) links.push(...await must(db.from('liens_bibliques').select('*').in('segment_id', ids.slice(index, index + 200)), 'liens'));

const editorialFields = [
  'segment_numero','segment_texte','ref_niv1','ref_niv2','ref_niv3','ref_niv4','ref_niv5',
  'ref_niv1_texte','ref_niv2_texte','ref_niv3_texte','ref_niv4_texte','ref_niv5_texte',
  'nature','texte_original','notes','paragraphe','rang','marquage_source',
];
const differences = [];
for (let index = 0; index < Math.max(candidate.length, rows.length); index++) {
  const expected = candidate[index];
  const actual = rows[index];
  if (!expected || !actual) { differences.push({ index: index + 1, kind: 'missing-row' }); continue; }
  for (const field of editorialFields) if ((expected[field] ?? null) !== (actual[field] ?? null)) {
    differences.push({ segment: actual.segment_numero, field, expected: expected[field] ?? null, actual: actual[field] ?? null });
  }
}

const displayFields = ['ref_niv1','ref_niv1_texte','ref_niv2','ref_niv2_texte','ref_niv3','ref_niv3_texte','ref_niv4','ref_niv4_texte','segment_texte','texte_original'];
const values = rows.flatMap((row) => displayFields.map((field) => ({ segment: row.segment_numero, field, value: String(row[field] ?? '') })).filter((item) => item.value));
const occurrences = (regex) => values.flatMap((item) => [...item.value.matchAll(regex)].map((match) => ({ segment: item.segment, field: item.field, excerpt: item.value.slice(Math.max(0, match.index - 35), match.index + match[0].length + 35) })));
const calls = values.flatMap((item) => [...item.value.matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1])));
const definitions = rows.flatMap((row) => [...String(row.notes ?? '').matchAll(/^\[\[(\d+)\]\]/gm)].map((match) => Number(match[1])));
const sequence = Array.from({ length: 184 }, (_, index) => index + 1);

const paragraphIssues = [];
const paragraphGroups = new Map();
for (const row of rows) {
  const key = `${row.nature}|${row.ref_niv1}|${row.ref_niv2 ?? ''}|${row.paragraphe}`;
  if (!paragraphGroups.has(key)) paragraphGroups.set(key, []);
  paragraphGroups.get(key).push(row);
}
for (const [key, group] of paragraphGroups) {
  const ranks = group.map((row) => row.rang).sort((a, b) => a - b);
  if (ranks.some((rank, index) => rank !== index + 1)) paragraphIssues.push({ key, issue: 'rangs', ranks });
  if (group.filter((row) => row.texte_original).some((row) => row.rang !== 1)) paragraphIssues.push({ key, issue: 'latin-hors-rang-1' });
}
const divisionParagraphs = new Map();
for (const row of rows) {
  const key = `${row.nature}|${row.ref_niv1}`;
  if (!divisionParagraphs.has(key)) divisionParagraphs.set(key, new Set());
  divisionParagraphs.get(key).add(row.paragraphe);
}
for (const [key, numbers] of divisionParagraphs) {
  const ordered = [...numbers].sort((a, b) => a - b);
  if (ordered.some((number, index) => number !== index + 1)) paragraphIssues.push({ key, issue: 'paragraphes-non-contigus', numbers: ordered });
}

const sourceMaster = JSON.parse(readFileSync('C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/master/transcription.json', 'utf8'));
const lastBlock = sourceMaster.parallel_blocks.at(-1);
const reviewText = readFileSync('scripts/ratramne-segmentation-review-2026-07-29.md', 'utf8');
const reviewHash = reviewText.match(/Empreinte SHA-256 du candidat : `([A-F0-9]+)`/)?.[1] ?? null;
const readerCode = readFileSync('app/oeuvre/[id]/OeuvreClient.tsx', 'utf8');

const checks = {
  sources_immutable: candidateAudit.invariants.source_hashes_unchanged === true,
  facsimile_complete_to_pdf_209_printed_122: lastBlock.kind === 'end_mark' && lastBlock.pdf_pages.includes(209) && lastBlock.printed_pages.includes(122) && lastBlock.french.text.trim() === 'FIN.',
  metadata_exact: work.titre === 'Du Corps & du Sang du Seigneur'
    && work.sous_titre === 'Où l’on éclaircit tout ce qui a esté dit jusqu’icy de plus considerable sur le Traitté de Ratramne, Du Corps & du Sang du Seigneur.'
    && work.titre_original === 'De corpore et sanguine Domini' && work.langue_originale === 'Latin' && work.langue_trad === 'Français'
    && work.editeur === 'Jean Lucas' && work.ville === 'Rouen' && String(work.date_publication) === '1673',
  author_exact: author.nom === 'Ratramne de Corbie',
  title_page_excluded: !rows.some((row) => row.ref_niv1 === 'Page de titre' || row.segment_texte.startsWith('RATRAMNE,\nAUTREMENT')),
  database_equals_regenerated_candidate: differences.length === 0,
  segment_numbers_contiguous: rows.length === 567 && rows.every((row, index) => row.segment_numero === index + 1),
  structure_exact: rows.slice(0, 323).every((row) => row.nature === 'apparat_critique' && row.ref_niv1 === 'Advertissement')
    && rows.slice(323, 326).every((row) => row.nature === 'apparat_critique' && row.ref_niv1 === 'Témoignages')
    && rows.slice(326, 334).every((row) => row.nature === 'apparat_critique' && row.ref_niv1 === 'Préface')
    && rows.slice(334, 449).every((row) => row.nature === 'texte' && row.ref_niv1 === 'Première partie')
    && rows.slice(449).every((row) => row.nature === 'texte' && row.ref_niv1 === 'Seconde partie'),
  work_title_absent_from_levels: !rows.some((row) => [row.ref_niv1,row.ref_niv2,row.ref_niv3,row.ref_niv4].includes(work.titre)),
  paragraphs_and_ranks_valid: paragraphIssues.length === 0,
  latin_alignment_valid: rows.filter((row) => row.texte_original).length === 101 && rows.filter((row) => row.texte_original).every((row) => row.rang === 1),
  note_sequence_global_unique: calls.length === 184 && definitions.length === 184
    && JSON.stringify(calls) === JSON.stringify(sequence) && JSON.stringify([...definitions].sort((a,b)=>a-b)) === JSON.stringify(sequence),
  no_note_after_closing_quote: occurrences(/[»”"]\s*\[\[\d+\]\]/gu).length === 0,
  no_note_after_punctuation: occurrences(/[.!?…;:,]\s*\[\[\d+\]\]/gu).length === 0,
  no_internal_note_markers: occurrences(/\[\[FN_[^\]]+\]\]/gu).length === 0,
  no_mojibake_or_replacement: occurrences(/(?:Ã.|â€™|â€œ|â€|Å“|�)/gu).length === 0,
  no_forbidden_dash: occurrences(/[—–‑]/gu).length === 0,
  no_markdown_or_html_residue: occurrences(/(?:\*\*|__|<\/?[a-z][^>]*>)/giu).length === 0,
  no_empty_segments: rows.every((row) => row.segment_texte?.trim()),
  links_complete_verified: links.length === 139 && links.every((link) => link.fiabilite === 'vérifié' && link.provenance === 'lecture' && link.arbitrage_requis === false && link.motif?.trim()),
  link_review_markers_complete: rows.every((row) => row.liens_revus_le && row.liens_revus_par === 'IA-lecture'),
  publication_consistent: notice.id_oeuvre_stable === WORK && notice.presence_sur_le_site === true,
  charter_rules_present: charte.valeur.includes('Page de titre bibliographique.')
    && charte.valeur.includes('tous champs affichables confondus')
    && charte.valeur.includes('Un appel de note ne se place jamais après un guillemet fermant.'),
  title_note_data_ready: rows[326].ref_niv1_texte === 'Au roy Charles[[76]].' && String(rows[326].notes ?? '').includes('[[76]] Depuis surnommé LE CHAUVE.'),
  title_note_reader_ready: readerCode.includes('onClick={basculerTooltip}')
    && readerCode.includes('rendreTitreColophonAvecNotes(groupe.niv1, notesTitre)')
    && readerCode.includes('rendreTitreColophonAvecNotes(groupe.niv1_texte, notesTitre)'),
};

const diagnostics = {
  candidate_sha256: candidateHash,
  segmentation_review_sha256: reviewHash,
  segmentation_review_is_current: reviewHash === candidateHash,
  segmentation_alerts_sha256: alertsHash,
  segmentation_alerts_review_is_current: reviewText.includes(alertsHash),
  editorial_control_flags: { verified: rows.filter((row) => row.controle_verifie === true).length, unverified: rows.filter((row) => row.controle_verifie !== true).length },
  differences: differences.slice(0, 20),
  differences_total: differences.length,
  differences_by_field: Object.fromEntries([...new Set(differences.map((item) => item.field ?? item.kind))].map((field) => [field, differences.filter((item) => (item.field ?? item.kind) === field).length])),
  paragraph_issues: paragraphIssues,
  typography: {
    notes_after_closing_quote: occurrences(/[»”"]\s*\[\[\d+\]\]/gu),
    notes_after_punctuation: occurrences(/[.!?…;:,]\s*\[\[\d+\]\]/gu),
    mojibake: occurrences(/(?:Ã.|â€™|â€œ|â€|Å“|�)/gu),
    forbidden_dashes: occurrences(/[—–‑]/gu),
    markdown_or_html: occurrences(/(?:\*\*|__|<\/?[a-z][^>]*>)/giu),
  },
  generator_alerts: {
    total: alerts.length,
    by_type: Object.fromEntries([...new Set(alerts.map((item) => item.type))].map((type) => [type, alerts.filter((item) => item.type === type).length])),
  },
};
console.log(JSON.stringify({ checks, diagnostics, counts: { segments: rows.length, apparatus: rows.filter((row) => row.nature === 'apparat_critique').length, text: rows.filter((row) => row.nature === 'texte').length, signs: rows.reduce((sum,row)=>sum+row.segment_texte.length,0), notes: definitions.length, links: links.length } }, null, 2));
