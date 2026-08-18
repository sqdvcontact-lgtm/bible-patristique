import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const REPO = path.resolve(import.meta.dirname, '..', '..');
const ENV_FILE = path.join(REPO, '.env.local');
const TEXT_ID = 'TXT_A0064O0001_FR_1646_CERIZIERS';
const SET_ID = 'ALNSET-A0064O0001-MIR1861-CER1646';

function outputDirectory() {
  const index = process.argv.indexOf('--out');
  if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: node snapshot-ceriziers.mjs --out <directory>');
  const labelIndex = process.argv.indexOf('--label');
  const label = labelIndex >= 0 ? process.argv[labelIndex + 1] : 'before';
  if (!['before', 'after'].includes(label)) throw new Error('--label doit valoir before ou after');
  return { out: path.resolve(process.argv[index + 1]), label };
}

async function loadEnv() {
  const raw = await fs.readFile(ENV_FILE, 'utf8');
  for (const line of raw.split(/\r?\n/u)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}
const stringify = value => `${JSON.stringify(stable(value), null, 2)}\n`;
const hash = value => crypto.createHash('sha256').update(stringify(value), 'utf8').digest('hex').toUpperCase();

async function all(build, size = 1000) {
  const rows = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < size) return rows;
  }
}
async function one(query) {
  const { data, error } = await query.single();
  if (error) throw error;
  return data;
}

await loadEnv();
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const text = await one(client.from('oeuvre_textes').select('*').eq('id_texte', TEXT_ID));
const [notice, units, segments, notes, blocks, relations, anchors, alignmentSet, alignments, alignmentMembers] = await Promise.all([
  one(client.from('catalogue_notices').select('*').eq('id_ligne', text.catalogue_notice_id_ligne)),
  all(() => client.from('oeuvre_texte_unites').select('*').eq('id_texte', TEXT_ID).order('global_order')),
  all(() => client.from('segments').select('*').eq('id_texte', TEXT_ID).order('segment_numero')),
  all(() => client.from('texte_notes').select('*').eq('id_texte', TEXT_ID).order('note_key')),
  all(() => client.from('texte_note_blocs').select('*').eq('id_texte', TEXT_ID).order('note_key').order('rank')),
  all(() => client.from('texte_note_relations').select('*').eq('id_texte', TEXT_ID).order('note_key')),
  all(() => client.from('texte_note_ancres').select('*').eq('id_texte', TEXT_ID).order('anchor_id')),
  one(client.from('texte_alignement_ensembles').select('*').eq('alignment_set_id', SET_ID)),
  all(() => client.from('texte_alignements').select('*').eq('alignment_set_id', SET_ID).order('book').order('canonical_division_order').order('group_order')),
  all(() => client.from('texte_alignement_membres').select('*').eq('alignment_set_id', SET_ID).order('alignment_id').order('role').order('member_order')),
]);
const snapshot = {
  captured_at_utc: new Date().toISOString(), project_ref: 'oucotpxcjalwgetylfbz',
  text, notice, units, segments, notes, note_blocks: blocks, note_relations: relations, note_anchors: anchors,
  alignment_set: alignmentSet, alignments, alignment_members: alignmentMembers,
  counts: {
    units: units.length, segments: segments.length, body: segments.filter(row => row.espace_textuel === 'corps').length,
    verses: segments.filter(row => row.nature === 'vers').length, notes: notes.length, note_blocks: blocks.length,
    note_relations: relations.length, note_anchors: anchors.length, alignment_groups: alignments.length,
    alignment_members: alignmentMembers.length,
  },
};
const { out, label } = outputDirectory();
await fs.mkdir(out, { recursive: true });
const file = path.join(out, `ceriziers_${label}.json`);
await fs.writeFile(file, stringify(snapshot), 'utf8');
const collections = { text, notice, units, segments, notes, note_blocks: blocks, note_relations: relations, note_anchors: anchors, alignment_set: alignmentSet, alignments, alignment_members: alignmentMembers };
const manifest = {
  snapshot_file: path.basename(file), snapshot_sha256: hash(snapshot),
  collection_sha256: Object.fromEntries(Object.entries(collections).map(([name, value]) => [name, hash(value)])),
  counts: snapshot.counts,
};
await fs.writeFile(path.join(out, `ceriziers_${label}_manifest.json`), stringify(manifest), 'utf8');
process.stdout.write(stringify(manifest));
