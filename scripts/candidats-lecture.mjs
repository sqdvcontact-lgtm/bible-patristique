// FILET DE RAPPEL POUR LA LECTURE (méthode « ne rien manquer », 21/07).
//
// Le défaut de recall vient de la lecture « à l'aveugle » : on espère tout
// remarquer. Correctif structurel : lire CONTRE un filet de candidats réunissant
// tout ce que les passes antérieures ont trouvé. La lecture ne fait plus que
// juger (confirmer / rejeter / corriger le type) et compléter.
//
// Ce script produit, pour un livre (ou toute l'œuvre), une feuille de travail :
// chaque segment avec son texte ET l'union des candidats —
//   • posé   = déjà en base (matcheur ou lecture précédente)
//   • ancien = première constitution (liens_anciens_controle.json), canon résolu
// Les psaumes sont donnés en grec (ossature) ET hébreu (édition) pour comparer.
//
//   node scripts/candidats-lecture.mjs <id_oeuvre> "Livre Sixième"
//   node scripts/candidats-lecture.mjs <id_oeuvre>            (toute l'œuvre)

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const OEUVRE = process.argv.find((a) => /^A\d{4}O\d{4}$/.test(a));
if (!OEUVRE) throw new Error('Usage : node scripts/candidats-lecture.mjs <id_oeuvre> [section]');
const LIVRE = process.argv.slice(2).find((a) => !/^A\d{4}O\d{4}$/.test(a) && !a.startsWith('--'));

async function pageAll(table, sel, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(table).select(sel).range(de, de + 999);
    if (filt) q = filt(q);
    const { data } = await q;
    o.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return o;
}

async function main() {
  // conversion grec→héb pour afficher les deux numérotations
  const toHeb = new Map();
  for (const r of await pageAll('versets_canon', 'id, ch_heb, v_heb, livre'))
    if (r.livre === 'PSA' && r.ch_heb != null) toHeb.set(r.id, `PSA.${r.ch_heb}.${r.v_heb}`);
  const affiche = (c) => (toHeb.has(c) ? `${c}(héb ${toHeb.get(c).replace('PSA.', 'Ps ')})` : c);

  const segs = (await pageAll('segments', 'id, segment_numero, ref_niv1, segment_texte', (q) => q.eq('id_oeuvre', OEUVRE)))
    .filter((s) => !LIVRE || s.ref_niv1 === LIVRE);
  const numById = new Map(segs.map((s) => [s.id, s.segment_numero]));
  const parNum = new Map(segs.map((s) => [s.segment_numero, s]));

  // candidats POSÉS (base)
  const pose = new Map(); // num → [{canon,type}]
  const ids = segs.map((s) => s.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id, type').in('segment_id', ids.slice(i, i + 200));
    for (const l of data || []) { if (!l.canon_id) continue; const n = numById.get(l.segment_id); if (!pose.has(n)) pose.set(n, []); pose.get(n).push(`${l.canon_id}/t${l.type}`); }
  }

  // candidats ANCIENS (première constitution)
  const anc = JSON.parse(readFileSync(new URL('./liens_anciens_controle.json', import.meta.url)));
  const ancien = new Map();
  for (const e of anc.liens) {
    if (e.id_oeuvre !== OEUVRE || !parNum.has(e.segment_numero)) continue;
    const cs = e.liens.filter((l) => l.canon_id).map((l) => l.canon_id);
    if (cs.length) ancien.set(e.segment_numero, cs);
  }

  const strip = (t) => (t || '').replace(/<[^>]+>/g, '').trim();
  const lignes = [];
  let nAvecCand = 0;
  for (const s of segs) {
    const n = s.segment_numero;
    const p = pose.get(n) || [], a = ancien.get(n) || [];
    // candidats anciens non encore posés = à juger en priorité.
    // Normalisation grec→héb des deux côtés : l'ancien numérote les psaumes en
    // hébreu, le posé en grec — sans quoi un même verset paraîtrait « à juger ».
    const norm = (c) => toHeb.get(c) || c;
    const poseCanon = new Set(p.map((x) => norm(x.split('/')[0])));
    const aJuger = a.filter((c) => !poseCanon.has(norm(c)));
    let ligne = `#${n}  ${strip(s.segment_texte).slice(0, 160)}`;
    if (p.length) ligne += `\n    posé   : ${p.join(', ')}`;
    if (aJuger.length) { ligne += `\n    À JUGER: ${aJuger.map(affiche).join(', ')}`; nAvecCand++; }
    lignes.push(ligne);
  }
  const out = `scripts/_candidats_${OEUVRE}${LIVRE ? '_' + LIVRE.replace(/\s+/g, '') : ''}.txt`;
  writeFileSync(out, lignes.join('\n\n'));
  console.log(`${segs.length} segments${LIVRE ? ' (' + LIVRE + ')' : ''} · ${nAvecCand} avec candidats anciens À JUGER non posés`);
  console.log(`feuille : ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
