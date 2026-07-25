// PASSE SUR TOUTE LA BIBLE — chapitres entiers décalés chez une traduction.
//
// La faute la plus rentable à traquer n'est pas le verset isolé mais le CHAPITRE
// ENTIER décalé — cas 2 Ch 2, où Segond est en retard d'un cran du v. 2 au v. 17.
// Elle est systématique, donc corrigible en bloc, et elle fausse tout un passage.
//
// MÉTHODE, indépendante de la langue. Pour chaque (traduction, livre, chapitre) on
// prend la SUITE DES LONGUEURS de ses versets, et on la compare à la suite des
// longueurs médianes du chapitre — celle que dessinent les autres témoins. Si la
// suite colle nettement mieux décalée d'un cran qu'en place, le chapitre est décalé.
// Le grec est plus dense et le latin plus bref, mais cela ne change pas la FORME de
// la courbe : c'est elle qu'on compare, après normalisation.
//
// Lecture seule.
//   node scripts/passe-decalages-chapitres.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const NOM = { TR0001: 'Sacy', TR0002: 'Segond', TR0003: 'Crampon', TR0004: 'Vulgate', TR0005: 'Septante' };

async function page(tr) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_v2').select('canon_id, texte')
      .eq('trad_id', tr).not('canon_id', 'is', null).order('id').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  const m = new Map();
  for (const r of o) {
    const t = (r.texte || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (t) m.set(r.canon_id, (m.get(r.canon_id) || 0) + t.length);
  }
  return m;
}
const L = {};
for (const tr of Object.keys(NOM)) L[tr] = await page(tr);

// médiane du créneau, sur au moins trois témoins
const tous = new Set(); for (const tr of Object.keys(NOM)) for (const k of L[tr].keys()) tous.add(k);
const med = new Map();
const mediane = (a) => { const b = [...a].sort((x, y) => x - y); return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2; };
for (const k of tous) {
  const v = Object.keys(NOM).map((tr) => L[tr].get(k)).filter(Boolean);
  if (v.length >= 3) med.set(k, mediane(v));
}
// regrouper par chapitre
const chapitres = new Map();
for (const k of med.keys()) {
  const [l, c, v] = k.split('.');
  const key = `${l}.${c}`;
  let a = chapitres.get(key); if (!a) chapitres.set(key, a = []); a.push(+v);
}
for (const a of chapitres.values()) a.sort((x, y) => x - y);

// corrélation de deux suites, sur les positions communes
function corr(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  const A = a.slice(0, n), B = b.slice(0, n);
  const mA = A.reduce((s, x) => s + x, 0) / n, mB = B.reduce((s, x) => s + x, 0) / n;
  let num = 0, dA = 0, dB = 0;
  for (let i = 0; i < n; i++) { const x = A[i] - mA, y = B[i] - mB; num += x * y; dA += x * x; dB += y * y; }
  return (dA && dB) ? num / Math.sqrt(dA * dB) : null;
}

const suspects = [];
for (const [key, versets] of chapitres) {
  if (versets.length < 8) continue;                       // trop court pour conclure
  const [livre, ch] = key.split('.');
  const suiteMed = versets.map((v) => med.get(`${livre}.${ch}.${v}`));
  for (const tr of Object.keys(NOM)) {
    const suite = versets.map((v) => L[tr].get(`${livre}.${ch}.${v}`) ?? null);
    if (suite.filter(Boolean).length < versets.length * 0.8) continue;   // couverture insuffisante
    const propre = suite.map((x) => x ?? 0);
    const c0 = corr(propre, suiteMed);
    if (c0 === null) continue;
    let best = { d: 0, c: c0 };
    for (const d of [-2, -1, 1, 2]) {
      const decale = versets.map((v) => L[tr].get(`${livre}.${ch}.${v + d}`) ?? 0);
      const c = corr(decale, suiteMed);
      if (c !== null && c > best.c) best = { d, c };
    }
    if (best.d !== 0 && best.c >= 0.75 && best.c - c0 >= 0.30)
      suspects.push({ ch: key, trad: NOM[tr], decalage: best.d, avant: +c0.toFixed(2), apres: +best.c.toFixed(2), n: versets.length });
  }
}
suspects.sort((a, b) => (b.apres - b.avant) - (a.apres - a.avant));
console.log(`chapitres examinés : ${chapitres.size}`);
console.log(`CHAPITRES DÉCALÉS : ${suspects.length}\n`);
const pl = {};
for (const s of suspects) pl[s.trad] = (pl[s.trad] || 0) + 1;
console.log('par traduction : ' + Object.entries(pl).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('\nchapitre     traduction   décalage   corrélation en place → décalée   versets');
for (const s of suspects.slice(0, 40))
  console.log(`  ${s.ch.padEnd(11)} ${s.trad.padEnd(10)} ${(s.decalage > 0 ? '+' : '') + s.decalage}         ${String(s.avant).padStart(5)} → ${String(s.apres).padStart(5)}          ${s.n}`);
writeFileSync('scripts/_chapitres_decales.json', JSON.stringify(suspects, null, 1), 'utf8');
console.log(`\n→ scripts/_chapitres_decales.json`);
process.exit(0);
