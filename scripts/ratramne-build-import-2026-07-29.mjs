import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const ROOT = resolve('tmp/ratramne-import-2026-07-29');
const MASTER = resolve('C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/master/transcription.json');
const SOURCE_PDF = resolve('C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/source/du_corps_et_du_sang_du_seigneur_1673.pdf');
const IMMUTABLE = [
  [resolve('C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_FRANCAIS_EN_COURS.docx'), '69C276229704F7652C31FE26D8F1C110F798AAF41B7D66072FF088F8E647BE82'],
  [resolve('C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_LATIN_EN_COURS.docx'), 'A3901891F3EAACCCF251EEC675131C77CFC24ABE27B8C7FCF32F6E66617565B8'],
  [resolve('C:/Corpus Scriptura/CS - Espace travail IA/Ratramne - OCR/Ratramne_BILINGUE_CONTROLE.docx'), '3F8DFDB5A9111015B2157A92B7E27979FA47BC2111DA29BC01E7B0E16D46C358'],
  [MASTER, '831603CEAD79C45FF380282FD66F94957B6CDC4F4660D729CA7BE8C8F13A3E04'],
  [SOURCE_PDF, '5C71131AD8C0DC555E3C57BCBA60BACE67F2F93D546AC2162BBDA80AD97CDD75'],
];
const hashBuffer = (buffer) => createHash('sha256').update(buffer).digest('hex').toUpperCase();
const hashFile = (path) => hashBuffer(readFileSync(path));
const stableObject = (value) => Array.isArray(value)
  ? value.map(stableObject)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]))
    : value;
const stableJson = (value) => `${JSON.stringify(stableObject(value), null, 2)}\n`;

for (const [path, expected] of IMMUTABLE) {
  const actual = hashFile(path);
  if (actual !== expected) throw new Error(`Source intangible modifiée : ${path}\nattendu ${expected}\nobtenu  ${actual}`);
}

const master = JSON.parse(readFileSync(MASTER, 'utf8'));
mkdirSync(ROOT, { recursive: true });

const alerts = [];
const transformations = [];
const forcedUnsplit = [
  ['RAT-APP-0001:p9', 'mais dans cette autre'],
  ['RAT-APP-0001:p11', '& s’ils'],
  ['RAT-APP-0001:p19', 'où il est appellé'],
  ['RAT-APP-0001:p28', 'cét Heretique'],
  ['RAT-APP-0001:p29', 'ce qui pourtant'],
  ['RAT-APP-0001:p41', 'mais ce qui'],
  ['RAT-APP-0001:p53', 'ce qui seroit'],
  ['RAT-APP-0001:p87', '& entre tous'],
  ['RAT-TXT-0004', 'ou si'],
  ['RAT-TXT-0016', 'ou s’ils'],
  ['RAT-TXT-0058', 'au lieu que'],
  ['RAT-TXT-0067', 'autre chose en tant'],
  ['RAT-TXT-0075', 'mais ce que'],
];
const definitions = new Map();
const orderedMarkers = [];

function addDefinitions(notes, context) {
  for (const note of notes ?? []) {
    if (!note.marker || !/^\[\[FN_[^\]]+\]\]$/.test(note.marker)) throw new Error(`Marqueur invalide ${context}`);
    if (definitions.has(note.marker)) throw new Error(`Définition dupliquée ${note.marker}`);
    orderedMarkers.push(note.marker);
    definitions.set(note.marker, { ...note, context });
  }
}

for (const apparatus of master.apparatus) addDefinitions(apparatus.notes, apparatus.id);
for (const block of master.parallel_blocks) {
  addDefinitions(block.latin?.notes, `${block.id}:latin`);
  addDefinitions(block.french?.notes, `${block.id}:french`);
}
if (orderedMarkers.length !== 184) throw new Error(`184 notes attendues, ${orderedMarkers.length} trouvées`);

const markerNumber = new Map(orderedMarkers.map((marker, index) => [marker, index + 1]));
const replaceMarkers = (text = '') => text.replace(/\[\[FN_[^\]]+\]\]/g, (marker) => {
  const number = markerNumber.get(marker);
  if (!number) throw new Error(`Appel sans définition : ${marker}`);
  return `[[${number}]]`;
});
const callsIn = (text = '') => [...text.matchAll(/\[\[(\d+)\]\]/g)].map((match) => Number(match[1]));
const noteLine = (number) => {
  const marker = orderedMarkers[number - 1];
  const note = definitions.get(marker);
  return `[[${number}]] ${note.text}`;
};
const textOfRuns = (runs = []) => runs.map((run) => run.text ?? '').join('');

function insertAnchoredMarker(lines, note, number, context) {
  const joined = lines.join('\n');
  const anchor = note.anchor;
  if (!anchor) throw new Error(`Note de titre sans ancre : ${context} ${note.marker}`);
  const index = joined.indexOf(anchor);
  if (index < 0 || joined.indexOf(anchor, index + anchor.length) >= 0)
    throw new Error(`Ancre absente ou ambiguë : ${context} ${anchor}`);
  return `${joined.slice(0, index + anchor.length)}[[${number}]]${joined.slice(index + anchor.length)}`;
}

function splitCandidate(text, context) {
  const source = text.trim().replace(/\s+/g, ' ');
  if (!source) return [];
  const protectedAbbreviations = new Set(['S.', 'SS.', 'M.', 'MM.', 'etc.', 'scil.', 'pag.', 'p.', 'l.', 'c.']);
  const candidates = [];
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (!'.;:?!…'.includes(char)) continue;
    const insideFrenchQuote = source.lastIndexOf('«', i) > source.lastIndexOf('»', i);
    let end = i + 1;
    while (end < source.length && '»”\"\')]}'.includes(source[end])) end++;
    // Les éditions anciennes placent souvent une espace entre le point final
    // et le guillemet fermant. Le guillemet appartient à la citation et ne doit
    // jamais devenir un segment isolé.
    const spacedCloser = source.slice(end).match(/^(\s+)([»”])/);
    if (spacedCloser) end += spacedCloser[0].length;
    const trailingNote = source.slice(end).match(/^\[\[\d+\]\]/);
    if (trailingNote) end += trailingNote[0].length;
    if (insideFrenchQuote && !source.slice(i + 1, end).includes('»')) continue;
    if (end >= source.length || !/\s/.test(source[end])) continue;
    const left = source.slice(0, i + 1).match(/([\p{L}.]+)$/u)?.[1] ?? '';
    const ampersandEtc = source.slice(Math.max(0, i - 2), i + 1) === '&c.';
    if (char === '.' && protectedAbbreviations.has(left) && !ampersandEtc) continue;
    const following = source.slice(end).trimStart();
    const next = following[0] ?? '';
    const manualUnsplit = forcedUnsplit.find(([forcedContext, prefix]) => context === forcedContext && following.startsWith(prefix));
    if (manualUnsplit) {
      transformations.push({ type: 'coupure_refusee', context, punctuation: char, following: manualUnsplit[1], reason: 'dépendance syntaxique relue' });
      continue;
    }
    if (char === ':' && /^(?:[a-zàâçéèêëîïôûùüÿœ]|Et (?:que|l’autre)|Seulement\b)/u.test(following)) continue;
    if (char === ':' && /prenez\s*&\s*beuvez\s*$/i.test(source.slice(Math.max(0, i - 60), i))) continue;
    if (char === ';' && /^(?:ny\b|& (?:enfin\b|qu|pour\b|afin\b|comme\b|l’un\b|ce\b|confirme\b|s’il\b)|où\b|Et que\b|en sorte\b|qui\b|rei\b|ou (?:si|quand)\b|ce grand nombre\b|sçavoir si\b|non sur\b|mais une autre chose\b|ou la chose mesme\b|chicaner\b)/u.test(following)) continue;
    const reason = char === ';' ? 'point-virgule' : char === ':' ? 'deux-points' : 'fin-de-phrase';
    candidates.push({ end, char, next, reason });
  }
  const out = [];
  let start = 0;
  while (start < source.length) {
    const remaining = source.length - start;
    if (remaining <= 360) {
      out.push({ text: source.slice(start).trim(), boundary: 'fin-paragraphe' });
      break;
    }
    const after = candidates.filter((c) => c.end > start + 90);
    // Une citation reste avec sa formule d’introduction, même si l’édition a
    // placé un point avant le guillemet ouvrant.
    const safe = after.filter((c) => c.next !== '«');
    const inWindow = safe.filter((c) => c.end >= start + 140 && c.end <= start + 380);
    const priority = (candidate) => candidate.char === ';' ? 1 : candidate.char === ':' ? 2 : 0;
    let chosen = inWindow.sort((a, b) => priority(a) - priority(b) || Math.abs((a.end - start) - 290) - Math.abs((b.end - start) - 290))[0]
      ?? safe.filter((c) => c.end < start + 460).at(-1)
      ?? safe[0];
    if (!chosen) {
      out.push({ text: source.slice(start).trim(), boundary: 'fin-paragraphe' });
      break;
    }
    const piece = source.slice(start, chosen.end).trim();
    out.push({ text: piece, boundary: chosen.reason });
    if (chosen.reason !== 'fin-de-phrase') alerts.push({
      type: 'coupure_a_relire',
      severity: chosen.reason === 'deux-points' ? 'critique' : 'controle',
      context,
      reason: chosen.reason,
      before: piece.slice(-220),
      after: source.slice(chosen.end).trimStart().slice(0, 220),
    });
    start = chosen.end;
    while (/\s/.test(source[start] ?? '')) start++;
  }
  for (const [index, segment] of out.entries()) {
    if (segment.text.length > 500) alerts.push({ type: 'segment_long', context, rang: index + 1, length: segment.text.length, excerpt: segment.text.slice(0, 220) });
    if (segment.text.length < 35 && out.length > 1) alerts.push({ type: 'segment_court', context, rang: index + 1, length: segment.text.length, excerpt: segment.text });
  }
  return out;
}

const segments = [];
let segmentNumero = 0;
function pushSegment(row, sourceMeta) {
  segmentNumero++;
  const complete = {
    id: null,
    id_oeuvre: 'A0091O0001',
    segment_numero: segmentNumero,
    segment_texte: row.segment_texte,
    ref_niv1: row.ref_niv1 ?? null,
    ref_niv2: row.ref_niv2 ?? null,
    ref_niv3: null,
    ref_niv4: null,
    ref_niv5: null,
    ref_niv1_texte: row.ref_niv1_texte ?? null,
    ref_niv2_texte: row.ref_niv2_texte ?? null,
    ref_niv3_texte: null,
    ref_niv4_texte: null,
    ref_niv5_texte: null,
    lien_1: null,
    lien_2: null,
    lien_3: null,
    lien_4: null,
    fiabilite: null,
    nature: row.nature,
    texte_original: row.texte_original ?? null,
    notes: row.notes ?? null,
    paragraphe: row.paragraphe,
    rang: row.rang,
    controle_rang_manuel: null,
    controle_verifie: false,
    marquage_source: 'Codex (IA)',
  };
  segments.push({ ...complete, __source: sourceMeta });
}

function notesForFields(fields) {
  const calls = fields.flatMap(callsIn);
  const unique = [...new Set(calls)];
  return unique.length ? unique.map(noteLine).join('\n') : null;
}

// Advertissement.
const advert = master.apparatus.find((item) => item.kind === 'avertissement');
for (const [paragraphIndex, paragraph] of advert.paragraphs.entries()) {
  const text = replaceMarkers(textOfRuns(paragraph.runs));
  const pieces = splitCandidate(text, `${advert.id}:p${paragraphIndex + 1}`);
  for (const [rankIndex, piece] of pieces.entries()) {
    pushSegment({
      segment_texte: piece.text,
      ref_niv1: 'Advertissement',
      ref_niv1_texte: null,
      nature: 'apparat_critique',
      paragraphe: paragraphIndex + 1,
      rang: rankIndex + 1,
      notes: notesForFields([piece.text]),
    }, { unit: advert.id, source_paragraph: paragraphIndex + 1, pdf_pages: advert.pdf_pages, boundary: piece.boundary });
  }
}

// Témoignages.
const testimonials = master.apparatus.find((item) => item.kind === 'temoignages');
let testimonialParagraph = 0;
for (const [sectionIndex, section] of testimonials.sections.entries()) {
  for (const paragraph of section.paragraphs) {
    testimonialParagraph++;
    const text = replaceMarkers(textOfRuns(paragraph.runs));
    const pieces = splitCandidate(text, `${testimonials.id}:p${testimonialParagraph}`);
    for (const [rankIndex, piece] of pieces.entries()) {
      pushSegment({
        segment_texte: piece.text,
        ref_niv1: 'Témoignages',
        ref_niv2: `Témoignage ${['I', 'II'][sectionIndex] ?? sectionIndex + 1}`,
        ref_niv2_texte: section.title,
        nature: 'apparat_critique',
        paragraphe: testimonialParagraph,
        rang: rankIndex + 1,
        notes: notesForFields([piece.text]),
      }, { unit: testimonials.id, source_paragraph: testimonialParagraph, pdf_pages: testimonials.pdf_pages, boundary: piece.boundary });
    }
  }
}

const firstHeading = master.parallel_blocks.find((block) => block.id === 'RAT-TXT-0001');
let latinHeading = firstHeading.latin.heading_lines;
let frenchHeading = firstHeading.french.heading_lines;
for (const note of firstHeading.latin.notes) latinHeading = insertAnchoredMarker(latinHeading, note, markerNumber.get(note.marker), `${firstHeading.id}:latin` ).split('\n');
for (const note of firstHeading.french.notes) frenchHeading = insertAnchoredMarker(frenchHeading, note, markerNumber.get(note.marker), `${firstHeading.id}:french`).split('\n');
const latinHeadingText = latinHeading.join('\n');
const frenchHeadingTitle = frenchHeading.at(-1)
  .replace(/\s+/g, ' ')
  .replace(/^PREFACE Au Roy CHARLES/, 'Préface au roy Charles')
  .replace(/\s*\.\s*$/, '.');

let section = 'Préface';
let sectionParagraph = 0;
let firstTextSegment = true;
for (const block of master.parallel_blocks) {
  if (block.kind === 'work_heading') {
    if (block.id === 'RAT-TXT-0050') { section = 'Seconde partie'; sectionParagraph = 0; }
    continue;
  }
  if (block.kind === 'end_mark') {
    pushSegment({ segment_texte: block.french.text, ref_niv1: section, nature: 'texte', paragraphe: sectionParagraph + 1, rang: 1, texte_original: block.latin.text }, { unit: block.id, pdf_pages: block.pdf_pages, printed_pages: block.printed_pages, boundary: 'colophon' });
    continue;
  }
  if (block.kind !== 'parallel_paragraph') throw new Error(`Type de bloc inconnu ${block.id}`);
  if (block.id === 'RAT-TXT-0004') { section = 'Première partie'; sectionParagraph = 0; }
  sectionParagraph++;
  const french = replaceMarkers(block.french.text);
  const latinBody = replaceMarkers(block.latin.text);
  const pieces = splitCandidate(french, block.id);
  for (const [rankIndex, piece] of pieces.entries()) {
    const isFirstRank = rankIndex === 0;
    const original = isFirstRank ? `${firstTextSegment ? `${latinHeadingText}\n\n` : ''}${latinBody}` : null;
    const title = firstTextSegment ? frenchHeadingTitle : null;
    const noteFields = [piece.text, original ?? '', title ?? ''];
    pushSegment({
      segment_texte: piece.text,
      ref_niv1: section,
      ref_niv1_texte: firstTextSegment ? title.replace(/^Préface\s+au\s+/i, 'Au ') : null,
      nature: section === 'Préface' ? 'apparat_critique' : 'texte',
      paragraphe: sectionParagraph,
      rang: rankIndex + 1,
      texte_original: original,
      notes: notesForFields(noteFields),
    }, { unit: block.id, pdf_pages: block.pdf_pages, printed_pages: block.printed_pages, boundary: piece.boundary });
    firstTextSegment = false;
  }
}

// Les numéros imprimés ne sont pas des identifiants de stockage. On refait une
// séquence globale selon la première apparition dans les champs affichables.
const generatedNoteMap = new Map();
const generatedNoteFields = ['ref_niv1', 'ref_niv1_texte', 'ref_niv2', 'ref_niv2_texte', 'ref_niv3', 'ref_niv3_texte', 'ref_niv4', 'ref_niv4_texte', 'segment_texte', 'texte_original'];
for (const row of segments) {
  for (const field of generatedNoteFields) {
    for (const match of String(row[field] ?? '').matchAll(/\[\[(\d+)\]\]/g)) {
      const oldNumber = Number(match[1]);
      if (!generatedNoteMap.has(oldNumber)) generatedNoteMap.set(oldNumber, generatedNoteMap.size + 1);
    }
  }
}
if (generatedNoteMap.size !== 184) throw new Error(`184 appels distincts attendus, ${generatedNoteMap.size} trouvés`);
const remapGenerated = (value) => value == null ? null : String(value).replace(/\[\[(\d+)\]\]/g, (_all, number) => `[[${generatedNoteMap.get(Number(number))}]]`);
for (const row of segments) {
  for (const field of generatedNoteFields) row[field] = remapGenerated(row[field]);
  if (row.notes) row.notes = row.notes.split(/\r?\n/).map((line) => {
    const match = line.match(/^\[\[(\d+)\]\](.*)$/s);
    if (!match) throw new Error(`Définition de note invalide : ${line}`);
    const number = generatedNoteMap.get(Number(match[1]));
    return { number, line: `[[${number}]]${match[2]}` };
  }).sort((a, b) => a.number - b.number).map((item) => item.line).join('\n');
}

// L'appel appartient à la citation : jamais après le guillemet fermant.
const placeNoteBeforeClosingQuote = (value) => value == null ? null : String(value)
  .replace(/([.!?…])([ \u00a0\u202f]*[»”"])[ \u00a0\u202f]*\[\[(\d+)\]\]/gu, '[[$3]]$1$2')
  .replace(/([ \u00a0\u202f]*[»”"])[ \u00a0\u202f]*\[\[(\d+)\]\]/gu, '[[$2]]$1')
  .replace(/([.!?…;:,])[ \u00a0\u202f]*\[\[(\d+)\]\]/gu, '[[$2]]$1');
for (const row of segments) for (const field of generatedNoteFields) row[field] = placeNoteBeforeClosingQuote(row[field]);

// Audits du candidat.
const plainSegments = segments.map(({ __source, ...row }) => row);
const nbSignes = plainSegments.reduce((sum, row) => sum + row.segment_texte.length, 0);
const metadata = {
  oeuvre: {
    id_oeuvre: 'A0091O0001',
    id_auteur: 'A0091',
    titre: 'Du Corps & du Sang du Seigneur',
    sous_titre: 'Où l’on éclaircit tout ce qui a esté dit jusqu’icy de plus considerable sur le Traitté de Ratramne, Du Corps & du Sang du Seigneur.',
    titre_original: 'De corpore et sanguine Domini',
    langue_originale: 'Latin',
    langue_trad: 'Français',
    date_approx: 'Vers 843',
    genre: 'Traité eucharistique',
    trad_auteur: 'Pierre Allix (attribution discutée avec Marc-Antoine de La Bastide)',
    note: 'Édition bilingue latin-français. Le latin est aligné par paragraphe dans texte_original.',
    editeur: 'Jean Lucas',
    collection: null,
    ville: 'Rouen',
    trad_id: null,
    date_publication: '1673',
    // La provenance reste dans catalogue_notices : la charte interdit de
    // publier l’URL de numérisation dans la notice publique de l’œuvre.
    url_source: null,
    profondeur_sommaire: 2,
    nb_signes: nbSignes,
    niveaux_sommaire: 2,
    niveaux_corps: 2,
    texte_sommaire: '1,1,0,0,0',
    texte_corps: '1,1,0,0,0',
    afficher_numeros: false,
    date_composition: 'Vers 843',
    genres: ['Traité eucharistique', 'Traité théologique'],
    composition_debut_annee: 843,
    composition_debut_precision: 'vers',
    composition_fin_annee: null,
    composition_fin_precision: null,
    publication_debut_annee: 1673,
    publication_debut_precision: 'exacte',
    publication_fin_annee: 1673,
    publication_fin_precision: 'exacte',
    titre_affichage: 'Du corps et du sang\ndu Seigneur',
  },
  catalogue_notice: {
    id: 1937,
    expected_id_ligne: 'V20-02060',
    expected_id_oeuvre_stable: 'A0091O0001',
    keep_presence_sur_le_site_during_import: false,
    patch_after_database_audit: {
      decision_import: 'Importé - transcription patrimoniale bilingue de l’édition de 1673, audit technique achevé.',
      niveau_verification: 'Très fort - fac-similé et transcription contrôlés ; structure, paragraphes, latin et notes audités.',
    },
    patch_only_after_final_publication: { presence_sur_le_site: true },
  },
};
const allFields = plainSegments.flatMap((row) => [row.segment_texte, row.texte_original, row.ref_niv1_texte, row.ref_niv2_texte]).filter(Boolean);
const allCalls = allFields.flatMap(callsIn);
const allDefined = plainSegments.flatMap((row) => (row.notes ?? '').split('\n').filter(Boolean).map((line) => Number(line.match(/^\[\[(\d+)\]\]/)?.[1])));
const remainingInternalMarkers = allFields.flatMap((field) => field.match(/\[\[FN_[^\]]+\]\]/g) ?? []);
const paragraphGroups = new Map();
for (const row of plainSegments) {
  const key = `${row.nature}|${row.ref_niv1}|${row.ref_niv2 ?? ''}|${row.paragraphe}`;
  if (!paragraphGroups.has(key)) paragraphGroups.set(key, []);
  paragraphGroups.get(key).push(row);
}
for (const [key, rows] of paragraphGroups) {
  const ranks = rows.map((row) => row.rang).sort((a, b) => a - b);
  if (ranks.some((rank, index) => rank !== index + 1)) alerts.push({ type: 'rangs_non_contigus', context: key, ranks });
  if (rows.filter((row) => row.texte_original).some((row) => row.rang !== 1)) alerts.push({ type: 'latin_hors_rang_1', context: key });
}
const divisions = new Map();
for (const row of plainSegments) {
  const key = `${row.nature}|${row.ref_niv1}`;
  if (!divisions.has(key)) divisions.set(key, new Set());
  divisions.get(key).add(row.paragraphe);
}
const paragraphsContiguous = [...divisions.values()].every((values) => {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered.every((value, index) => value === index + 1);
});
const rowNotePairMismatches = plainSegments.flatMap((row) => {
  const fields = generatedNoteFields.map((field) => row[field]).filter(Boolean);
  const calls = fields.flatMap(callsIn);
  const defs = [...(row.notes ?? '').matchAll(/^\[\[(\d+)\]\]/gm)].map((match) => Number(match[1]));
  return JSON.stringify(calls) === JSON.stringify(defs) ? [] : [{ segment_numero: row.segment_numero, calls, defs }];
});
const rowNotePairs = rowNotePairMismatches.length === 0;
const strongEnding = (text) => {
  let value = text.replace(/\[\[\d+\]\]/g, '').trim();
  while (/[»”"')\]}]/.test(value.at(-1) ?? '')) value = value.slice(0, -1).trim();
  return /[.;:?!…]$/.test(value);
};
const parallelUnitIds = master.parallel_blocks.filter((block) => block.kind === 'parallel_paragraph').map((block) => block.id);
const latinUnitCounts = new Map(parallelUnitIds.map((id) => [id, 0]));
for (const row of segments) if (latinUnitCounts.has(row.__source.unit) && row.texte_original) latinUnitCounts.set(row.__source.unit, latinUnitCounts.get(row.__source.unit) + 1);
const audit = {
  generated_at: new Date().toISOString(),
  source: { master: MASTER, pdf: SOURCE_PDF, immutable: IMMUTABLE.map(([path, expected]) => ({ path, sha256: expected })) },
  target: { author_id: 'A0091', work_id: 'A0091O0001', catalogue_notice_id: 1937, published_during_import: false },
  counts: {
    segments: plainSegments.length,
    apparatus_segments: plainSegments.filter((row) => row.nature === 'apparat_critique').length,
    text_segments: plainSegments.filter((row) => row.nature === 'texte').length,
    bilingual_source_paragraphs: master.parallel_blocks.filter((block) => block.kind === 'parallel_paragraph').length,
    latin_rows: plainSegments.filter((row) => row.texte_original).length,
    note_definitions_source: orderedMarkers.length,
    note_calls_candidate: allCalls.length,
    note_definitions_candidate: allDefined.length,
    alerts: alerts.length,
    note_pair_mismatches: rowNotePairMismatches,
  },
  invariants: {
    source_notes_184: orderedMarkers.length === 184,
    calls_184: allCalls.length === 184,
    definitions_184: allDefined.length === 184,
    calls_unique: new Set(allCalls).size === 184,
    definitions_unique: new Set(allDefined).size === 184,
    calls_equal_definitions: JSON.stringify([...allCalls].sort((a,b)=>a-b)) === JSON.stringify([...allDefined].sort((a,b)=>a-b)),
    calls_equal_definitions_per_row: rowNotePairs,
    no_internal_markers: remainingInternalMarkers.length === 0,
    segment_numbers_contiguous: plainSegments.every((row, index) => row.segment_numero === index + 1),
    no_empty_text: plainSegments.every((row) => row.segment_texte?.trim()),
    segment_endings_strong: plainSegments.every((row) => strongEnding(row.segment_texte)),
    guillemets_balanced_per_segment: plainSegments.every((row) => (row.segment_texte.match(/«/g) ?? []).length === (row.segment_texte.match(/»/g) ?? []).length),
    paragraphs_contiguous_by_division: paragraphsContiguous,
    ranks_contiguous_by_paragraph: !alerts.some((alert) => alert.type === 'rangs_non_contigus'),
    latin_only_on_rank_1: !alerts.some((alert) => alert.type === 'latin_hors_rang_1'),
    each_parallel_unit_has_one_latin_row: [...latinUnitCounts.values()].every((count) => count === 1),
    bilingual_paragraphs_100: master.parallel_blocks.filter((block) => block.kind === 'parallel_paragraph').length === 100,
    source_hashes_unchanged: true,
  },
  caveats: [
    'Les coupures automatiques après point-virgule ou deux-points doivent être lues avant import.',
    'Les trois notes attachées au titre sont conservées sur le premier groupe de la préface classée dans l’apparat critique ; leur rendu exige le lecteur de notes actif dans les titres.',
    'Le libellé Première partie est une restitution structurelle documentée, non un titre composé à cet endroit du fac-similé.',
    'Aucun lien biblique n’est constitué par ce constructeur.',
  ],
};
if (!Object.values(audit.invariants).every(Boolean)) throw new Error(`Audit candidat en échec : ${JSON.stringify(audit.invariants)} ; notes=${JSON.stringify(rowNotePairMismatches)}`);

const csvColumns = ['id','id_oeuvre','segment_numero','segment_texte','ref_niv1','ref_niv2','ref_niv3','ref_niv4','ref_niv5','ref_niv1_texte','ref_niv2_texte','ref_niv3_texte','ref_niv4_texte','ref_niv5_texte','lien_1','lien_2','lien_3','lien_4','fiabilite','nature','texte_original','notes','paragraphe','rang','controle_rang_manuel','controle_verifie','marquage_source'];
const csvCell = (value) => value == null ? '' : `"${String(value).replaceAll('"', '""')}"`;
const csv = `\uFEFF${csvColumns.join(',')}\r\n${plainSegments.map((row) => csvColumns.map((column) => csvCell(row[column])).join(',')).join('\r\n')}\r\n`;
const rich = { audit, transformations, notes: orderedMarkers.map((marker, index) => ({ number: index + 1, marker, ...definitions.get(marker) })), segments };
const outputs = [
  ['ratramne-segments-candidate.json', stableJson(plainSegments)],
  ['ratramne-rich-audit.json', stableJson(rich)],
  ['ratramne-alerts.json', stableJson(alerts)],
  ['ratramne-transformations.json', stableJson(transformations)],
  ['ratramne-audit.json', stableJson(audit)],
  ['ratramne-metadata-candidate.json', stableJson(metadata)],
  ['ratramne-segments-candidate.csv', csv],
];
for (const [name, body] of outputs) {
  writeFileSync(resolve(ROOT, name), body, 'utf8');
  writeFileSync(resolve(ROOT, `${name}.sha256`), `${hashBuffer(Buffer.from(body, 'utf8'))}  ${name}\n`, 'utf8');
}
writeFileSync(resolve(ROOT, 'SOURCE-IMMUTABLE-SHA256.txt'), `${IMMUTABLE.map(([path, expected]) => `${expected}  ${path}`).join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ ready: true, apply: false, output: ROOT, ...audit.counts, invariants: audit.invariants, files: outputs.map(([name]) => basename(name)) }, null, 2));
