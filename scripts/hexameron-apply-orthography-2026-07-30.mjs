import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const APPLY = process.argv.includes('--apply');
const proposal = JSON.parse(readFileSync('audit/hexameron-2026-07-30/orthography-proposal.json', 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchSegments() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('segments')
      .select('id,segment_numero,segment_texte,texte_norm').eq('id_oeuvre', OEUVRE)
      .order('segment_numero').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const beforeRows = await fetchSegments();
const current = new Map(beforeRows.map((row) => [row.id, row]));
for (const row of proposal.rows) {
  const found = current.get(row.id);
  if (!found || found.segment_numero !== row.segment_numero || found.segment_texte !== row.before) {
    throw new Error(`Garde segment ${row.segment_numero} : état courant différent de la proposition`);
  }
}
console.log(JSON.stringify({ apply: APPLY, segments: proposal.rows.length, replacements: proposal.remplacements }, null, 2));
if (!APPLY) process.exit(0);

const concurrency = 8;
let cursor = 0;
async function worker() {
  while (cursor < proposal.rows.length) {
    const row = proposal.rows[cursor++];
    const { data, error } = await db.from('segments').update({ segment_texte: row.after })
      .eq('id', row.id).select('id');
    if (error) throw error;
    if (data.length !== 1) throw new Error(`Écriture segment ${row.segment_numero} : ${data.length} ligne`);
  }
}
await Promise.all(Array.from({ length: concurrency }, () => worker()));

const afterRows = await fetchSegments();
const afterById = new Map(afterRows.map((row) => [row.id, row]));
for (const row of proposal.rows) {
  if (afterById.get(row.id)?.segment_texte !== row.after) {
    throw new Error(`Post-contrôle segment ${row.segment_numero} échoué`);
  }
}
const hash = createHash('sha256').update(afterRows
  .map((s) => `${s.id}\t${s.segment_numero}\t${s.segment_texte ?? ''}`).join('\n'), 'utf8')
  .digest('hex').toUpperCase();
console.log(JSON.stringify({ ok: true, segments: proposal.rows.length, replacements: proposal.remplacements, texte_hash: hash }, null, 2));
