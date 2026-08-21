import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OUT = 'audit/oeuvres-global-2026-07-30';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const hash = (value) => createHash('sha256').update(value).digest('hex');

async function all(table, select = '*', configure = null, order = 'id') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = db.from(table).select(select).range(from, from + 999);
    if (configure) query = configure(query);
    if (order) query = query.order(order);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const [works, authors, segments, links, canon] = await Promise.all([
  all('oeuvres', '*', null, 'id_oeuvre'),
  all('auteurs', '*', null, 'id_auteur'),
  all('segments', '*', null, 'id'),
  all('liens_bibliques', '*', null, 'id'),
  all('versets_canon', 'id', null, 'id'),
]);
const authorById = new Map(authors.map((row) => [row.id_auteur, row]));
const workById = new Map(works.map((row) => [row.id_oeuvre, row]));
const segmentById = new Map(segments.map((row) => [row.id, row]));
const canonIds = new Set(canon.map((row) => row.id));
const segmentsByWork = new Map(works.map((work) => [work.id_oeuvre, []]));
const linksByWork = new Map(works.map((work) => [work.id_oeuvre, []]));
for (const segment of segments) {
  if (!segmentsByWork.has(segment.id_oeuvre)) segmentsByWork.set(segment.id_oeuvre, []);
  segmentsByWork.get(segment.id_oeuvre).push(segment);
}
const orphanLinks = [];
for (const link of links) {
  const segment = segmentById.get(link.segment_id);
  if (!segment) { orphanLinks.push(link); continue; }
  if (!linksByWork.has(segment.id_oeuvre)) linksByWork.set(segment.id_oeuvre, []);
  linksByWork.get(segment.id_oeuvre).push(link);
}
const asText = (value) => String(value ?? '');
const noteCalls = (text) => [...asText(text).matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]));
const reflexiveRepeats = new Set(['nous', 'vous', 'elle', 'elles', 'ils', 'lui']);
const immediateRepeatedWords = (text) => [...asText(text).matchAll(/\b([\p{L}]{3,})\s+\1\b/giu)]
  .filter((match) => !reflexiveRepeats.has(match[1].toLowerCase())).map((match) => match[0]);
const fieldPresent = (value) => value != null && (typeof value !== 'string' || value.trim() !== '');
const linkKey = (link) => [
  link.segment_id, link.canon_id, link.verset_v2_id, link.livre, link.chapitre,
  link.type, link.fiabilite, link.motif, link.provenance, link.arbitrage_requis,
].join('|');
const structuralRef = (value) => {
  const text = asText(value).trim();
  // A visible « § n » repeats the paragraph label; per charter §6.1 it does not
  // delimit a second grouping level for rank validation.
  return /^§\s*\d+[a-z]?(?:\s|$)/iu.test(text) ? null : (text || null);
};

const reports = [];
for (const work of works) {
  const rows = [...(segmentsByWork.get(work.id_oeuvre) ?? [])].sort((a, b) => a.segment_numero - b.segment_numero);
  const workLinks = linksByWork.get(work.id_oeuvre) ?? [];
  const numbers = rows.map((row) => row.segment_numero).filter(Number.isFinite);
  const numberCounts = new Map();
  for (const number of numbers) numberCounts.set(number, (numberCounts.get(number) ?? 0) + 1);
  const duplicateNumbers = [...numberCounts].filter(([, count]) => count > 1).map(([number, count]) => ({ number, count }));
  const missingNumbers = [];
  if (numbers.length) {
    const present = new Set(numbers);
    for (let number = Math.min(...numbers); number <= Math.max(...numbers); number++) if (!present.has(number)) missingNumbers.push(number);
  }
  const paragraphs = new Map();
  for (const row of rows.filter((item) => Number.isInteger(item.paragraphe) && item.paragraphe > 0)) {
    const textualNamespace = row.nature === 'apparat_critique'
      ? 'apparat'
      : row.nature === 'introduction' ? 'introduction' : 'corps';
    const key = [textualNamespace, ...[1, 2, 3, 4, 5].map((level) => structuralRef(row[`ref_niv${level}`])), row.paragraphe].map((value) => value ?? '∅').join('|');
    if (!paragraphs.has(key)) paragraphs.set(key, []);
    paragraphs.get(key).push(row);
  }
  const paragraphRankErrors = [];
  for (const [key, group] of paragraphs) {
    const ranks = group.map((row) => row.rang).sort((a, b) => a - b);
    if (ranks.some((rank, index) => rank !== index + 1)) paragraphRankErrors.push({ key, paragraph: group[0].paragraphe, segment_numbers: group.map((row) => row.segment_numero), ranks });
  }
  const calls = rows.flatMap((row) => noteCalls(row.segment_texte).map((number) => ({ number, segment_id: row.id, segment_numero: row.segment_numero })));
  const noteShapes = {};
  const noteSamples = [];
  for (const row of rows.filter((item) => item.notes != null)) {
    const shape = Array.isArray(row.notes) ? 'array' : typeof row.notes;
    noteShapes[shape] = (noteShapes[shape] ?? 0) + 1;
    if (noteSamples.length < 8) noteSamples.push({ segment_numero: row.segment_numero, notes: row.notes });
  }
  const exactLinkCounts = new Map();
  for (const link of workLinks) exactLinkCounts.set(linkKey(link), (exactLinkCounts.get(linkKey(link)) ?? 0) + 1);
  const duplicateLinks = [...exactLinkCounts].filter(([, count]) => count > 1).map(([key, count]) => ({ key, count }));
  const typography = {
    replacement_character: rows.filter((row) => asText(row.segment_texte).includes('\uFFFD')).map((row) => row.segment_numero),
    // Avoid treating legitimate French words beginning with « Â » (Âme, Âge…) as mojibake.
    mojibake: rows.filter((row) => /(?:Ã[\u0080-\u00ff]|Â(?=[\u0080-\u00bf\s«»])|â[€\u0080-\u00bf]|ðŸ)/.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    control_characters: rows.filter((row) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    double_ascii_spaces: rows.filter((row) => / {2,}/.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    leading_trailing_spaces: rows.filter((row) => row.segment_texte != null && row.segment_texte !== row.segment_texte.trim()).map((row) => row.segment_numero),
    apostrophe_space: rows.filter((row) => /[\p{L}]’ +[\p{L}]/u.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    hyphen_space: rows.filter((row) => /[\p{L}]- +[\p{L}]/u.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    continuation_marker: rows.filter((row) => /\[\s*suite\s*\]/i.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    note_after_closing_quote: rows.filter((row) => /[»”"]\s*\[\[\d+\]\]/.test(asText(row.segment_texte))).map((row) => row.segment_numero),
    immediate_repeated_words: rows.flatMap((row) => immediateRepeatedWords(row.segment_texte).map((match) => ({ segment_numero: row.segment_numero, match }))),
  };
  const metadataMissing = ['titre', 'id_auteur', 'langue_trad', 'date_publication', 'trad_auteur', 'editeur', 'ville', 'url_source'].filter((field) => !fieldPresent(work[field]));
  const structural = {
    segments: rows.length,
    min_number: numbers.length ? Math.min(...numbers) : null,
    max_number: numbers.length ? Math.max(...numbers) : null,
    duplicate_numbers: duplicateNumbers,
    missing_numbers: missingNumbers,
    null_or_empty_text: rows.filter((row) => !asText(row.segment_texte).trim()).map((row) => row.segment_numero),
    missing_paragraph: rows.filter((row) => !Number.isInteger(row.paragraphe) || row.paragraphe < 1).map((row) => row.segment_numero),
    missing_rank: rows.filter((row) => !Number.isInteger(row.rang) || row.rang < 1).map((row) => row.segment_numero),
    paragraph_rank_errors: paragraphRankErrors,
    missing_nature: rows.filter((row) => !fieldPresent(row.nature)).map((row) => row.segment_numero),
    no_hierarchy_reference: rows.filter((row) => ![1, 2, 3, 4, 5].some((level) => fieldPresent(row[`ref_niv${level}`]))).map((row) => row.segment_numero),
  };
  const linksAudit = {
    total: workLinks.length,
    reviewed_segments: rows.filter((row) => row.liens_revus_le != null).length,
    unreviewed_segments: rows.filter((row) => row.liens_revus_le == null).length,
    types: Object.fromEntries([1, 2, 3, 4].map((type) => [type, workLinks.filter((link) => link.type === type).length])),
    reliability: Object.fromEntries([...new Set(workLinks.map((link) => link.fiabilite ?? '∅'))].map((value) => [value, workLinks.filter((link) => (link.fiabilite ?? '∅') === value).length])),
    arbitration_required: workLinks.filter((link) => link.arbitrage_requis).length,
    missing_motif: workLinks.filter((link) => !fieldPresent(link.motif)).map((link) => link.id),
    missing_provenance: workLinks.filter((link) => !fieldPresent(link.provenance)).map((link) => link.id),
    invalid_type: workLinks.filter((link) => ![1, 2, 3, 4].includes(link.type)).map((link) => link.id),
    dead_canon_target: workLinks.filter((link) => link.canon_id && !canonIds.has(link.canon_id)).map((link) => ({ id: link.id, canon_id: link.canon_id })),
    targetless_without_construction_status: workLinks.filter((link) => !link.canon_id && !link.verset_v2_id && !(link.livre && link.chapitre) && link.fiabilite !== 'à constituer').map((link) => link.id),
    duplicate_links: duplicateLinks,
  };
  const critical = structural.null_or_empty_text.length + structural.duplicate_numbers.length + structural.missing_numbers.length + (structural.paragraph_rank_errors.length ? 1 : 0) + linksAudit.dead_canon_target.length + linksAudit.invalid_type.length;
  const major = Math.max(structural.missing_paragraph.length, structural.missing_rank.length) + structural.missing_nature.length + typography.replacement_character.length + typography.mojibake.length + typography.control_characters.length + typography.continuation_marker.length + typography.note_after_closing_quote.length;
  const moderate = metadataMissing.length + typography.double_ascii_spaces.length + typography.leading_trailing_spaces.length + typography.apostrophe_space.length + typography.hyphen_space.length + typography.immediate_repeated_words.length + linksAudit.missing_motif.length + linksAudit.missing_provenance.length + linksAudit.duplicate_links.length;
  const priorityScore = critical * 1000 + major * 20 + moderate;
  reports.push({
    id_oeuvre: work.id_oeuvre, titre: work.titre, auteur: authorById.get(work.id_auteur)?.nom ?? authorById.get(work.id_auteur)?.nom_affichage ?? work.id_auteur,
    published: work.date_mise_en_ligne != null, date_mise_en_ligne: work.date_mise_en_ligne,
    metadata: { missing: metadataMissing, source: work.url_source, translator: work.trad_auteur, publication: work.date_publication, levels: { profondeur_sommaire: work.profondeur_sommaire, niveaux_sommaire: work.niveaux_sommaire, niveaux_corps: work.niveaux_corps, lecture_texte_entier: work.lecture_texte_entier } },
    structure: structural,
    editorial: {
      notes_rows: rows.filter((row) => row.notes != null).length, note_calls: calls.length, note_numbers_unique: new Set(calls.map((item) => item.number)).size,
      note_shapes: noteShapes, note_samples: noteSamples,
      original_text_rows: rows.filter((row) => fieldPresent(row.texte_original)).length,
      apparatus_like_rows: rows.filter((row) => /apparat|note|préface|avis|approbation|privilège/i.test(asText(row.nature))).length,
      natures: Object.fromEntries([...new Set(rows.map((row) => row.nature ?? '∅'))].map((nature) => [nature, rows.filter((row) => (row.nature ?? '∅') === nature).length])),
    },
    typography, links: linksAudit,
    severity: { critical, major, moderate, priority_score: priorityScore },
  });
}
reports.sort((a, b) => b.severity.priority_score - a.severity.priority_score || a.id_oeuvre.localeCompare(b.id_oeuvre));
const global = {
  generated_at: new Date().toISOString(), mode: 'read_only', charter_sha256: hash(readFileSync('audit/crampon-2026-07-30/charte-before.md', 'utf8')),
  counts: {
    works: works.length, published: reports.filter((row) => row.published).length, unpublished: reports.filter((row) => !row.published).length,
    segments: segments.length, links: links.length, orphan_segments: segments.filter((row) => !workById.has(row.id_oeuvre)).length, orphan_links: orphanLinks.length,
    works_with_critical: reports.filter((row) => row.severity.critical > 0).length,
    works_with_major: reports.filter((row) => row.severity.major > 0).length,
    works_without_structural_or_text_issue: reports.filter((row) => row.severity.critical === 0 && row.severity.major === 0).length,
  },
  global_integrity: {
    duplicate_segment_ids: segments.length - new Set(segments.map((row) => row.id)).size,
    orphan_segment_work_ids: [...new Set(segments.filter((row) => !workById.has(row.id_oeuvre)).map((row) => row.id_oeuvre))],
    orphan_links: orphanLinks,
  },
  works: reports,
};
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/audit-global.json`, `${JSON.stringify(global, null, 2)}\n`, 'utf8');
const lines = [
  '# Audit global des œuvres encore présentes', '',
  `Lecture seule, ${global.generated_at}.`, '',
  `- ${global.counts.works} œuvres : ${global.counts.published} publiées, ${global.counts.unpublished} non publiées`,
  `- ${global.counts.segments} segments ; ${global.counts.links} liens bibliques`,
  `- ${global.counts.works_with_critical} œuvres avec anomalie critique ; ${global.counts.works_with_major} avec anomalie majeure`,
  `- ${global.counts.orphan_segments} segment orphelin ; ${global.counts.orphan_links} lien orphelin`, '',
  '## Classement', '',
  '| Priorité | ID | Œuvre | Publiée | Segments | Critiques | Majeures | Modérées | Liens revus |',
  '|---:|---|---|:---:|---:|---:|---:|---:|---:|',
  ...reports.map((row, index) => `| ${index + 1} | ${row.id_oeuvre} | ${asText(row.titre).replaceAll('|', '\\|')} | ${row.published ? 'oui' : 'non'} | ${row.structure.segments} | ${row.severity.critical} | ${row.severity.major} | ${row.severity.moderate} | ${row.links.reviewed_segments}/${row.structure.segments} |`),
  '', '## Principales anomalies par œuvre', '',
  ...reports.flatMap((row) => {
    const findings = [];
    if (row.structure.null_or_empty_text.length) findings.push(`${row.structure.null_or_empty_text.length} texte(s) vide(s)`);
    if (row.structure.duplicate_numbers.length) findings.push(`${row.structure.duplicate_numbers.length} numéro(s) dupliqué(s)`);
    if (row.structure.missing_numbers.length) findings.push(`${row.structure.missing_numbers.length} numéro(s) manquant(s)`);
    if (row.structure.missing_paragraph.length) findings.push(`${row.structure.missing_paragraph.length} segment(s) sans paragraphe`);
    if (row.structure.missing_rank.length) findings.push(`${row.structure.missing_rank.length} segment(s) sans rang`);
    if (row.structure.paragraph_rank_errors.length) findings.push(`${row.structure.paragraph_rank_errors.length} paragraphe(s) aux rangs incohérents`);
    if (row.typography.replacement_character.length) findings.push(`${row.typography.replacement_character.length} caractère(s) de remplacement`);
    if (row.typography.mojibake.length) findings.push(`${row.typography.mojibake.length} soupçon(s) d’encodage`);
    if (row.typography.note_after_closing_quote.length) findings.push(`${row.typography.note_after_closing_quote.length} appel(s) de note après guillemet`);
    if (row.links.dead_canon_target.length) findings.push(`${row.links.dead_canon_target.length} cible(s) canonique(s) morte(s)`);
    if (row.metadata.missing.length) findings.push(`métadonnées manquantes : ${row.metadata.missing.join(', ')}`);
    if (!findings.length) findings.push('aucune anomalie structurelle ou textuelle forte détectée automatiquement');
    return [`### ${row.id_oeuvre} — ${row.titre}`, '', ...findings.map((item) => `- ${item}`), `- liens : ${row.links.total}, segments revus ${row.links.reviewed_segments}/${row.structure.segments}, arbitrages ${row.links.arbitration_required}`, ''];
  }),
];
writeFileSync(`${OUT}/rapport-global.md`, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ output: OUT, counts: global.counts, ranking: reports.map((row) => ({ id: row.id_oeuvre, title: row.titre, published: row.published, segments: row.structure.segments, severity: row.severity, reviewed: `${row.links.reviewed_segments}/${row.structure.segments}` })) }, null, 2));
