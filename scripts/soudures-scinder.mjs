// SCISSION DES SOUDURES — piloté par une table lue à la main.
//
// Chaque entrée : le créneau resté vide, et le MARQUEUR où couper le verset latin
// qui siège au créneau suivant. Sa première moitié revient au créneau vide, la
// seconde demeure. Les deux gardent `ch_orig`/`v_orig` — l'édition n'a qu'un verset
// là — et portent une note qui l'énonce (charte, § « Alignement des versets »).
//
// La table se remplit EN LISANT `scripts/_soudures_TRxxxx_LIVRE.txt`, jamais
// automatiquement : la continuité de numérotation n'est qu'un indice, et le point
// de coupe est affaire de sens.
//
//   node scripts/soudures-scinder.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const TRAD = 'TR0004';

// { vide : le créneau à remplir · marqueur : où couper le verset du créneau suivant }
const TABLE = [
  // faites le 24/07/2026 — laissées pour mémoire, le script est idempotent
  // { vide: 'SIR.1.14',  marqueur: 'cum electis feminis' },
  // { vide: 'SIR.3.13',  marqueur: 'eleemosyna enim patris' },
  // { vide: 'SIR.15.3',  marqueur: 'et firmabitur in illo' },
  { vide: 'NEH.3.30',  marqueur: 'Post eum ædificavit Melchias' },
  { vide: 'NEH.12.33', marqueur: 'Judas, et Benjamin' },
  { vide: 'JOB.42.16', marqueur: 'et mortuus est senex' },
  { vide: 'WIS.19.12', marqueur: 'et vexationes peccatoribus' },
  { vide: 'JER.37.4',  marqueur: 'Igitur exercitus Pharaonis' },
];

const NOTE_A = 'Première part d’un verset que l’édition soude : elle imprime en un seul verset ce que l’ossature sépare en deux. La numérotation d’origine est conservée de part et d’autre.';
const NOTE_B = 'Seconde part d’un verset que l’édition soude — voir la première au créneau précédent.';

for (const op of TABLE) {
  const [livre, ch, v] = op.vide.split('.');
  const suivant = `${livre}.${ch}.${+v + 1}`;
  const { data } = await sb.from('versets_v2')
    .select('id, ch_orig, v_orig, texte').eq('trad_id', TRAD).eq('canon_id', suivant).order('ordre_slot');
  const r = (data || [])[0];
  if (!r) { console.log(`✗ ${op.vide} — rien au créneau ${suivant}`); continue; }
  const i = (r.texte || '').indexOf(op.marqueur);
  if (i < 0) { console.log(`✗ ${op.vide} — marqueur « ${op.marqueur} » absent de ${suivant}`); continue; }
  const tete = r.texte.slice(0, i).trim().replace(/[:,;]\s*$/, '');
  const queue = r.texte.slice(i).trim();
  console.log(`\n── ${op.vide}  (depuis ${suivant}, verset ${r.ch_orig},${r.v_orig})`);
  console.log(`   ${op.vide.padEnd(11)} │ ${tete.slice(0, 96)}`);
  console.log(`   ${suivant.padEnd(11)} │ ${queue.slice(0, 96)}`);
  if (DRY) continue;
  await sb.from('versets_v2').update({ texte: queue, notes: NOTE_B, alignement_verifie: false }).eq('id', r.id);
  const { error } = await sb.from('versets_v2').insert({
    trad_id: TRAD, livre, ch_orig: r.ch_orig, v_orig: r.v_orig,
    texte: tete, canon_id: op.vide, ordre_slot: 1, alignement_verifie: false, notes: NOTE_A,
  });
  console.log(error ? `   ✗ ${error.message}` : '   ✓ écrit');
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
