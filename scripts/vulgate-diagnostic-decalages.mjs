// DIAGNOSTIC DES DÉCALAGES VULGATE / SACY — structure avant remède.
//
// Sacy traduit la Vulgate verset par verset : son placement fait donc autorité.
// Mais tous les écarts ne se valent pas. Le cas du Siracide 16 a montré que les
// vrais décalages viennent par SÉRIES CONTIGUËS à pas constant — un chapitre
// entier glissé d'un cran. Un écart isolé, lui, est souvent légitime (Sacy scinde
// ou soude un verset là où la Vulgate ne le fait pas).
//
// LES PSAUMES SONT EXCLUS : Sacy y numérote la suscription 0, la Vulgate 1, si
// bien qu'une comparaison par (livre, ch, v) décale tout le psautier
// artificiellement. Vérifié à l'import que `PSA.30.1` porte la suscription latine.
//
// Lecture seule.
//   node scripts/vulgate-diagnostic-decalages.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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
for (const r of S) {
  const k = `${r.livre}|${r.ch_orig}|${r.v_orig}`;
  let a = sKey.get(k); if (!a) sKey.set(k, a = []); a.push(r.canon_id);
}

// écart = différence entre le numéro de verset visé par la Vulgate et celui visé par Sacy
const ecarts = [];
for (const r of V) {
  if (r.livre === 'PSA' || !r.canon_id) continue;
  const a = sKey.get(`${r.livre}|${r.ch_orig}|${r.v_orig}`);
  if (!a || a.includes(r.canon_id)) continue;
  const cible = a[0];
  if (!cible) continue;
  const [lm, cm, vm] = r.canon_id.split('.');
  const [ls, cs, vs] = cible.split('.');
  ecarts.push({
    ...r, cible,
    memeChapitre: lm === ls && cm === cs,
    pas: (lm === ls && cm === cs) ? (+vs - +vm) : null,
  });
}
console.log(`écarts hors psaumes : ${ecarts.length}`);

// regrouper par (livre, chapitre d'édition) et mesurer la régularité
const groupes = new Map();
for (const e of ecarts) {
  const k = `${e.livre} ${e.ch_orig}`;
  let g = groupes.get(k); if (!g) groupes.set(k, g = []); g.push(e);
}
const series = [], isoles = [];
for (const [k, g] of groupes) {
  const pas = [...new Set(g.map((e) => e.pas))];
  const regulier = pas.length === 1 && pas[0] !== null;
  (g.length >= 3 && regulier ? series : isoles).push({ k, n: g.length, pas: pas.length === 1 ? pas[0] : null, g });
}
series.sort((a, b) => b.n - a.n);
console.log(`\nSÉRIES régulières (≥ 3 versets, pas constant) : ${series.length} chapitres, ${series.reduce((n, s) => n + s.n, 0)} versets`);
for (const s of series.slice(0, 25)) console.log(`   ${s.k.padEnd(10)} ${String(s.n).padStart(3)} versets · décalage ${s.pas > 0 ? '+' : ''}${s.pas}`);
const rest = isoles.reduce((n, s) => n + s.n, 0);
console.log(`\nÉCARTS ISOLÉS ou irréguliers : ${isoles.length} chapitres, ${rest} versets — à juger un par un`);
for (const s of isoles.sort((a, b) => b.n - a.n).slice(0, 15))
  console.log(`   ${s.k.padEnd(10)} ${String(s.n).padStart(3)} versets · ${s.pas === null ? 'pas irrégulier ou changement de chapitre' : 'décalage ' + s.pas}`);
writeFileSync('scripts/_vulgate_decalages.json', JSON.stringify({ series, isoles }, null, 1), 'utf8');
console.log('\n→ scripts/_vulgate_decalages.json');
process.exit(0);
