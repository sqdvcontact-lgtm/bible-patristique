// CORRECTION DES SURNUMÉRAIRES DE LA VULGATE (TR0004) — 24/07/2026.
//
// Erreur de l'import initial : les versets propres à la Vulgate, sans créneau dans
// l'ossature, avaient été logés en `ordre_slot = 2` sur le créneau PRÉCÉDENT. Or
// Sacy — qui traduit la même Vulgate et dont l'alignement est arbitré — traite ces
// versets autrement : il les laisse SANS créneau (`canon_id = null`). Suivre Sacy,
// verset par verset, plutôt que d'inventer un placement.
//
// Trois cas, tranchés en comparant chaque verset au Sacy de même (livre, ch, v) :
//   · Sacy sans créneau            → canon_id = null      (122)
//   · Sacy à un autre créneau      → adopter le sien       (79)
//   · Sacy au même créneau         → ne rien toucher      (220)
//
//   node scripts/vulgate-corrige-surnumeraires.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

async function page(tr) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_v2')
      .select('id, livre, ch_orig, v_orig, canon_id, ordre_slot')
      .eq('trad_id', tr).order('id').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}

const V = await page('TR0004'), S = await page('TR0001');
const sKey = new Map();
for (const r of S) sKey.set(`${r.livre}|${r.ch_orig}|${r.v_orig}`, r);

const versNull = [], versAutre = [], inconnus = [];
for (const r of V.filter((x) => (x.ordre_slot ?? 1) > 1)) {
  const s = sKey.get(`${r.livre}|${r.ch_orig}|${r.v_orig}`);
  if (!s) { inconnus.push(r); continue; }
  if (s.canon_id === null) versNull.push(r);
  else if (s.canon_id !== r.canon_id) versAutre.push({ r, cible: s.canon_id });
}
console.log(`sans créneau (comme Sacy) : ${versNull.length}`);
console.log(`recréneautés d'après Sacy : ${versAutre.length}`);
console.log(`Sacy ne les a pas, inchangés : ${inconnus.length}`);
if (inconnus.length) console.log('   ' + inconnus.map((r) => `${r.livre} ${r.ch_orig},${r.v_orig}`).join(' · '));

if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0); }

let a = 0;
for (const r of versNull) {
  const { error } = await sb.from('versets_v2')
    .update({ canon_id: null, ordre_slot: null,
      notes: 'Verset propre à la Vulgate, sans équivalent dans l’ossature — laissé sans créneau, comme le fait Sacy pour le même verset.' })
    .eq('id', r.id);
  if (!error) a++; else console.log('ERR', r.livre, r.ch_orig, r.v_orig, error.message);
}
console.log(`\n✓ ${a} laissés sans créneau`);

// Recréneautage : ordre_slot recalculé parmi les versets vulgates du créneau visé.
let b = 0;
for (const { r, cible } of versAutre) {
  const { data: occupants } = await sb.from('versets_v2')
    .select('id, ch_orig, v_orig').eq('trad_id', 'TR0004').eq('canon_id', cible);
  const slot = (occupants?.length ?? 0) + 1;
  const { error } = await sb.from('versets_v2')
    .update({ canon_id: cible, ordre_slot: slot,
      notes: 'Créneau repris de la Bible de Sacy, qui traduit la même Vulgate et dont l’alignement est arbitré.' })
    .eq('id', r.id);
  if (!error) b++; else console.log('ERR', r.livre, r.ch_orig, r.v_orig, error.message);
}
console.log(`✓ ${b} recréneautés d'après Sacy`);
process.exit(0);
