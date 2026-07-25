import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

// Siracide 16 : la Vulgate est décalée d'un cran par rapport à Sacy, qui la traduit.
// Règle vérifiée au contenu verset par verset : Vulg 16,n prend le créneau de Sacy 16,n.
const { data: S } = await sb.from('versets_v2').select('v_orig, canon_id, ordre_slot')
  .eq('trad_id','TR0001').eq('livre','SIR').eq('ch_orig',16).order('v_orig');
const { data: V } = await sb.from('versets_v2').select('id, v_orig, canon_id, texte')
  .eq('trad_id','TR0004').eq('livre','SIR').eq('ch_orig',16).order('v_orig');
const cible = new Map();
for (const s of S||[]) { if (!cible.has(s.v_orig)) cible.set(s.v_orig, []); cible.get(s.v_orig).push(s.canon_id); }

let bouge = 0;
for (const v of V||[]) {
  const c = cible.get(v.v_orig);
  if (!c || c.includes(v.canon_id)) continue;
  const dest = c[0];                       // premier créneau où Sacy porte ce verset
  console.log(`  Vulg 16,${String(v.v_orig).padEnd(2)} : ${v.canon_id} → ${dest}`);
  if (!DRY) await sb.from('versets_v2').update({
    canon_id: dest, ordre_slot: 1, alignement_verifie: false,
    notes: 'Créneau repris de la Bible de Sacy, qui traduit la même Vulgate ; correspondance vérifiée au contenu (Siracide 16 était décalé d’un cran).',
  }).eq('id', v.id);
  bouge++;
}
console.log(`\n${bouge} versets recréneautés`);

// Vulg 16,11 porte DEUX propositions que Sacy répartit sur deux créneaux :
// « Et sicut sexcenta millia… duritia cordis sui » puis « et si unus fuisset cervicatus… ».
const onze = (V||[]).find(x => x.v_orig === 11);
if (onze) {
  const i = onze.texte.indexOf('et si unus fuisset cervicatus');
  if (i > 0) {
    const tete = onze.texte.slice(0, i).trim().replace(/[:,]\s*$/, '');
    const queue = onze.texte.slice(i).trim();
    console.log(`\nscission de 16,11 :\n   SIR.16.10 │ ${tete}\n   SIR.16.11 │ ${queue}`);
    if (!DRY) {
      await sb.from('versets_v2').update({ texte: tete, canon_id: 'SIR.16.10', ordre_slot: 1,
        notes: 'Verset latin scindé : première part. Sacy répartit son v. 11 sur deux créneaux ; on suit sa coupure.' }).eq('id', onze.id);
      await sb.from('versets_v2').insert({ trad_id:'TR0004', livre:'SIR', ch_orig:16, v_orig:11,
        texte: queue, canon_id:'SIR.16.11', ordre_slot:1, alignement_verifie:false,
        notes: 'Verset latin scindé : seconde part, portée ici — elle traduit « Aurait-il donc pardonné à un seul homme… » chez Sacy.' });
    }
  } else console.log('\n⚠ marqueur de scission absent de 16,11');
}
if (DRY) console.log('\n(--dry : rien écrit)');
process.exit(0);
