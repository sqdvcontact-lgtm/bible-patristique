import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const TEXT_ID = 'TXT_A0064O0001_FR_1646_CERIZIERS';
const WORK_ID = 'A0064O0001';
const SOURCE_NOTE_TO_NUMBER = new Map([
  ['FN_LACUNE', 1],
  ['FN_PAUIE', 2],
  ['FN_TITRE_P48', 3],
  ['FN_TITRE_P81', 4],
]);
const BOOK_LABELS = new Map([
  [1, 'LIVRE PREMIER'],
  [2, 'LIVRE DEUXIÈME'],
  [3, 'LIVRE TROISIÈME'],
  [4, 'LIVRE QUATRIÈME'],
  [5, 'LIVRE CINQUIÈME'],
]);

function parseArgs() {
  const args = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    args[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  }
  if (!args.source || !args.out || !args.docx || !args.pdf || !args.archive) {
    throw new Error('Usage: node build-segmentation.mjs --source reading.json --out dir --docx file --pdf file --archive file');
  }
  return Object.fromEntries(Object.entries(args).map(([key, value]) => [key, path.resolve(value)]));
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

function sha256Text(text) {
  return sha256Buffer(Buffer.from(text, 'utf8'));
}

async function sha256File(file) {
  return sha256Buffer(await fs.readFile(file));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function stableStringify(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvValue(row[column])).join(',')).join('\n')}\n`;
}

function roman(number) {
  const numerals = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let remaining = number;
  let result = '';
  for (const [value, symbol] of numerals) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

function canonicalNumber(book, kind, semanticNumber) {
  if (book === 1) return kind === 'poesie' ? semanticNumber * 2 - 1 : semanticNumber * 2;
  return kind === 'prose' ? semanticNumber * 2 - 1 : semanticNumber * 2;
}

function cleanMarkers(rawText) {
  const anchors = [];
  let cleanText = '';
  let cursor = 0;
  const markerPattern = /\[\[(FN_[A-Z0-9_]+)\]\]/gu;
  for (const match of rawText.matchAll(markerPattern)) {
    cleanText += rawText.slice(cursor, match.index);
    const noteNumber = SOURCE_NOTE_TO_NUMBER.get(match[1]);
    if (!noteNumber) throw new Error(`Marqueur de note inconnu : ${match[1]}`);
    anchors.push({ source_target: match[1], note_number: noteNumber, offset: cleanText.length });
    cursor = match.index + match[0].length;
  }
  cleanText += rawText.slice(cursor);
  return { cleanText, anchors };
}

function speakerBoundaries(text) {
  const candidates = [...text.matchAll(/(?:^|\s)([BP])\.\s/gu)]
    .map((match) => ({ index: match.index + (match[0].startsWith(' ') ? 1 : 0), speaker: match[1] }));
  if (candidates.length <= 1) return [{ start: 0, end: text.length, speaker: candidates[0]?.speaker ?? null, joinBefore: '' }];
  const boundaries = [];
  if (candidates[0].index > 0) boundaries.push({ index: 0, speaker: null });
  boundaries.push(...candidates);
  return boundaries.map((item, index) => {
    const end = boundaries[index + 1]?.index ?? text.length;
    let start = item.index;
    let joinBefore = '';
    if (start > 0 && text[start - 1] === ' ') {
      start -= 1;
      joinBefore = ' ';
    }
    const contentStart = start + joinBefore.length;
    return { start: contentStart, end, speaker: item.speaker, joinBefore };
  });
}

function sentenceSpans(text) {
  const spans = [];
  let start = 0;
  for (const match of text.matchAll(/[.!?](?:[»”’)]*)\s+/gu)) {
    const end = match.index + match[0].length - (match[0].match(/\s+$/u)?.[0].length ?? 0);
    spans.push({ start, end });
    start = end;
    while (start < text.length && /\s/u.test(text[start])) start += 1;
  }
  if (start < text.length) spans.push({ start, end: text.length });
  return spans.filter((span) => span.end > span.start);
}

function splitLongSpan(text, span, maxLength = 560) {
  if (span.end - span.start <= maxLength) return [span];
  const pieces = [];
  let cursor = span.start;
  while (span.end - cursor > maxLength) {
    const desired = cursor + 330;
    const upper = Math.min(span.end - 90, cursor + maxLength);
    const lower = Math.min(upper, cursor + 180);
    const candidates = [];
    for (let index = lower; index <= upper; index += 1) {
      if (/[;:]/u.test(text[index])) candidates.push(index + 1);
    }
    if (candidates.length === 0) {
      for (let index = lower; index <= upper; index += 1) {
        if (text[index] === ',') candidates.push(index + 1);
      }
    }
    let cut = candidates.sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired))[0];
    if (!cut) {
      cut = upper;
      while (cut > lower && !/\s/u.test(text[cut])) cut -= 1;
    }
    if (!cut || cut <= cursor) break;
    pieces.push({ start: cursor, end: cut });
    cursor = cut;
    while (cursor < span.end && /\s/u.test(text[cursor])) cursor += 1;
  }
  pieces.push({ start: cursor, end: span.end });
  return pieces;
}

function semanticSpans(text) {
  const atomic = sentenceSpans(text).flatMap((span) => splitLongSpan(text, span));
  const output = [];
  let current = null;
  for (const span of atomic) {
    if (!current) {
      current = { ...span };
      continue;
    }
    const proposedLength = span.end - current.start;
    const currentLength = current.end - current.start;
    const nextLength = span.end - span.start;
    if ((currentLength < 170 && proposedLength <= 480) || (proposedLength <= 410 && nextLength < 170)) {
      current.end = span.end;
    } else {
      output.push(current);
      current = { ...span };
    }
  }
  if (current) output.push(current);
  if (output.length > 1) {
    const last = output.at(-1);
    if (last.end - last.start < 90) {
      output.at(-2).end = last.end;
      output.pop();
    }
  }
  return output;
}

function splitWithGaps(text, spans) {
  return spans.map((span, index) => {
    const previousEnd = index === 0 ? 0 : spans[index - 1].end;
    return { ...span, joinBefore: text.slice(previousEnd, span.start), text: text.slice(span.start, span.end) };
  });
}

function insertMarkers(text, segmentStart, anchors) {
  let result = text;
  for (const anchor of [...anchors].sort((a, b) => b.offset - a.offset)) {
    const relative = anchor.offset - segmentStart;
    result = `${result.slice(0, relative)}[[${anchor.note_number}]]${result.slice(relative)}`;
  }
  return result;
}

function locateAnchor(segments, anchor) {
  const candidates = segments.filter((segment) => anchor.offset > segment.source_start_offset_unicode && anchor.offset <= segment.source_end_offset_unicode);
  if (candidates.length === 1) return candidates[0];
  const fallback = segments.find((segment) => anchor.offset >= segment.source_start_offset_unicode && anchor.offset <= segment.source_end_offset_unicode);
  if (!fallback) throw new Error(`Ancre ${anchor.source_target} introuvable à l’offset ${anchor.offset}`);
  return fallback;
}

function sourceLocator(sourceEntries, pages) {
  const entries = sourceEntries ?? [];
  return {
    pages: pages ?? [...new Set(entries.map((item) => item.page))],
    lines: entries,
  };
}

async function main() {
  const args = parseArgs();
  const reading = JSON.parse(await fs.readFile(args.source, 'utf8'));
  await fs.mkdir(args.out, { recursive: true });

  const divisions = [];
  for (const book of reading.books) {
    for (const section of book.sections) {
      const canonical = canonicalNumber(book.number, section.kind, section.semantic_number);
      divisions.push({
        book_number: book.number,
        book_label: BOOK_LABELS.get(book.number),
        section_id: section.id,
        source_kind: section.kind,
        semantic_number: section.semantic_number,
        printed_number: section.printed_number,
        printed_title: section.printed_title,
        canonical_number: canonical,
        canonical_roman: roman(canonical),
        source_pages: section.source_pages,
        source_start: section.source_start,
        source_end: section.source_end,
      });
    }
  }
  if (divisions.length !== 78) throw new Error(`78 divisions attendues, ${divisions.length} obtenues`);

  const sourceBlocks = [];
  const units = [];
  const segments = [];
  const boundaryChanges = [];
  const uncertainties = [];
  const anchorsPending = [];
  let globalOrder = 0;
  let segmentNumero = 0;

  function addUnit({
    sourceUnitId, sourceParentId, espaceTextuel, refNiv1 = null, refNiv2 = null,
    book = null, bookHeading = null, section = null, paragraphe = null,
    turnOrder = null, typeUnite, sourceKind, cleanText, pageDebut = null,
    pageStatus = null, locator = {}, metadata = {}, segmentSpecs,
  }) {
    globalOrder += 1;
    const unit = {
      id_texte: TEXT_ID,
      source_unit_id: sourceUnitId,
      source_parent_id: sourceParentId,
      espace_textuel: espaceTextuel,
      global_order: globalOrder,
      ordre_documentaire: globalOrder,
      ref_niv1: refNiv1,
      ref_niv2: refNiv2,
      ref_niv3: null,
      ref_niv4: null,
      ref_niv5: null,
      book,
      book_heading: bookHeading,
      section,
      paragraphe,
      source_parent_paragraph: paragraphe,
      turn_order: turnOrder,
      type_unite: typeUnite,
      source_kind: sourceKind,
      clean_text: cleanText,
      clean_text_sha256: sha256Text(cleanText),
      page_debut: pageDebut,
      page_status: pageStatus,
      source_locator: locator,
      metadata,
    };
    units.push(unit);

    const unitSegments = [];
    for (let index = 0; index < segmentSpecs.length; index += 1) {
      const spec = segmentSpecs[index];
      segmentNumero += 1;
      const rank = index + 1;
      const segmentKey = `${TEXT_ID}:${sourceUnitId}:s${String(rank).padStart(3, '0')}`;
      const segment = {
        id_oeuvre: WORK_ID,
        id_texte: TEXT_ID,
        segment_numero: segmentNumero,
        segment_key: segmentKey,
        source_unit_id: sourceUnitId,
        espace_textuel: espaceTextuel,
        segment_texte: spec.segmentText ?? spec.text,
        texte_original: null,
        notes: null,
        page: rank === 1 ? pageDebut : null,
        ref_niv1: refNiv1,
        ref_niv2: refNiv2,
        ref_niv3: null,
        ref_niv4: null,
        ref_niv5: null,
        ref_niv1_texte: bookHeading,
        ref_niv2_texte: metadata.printed_title ?? null,
        ref_niv3_texte: null,
        ref_niv4_texte: null,
        ref_niv5_texte: null,
        fiabilite: 'vérifié',
        nature: spec.nature,
        verifies: [],
        paragraphe,
        rang: rank,
        controle_rang_manuel: null,
        controle_verifie: false,
        source_start_offset_unicode: spec.start,
        source_end_offset_unicode: spec.end,
        join_before: spec.joinBefore,
        marquage_source: 'Codex (IA)',
        commentaire_ia: 'Segmentation Ceriziers 1646 ; français ancien conservé sans modernisation.',
        segment_metadata: {
          id_oeuvre: WORK_ID,
          id_texte: TEXT_ID,
          segment_numero: segmentNumero,
          segment_key: segmentKey,
          source_unit_id: sourceUnitId,
          source_parent_id: sourceParentId,
          espace_textuel: espaceTextuel,
          ref_niv1: refNiv1,
          ref_niv2: refNiv2,
          printed_title: metadata.printed_title ?? null,
          printed_number: metadata.printed_number ?? null,
          semantic_number: metadata.semantic_number ?? null,
          canonical_number: metadata.canonical_number ?? null,
          canonical_roman: metadata.canonical_roman ?? null,
          alignment_scope: metadata.alignment_scope ?? false,
          source_block_id: metadata.source_block_id ?? null,
          speaker: spec.speaker ?? metadata.speaker ?? null,
          segment_text_clean: spec.text,
          join_before: spec.joinBefore,
          source_start_offset_unicode: spec.start,
          source_end_offset_unicode: spec.end,
          nature: spec.nature,
          page: rank === 1 ? pageDebut : null,
          page_status: rank === 1 ? pageStatus : 'not_repeated_inside_unit',
          paragraphe,
          rang: rank,
          segmentation_basis: spec.segmentationBasis,
          semantic_review_status: 'reviewed_ai',
          needs_review: Boolean(spec.needsReview),
          verse_number: spec.verseNumber ?? null,
          indent_inches: spec.indentInches ?? null,
          stanza_before: spec.stanzaBefore ?? null,
          source: spec.source ?? null,
        },
      };
      segments.push(segment);
      unitSegments.push(segment);
    }
    const recomposed = unitSegments.map((segment) => `${segment.join_before ?? ''}${segment.segment_metadata.segment_text_clean}`).join('');
    if (recomposed !== cleanText) {
      throw new Error(`Recomposition fautive pour ${sourceUnitId}`);
    }
    return unitSegments;
  }

  for (const front of reading.front_matter) {
    const isApproval = front.id.includes('approbation');
    for (let paragraphIndex = 0; paragraphIndex < front.paragraphs.length; paragraphIndex += 1) {
      const rawText = front.paragraphs[paragraphIndex];
      const { cleanText, anchors } = cleanMarkers(rawText);
      const blockId = `CER-FRONT-${front.id.toUpperCase()}-B${String(paragraphIndex + 1).padStart(3, '0')}`;
      const sourceUnitId = `${blockId}-U001`;
      sourceBlocks.push({
        source_block_id: blockId,
        source_parent_id: front.id,
        espace_textuel: isApproval ? 'apparat_critique' : 'introduction',
        type: isApproval ? 'approbation' : 'liminaire',
        text: cleanText,
        raw_text_with_source_markers: rawText,
        source_pages: front.pages,
        metadata: { title: front.title, subtitle: front.subtitle, alignment_scope: false },
      });
      const spans = splitWithGaps(cleanText, semanticSpans(cleanText));
      const specs = spans.map((span) => ({
        ...span,
        nature: isApproval ? 'apparat_critique' : 'introduction',
        segmentationBasis: 'phrase_ou_periode_semantique',
        needsReview: span.text.length > 560,
      }));
      const unitSegments = addUnit({
        sourceUnitId,
        sourceParentId: blockId,
        espaceTextuel: isApproval ? 'apparat_critique' : 'introduction',
        section: front.title,
        paragraphe: paragraphIndex + 1,
        typeUnite: isApproval ? 'approbation' : 'liminaire',
        sourceKind: isApproval ? 'apparat_critique' : 'introduction',
        cleanText,
        pageDebut: front.pages[0],
        pageStatus: 'source_pages_attested',
        locator: sourceLocator([], front.pages),
        metadata: { title: front.title, subtitle: front.subtitle, alignment_scope: false, source_block_id: blockId },
        segmentSpecs: specs,
      });
      for (const anchor of anchors) {
        const segment = locateAnchor(unitSegments, anchor);
        segment.segment_texte = insertMarkers(segment.segment_texte, segment.source_start_offset_unicode, [anchor]);
        segment.segment_metadata.segment_texte = segment.segment_texte;
        anchorsPending.push({ ...anchor, unit: units.at(-1), segment });
      }
      for (let index = 1; index < specs.length; index += 1) {
        boundaryChanges.push({
          scope: 'front_matter', source_unit_id: sourceUnitId, boundary_offset: specs[index].start,
          left_segment_key: unitSegments[index - 1].segment_key, right_segment_key: unitSegments[index].segment_key,
          reason: 'frontière syntaxique ou changement de période',
        });
      }
    }
  }

  for (const book of reading.books) {
    for (const section of book.sections) {
      const canonical = canonicalNumber(book.number, section.kind, section.semantic_number);
      const canonicalRoman = roman(canonical);
      const prefix = `CER-B${String(book.number).padStart(2, '0')}-D${String(canonical).padStart(2, '0')}`;
      const commonMetadata = {
        printed_title: section.printed_title,
        printed_number: section.printed_number,
        semantic_number: section.semantic_number,
        canonical_number: canonical,
        canonical_roman: canonicalRoman,
        alignment_scope: true,
      };
      let paragraphNumber = 0;

      const anomalyNote =
        book.number === 2 && section.kind === 'prose' && section.semantic_number === 3 ? 3 :
        book.number === 3 && section.kind === 'prose' && section.semantic_number === 6 ? 4 :
        null;
      if (anomalyNote) {
        paragraphNumber += 1;
        const blockId = `${prefix}-RUBRIQUE`;
        const sourceUnitId = `${blockId}-U001`;
        const cleanText = section.printed_title;
        const sourceTarget = anomalyNote === 3 ? 'FN_TITRE_P48' : 'FN_TITRE_P81';
        sourceBlocks.push({
          source_block_id: blockId,
          source_parent_id: section.id,
          espace_textuel: 'corps',
          type: 'rubrique',
          text: cleanText,
          source_pages: [section.source_start.page],
          source_lines: [section.source_start],
          metadata: { ...commonMetadata, alignment_scope: false, source_note_target: sourceTarget },
        });
        const unitSegments = addUnit({
          sourceUnitId,
          sourceParentId: blockId,
          espaceTextuel: 'corps',
          refNiv1: BOOK_LABELS.get(book.number),
          refNiv2: canonicalRoman,
          book: roman(book.number),
          bookHeading: book.label,
          section: canonicalRoman,
          paragraphe: paragraphNumber,
          typeUnite: 'rubrique',
          sourceKind: 'rubrique',
          cleanText,
          pageDebut: section.source_start.page,
          pageStatus: 'source_start_attested',
          locator: sourceLocator([section.source_start], [section.source_start.page]),
          metadata: { ...commonMetadata, alignment_scope: false, source_block_id: blockId },
          segmentSpecs: [{
            start: 0, end: cleanText.length, joinBefore: '', text: cleanText,
            segmentText: `${cleanText}[[${anomalyNote}]]`, nature: 'rubrique',
            segmentationBasis: 'support_autonome_de_note_de_titre', needsReview: false,
          }],
        });
        const anchor = { source_target: sourceTarget, note_number: anomalyNote, offset: cleanText.length };
        anchorsPending.push({ ...anchor, unit: units.at(-1), segment: unitSegments[0] });
      }

      if (section.kind === 'poesie') {
        paragraphNumber += 1;
        const blockIds = [];
        const lines = [];
        for (let index = 0; index < section.blocks.length; index += 1) {
          const block = section.blocks[index];
          const blockId = `${prefix}-V${String(index + 1).padStart(4, '0')}`;
          blockIds.push(blockId);
          lines.push(block.text);
          sourceBlocks.push({
            source_block_id: blockId,
            source_parent_id: section.id,
            espace_textuel: 'corps',
            type: 'vers',
            text: block.text,
            source_pages: [...new Set(block.source.map((item) => item.page))],
            source_lines: block.source,
            metadata: {
              ...commonMetadata,
              verse_number: index + 1,
              indent_inches: block.indent_inches,
              stanza_before: block.stanza_before,
            },
          });
        }
        const cleanText = lines.join('\n');
        let offset = 0;
        const specs = section.blocks.map((block, index) => {
          const start = offset;
          const end = start + block.text.length;
          offset = end + 1;
          return {
            start, end, joinBefore: index === 0 ? '' : '\n', text: block.text, nature: 'vers',
            segmentationBasis: 'un_vers_source_un_segment', needsReview: false,
            verseNumber: index + 1, indentInches: block.indent_inches,
            stanzaBefore: block.stanza_before, source: block.source,
          };
        });
        addUnit({
          sourceUnitId: `${prefix}-U001-POEM`,
          sourceParentId: section.id,
          espaceTextuel: 'corps',
          refNiv1: BOOK_LABELS.get(book.number),
          refNiv2: canonicalRoman,
          book: roman(book.number),
          bookHeading: book.label,
          section: canonicalRoman,
          paragraphe: paragraphNumber,
          typeUnite: 'poeme',
          sourceKind: 'poesie',
          cleanText,
          pageDebut: section.source_pages[0],
          pageStatus: 'source_pages_attested',
          locator: sourceLocator(section.blocks.flatMap((block) => block.source), section.source_pages),
          metadata: { ...commonMetadata, source_block_ids: blockIds, source_block_id: blockIds[0], poem_id: section.id },
          segmentSpecs: specs,
        });
      } else {
        for (let blockIndex = 0; blockIndex < section.blocks.length; blockIndex += 1) {
          const block = section.blocks[blockIndex];
          const blockId = `${prefix}-B${String(blockIndex + 1).padStart(3, '0')}`;
          sourceBlocks.push({
            source_block_id: blockId,
            source_parent_id: section.id,
            espace_textuel: 'corps',
            type: 'prose',
            text: block.text,
            source_pages: section.source_pages,
            source_lines: block.source ?? [],
            metadata: commonMetadata,
          });
          const turns = speakerBoundaries(block.text);
          let recomposedBlock = '';
          for (let turnIndex = 0; turnIndex < turns.length; turnIndex += 1) {
            const turn = turns[turnIndex];
            paragraphNumber += 1;
            const cleanText = block.text.slice(turn.start, turn.end);
            recomposedBlock += `${turn.joinBefore}${cleanText}`;
            const sourceUnitId = `${blockId}-U${String(turnIndex + 1).padStart(3, '0')}`;
            const spans = splitWithGaps(cleanText, semanticSpans(cleanText));
            const specs = spans.map((span) => ({
              ...span,
              nature: turn.speaker ? 'dialogue' : 'texte',
              speaker: turn.speaker,
              segmentationBasis: span.text.length > 500 ? 'articulation_interne_periode_longue' : 'phrase_ou_periode_semantique',
              needsReview: span.text.length > 600,
            }));
            const unitSegments = addUnit({
              sourceUnitId,
              sourceParentId: blockId,
              espaceTextuel: 'corps',
              refNiv1: BOOK_LABELS.get(book.number),
              refNiv2: canonicalRoman,
              book: roman(book.number),
              bookHeading: book.label,
              section: canonicalRoman,
              paragraphe: paragraphNumber,
              turnOrder: turnIndex + 1,
              typeUnite: turn.speaker ? 'tour_de_parole' : 'prose',
              sourceKind: 'prose',
              cleanText,
              pageDebut: section.source_pages[0],
              pageStatus: 'section_source_pages_attested',
              locator: sourceLocator(block.source ?? [], section.source_pages),
              metadata: {
                ...commonMetadata,
                source_block_id: blockId,
                source_block_join_before: turn.joinBefore,
                source_block_start_offset_unicode: turn.start,
                source_block_end_offset_unicode: turn.end,
                speaker: turn.speaker,
              },
              segmentSpecs: specs,
            });
            for (let index = 1; index < specs.length; index += 1) {
              boundaryChanges.push({
                scope: 'body_prose', source_unit_id: sourceUnitId, boundary_offset: specs[index].start,
                left_segment_key: unitSegments[index - 1].segment_key, right_segment_key: unitSegments[index].segment_key,
                reason: specs[index].segmentationBasis,
              });
            }
            if (turnIndex > 0) {
              boundaryChanges.push({
                scope: 'speaker_turn', source_unit_id: sourceUnitId, boundary_offset: 0,
                left_segment_key: null, right_segment_key: unitSegments[0].segment_key,
                reason: `changement de locuteur ${turn.speaker}.`,
              });
            }
            for (const spec of specs) {
              if (spec.needsReview) {
                uncertainties.push({
                  source_unit_id: sourceUnitId,
                  segment_key: unitSegments[specs.indexOf(spec)].segment_key,
                  reason: 'période supérieure à 600 caractères faute d’articulation plus sûre',
                  length: spec.text.length,
                });
              }
            }
          }
          if (recomposedBlock !== block.text) throw new Error(`Recomposition de bloc fautive : ${blockId}`);
        }
      }
    }
  }

  const apparatusById = new Map(reading.apparatus.map((note) => [note.id, note]));
  const notes = [];
  const noteBlocks = [];
  const noteAnchors = [];
  for (const pending of anchorsPending.sort((a, b) => a.note_number - b.note_number)) {
    const sourceNote = apparatusById.get(pending.source_target);
    const noteKey = `CER-NOTE-${String(pending.note_number).padStart(3, '0')}`;
    const blockId = `${noteKey}-B001`;
    const marker = `[[${pending.note_number}]]`;
    pending.segment.notes = `${marker} ${sourceNote.text}`;
    pending.segment.segment_metadata.notes = pending.segment.notes;
    notes.push({
      id_texte: TEXT_ID,
      note_key: noteKey,
      book: pending.segment.ref_niv1,
      note_number: pending.note_number,
      footnote_id: pending.note_number,
      source_target: pending.source_target,
      printed_page: sourceNote.source_page,
      metadata: {
        kind: sourceNote.kind,
        source_page: sourceNote.source_page,
        printed_reading: sourceNote.kind === 'anomalie_titre_imprime' ? pending.unit.clean_text : null,
        semantic_reading: sourceNote.kind === 'anomalie_titre_imprime'
          ? (pending.note_number === 3 ? 'III. PROSE.' : 'VI. PROSE.')
          : null,
        canonical_division_ref: sourceNote.kind === 'anomalie_titre_imprime' ? pending.segment.ref_niv2 : null,
        provenance: 'apparat de la transcription diplomatique corrigée',
        validated_human: false,
      },
    });
    noteBlocks.push({
      id_texte: TEXT_ID,
      note_key: noteKey,
      block_id: blockId,
      rank: 1,
      kind: 'commentary',
      form: 'prose',
      language: 'fr',
      text: sourceNote.text,
      rendering: null,
      needs_review: false,
      metadata: { source_page: sourceNote.source_page, source_kind: sourceNote.kind, validated_human: false },
    });
    const segmentClean = pending.segment.segment_metadata.segment_text_clean;
    const relativeOffset = pending.offset - pending.segment.source_start_offset_unicode;
    noteAnchors.push({
      id_texte: TEXT_ID,
      anchor_id: `CER-ANCHOR-${String(pending.note_number).padStart(3, '0')}`,
      note_key: noteKey,
      source_target: pending.source_target,
      source_parent_id: pending.unit.source_parent_id,
      source_unit_id: pending.unit.source_unit_id,
      source_offset_unicode: pending.offset,
      source_unit_offset_unicode: pending.offset,
      segment_key: pending.segment.segment_key,
      segment_numero: pending.segment.segment_numero,
      segment_offset_unicode: relativeOffset,
      marker,
      anchor_text_left: segmentClean.slice(Math.max(0, relativeOffset - 60), relativeOffset),
      anchor_text_right: segmentClean.slice(relativeOffset, relativeOffset + 60),
      structured_block_count: 1,
      metadata: { source_page: sourceNote.source_page, kind: sourceNote.kind, validated_human: false },
    });
  }

  const verseSegments = segments.filter((segment) => segment.nature === 'vers');
  if (verseSegments.length !== 1213) throw new Error(`1 213 vers attendus, ${verseSegments.length} obtenus`);
  if (new Set(segments.map((segment) => segment.segment_numero)).size !== segments.length) throw new Error('Doublon segment_numero');
  if (new Set(segments.map((segment) => segment.segment_key)).size !== segments.length) throw new Error('Doublon segment_key');
  if (notes.length !== 4 || noteBlocks.length !== 4 || noteAnchors.length !== 4) throw new Error('Apparat incomplet');

  const unitRecomposition = units.map((unit) => {
    const unitSegments = segments.filter((segment) => segment.source_unit_id === unit.source_unit_id).sort((a, b) => a.rang - b.rang);
    const recomposed = unitSegments.map((segment) => `${segment.join_before ?? ''}${segment.segment_metadata.segment_text_clean}`).join('');
    return { source_unit_id: unit.source_unit_id, expected_sha256: unit.clean_text_sha256, recomposed_sha256: sha256Text(recomposed), pass: recomposed === unit.clean_text };
  });

  const segmentManifest = {
    schema: 'la-gueule-ceriziers-segmentation-v1',
    generated_at_utc: new Date().toISOString(),
    id_oeuvre: WORK_ID,
    id_texte: TEXT_ID,
    policy: {
      modernization: false,
      semantic_segmentation: true,
      target_length_is_guide_only: true,
      verse_policy: 'un vers source = un segment',
      alignment_scope: 'corps uniquement',
    },
    counts: {
      canonical_divisions: divisions.length,
      source_blocks: sourceBlocks.length,
      source_units: units.length,
      segments: segments.length,
      body_segments: segments.filter((segment) => segment.espace_textuel === 'corps').length,
      introduction_segments: segments.filter((segment) => segment.espace_textuel === 'introduction').length,
      apparatus_segments: segments.filter((segment) => segment.espace_textuel === 'apparat_critique').length,
      verse_segments: verseSegments.length,
      prose_or_dialogue_segments: segments.filter((segment) => ['texte', 'dialogue'].includes(segment.nature)).length,
      rubric_segments: segments.filter((segment) => segment.nature === 'rubrique').length,
      notes: notes.length,
      note_blocks: noteBlocks.length,
      note_anchors: noteAnchors.length,
      uncertain_segments: uncertainties.length,
    },
    divisions,
    segments,
  };

  const bibliography = {
    id_oeuvre: WORK_ID,
    id_texte: TEXT_ID,
    id_traduction: 'TR_FR_1646_CERIZIERS_BOECE_CONSOLATION',
    bibliographic_notice: 'La Consolation de la philosophie, traduicte du latin de Boèce en françois, par le P. de Ceriziers, de la Compagnie de Jésus. Édition cinquième, revue par le traducteur. Rouen, Jean Viret, Jacques Besongne et Clément Malassis, 1646.',
    titre_version: 'Traduction de René de Ceriziers, cinquième édition, 1646',
    edition_label: 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646',
    title_edition: 'La Consolation de la philosophie, traduicte du latin de Boèce en françois',
    language: 'français',
    translator: 'René de Ceriziers',
    edition_number: 5,
    edition_year: 1646,
    edition_place: 'Rouen',
    publishers: ['Jean Viret', 'Jacques Besongne', 'Clément Malassis'],
    source_url: 'https://archive.org/details/bub_gb_j51V661mEw0C',
    is_default: false,
    is_public: false,
    status: 'review',
    catalogue_translation_published: false,
  };

  const sourceHashes = {
    source_archive_sha256: await sha256File(args.archive),
    source_reading_json_sha256: await sha256File(args.source),
    corrected_bibliographic_docx_sha256: await sha256File(args.docx),
    corrected_bibliographic_pdf_sha256: await sha256File(args.pdf),
  };

  const importPayload = {
    schema: 'la-gueule-ceriziers-private-import-v1',
    id_oeuvre: WORK_ID,
    id_texte: TEXT_ID,
    bibliography,
    source_hashes: sourceHashes,
    units,
    segments,
    notes,
    note_blocks: noteBlocks,
    note_relations: [],
    note_anchors: noteAnchors,
    alignments: null,
  };

  const reviewByDivision = divisions.map((division) => {
    const divisionSegments = segments.filter((segment) => segment.espace_textuel === 'corps' && segment.ref_niv1 === division.book_label && segment.ref_niv2 === division.canonical_roman);
    return {
      ...division,
      segment_count: divisionSegments.length,
      alignment_scope_segment_count: divisionSegments.filter((segment) => segment.segment_metadata.alignment_scope).length,
      continuous_text: divisionSegments.filter((segment) => segment.segment_metadata.alignment_scope).map((segment) => segment.segment_metadata.segment_text_clean).join(division.source_kind === 'poesie' ? '\n' : ' '),
      segments: divisionSegments.map((segment) => ({ segment_key: segment.segment_key, segment_numero: segment.segment_numero, nature: segment.nature, text: segment.segment_metadata.segment_text_clean })),
    };
  });

  const outputs = {
    'ceriziers_bibliographie_1646.json': stableStringify(bibliography),
    'ceriziers_canonical_divisions.csv': toCsv(divisions, ['book_number', 'book_label', 'section_id', 'source_kind', 'semantic_number', 'printed_number', 'printed_title', 'canonical_number', 'canonical_roman', 'source_pages']),
    'ceriziers_source_blocks.json': stableStringify(sourceBlocks),
    'ceriziers_source_blocks.csv': toCsv(sourceBlocks, ['source_block_id', 'source_parent_id', 'espace_textuel', 'type', 'text', 'source_pages', 'source_lines', 'metadata']),
    'ceriziers_source_blocks_corriges.json': stableStringify(sourceBlocks),
    'ceriziers_source_blocks_corriges.csv': toCsv(sourceBlocks, ['source_block_id', 'source_parent_id', 'espace_textuel', 'type', 'text', 'source_pages', 'source_lines', 'metadata']),
    'ceriziers_source_units.json': stableStringify(units),
    'ceriziers_source_units.csv': toCsv(units, ['id_texte', 'source_unit_id', 'source_parent_id', 'espace_textuel', 'global_order', 'ref_niv1', 'ref_niv2', 'book', 'section', 'paragraphe', 'turn_order', 'type_unite', 'source_kind', 'clean_text', 'clean_text_sha256', 'page_debut', 'source_locator', 'metadata']),
    'ceriziers_source_units_corrigees.json': stableStringify(units),
    'ceriziers_source_units_corrigees.csv': toCsv(units, ['id_texte', 'source_unit_id', 'source_parent_id', 'espace_textuel', 'global_order', 'ref_niv1', 'ref_niv2', 'book', 'section', 'paragraphe', 'turn_order', 'type_unite', 'source_kind', 'clean_text', 'clean_text_sha256', 'page_debut', 'source_locator', 'metadata']),
    'ceriziers_segmentation_manifest.json': stableStringify(segmentManifest),
    'ceriziers_segmentation_manifest.csv': toCsv(segments, ['id_texte', 'segment_numero', 'segment_key', 'source_unit_id', 'espace_textuel', 'segment_texte', 'notes', 'page', 'ref_niv1', 'ref_niv2', 'ref_niv1_texte', 'ref_niv2_texte', 'nature', 'paragraphe', 'rang', 'source_start_offset_unicode', 'source_end_offset_unicode', 'join_before', 'segment_metadata']),
    'ceriziers_segmentation_changes.csv': toCsv(boundaryChanges, ['scope', 'source_unit_id', 'boundary_offset', 'left_segment_key', 'right_segment_key', 'reason']),
    'ceriziers_segmentation_uncertain.md': `# Cas incertains de segmentation\n\n${uncertainties.length === 0 ? 'Aucun cas incertain résiduel.\n' : uncertainties.map((item) => `- \`${item.segment_key}\` (${item.length} caractères) : ${item.reason}`).join('\n') + '\n'}`,
    'ceriziers_recomposition_tests.json': stableStringify({ status: unitRecomposition.every((item) => item.pass) ? 'PASS' : 'FAIL', tested_units: unitRecomposition.length, failures: unitRecomposition.filter((item) => !item.pass), results: unitRecomposition }),
    'ceriziers_notes.json': stableStringify({ notes, blocks: noteBlocks, relations: [], anchors: noteAnchors }),
    'ceriziers_divisions_review.json': stableStringify(reviewByDivision),
    'ceriziers_import_payload_pre_alignment.json': stableStringify(importPayload),
    'ceriziers_source_sha256.txt': `${Object.entries(sourceHashes).map(([name, value]) => `${value}  ${name}`).join('\n')}\n`,
  };
  for (const [name, content] of Object.entries(outputs)) await fs.writeFile(path.join(args.out, name), content, 'utf8');

  const summary = {
    status: 'PASS',
    ...segmentManifest.counts,
    outputs: Object.keys(outputs),
    hashes: Object.fromEntries(Object.entries(outputs).map(([name, content]) => [name, sha256Text(content)])),
  };
  await fs.writeFile(path.join(args.out, 'ceriziers_segmentation_summary.json'), stableStringify(summary), 'utf8');
  process.stdout.write(stableStringify(summary));
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
