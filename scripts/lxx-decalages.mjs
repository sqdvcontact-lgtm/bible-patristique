// SEPTANTE — séparer le décalage de numérotation de la divergence de texte.
//
// 1 207 créneaux que la Septante seule laisse vides : la plupart tiennent à ce
// qu'elle DIT autre chose (Jérémie réordonné, Job plus court, Baruch). Mais une
// part tient seulement à un DÉCALAGE de numérotation — et celle-là se corrige.
//
// Critère, éprouvé sur la Vulgate le 24/07 : dans un chapitre donné, si l'ensemble
// des numéros de la Septante se superpose à celui de l'ossature moyennant un pas
// CONSTANT, c'est un décalage. Sinon, c'est le texte qui diffère : on n'y touche pas.
// Lecture seule.
//   node scripts/lxx-decalages.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const V = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_v2').select('id, livre, ch_orig, v_orig, canon_id')
    .eq('trad_id', 'TR0005').order('id').range(de, de + 999);
  if (!data?.length) break; V.push(...data); if (data.length < 1000) break;
}
const canon = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_canon').select('id, livre, ch_canon, v_canon').order('id').range(de, de + 999);
  if (!data?.length) break; canon.push(...data); if (data.length < 1000) break;
}
const ossChap = new Map();
for (const r of canon) {
  const k = `${r.livre}|${r.ch_canon}`;
  let s = ossChap.get(k); if (!s) ossChap.set(k, s = new Set()); s.add(r.v_canon);
}
const lxxChap = new Map();
for (const r of V) {
  const k = `${r.livre}|${r.ch_orig}`;
  let s = lxxChap.get(k); if (!s) lxxChap.set(k, s = new Map()); s.set(r.v_orig, r);
}

const decales = [], divergents = [];
for (const [k, versets] of lxxChap) {
  const oss = ossChap.get(k);
  if (!oss) { divergents.push({ k, cause: 'chapitre absent de l’ossature', n: versets.size }); continue; }
  const nonPlaces = [...versets.values()].filter((r) => !r.canon_id);
  if (!nonPlaces.length) continue;
  // essayer un pas constant qui place TOUS les versets du chapitre dans l'ossature
  let pas = null;
  for (const d of Array.from({length:81},(_,i)=>i-40)) {   // fenêtre large : un décalage peut valoir -11 (Ps 147 grec) ou plus
    if ([...versets.keys()].every((v) => oss.has(v + d))) { pas = d; break; }
  }
  if (pas !== null) decales.push({ k, pas, n: versets.size, aBouger: [...versets.values()] });
  else divergents.push({ k, cause: 'numéros non superposables — le texte diffère', n: nonPlaces.length });
}
decales.sort((a, b) => b.n - a.n);
console.log(`chapitres à DÉCALAGE constant (corrigible) : ${decales.length} · ${decales.reduce((n, d) => n + d.n, 0)} versets`);
for (const d of decales.slice(0, 30)) console.log(`   ${d.k.replace('|', ' ').padEnd(10)} ${String(d.n).padStart(4)} versets · pas ${d.pas > 0 ? '+' : ''}${d.pas}`);
const parLivre = {};
for (const d of divergents) parLivre[d.k.split('|')[0]] = (parLivre[d.k.split('|')[0]] || 0) + 1;
console.log(`\nchapitres où le TEXTE diffère (à ne pas toucher) : ${divergents.length}`);
console.log('   ' + Object.entries(parLivre).sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, n]) => `${k} ${n}`).join(' · '));
writeFileSync('scripts/_lxx_decalages.json', JSON.stringify(decales.map((d) => ({ k: d.k, pas: d.pas, ids: d.aBouger.map((r) => ({ id: r.id, v: r.v_orig })) })), null, 1), 'utf8');
console.log('\n→ scripts/_lxx_decalages.json');
process.exit(0);
