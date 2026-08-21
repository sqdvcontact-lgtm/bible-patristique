// DISCORDANCES DE CONTENU — un créneau plein, mais qui ne dit pas la même chose.
//
// RÈGLE FONDATRICE, que mes détecteurs précédents ignoraient : une ligne de la
// polyglotte doit porter LE MÊME TEXTE, traduit différemment. L'ossature n'est pas
// un système de numérotation parallèle mais une grille de CONTENU.
//
// `detecte-soudures.mjs` ne voit que les créneaux VIDES. Or une faute plus sournoise
// existe : le créneau est rempli partout, mais une édition y met ce qu'une autre met
// au verset voisin. Cas repéré par l'auteur du site en Lv 14, 20 — Segond y ouvre sur
// l'égorgement de l'holocauste, que Sacy, la Vulgate ET l'hébreu placent à la fin
// du v. 19.
//
// MÉTHODE. Comparaison FRANÇAIS contre FRANÇAIS (la seule fiable — cf. l'échec du
// latin/français). Pour chaque créneau, on mesure ce que deux traductions ont en
// commun ; si elles s'accordent mal ENTRE ELLES mais que l'une s'accorde bien avec
// le créneau VOISIN de l'autre, le contenu est décalé.
//   node scripts/detecte-discordances.mjs [LIVRE]
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const LIVRE = process.argv[2] || null;

const ancienne = (m) => m.replace(/oi/g, 'ai').replace(/([bcdfgjklmnpqrstvxz])ans$/, '$1ants');
const VIDES = new Set('les des que qui pour dans avec est son sur plus tout tous par une aux ses leur ils elle vous nous mais comme cette ces pas ont sont lui car point donc dont fait sera seront lorsque afin ainsi'.split(' '));
const sac = (s) => new Set((s || '').replace(/<[^>]+>/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
  .filter((m) => m.length > 3).map((m) => ancienne(m).slice(0, 5)).filter((m) => !VIDES.has(m)));
const accord = (a, b) => { if (!a.size || !b.size) return null; let i = 0; for (const w of a) if (b.has(w)) i++; return i / Math.min(a.size, b.size); };

async function page(tr) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from('versets_v2').select('livre, canon_id, texte').eq('trad_id', tr).not('canon_id', 'is', null).order('id').range(de, de + 999);
    if (LIVRE) q = q.eq('livre', LIVRE);
    const { data } = await q;
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  const m = new Map();
  for (const r of o) if (r.texte?.trim()) m.set(r.canon_id, (m.get(r.canon_id) ? m.get(r.canon_id) + ' ' : '') + r.texte);
  return m;
}
// Trois témoins français : deux traditions textuelles distinctes, donc l'accord
// entre eux mesure le contenu, non la parenté d'édition.
const S = await page('TR0001'), G = await page('TR0002'), C = await page('TR0003');

const suspects = [];
for (const [id, tS] of S) {
  const tG = G.get(id), tC = C.get(id);
  if (!tG && !tC) continue;
  const [l, ch, v] = id.split('.');
  const voisin = (d) => `${l}.${ch}.${+v + d}`;
  const aS = sac(tS);
  for (const [nom, txt] of [['Segond', tG], ['Crampon', tC]]) {
    if (!txt) continue;
    const ici = accord(aS, sac(txt));
    if (ici === null || ici >= 0.34) continue;                 // s'accordent : rien à voir
    // le texte de l'autre s'accorde-t-il mieux avec un voisin de Sacy ?
    for (const d of [-1, 1]) {
      const vs = S.get(voisin(d));
      if (!vs) continue;
      const la = accord(sac(vs), sac(txt));
      if (la !== null && la >= ici + 0.25 && la >= 0.4) {
        suspects.push({ id, autre: nom, ici: +ici.toFixed(2), voisin: voisin(d), la: +la.toFixed(2) });
        break;
      }
    }
  }
}
console.log(`créneaux examinés : ${S.size}`);
console.log(`DISCORDANCES DE CONTENU : ${suspects.length}\n`);
const pl = {};
for (const s of suspects) pl[s.id.split('.')[0]] = (pl[s.id.split('.')[0]] || 0) + 1;
console.log('par livre : ' + Object.entries(pl).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, n]) => `${k} ${n}`).join(' · '));
console.log('\nles 20 premières :');
for (const s of suspects.slice(0, 20))
  console.log(`   ${s.id.padEnd(12)} ${s.autre.padEnd(8)} accord ici ${s.ici} · avec ${s.voisin} ${s.la}`);
writeFileSync('scripts/_discordances.json', JSON.stringify(suspects, null, 1), 'utf8');
console.log(`\n→ scripts/_discordances.json`);
process.exit(0);
