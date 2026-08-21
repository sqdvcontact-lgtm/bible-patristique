import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const APPLY = process.argv.includes('--apply');
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

const before = await fetchAll();
const currentById = new Map(before.map((row) => [row.id, row]));
const snapshotById = new Map(snapshot.segments.map((row) => [row.id, row]));
if (before.length !== proposal.rows.length || before.length !== snapshot.segments.length) {
  throw new Error(`Garde compte : base=${before.length}, proposition=${proposal.rows.length}, instantané=${snapshot.segments.length}`);
}
for (const row of proposal.rows) {
  const current = currentById.get(row.id);
  const saved = snapshotById.get(row.id);
  if (!current || !saved || current.segment_texte !== saved.segment_texte || current.segment_numero !== saved.segment_numero) {
    throw new Error(`Garde segment ${row.id} : état courant différent de l’instantané`);
  }
}

const contentHash = (rows) => createHash('sha256').update(rows
  .sort((a, b) => a.id - b.id)
  .map((s) => `${s.id}\t${s.segment_texte ?? ''}\t${s.notes ?? ''}\t${s.texte_original ?? ''}`).join('\n'), 'utf8')
  .digest('hex').toUpperCase();
const beforeContentHash = contentHash([...before]);
console.log(JSON.stringify({ apply: APPLY, segments: before.length, contentHash: beforeContentHash,
  audit: proposal.audit.map(({ homily, source_paragraphs, source_sections, segments }) => ({ homily, source_paragraphs, source_sections, segments })) }, null, 2));

if (APPLY) {
  // Move every segment number to an unused range so the final renumbering cannot collide.
  for (const row of before) {
    const { data, error } = await db.from('segments').update({ segment_numero: row.segment_numero + 1000000 })
      .eq('id', row.id).eq('segment_numero', row.segment_numero).select('id');
    if (error) throw error;
    if (data.length !== 1) throw new Error(`Renumérotation temporaire ${row.id} : ${data.length}`);
  }

  for (let index = 0; index < proposal.rows.length; index += 1) {
    const row = proposal.rows[index];
    const patch = {
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
    };
    const { data, error } = await db.from('segments').update(patch)
      .eq('id', row.id).select('id');
    if (error) throw error;
    if (data.length !== 1) throw new Error(`Structure segment ${row.id} : ${data.length}`);
  }

  const after = await fetchAll();
  if (after.length !== before.length) throw new Error(`Post-compte : ${after.length}`);
  for (let index = 0; index < after.length; index += 1) {
    const expected = proposal.rows[index];
    const actual = after[index];
    if (actual.id !== expected.id || actual.segment_numero !== index + 1 ||
        actual.paragraphe !== expected.paragraphe || actual.rang !== expected.rang ||
        actual.ref_niv1 !== expected.ref_niv1 || actual.ref_niv2 !== expected.ref_niv2) {
      throw new Error(`Post-contrôle structure à la position ${index + 1}`);
    }
  }
  const afterContentHash = contentHash([...after]);
  if (afterContentHash !== beforeContentHash) throw new Error('Le contenu textuel, les notes ou le grec ont changé');
  console.log(JSON.stringify({ ok: true, segments: after.length, contentHash: afterContentHash,
    paragraphes: new Set(after.map((s) => `${s.ref_niv1}|${s.paragraphe}`)).size,
    rangsInvalides: after.filter((s) => !Number.isInteger(s.rang) || s.rang < 1).length,
  }, null, 2));
}
