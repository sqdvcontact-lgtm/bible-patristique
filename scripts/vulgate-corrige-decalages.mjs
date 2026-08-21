// CORRECTION DES DÉCALAGES DE FRONTIÈRE — Vulgate alignée sur Sacy.
//
// 21 chapitres où la Vulgate et Sacy divergent par SÉRIES contiguës à pas constant,
// et par paires de chapitres voisins aux pas opposés (Gn 31 −32 / Gn 32 +32) : c'est
// la signature d'un déplacement de frontière de chapitre. La Vulgate range en fin de
// chapitre N ce que l'hébreu ouvre au chapitre N+1 ; Sacy, qui la traduit, suit la
// frontière hébraïque — donc celle de l'ossature. On adopte son créneau.
//
// Les écarts ISOLÉS ou irréguliers (65 versets, 17 chapitres) ne sont PAS touchés :
// ils demandent un jugement au cas par cas.
// Les PSAUMES sont hors sujet (artefact de la suscription, cf. diagnostic).
//
// Contrôle avant écriture : aucun créneau ne doit se retrouver servi deux fois.
//   node scripts/vulgate-corrige-decalages.mjs --dry
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const { series } = JSON.parse(readFileSync('scripts/_vulgate_decalages.json', 'utf8'));
const aBouger = series.flatMap((s) => s.g.map((e) => ({ id: e.id, de: e.canon_id, vers: e.cible, ref: `${e.livre} ${e.ch_orig},${e.v_orig}` })));
console.log(`${series.length} chapitres · ${aBouger.length} versets à recréneauter`);

// ── contrôle : état final sans collision ? ─────────────────────────────────
const V = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_v2').select('id, canon_id').eq('trad_id', 'TR0004').order('id').range(de, de + 999);
  if (!data?.length) break; V.push(...data); if (data.length < 1000) break;
}
const futur = new Map(V.map((r) => [r.id, r.canon_id]));
for (const m of aBouger) futur.set(m.id, m.vers);
const compte = new Map();
for (const c of futur.values()) if (c) compte.set(c, (compte.get(c) || 0) + 1);
const collisions = [...compte.entries()].filter(([, n]) => n > 1);
console.log(`créneaux servis plus d'une fois après correction : ${collisions.length}` +
  (collisions.length ? ' → ' + collisions.slice(0, 8).map(([c, n]) => `${c}×${n}`).join(' · ') : ''));
console.log('   (un créneau peut légitimement porter deux versets latins : le rang ordre_slot les ordonne)');

if (DRY) {
  console.log('\nles 12 premiers mouvements :');
  for (const m of aBouger.slice(0, 12)) console.log(`   ${m.ref.padEnd(12)} ${m.de} → ${m.vers}`);
  console.log('\n(--dry : rien écrit)');
  process.exit(0);
}

let ok = 0;
for (const m of aBouger) {
  const { error } = await sb.from('versets_v2').update({
    canon_id: m.vers, alignement_verifie: false,
    notes: 'Créneau repris de la Bible de Sacy : la Vulgate place en fin de chapitre ce que l’ossature ouvre au chapitre suivant (déplacement de frontière).',
  }).eq('id', m.id);
  if (!error) ok++; else console.log('ERR', m.ref, error.message);
}
console.log(`\n✓ ${ok} versets recréneautés`);

// rangs recalculés là où plusieurs versets latins partagent un créneau
const W = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_v2').select('id, canon_id, ch_orig, v_orig, ordre_slot')
    .eq('trad_id', 'TR0004').not('canon_id', 'is', null).order('id').range(de, de + 999);
  if (!data?.length) break; W.push(...data); if (data.length < 1000) break;
}
const par = new Map();
for (const r of W) { let a = par.get(r.canon_id); if (!a) par.set(r.canon_id, a = []); a.push(r); }
let rangs = 0;
for (const [, a] of par) {
  if (a.length < 2) continue;
  a.sort((x, y) => x.ch_orig - y.ch_orig || x.v_orig - y.v_orig);
  for (let i = 0; i < a.length; i++) if (a[i].ordre_slot !== i + 1) { await sb.from('versets_v2').update({ ordre_slot: i + 1 }).eq('id', a[i].id); rangs++; }
}
console.log(`✓ ${rangs} rangs recalculés`);
process.exit(0);
