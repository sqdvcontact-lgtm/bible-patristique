import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const WORK_ID = 'A0010O0001';
const ROOT = resolve('tmp/confessions-latin-csel-2026-07-29');
const UPDATES_PATH = resolve(ROOT, 'confessions-latin-updates.json');
const ALIGNMENTS_PATH = resolve(ROOT, 'confessions-latin-alignments.json');
const EXPECTED = {
  segments: 10348,
  body: 10211,
  apparatus: 137,
  paragraphs: 932,
  latinCharactersStored: 515928,
};

const sha = (value) => createHash('sha256').update(value).digest('hex').toUpperCase();
const stable = (value) => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
    : value;
const stableJson = (value) => `${JSON.stringify(stable(value), null, 2)}\n`;
const must = async (promise, label) => {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const updatesBody = readFileSync(UPDATES_PATH, 'utf8');
const alignmentsBody = readFileSync(ALIGNMENTS_PATH, 'utf8');
const normalizedUpdatesBody = updatesBody.replaceAll('\r\n', '\n');
const normalizedAlignmentsBody = alignmentsBody.replaceAll('\r\n', '\n');
const updates = JSON.parse(updatesBody);
const alignments = JSON.parse(alignmentsBody);
const checksumLine = readFileSync(`${UPDATES_PATH}.sha256`, 'utf8').trim();
if (!checksumLine.startsWith(sha(normalizedUpdatesBody))) throw new Error('Empreinte des mises à jour latines invalide');
if (updates.length !== EXPECTED.paragraphs || alignments.length !== EXPECTED.paragraphs) throw new Error('932 paragraphes latins attendus');
if (new Set(updates.map((item) => item.segment_numero)).size !== EXPECTED.paragraphs) throw new Error('Numéros de segment latins dupliqués');
if (updates.some((item) => !item.texte_original?.trim())) throw new Error('Texte latin vide');
if (updates.reduce((sum, item) => sum + item.texte_original.length, 0) !== EXPECTED.latinCharactersStored) throw new Error('Longueur latine inattendue');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Variables Supabase absentes');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchRows() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const data = await must(
      db.from('segments')
        .select('id,segment_numero,nature,paragraphe,rang,texte_original')
        .eq('id_oeuvre', WORK_ID)
        .order('segment_numero')
        .range(from, from + 999),
      `lecture segments ${from}`,
    );
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const rows = await fetchRows();
const body = rows.filter((row) => row.nature === 'texte');
const apparatus = rows.filter((row) => row.nature === 'apparat_critique');
if (rows.length !== EXPECTED.segments || body.length !== EXPECTED.body || apparatus.length !== EXPECTED.apparatus) {
  throw new Error(`Comptes en base inattendus : ${rows.length}/${body.length}/${apparatus.length}`);
}
const byNumber = new Map(rows.map((row) => [row.segment_numero, row]));
const expectedByNumber = new Map(updates.map((item) => [item.segment_numero, item.texte_original]));
for (const number of expectedByNumber.keys()) {
  const row = byNumber.get(number);
  if (!row || row.nature !== 'texte' || row.rang !== 1) throw new Error(`Premier segment de paragraphe invalide : ${number}`);
}

const desired = body.map((row) => ({
  id: row.id,
  segment_numero: row.segment_numero,
  texte_original: expectedByNumber.get(row.segment_numero) ?? null,
}));
const changes = desired.filter((item) => byNumber.get(item.segment_numero).texte_original !== item.texte_original);

const before = {
  captured_at: new Date().toISOString(),
  work_id: WORK_ID,
  values: rows.filter((row) => row.texte_original !== null).map((row) => ({
    segment_numero: row.segment_numero,
    texte_original: row.texte_original,
  })),
};
const beforeBody = stableJson(before);
const beforePath = resolve(ROOT, 'confessions-latin-pre-apply.json');
writeFileSync(beforePath, beforeBody, 'utf8');
writeFileSync(`${beforePath}.sha256`, `${sha(beforeBody)}  confessions-latin-pre-apply.json\n`, 'utf8');

if (!APPLY) {
  console.log(JSON.stringify({
    ready: true,
    apply: false,
    work_id: WORK_ID,
    updates: updates.length,
    database_changes: changes.length,
    currently_non_null: before.values.length,
    updates_sha256: sha(normalizedUpdatesBody),
    alignments_sha256: sha(normalizedAlignmentsBody),
    snapshot: beforePath,
  }, null, 2));
  process.exit(0);
}

for (let offset = 0; offset < changes.length; offset += 20) {
  const batch = changes.slice(offset, offset + 20);
  await Promise.all(batch.map((item) => must(
    db.from('segments').update({ texte_original: item.texte_original }).eq('id', item.id),
    `mise à jour latin segment ${item.segment_numero}`,
  )));
}

const afterRows = await fetchRows();
const afterBody = afterRows.filter((row) => row.nature === 'texte');
const afterApparatus = afterRows.filter((row) => row.nature === 'apparat_critique');
const nonNullBody = afterBody.filter((row) => row.texte_original !== null);
const wrong = afterBody.filter((row) => row.texte_original !== (expectedByNumber.get(row.segment_numero) ?? null));
if (wrong.length) throw new Error(`Relecture en base divergente : ${wrong.length} segments`);
if (nonNullBody.length !== EXPECTED.paragraphs) throw new Error(`Nombre de paragraphes latins en base : ${nonNullBody.length}`);
if (afterApparatus.some((row) => row.texte_original !== null)) throw new Error('Du latin a été placé dans l’apparat critique');
if (nonNullBody.reduce((sum, row) => sum + row.texte_original.length, 0) !== EXPECTED.latinCharactersStored) throw new Error('Longueur latine en base divergente');

const databaseLatin = nonNullBody
  .map((row) => ({ segment_numero: row.segment_numero, texte_original: row.texte_original }))
  .sort((a, b) => a.segment_numero - b.segment_numero);
const expectedLatin = [...updates].sort((a, b) => a.segment_numero - b.segment_numero);
if (stableJson(databaseLatin) !== stableJson(expectedLatin)) throw new Error('Empreinte éditoriale latine divergente après écriture');

const report = {
  applied_at: new Date().toISOString(),
  work_id: WORK_ID,
  changed_segments: changes.length,
  latin_paragraphs: nonNullBody.length,
  body_segments_without_duplicate_latin: afterBody.length - nonNullBody.length,
  apparatus_segments_without_latin: afterApparatus.length,
  latin_characters_stored: nonNullBody.reduce((sum, row) => sum + row.texte_original.length, 0),
  database_latin_sha256: sha(stableJson(databaseLatin)),
  updates_sha256: sha(normalizedUpdatesBody),
};
const reportBody = stableJson(report);
const reportPath = resolve(ROOT, 'confessions-latin-post-apply-audit.json');
writeFileSync(reportPath, reportBody, 'utf8');
writeFileSync(`${reportPath}.sha256`, `${sha(reportBody)}  confessions-latin-post-apply-audit.json\n`, 'utf8');
console.log(JSON.stringify({ ok: true, report: reportPath, ...report }, null, 2));
