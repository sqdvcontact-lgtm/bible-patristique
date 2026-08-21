import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const WORK = 'A0091O0001';
const { data: charteRow, error: charteError } = await sb.from('parametres').select('valeur,mis_a_jour').eq('cle', 'charte_ia').single();
if (charteError) throw charteError;
const { data: work, error: workError } = await sb.from('oeuvres').select('*').eq('id_oeuvre', WORK).single();
if (workError) throw workError;

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('segments')
    .select('id,segment_numero,segment_texte,texte_original,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,notes,paragraphe,rang,nature,lien_1,lien_2,lien_3,lien_4')
    .eq('id_oeuvre', WORK).order('segment_numero').range(from, from + 999);
  if (error) throw error;
  rows.push(...data);
  if (data.length < 1000) break;
}

const markerRe = /\[\[(\d+)\]\]/g;
const markers = (value) => [...String(value ?? '').matchAll(markerRe)].map((m) => Number(m[1]));
const noteDefs = [];
const calls = [];
const fields = ['ref_niv1', 'ref_niv1_texte', 'ref_niv2', 'ref_niv2_texte', 'ref_niv3', 'ref_niv3_texte', 'ref_niv4', 'ref_niv4_texte', 'segment_texte', 'texte_original'];
for (const row of rows) {
  for (const field of fields) for (const number of markers(row[field])) calls.push({ segment: row.segment_numero, field, number });
  for (const line of String(row.notes ?? '').split(/\r?\n/)) {
    const match = line.match(/^\[\[(\d+)\]\]\s*(.*)$/s);
    if (match) noteDefs.push({ segment: row.segment_numero, number: Number(match[1]), text: match[2] });
  }
}

const counts = (items) => Object.entries(items.reduce((acc, item) => ((acc[item.number] = (acc[item.number] ?? 0) + 1), acc), {}))
  .filter(([, count]) => count !== 1).map(([number, count]) => ({ number: Number(number), count }));
const changes = [];
for (let i = 1; i < rows.length; i++) {
  const before = rows[i - 1];
  const after = rows[i];
  for (const field of ['ref_niv1', 'ref_niv1_texte', 'ref_niv2', 'ref_niv2_texte']) {
    if (before[field] !== after[field]) changes.push({ at: after.segment_numero, field, before: before[field], after: after[field] });
  }
}

console.log(JSON.stringify({
  charte: {
    mis_a_jour: charteRow.mis_a_jour,
    title_page_context: charteRow.valeur.slice(Math.max(0, charteRow.valeur.indexOf('## 4.') - 200), charteRow.valeur.indexOf('## 4.') + 1600),
    note_context: charteRow.valeur.slice(Math.max(0, charteRow.valeur.indexOf('RenumÃ©rotation sÃ©quentielle') - 500), charteRow.valeur.indexOf('RenumÃ©rotation sÃ©quentielle') + 1300),
  },
  work: {
    id_oeuvre: work.id_oeuvre, titre: work.titre, sous_titre: work.sous_titre,
    nb_signes: work.nb_signes, profondeur_sommaire: work.profondeur_sommaire,
    niveaux_sommaire: work.niveaux_sommaire, afficher_numeros: work.afficher_numeros,
  },
  segment_count: rows.length,
  first: rows.slice(0, 5),
  last: rows.slice(-5),
  structure_changes: changes,
  notes: {
    call_count: calls.length, definition_count: noteDefs.length,
    call_numbers: [...new Set(calls.map((x) => x.number))],
    definition_numbers: noteDefs.map((x) => x.number),
    duplicate_calls: counts(calls), duplicate_definitions: counts(noteDefs),
    calls_near_treatise_start: calls.filter((x) => x.segment >= 320 && x.segment <= 345),
    definitions_near_treatise_start: noteDefs.filter((x) => x.segment >= 320 && x.segment <= 345),
  },
}, null, 2));
