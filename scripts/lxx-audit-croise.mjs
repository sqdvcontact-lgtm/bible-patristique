// AUDIT CROISÉ DE LA SEPTANTE — TR0005 en regard des quatre autres témoins.
//
// Cinq questions :
//   1. couverture de l'ossature, livre par livre, et où elle décroche ;
//   2. les 507 versets sans créneau — sont-ils concentrés ou épars ;
//   3. LES PSAUMES : l'ossature étant en numérotation GRECQUE, la Septante devrait
//      s'y aligner presque parfaitement. C'est le contrôle le plus révélateur ;
//   4. créneaux que la Septante SEULE remplit, et ceux qu'elle seule laisse vides ;
//   5. Jérémie, dont la Septante réordonne les chapitres.
// Lecture seule.
//   node scripts/lxx-audit-croise.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function page(tr) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_v2')
      .select('livre, ch_orig, v_orig, canon_id, texte')
      .eq('trad_id', tr).order('id').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
const canon = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_canon').select('id, livre, ch_canon, v_canon, ch_heb').order('id').range(de, de + 999);
  if (!data?.length) break; canon.push(...data); if (data.length < 1000) break;
}
const parLivreCanon = {};
for (const r of canon) parLivreCanon[r.livre] = (parLivreCanon[r.livre] || 0) + 1;

const T = {};
for (const tr of ['TR0001', 'TR0002', 'TR0003', 'TR0004', 'TR0005']) T[tr] = await page(tr);
const rempli = {};
for (const tr of Object.keys(T)) rempli[tr] = new Set(T[tr].filter((r) => r.canon_id && r.texte?.trim()).map((r) => r.canon_id));

console.log('╔═ SEPTANTE (TR0005) EN REGARD DES AUTRES TÉMOINS ═╗\n');

// 1. couverture par livre — seulement les livres que la Septante porte
const livresLxx = new Set(T.TR0005.map((r) => r.livre));
const faibles = [];
for (const [l, total] of Object.entries(parLivreCanon)) {
  if (!livresLxx.has(l)) continue;
  const n = [...rempli.TR0005].filter((id) => id.startsWith(l + '.')).length;
  const pct = Math.round((n / total) * 100);
  if (pct < 100) faibles.push({ l, n, total, pct, manque: total - n });
}
faibles.sort((a, b) => a.pct - b.pct);
console.log('── 1. LIVRES OÙ LA SEPTANTE NE COUVRE PAS TOUT');
console.log('livre   couvert / ossature    %   créneaux non couverts');
for (const f of faibles) console.log(`  ${f.l.padEnd(5)} ${String(f.n).padStart(5)} / ${String(f.total).padEnd(5)} ${String(f.pct).padStart(5)} %   ${f.manque}`);
console.log(`  (${Object.keys(parLivreCanon).length - livresLxx.size} livres absents : le Nouveau Testament, plus l’Ecclésiaste)`);

// 2. versets sans créneau
const sansC = T.TR0005.filter((r) => !r.canon_id);
const plS = {}; for (const r of sansC) plS[r.livre] = (plS[r.livre] || 0) + 1;
console.log(`\n── 2. VERSETS SANS CRÉNEAU : ${sansC.length}`);
console.log('  ' + Object.entries(plS).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));

// 3. LES PSAUMES — le contrôle décisif
const psOss = canon.filter((r) => r.livre === 'PSA').length;
const psLxx = [...rempli.TR0005].filter((id) => id.startsWith('PSA.')).length;
const psSans = sansC.filter((r) => r.livre === 'PSA').length;
console.log(`\n── 3. PSAUMES — l’ossature est en numérotation GRECQUE, l’accord doit être quasi parfait`);
console.log(`  ossature ${psOss} créneaux · Septante en couvre ${psLxx} (${Math.round(psLxx / psOss * 100)} %) · ${psSans} versets grecs sans créneau`);
const chSans = {};
for (const r of sansC.filter((x) => x.livre === 'PSA')) chSans[r.ch_orig] = (chSans[r.ch_orig] || 0) + 1;
if (Object.keys(chSans).length) console.log('  chapitres concernés : ' + Object.entries(chSans).sort((a, b) => +a[0] - +b[0]).map(([c, n]) => `Ps ${c} (${n})`).join(' · '));

// 4. ce que la Septante seule apporte, ce qu'elle seule manque
const autres = new Set();
for (const tr of ['TR0001', 'TR0002', 'TR0003', 'TR0004']) for (const id of rempli[tr]) autres.add(id);
const seuleLxx = [...rempli.TR0005].filter((id) => !autres.has(id));
const seuleVide = [...autres].filter((id) => !rempli.TR0005.has(id) && livresLxx.has(id.split('.')[0]));
console.log(`\n── 4. APPORT PROPRE ET LACUNES PROPRES`);
console.log(`  créneaux que SEULE la Septante remplit : ${seuleLxx.length}` + (seuleLxx.length ? '   ' + seuleLxx.slice(0, 12).join(' · ') : ''));
console.log(`  créneaux qu’elle SEULE laisse vides    : ${seuleVide.length}`);
const plV = {}; for (const id of seuleVide) plV[id.split('.')[0]] = (plV[id.split('.')[0]] || 0) + 1;
if (seuleVide.length) console.log('     ' + Object.entries(plV).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `${k} ${n}`).join(' · '));

// 5. Jérémie
const jerOss = canon.filter((r) => r.livre === 'JER');
const jerLxx = T.TR0005.filter((r) => r.livre === 'JER');
const chOss = new Set(jerOss.map((r) => r.ch_canon)), chLxx = new Set(jerLxx.map((r) => r.ch_orig));
console.log(`\n── 5. JÉRÉMIE — la Septante y réordonne les chapitres`);
console.log(`  ossature : ${chOss.size} chapitres, ${jerOss.length} versets · Septante : ${chLxx.size} chapitres, ${jerLxx.length} versets`);
console.log(`  couverts : ${[...rempli.TR0005].filter((id) => id.startsWith('JER.')).length} · sans créneau : ${sansC.filter((r) => r.livre === 'JER').length}`);
console.log();
process.exit(0);
