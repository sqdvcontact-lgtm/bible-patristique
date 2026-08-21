import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ROOT = 'audit/oeuvres-global-2026-07-30';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const corrections = [
  { id_oeuvre: 'A0010O0004', segment_numero: 31204, old: 'en paraissant cher cher Dieu', next: 'en paraissant chercher Dieu', source: 'Wikisource, Discours sur les psaumes LXXI à LXXX' },
  { id_oeuvre: 'A0013O0002', segment_numero: 13723, old: 'en peut vouloir vouloir', next: 'on peut vouloir vouloir', source: 'correction grammaticale certaine' },
  { id_oeuvre: 'A0013O0002', segment_numero: 13868, old: 'pour cela cela appartient', next: 'pour cela appartient', source: 'répétition OCR certaine' },
  { id_oeuvre: 'A0010O0002', segment_numero: 1761, old: 'quand il dit que, voulait comprendre', next: 'quand il dit que, voulant comprendre', source: 'Wikisource, Cité de Dieu, tome XIII, p. 115' },
  { id_oeuvre: 'A0010O0002', segment_numero: 8094, old: 'lsaïe ajoute', next: 'Isaïe ajoute', source: 'nom biblique certain' },
];
const rows = [];
for (const correction of corrections) {
  const { data, error } = await db.from('segments').select('id,id_oeuvre,segment_numero,segment_texte')
    .eq('id_oeuvre', correction.id_oeuvre).eq('segment_numero', correction.segment_numero).single();
  if (error) throw new Error(error.message);
  if (!data.segment_texte.includes(correction.old)) throw new Error(`Texte attendu absent : ${correction.id_oeuvre}/${correction.segment_numero}`);
  rows.push({ correction, before: data, after: data.segment_texte.replace(correction.old, correction.next) });
}
mkdirSync(ROOT, { recursive: true });
const path = `${ROOT}/${APPLY ? 'sauvegarde-avant-corrections-residuelles' : 'simulation-corrections-residuelles'}.json`;
writeFileSync(path, `${JSON.stringify({ generated_at: new Date().toISOString(), rows }, null, 2)}\n`, 'utf8');
if (!APPLY) {
  console.log(JSON.stringify({ mode: 'dry_run', path, updates: rows.length }, null, 2));
  process.exit(0);
}
for (const row of rows) {
  const { data, error } = await db.from('segments').update({ segment_texte: row.after })
    .eq('id', row.before.id).eq('segment_texte', row.before.segment_texte).select('id');
  if (error) throw new Error(error.message);
  if (data.length !== 1) throw new Error(`Garde concurrente déclenchée : ${row.before.id_oeuvre}/${row.before.segment_numero}`);
}
console.log(JSON.stringify({ mode: 'applied', path, updates: rows.length }, null, 2));
