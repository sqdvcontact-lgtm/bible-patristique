import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OEUVRE = 'A0017O0001';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const specs = [
  {
    numero: 890,
    boundary: ' peine Et ces téméraires',
    firstEnd: ' peine.',
    secondStart: 'Et ces téméraires',
    keepOriginal: 'second',
    temporaryNumero: 900001,
  },
  {
    numero: 1245,
    boundary: ' caractère Le roi a un aiguillon',
    firstEnd: ' caractère.',
    secondStart: 'Le roi a un aiguillon',
    keepOriginal: 'first',
    temporaryNumero: 900002,
  },
  {
    numero: 1421,
    boundary: ' sagesse Nous ne saurions dire',
    firstEnd: ' sagesse.',
    secondStart: 'Nous ne saurions dire',
    keepOriginal: 'first',
    temporaryNumero: 900003,
  },
];

const { data: rows, error } = await db.from('segments').select('*')
  .eq('id_oeuvre', OEUVRE).in('segment_numero', [...specs.map((s) => s.numero), 1797]);
if (error) throw error;
const byNumero = new Map(rows.map((row) => [row.segment_numero, row]));

function split(row, spec) {
  const index = row.segment_texte.indexOf(spec.boundary);
  if (index < 0 || row.segment_texte.indexOf(spec.boundary, index + 1) >= 0) {
    throw new Error(`Garde segment ${spec.numero} : frontière absente ou multiple`);
  }
  const prefixLength = spec.boundary.indexOf(spec.firstEnd.slice(0, -1));
  if (prefixLength !== 0) throw new Error(`Spécification invalide ${spec.numero}`);
  const first = row.segment_texte.slice(0, index) + spec.firstEnd;
  const second = spec.secondStart + row.segment_texte.slice(index + spec.boundary.length);
  return { first, second };
}

const proposal = specs.map((spec) => {
  const row = byNumero.get(spec.numero);
  if (!row) throw new Error(`Segment absent : ${spec.numero}`);
  const parts = split(row, spec);
  return { spec, row, ...parts };
});
const fin = byNumero.get(1797);
if (!fin || fin.segment_texte.trim() !== 'FIN.' || fin.notes || fin.texte_original) {
  throw new Error('Garde FIN : état inattendu');
}
console.log(JSON.stringify({ apply: APPLY, splits: proposal.map((p) => ({
  segment: p.spec.numero, keepOriginal: p.spec.keepOriginal,
  first: p.first, second: p.second,
})), deleteFinId: fin.id }, null, 2));
if (APPLY) {

const insertableKeys = [
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'ref_niv1_texte', 'ref_niv2_texte', 'ref_niv3_texte', 'ref_niv4_texte', 'ref_niv5_texte',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'reference_manuelle',
  'verifies', 'texte_original', 'notes', 'marquage_source', 'marquage_date', 'commentaire_ia',
  'liens_revus_le', 'liens_revus_par', 'paragraphe', 'rang', 'controle_rang_manuel',
  'controle_verifie', 'controle_verifie_le',
];

for (const item of proposal) {
  const { spec, row, first, second } = item;
  const originalText = spec.keepOriginal === 'first' ? first : second;
  const newText = spec.keepOriginal === 'first' ? second : first;
  const { data: updated, error: updateError } = await db.from('segments')
    .update({ segment_texte: originalText }).eq('id', row.id).eq('segment_texte', row.segment_texte).select('id');
  if (updateError) throw updateError;
  if (updated.length !== 1) throw new Error(`Mise à jour segment ${spec.numero} : ${updated.length}`);

  const inserted = Object.fromEntries(insertableKeys.map((key) => [key, row[key]]));
  inserted.segment_numero = spec.temporaryNumero;
  inserted.segment_texte = newText;
  inserted.texte_original = null;
  inserted.notes = null;
  inserted.lien_1 = null;
  inserted.lien_2 = null;
  inserted.lien_3 = null;
  inserted.lien_4 = null;
  inserted.fiabilite = null;
  inserted.reference_manuelle = null;
  inserted.verifies = [];
  inserted.liens_revus_le = null;
  inserted.liens_revus_par = null;
  inserted.controle_verifie = false;
  inserted.controle_verifie_le = null;
  const { data: created, error: insertError } = await db.from('segments').insert(inserted).select('id');
  if (insertError) throw insertError;
  if (created.length !== 1) throw new Error(`Insertion segment issu de ${spec.numero} : ${created.length}`);
}

const { data: deleted, error: deleteError } = await db.from('segments').delete()
  .eq('id', fin.id).eq('segment_texte', 'FIN.').select('id');
if (deleteError) throw deleteError;
if (deleted.length !== 1) throw new Error(`Suppression FIN : ${deleted.length}`);

const { data: check, error: checkError } = await db.from('segments').select('id,segment_numero,segment_texte,texte_original')
  .eq('id_oeuvre', OEUVRE).in('segment_numero', [...specs.map((s) => s.numero), ...specs.map((s) => s.temporaryNumero)]);
if (checkError) throw checkError;
if (check.length !== 6) throw new Error(`Post-contrôle scissions : ${check.length} lignes`);
console.log(JSON.stringify({ ok: true, rows: check.sort((a, b) => a.segment_numero - b.segment_numero) }, null, 2));
}
