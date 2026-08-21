import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const proposal = JSON.parse(readFileSync('audit/hexameron-2026-07-30/structure-proposal.json', 'utf8'));
const snapshot = JSON.parse(readFileSync('audit/hexameron-2026-07-30/after-splits.json', 'utf8'));
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('segments').select('*').eq('id_oeuvre', OEUVRE)
      .order('segment_numero').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

const contentHash = (rows) => createHash('sha256').update(rows
  .sort((a, b) => a.id - b.id)
  .map((s) => `${s.id}\t${s.segment_texte ?? ''}\t${s.notes ?? ''}\t${s.texte_original ?? ''}`).join('\n'), 'utf8')
  .digest('hex').toUpperCase();

const current = await fetchAll();
const currentById = new Map(current.map((row) => [row.id, row]));
const snapshotById = new Map(snapshot.segments.map((row) => [row.id, row]));
if (current.length !== proposal.rows.length || current.length !== snapshot.segments.length) {
  throw new Error(`Compte incompatible : ${current.length}`);
}
for (const row of proposal.rows) {
  const now = currentById.get(row.id);
  const saved = snapshotById.get(row.id);
  if (!now || !saved || now.segment_texte !== saved.segment_texte || now.notes !== saved.notes || now.texte_original !== saved.texte_original) {
    throw new Error(`Contenu modifié pour ${row.id}`);
  }
}

const expectedPatch = (row, index) => ({
  segment_numero: index + 1,
  ref_niv1: row.ref_niv1,
  ref_niv1_texte: row.ref_niv1_texte,
  ref_niv2: row.ref_niv2,
  ref_niv2_texte: row.ref_niv2_texte,
  ref_niv3: null,
  ref_niv3_texte: null,
  ref_niv4: null,
  ref_niv4_texte: null,
  ref_niv5: null,
  ref_niv5_texte: null,
  paragraphe: row.paragraphe,
  rang: row.rang,
});
const pending = proposal.rows.map((row, index) => ({ row, index, patch: expectedPatch(row, index) }))
  .filter(({ row, patch }) => {
    const now = currentById.get(row.id);
    return Object.entries(patch).some(([key, value]) => now[key] !== value);
  });
console.log(JSON.stringify({ segments: current.length, dejaComplets: current.length - pending.length, aReprendre: pending.length,
  contentHash: contentHash([...current]) }, null, 2));

let cursor = 0;
async function worker() {
  while (cursor < pending.length) {
    const item = pending[cursor++];
    const { data, error } = await db.from('segments').update(item.patch).eq('id', item.row.id).select('id');
    if (error) throw error;
    if (data.length !== 1) throw new Error(`Reprise ${item.row.id} : ${data.length}`);
  }
}
await Promise.all(Array.from({ length: 12 }, () => worker()));

const after = await fetchAll();
for (let index = 0; index < proposal.rows.length; index += 1) {
  const expected = proposal.rows[index];
  const actual = after[index];
  if (actual.id !== expected.id || actual.segment_numero !== index + 1 ||
      actual.ref_niv1 !== expected.ref_niv1 || actual.ref_niv2 !== expected.ref_niv2 ||
      actual.paragraphe !== expected.paragraphe || actual.rang !== expected.rang) {
    throw new Error(`Post-contrôle position ${index + 1}`);
  }
}
const finalHash = contentHash([...after]);
const snapshotHash = contentHash([...snapshot.segments]);
if (finalHash !== snapshotHash) throw new Error(`Empreinte contenu différente : ${finalHash} / ${snapshotHash}`);
console.log(JSON.stringify({ ok: true, segments: after.length, contentHash: finalHash,
  paragraphes: new Set(after.map((s) => `${s.ref_niv1}|${s.paragraphe}`)).size,
}, null, 2));
