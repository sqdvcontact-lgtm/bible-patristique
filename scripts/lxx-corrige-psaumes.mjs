// SEPTANTE — trois corrections aux psaumes (24/07/2026).
//   1. Ps 115 et Ps 147 : l'ossature y garde la numérotation HÉBRAÏQUE (v. 10-19 et
//      12-20), secondes moitiés de psaumes hébreux scindés, quand le fichier grec
//      repart à 1. Décalage de +9 et +11.
//   2. Le Psaume 151 n'est pas canonique : il rejoint versets_apocryphes sous PS2.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');
const NOTE = 'Créneau rétabli : l’ossature garde ici la numérotation hébraïque (seconde moitié d’un psaume hébreu scindé par le grec), quand le fichier source repart au verset 1.';

for (const [ch, pas] of [[115, 9], [147, 11]]) {
  const { data: oss } = await sb.from('versets_canon').select('v_canon').eq('livre','PSA').eq('ch_canon',ch);
  const slots = new Set((oss||[]).map(r=>r.v_canon));
  const { data: v } = await sb.from('versets_v2').select('id, v_orig, canon_id')
    .eq('trad_id','TR0005').eq('livre','PSA').eq('ch_orig',ch).order('v_orig');
  let n = 0;
  for (const r of v||[]) {
    const cible = r.v_orig + pas;
    if (!slots.has(cible)) continue;              // unité parasite : on n'y touche pas
    if (r.canon_id === `PSA.${ch}.${cible}`) continue;
    if (!DRY) await sb.from('versets_v2').update({ canon_id:`PSA.${ch}.${cible}`, ordre_slot:1, notes:NOTE, alignement_verifie:false }).eq('id', r.id);
    n++;
  }
  console.log(`Ps ${ch} : ${n} versets recréneautés (pas +${pas})`);
}

// Psaume 151 → apocryphes
const { data: p151 } = await sb.from('versets_v2').select('id, v_orig, texte, notes')
  .eq('trad_id','TR0005').eq('livre','PSA').eq('ch_orig',151).order('v_orig');
console.log(`Ps 151 : ${(p151||[]).length} versets à déplacer vers versets_apocryphes (PS2)`);
if (!DRY && p151?.length) {
  const { error } = await sb.from('versets_apocryphes').insert(p151.map(r => ({
    trad_id:'TR0005', livre:'PS2', chapitre:1, verset:r.v_orig, texte:r.texte,
    notes:'Psaume 151 — non canonique. Porté par la Septante, absent du canon des 73 livres.',
  })));
  if (error) console.log('   ✗ ' + error.message);
  else { await sb.from('versets_v2').delete().in('id', p151.map(r=>r.id)); console.log('   ✓ déplacé'); }
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
