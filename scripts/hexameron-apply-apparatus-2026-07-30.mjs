import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const WORK = 'A0017O0001';
const PROPOSAL_PATH = 'audit/hexameron-2026-07-30/apparatus-proposal.json';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const proposal = JSON.parse(readFileSync(PROPOSAL_PATH, 'utf8'));
const hash = (value) => createHash('sha256').update(value, 'utf8').digest('hex').toUpperCase();

const { data: existing, error: existingError } = await db.from('segments')
  .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv1_texte,ref_niv2_texte,nature,paragraphe,rang,notes,texte_original')
  .eq('id_oeuvre', WORK).eq('nature', 'apparat_critique').order('segment_numero');
if (existingError) throw existingError;

const expected = proposal.rows.map((row, index) => ({
  id_oeuvre: WORK,
  segment_numero: 1800 + index,
  segment_texte: row.segment_texte,
  ref_niv1: row.ref_niv1,
  ref_niv2: row.ref_niv2,
  ref_niv3: null,
  ref_niv4: null,
  ref_niv5: null,
  ref_niv1_texte: row.ref_niv1_texte,
  ref_niv2_texte: row.ref_niv2_texte,
  ref_niv3_texte: null,
  ref_niv4_texte: null,
  ref_niv5_texte: null,
  nature: 'apparat_critique',
  paragraphe: row.paragraphe,
  rang: row.rang,
  controle_rang_manuel: 'critique',
  controle_verifie: true,
  marquage_source: 'Codex (IA) — fac-similé Auger 1827',
  notes: null,
  texte_original: null,
}));

const comparable = (row) => JSON.stringify([
  row.segment_numero, row.segment_texte, row.ref_niv1, row.ref_niv2,
  row.ref_niv1_texte, row.ref_niv2_texte, row.nature, row.paragraphe, row.rang,
  row.notes, row.texte_original,
]);

if (existing.length) {
  if (existing.length !== expected.length || existing.some((row, index) => comparable(row) !== comparable(expected[index]))) {
    throw new Error(`Apparat déjà présent mais différent (${existing.length} segments) : arrêt prudent.`);
  }
  console.log(JSON.stringify({ ok: true, deja_present: true, segments: existing.length }, null, 2));
  process.exit(0);
}

const { data: bodyTail, error: bodyError } = await db.from('segments')
  .select('segment_numero,nature').eq('id_oeuvre', WORK).order('segment_numero', { ascending: false }).limit(1).single();
if (bodyError) throw bodyError;
if (bodyTail.segment_numero !== 1799 || bodyTail.nature === 'apparat_critique') {
  throw new Error(`État du corps inattendu avant insertion : ${JSON.stringify(bodyTail)}`);
}

const { data: inserted, error: insertError } = await db.from('segments').insert(expected)
  .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv1_texte,ref_niv2_texte,nature,paragraphe,rang,notes,texte_original');
if (insertError) throw insertError;

const { data: after, error: afterError } = await db.from('segments')
  .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv1_texte,ref_niv2_texte,nature,paragraphe,rang,notes,texte_original')
  .eq('id_oeuvre', WORK).eq('nature', 'apparat_critique').order('segment_numero');
if (afterError) throw afterError;
if (after.length !== expected.length || after.some((row, index) => comparable(row) !== comparable(expected[index]))) {
  throw new Error('Le contrôle post-insertion de l’apparat a échoué.');
}

console.log(JSON.stringify({
  ok: true,
  inserted: inserted.length,
  first: after[0].segment_numero,
  last: after.at(-1).segment_numero,
  textHash: hash(after.map((row) => row.segment_texte).join('\n')),
}, null, 2));
