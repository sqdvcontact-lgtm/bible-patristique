import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rows = JSON.parse(readFileSync(resolve('tmp/ratramne-import-2026-07-29/ratramne-segments-candidate.json'), 'utf8'));
const from = Number(process.argv[2] ?? 0);
const to = Number(process.argv[3] ?? Number.MAX_SAFE_INTEGER);
const includeContinuations = process.argv.includes('--all');
const onlyContinuations = process.argv.includes('--continuations');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const only = onlyArg ? new Set(onlyArg.slice(7).split(',').map(Number)) : null;

for (const row of rows) {
  if (only && !only.has(row.segment_numero)) continue;
  if (onlyContinuations && row.rang === 1) continue;
  if ((!includeContinuations && !onlyContinuations && row.rang !== 1) || row.segment_numero < from || row.segment_numero > to) continue;
  const refs = [row.ref_niv1_texte, row.ref_niv2_texte, row.ref_niv3_texte, row.ref_niv4_texte, row.ref_niv5_texte]
    .filter(Boolean).join(' > ');
  console.log(`\n### SEGMENT ${row.segment_numero} — ${refs}`);
  console.log(row.segment_texte);
  if (row.notes) console.log(`NOTES: ${row.notes}`);
}
