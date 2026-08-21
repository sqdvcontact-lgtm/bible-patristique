// DISCORDANCES PAR LA LONGUEUR — le signal qui traverse les langues.
//
// Observation de l'auteur du site : quand une édition met au créneau N ce qu'une
// autre met au créneau N+1, la différence de LONGUEUR saute aux yeux — un fragment
// de vingt-cinq caractères en face d'un verset de cent. Et ce signal vaut du grec
// au français, là où toute comparaison de mots échoue.
//
// MÉTHODE. Le latin est plus bref que le français, le grec plus dense : on ne compare
// donc pas des longueurs brutes. Pour chaque traduction on calcule d'abord son
// rapport MÉDIAN à la médiane du créneau — sa « longueur normale » —, puis on
// signale les créneaux où elle s'en écarte fortement. Aucune langue n'est prise
// pour étalon : chacune est jugée sur son propre régime.
//   node scripts/detecte-longueurs.mjs [LIVRE]
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const LIVRE = process.argv[2] || null;
const NOM = { TR0001: 'Sacy', TR0002: 'Segond', TR0003: 'Crampon', TR0004: 'Vulgate', TR0005: 'Septante' };
const SEUIL_BAS = 0.45, SEUIL_HAUT = 2.2;   // écart au régime propre de la traduction

async function page(tr) {
  const m = new Map();
  for (let de = 0; ; de += 1000) {
    let q = sb.from('versets_v2').select('canon_id, texte').eq('trad_id', tr).not('canon_id', 'is', null).order('id').range(de, de + 999);
    if (LIVRE) q = q.eq('livre', LIVRE);
    const { data } = await q;
    if (!data?.length) break;
    for (const r of data) {
      const t = (r.texte || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (t) m.set(r.canon_id, (m.get(r.canon_id) || 0) + t.length);
    }
    if (data.length < 1000) break;
  }
  return m;
}
const L = {};
for (const tr of Object.keys(NOM)) L[tr] = await page(tr);

// médiane du créneau, sur les traductions qui le portent
const mediane = (a) => { const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
const creneaux = new Set();
for (const tr of Object.keys(NOM)) for (const k of L[tr].keys()) creneaux.add(k);
const medSlot = new Map();
for (const k of creneaux) {
  const v = Object.keys(NOM).map((tr) => L[tr].get(k)).filter(Boolean);
  if (v.length >= 3) medSlot.set(k, mediane(v));
}
// régime propre de chaque traduction : son rapport médian à la médiane du créneau
const regime = {};
for (const tr of Object.keys(NOM)) {
  const r = [];
  for (const [k, med] of medSlot) { const l = L[tr].get(k); if (l && med) r.push(l / med); }
  regime[tr] = r.length ? mediane(r) : 1;
}
console.log('régime propre de chaque traduction (rapport médian à la médiane du créneau) :');
for (const tr of Object.keys(NOM)) console.log(`   ${NOM[tr].padEnd(9)} ${regime[tr].toFixed(2)}`);

const suspects = [];
for (const [k, med] of medSlot) {
  for (const tr of Object.keys(NOM)) {
    const l = L[tr].get(k);
    if (!l) continue;
    const rapport = (l / med) / regime[tr];          // 1 = longueur attendue
    if (rapport >= SEUIL_BAS && rapport <= SEUIL_HAUT) continue;
    suspects.push({ k, trad: NOM[tr], long: l, med: Math.round(med), rapport: +rapport.toFixed(2) });
  }
}
suspects.sort((a, b) => Math.abs(Math.log(a.rapport)) < Math.abs(Math.log(b.rapport)) ? 1 : -1);
console.log(`\ncréneaux comparables (≥ 3 témoins) : ${medSlot.size}`);
console.log(`ÉCARTS DE LONGUEUR : ${suspects.length}\n`);
const pl = {};
for (const s of suspects) pl[s.k.split('.')[0]] = (pl[s.k.split('.')[0]] || 0) + 1;
console.log('par livre : ' + Object.entries(pl).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([a, n]) => `${a} ${n}`).join(' · '));
console.log('\nles 22 plus criants :');
for (const s of suspects.slice(0, 22))
  console.log(`   ${s.k.padEnd(12)} ${s.trad.padEnd(9)} ${String(s.long).padStart(4)} car. · médiane ${String(s.med).padStart(4)} · rapport ${s.rapport}`);
writeFileSync('scripts/_longueurs.json', JSON.stringify(suspects, null, 1), 'utf8');
console.log(`\n→ scripts/_longueurs.json`);
process.exit(0);
