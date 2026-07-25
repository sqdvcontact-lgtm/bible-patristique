// DÉTECTION DES SOUDURES — créneaux vides parce que l'édition RÉUNIT deux versets.
//
// Un créneau sans texte chez une traduction a deux causes très différentes :
//
//   · SOUDURE — l'édition imprime en un seul verset ce que l'ossature sépare en
//     deux. Sa numérotation ne saute rien : v. 10 puis v. 11, mais le v. 11 couvre
//     deux créneaux. Le texte n'est PAS perdu, il est dans le voisin. Remède :
//     scinder ce voisin sur les deux créneaux, comme le fait déjà Sacy.
//
//   · MANQUE — l'édition n'a réellement pas ce verset (recension différente, texte
//     grec bref). Sa numérotation saute. Remède : aucun — on laisse vide, avec une
//     note. Combler par le voisin fabriquerait un faux.
//
// Le signe qui les sépare est la CONTINUITÉ DE LA NUMÉROTATION de l'édition autour
// du trou. Lecture seule.
//   node scripts/detecte-soudures.mjs [TR0004]
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const CIBLES = process.argv.slice(2).filter((a) => /^TR\d+$/.test(a));

async function page(tr) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    const { data } = await sb.from('versets_v2')
      .select('id, livre, ch_orig, v_orig, canon_id, ordre_slot, texte, notes')
      .eq('trad_id', tr).order('id').range(de, de + 999);
    if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
const canon = [];
for (let de = 0; ; de += 1000) {
  const { data } = await sb.from('versets_canon').select('id, livre, ch_canon, v_canon, ordre').order('ordre').range(de, de + 999);
  if (!data?.length) break; canon.push(...data); if (data.length < 1000) break;
}
const ordreDe = new Map(canon.map((r) => [r.id, r.ordre]));
const { data: trads } = await sb.from('traductions').select('trad_id, nom').order('ordre');

// Créneaux que PERSONNE ne remplit : l'ossature les ouvre d'après le grec, la
// tradition latine ne les a pas. Ce sont des MANQUES, jamais des soudures — la
// continuité de numérotation les ferait prendre à tort pour des versets soudés
// (constaté sur SIR.3.19 et SIR.3.25 le 24/07/2026).
const remplisPartout = new Set();
for (const t of trads) for (const r of await page(t.trad_id)) if (r.canon_id && r.texte?.trim()) remplisPartout.add(r.canon_id);
const orphelinsAbsolus = new Set(canon.map((r) => r.id).filter((id) => !remplisPartout.has(id)));
console.log(`(${orphelinsAbsolus.size} créneaux vides chez TOUS les témoins : écartés des soudures, ce sont des manques)`);

const rapport = {};
for (const t of trads) {
  if (CIBLES.length && !CIBLES.includes(t.trad_id)) continue;
  const V = await page(t.trad_id);
  // ce que cette édition couvre réellement (avec du texte)
  const avecTexte = new Set(V.filter((r) => r.canon_id && r.texte?.trim()).map((r) => r.canon_id));
  // sa numérotation propre, par livre+chapitre
  const numeros = new Map();
  for (const r of V) {
    const k = `${r.livre}|${r.ch_orig}`;
    let s = numeros.get(k); if (!s) numeros.set(k, s = new Set()); s.add(r.v_orig);
  }
  // pour chaque créneau que l'édition ne couvre pas, dans un chapitre qu'elle traite
  const chapitresTraites = new Set(V.map((r) => r.livre + '|' + r.ch_orig));
  const soudures = [], manques = [];
  for (const c of canon) {
    if (avecTexte.has(c.id)) continue;
    const k = `${c.livre}|${c.ch_canon}`;
    if (!chapitresTraites.has(k)) continue;                 // chapitre non traité : hors sujet
    const nums = numeros.get(k);
    if (!nums) continue;
    // l'édition a-t-elle un verset portant ce numéro ? si oui, il est ailleurs (décalage) ;
    // si non, elle ne l'imprime pas — soudure si sa numérotation est continue autour.
    const continue_ = nums.has(c.v_canon - 1) && nums.has(c.v_canon);
    // un créneau vide chez tous les témoins n'est jamais une soudure
    (continue_ && !orphelinsAbsolus.has(c.id) ? soudures : manques).push(c.id);
  }
  rapport[t.trad_id] = { soudures, manques };
  console.log(`\n${t.trad_id} — ${t.nom}`);
  console.log(`   SOUDURES probables (texte dans le voisin, à scinder) : ${soudures.length}`);
  if (soudures.length) {
    const pl = {}; for (const id of soudures) pl[id.split('.')[0]] = (pl[id.split('.')[0]] || 0) + 1;
    console.log('      ' + Object.entries(pl).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · '));
    console.log('      ex. ' + soudures.slice(0, 10).join(' · '));
  }
  console.log(`   MANQUES réels (l'édition ne l'imprime pas — laisser vide) : ${manques.length}`);
  if (manques.length) {
    const pl = {}; for (const id of manques) pl[id.split('.')[0]] = (pl[id.split('.')[0]] || 0) + 1;
    console.log('      ' + Object.entries(pl).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k} ${n}`).join(' · '));
  }
}
writeFileSync('scripts/_soudures.json', JSON.stringify(rapport, null, 1), 'utf8');
console.log('\n→ scripts/_soudures.json');
process.exit(0);
