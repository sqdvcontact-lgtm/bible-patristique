import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const REPO = path.resolve(import.meta.dirname, '..', '..');
const ENV_FILE = path.join(REPO, '.env.local');
const MIRANDOL_TEXT_ID = 'TXT_A0064O0001_FR_1861_MIRANDOL';
const WORK_ID = 'A0064O0001';

function parseArgs() {
  const index = process.argv.indexOf('--out');
  if (index === -1 || !process.argv[index + 1]) {
    throw new Error('Usage: node snapshot-mirandol.mjs --out <directory>');
  }
  const labelIndex = process.argv.indexOf('--label');
  const label = labelIndex >= 0 ? process.argv[labelIndex + 1] : 'before';
  if (!['before', 'after'].includes(label)) throw new Error('--label doit valoir before ou after');
  return { outDir: path.resolve(process.argv[index + 1]), label };
}

async function loadEnv() {
  const raw = await fs.readFile(ENV_FILE, 'utf8');
  for (const line of raw.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
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

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex').toUpperCase();
}

async function fetchAll(buildQuery, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

async function fetchOne(query) {
  const { data, error } = await query.single();
  if (error) throw error;
  return data;
}

async function main() {
  const { outDir, label } = parseArgs();
  await loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing in .env.local');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [work, textRow, units, segments, notes, blocks, relations, anchors, catalogue] = await Promise.all([
    fetchOne(client.from('oeuvres').select('*').eq('id_oeuvre', WORK_ID)),
    fetchOne(client.from('oeuvre_textes').select('*').eq('id_texte', MIRANDOL_TEXT_ID)),
    fetchAll(() => client.from('oeuvre_texte_unites').select('*').eq('id_texte', MIRANDOL_TEXT_ID).order('global_order')),
    fetchAll(() => client.from('segments').select('*').eq('id_texte', MIRANDOL_TEXT_ID).order('segment_numero')),
    fetchAll(() => client.from('texte_notes').select('*').eq('id_texte', MIRANDOL_TEXT_ID).order('footnote_id')),
    fetchAll(() => client.from('texte_note_blocs').select('*').eq('id_texte', MIRANDOL_TEXT_ID).order('note_key').order('rank')),
    fetchAll(() => client.from('texte_note_relations').select('*').eq('id_texte', MIRANDOL_TEXT_ID).order('note_key').order('relation_kind').order('source_block_id').order('target_block_id')),
    fetchAll(() => client.from('texte_note_ancres').select('*').eq('id_texte', MIRANDOL_TEXT_ID).order('anchor_id')),
    fetchAll(() => client.from('catalogue_notices').select('*').eq('id_oeuvre_stable', WORK_ID).order('id_ligne')),
  ]);

  const segmentIds = segments.map((row) => row.id);
  const bibleLinks = [];
  for (let index = 0; index < segmentIds.length; index += 200) {
    const chunk = segmentIds.slice(index, index + 200);
    const { data, error } = await client.from('liens_bibliques').select('*').in('segment_id', chunk).order('id');
    if (error) throw error;
    bibleLinks.push(...data);
  }
  bibleLinks.sort((a, b) => a.id - b.id);

  const snapshot = {
    captured_at_utc: new Date().toISOString(),
    project_ref: 'oucotpxcjalwgetylfbz',
    work,
    text: textRow,
    counts: {
      units: units.length,
      segments: segments.length,
      notes: notes.length,
      note_blocks: blocks.length,
      note_relations: relations.length,
      note_anchors: anchors.length,
      biblical_links: bibleLinks.length,
      latin_rank_1: segments.filter((row) => row.rang === 1 && row.texte_original !== null).length,
      latin_rank_gt_1: segments.filter((row) => row.rang > 1 && row.texte_original !== null).length,
      body_chars: segments.reduce((sum, row) => sum + (row.segment_texte?.length ?? 0), 0),
    },
    units,
    segments,
    notes,
    note_blocks: blocks,
    note_relations: relations,
    note_anchors: anchors,
    biblical_links: bibleLinks,
    catalogue_notices: catalogue,
  };

  await fs.mkdir(outDir, { recursive: true });
  const snapshotPath = path.join(outDir, `mirandol_${label}.json`);
  const snapshotText = stableStringify(snapshot);
  await fs.writeFile(snapshotPath, snapshotText, 'utf8');

  const collections = {
    work,
    text: textRow,
    units,
    segments,
    notes,
    note_blocks: blocks,
    note_relations: relations,
    note_anchors: anchors,
    biblical_links: bibleLinks,
  };
  const hashes = Object.fromEntries(Object.entries(collections).map(([name, value]) => [name, sha256(stableStringify(value))]));
  const manifest = {
    snapshot_file: path.basename(snapshotPath),
    snapshot_sha256: sha256(snapshotText),
    collection_sha256: hashes,
    counts: snapshot.counts,
  };
  await fs.writeFile(path.join(outDir, `mirandol_${label}_manifest.json`), stableStringify(manifest), 'utf8');
  process.stdout.write(`${stableStringify(manifest)}`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
