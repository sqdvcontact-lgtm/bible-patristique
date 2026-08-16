import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

function parseArgs() {
  const args = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    args[process.argv[index].replace(/^--/u, '')] = process.argv[index + 1];
  }
  if (!args.source || !args.out) {
    throw new Error('Usage: node build-correction-layer.mjs --source lecture_structuree.json --out output-directory');
  }
  return { source: path.resolve(args.source), out: path.resolve(args.out) };
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

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvValue(row[column])).join(',')).join('\n')}\n`;
}

function objectSha(value) {
  return sha256(stableStringify(value));
}

async function main() {
  const args = parseArgs();
  const sourceBytes = await fs.readFile(args.source);
  const reading = JSON.parse(sourceBytes.toString('utf8'));
  const corrected = structuredClone(reading);
  const corrections = [];

  let insolenceMatches = 0;
  let proMatches = 0;

  for (const book of corrected.books ?? []) {
    for (const section of book.sections ?? []) {
      for (let index = 0; index < (section.blocks ?? []).length; index += 1) {
        const block = section.blocks[index];
        if (typeof block.text === 'string' && block.text.includes('brauons son inso¬')) {
          const before = structuredClone(block);
          block.text = block.text.replace('brauons son inso¬', 'brauons son insolence.');
          insolenceMatches += 1;
          corrections.push({
            correction_id: 'CER-CORR-001',
            correction_kind: 'word_join_and_lost_continuation',
            source_file: path.basename(args.source),
            source_object: `books[${book.number}].sections[${section.id}].blocks[${index}]`,
            source_parent_id: section.id,
            page: 27,
            line: 'fin de page, raccord inso- / lence.',
            form_before: 'inso¬',
            form_after: 'insolence.',
            justification: 'Le fac-similé porte inso- en fin de ligne puis lence. à la ligne suivante ; le mot coupé typographiquement doit être réuni.',
            facsimile_reference: 'fac_simile_ceriziers_1646.pdf, page source 27',
            object_sha256_before: objectSha(before),
            object_sha256_after: objectSha(block),
            action: 'replace_text_in_derived_layer',
          });
        }
        if (block?.type === 'vers' && block?.text === 'PRO'
          && block?.source?.some((item) => item.page === 152 && item.line === 38)) {
          const before = structuredClone(block);
          section.blocks.splice(index, 1);
          index -= 1;
          proMatches += 1;
          corrections.push({
            correction_id: 'CER-CORR-002',
            correction_kind: 'remove_running_title_fragment_from_body',
            source_file: path.basename(args.source),
            source_object: `books[${book.number}].sections[${section.id}].blocks[source page 152 line 38]`,
            source_parent_id: section.id,
            page: 152,
            line: 38,
            form_before: 'PRO',
            form_after: null,
            justification: 'Le fragment appartient au titre courant tronqué V. PRO ; la page suivante reprend le titre complet V. PROSE. Ce fragment n’est pas un vers.',
            facsimile_reference: 'fac_simile_ceriziers_1646.pdf, pages source 152-153',
            object_sha256_before: objectSha(before),
            object_sha256_after: null,
            action: 'remove_block_from_derived_layer',
          });
        }
      }
    }
  }

  if (insolenceMatches !== 1) throw new Error(`Une correction insolence attendue, ${insolenceMatches} trouvée(s).`);
  if (proMatches !== 1) throw new Error(`Un faux vers PRO attendu, ${proMatches} trouvé(s).`);

  const correctedText = stableStringify(corrected);
  if (correctedText.includes('¬')) throw new Error('Le caractère ¬ subsiste dans la couche dérivée.');
  const remainingFalseVerses = [];
  for (const book of corrected.books ?? []) {
    for (const section of book.sections ?? []) {
      for (const block of section.blocks ?? []) {
        if (block?.type === 'vers' && block?.text === 'PRO') remainingFalseVerses.push(section.id);
      }
    }
  }
  if (remainingFalseVerses.length) throw new Error(`Le faux vers PRO subsiste : ${remainingFalseVerses.join(', ')}`);

  const manifest = {
    schema: 'ceriziers-derived-correction-layer-v1',
    generated_at_utc: new Date().toISOString(),
    immutable_source: {
      file: path.basename(args.source),
      sha256: sha256(sourceBytes),
      modified: false,
    },
    corrected_layer: {
      file: 'lecture_structuree_corrigee.json',
      sha256: sha256(correctedText),
    },
    corrections,
    tests: {
      correction_count: corrections.length,
      insolence_correction_count: insolenceMatches,
      removed_false_verse_count: proMatches,
      remaining_not_sign_count: [...correctedText].filter((character) => character === '¬').length,
      remaining_exact_pro_verse_count: remainingFalseVerses.length,
    },
  };

  await fs.mkdir(args.out, { recursive: true });
  await fs.writeFile(path.join(args.out, 'lecture_structuree_corrigee.json'), correctedText, 'utf8');
  await fs.writeFile(path.join(args.out, 'ceriziers_source_corrections.json'), stableStringify(manifest), 'utf8');
  await fs.writeFile(
    path.join(args.out, 'ceriziers_source_corrections.csv'),
    toCsv(corrections, [
      'correction_id', 'correction_kind', 'source_file', 'source_object', 'source_parent_id',
      'page', 'line', 'form_before', 'form_after', 'justification', 'facsimile_reference',
      'object_sha256_before', 'object_sha256_after', 'action',
    ]),
    'utf8',
  );
  process.stdout.write(stableStringify(manifest));
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
