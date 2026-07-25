// Enrichissement du livre XII de la Cité de Dieu par lecture (Corpus Scriptura).
// Création de l'homme, origine des deux cités, réfutation des cycles éternels.
// Ajouts (Ex 3,14 ; Sagesse ; Ps 11 ; Jr 23,24) et faux amis (versets voisins ou d'un
// autre livre appariés par thème : Gn 1,14 pris pour Ga 4,10, Sag 11,21 pour Pr 20,10…).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XII';

const AJOUTS = [
  [4180, 'EXO.3.14', 1],  // « Je suis celui qui suis » (à Moïse)
  [4217, 'SIR.10.15', 1], // « l'orgueil est le commencement de tout péché »
  [4253, 'PSA.18.13', 1], // « qui peut comprendre les péchés ? »
  [4309, 'ROM.6.9', 1],   // « Christ mort une fois ne meurt plus, la mort n'a plus d'empire »
  [4309, '1TH.4.17', 1],  // « nous serons toujours avec le Seigneur »
  [4309, 'PSA.11.8', 1],  // « vous nous conserverez toujours, Seigneur… jusqu'en l'éternité »
  [4310, 'PSA.11.9', 1],  // « les impies vont tournant dans un cercle »
  [4315, 'PSA.11.8', 2],  // reprise
  [4315, 'PSA.11.9', 2],  // reprise
  [4321, 'WIS.9.13', 1],  // « quel homme connaît les desseins de Dieu ? »
  [4322, 'WIS.9.15', 1],  // « le corps corruptible appesantit l'âme »
  [4331, 'GEN.1.14', 1],  // « qu'ils servent à marquer les temps, les jours et les années »
  [4370, '2CO.10.12', 1], // « pour ne se comparer qu'à eux-mêmes, ils n'entendent pas »
  [4382, 'WIS.11.21', 1], // « vous avez fait toutes choses avec poids, nombre et mesure »
  [4456, 'JER.23.24', 1], // « je remplis le ciel et la terre »
  [4456, 'WIS.8.1', 2],   // « sa sagesse atteint d'un bout à l'autre… gouverne avec douceur »
  [4463, 'GEN.30.37', 2], // les agneaux bigarrés de Jacob (baguettes)
  [4482, 'PSA.45.9', 1],  // « venez, voyez les ouvrages du Seigneur »
];
const RETRAITS = [
  [4309, 'MAT.28.20'],    // « vous nous conserverez… » = Ps 11,8 (le Psalmiste), pas Mt 28,20
  [4315, 'MAT.28.20'],    // idem (reprise Ps 11,8-9)
  [4331, 'GAL.4.10'],     // « marquer les temps… » = Gn 1,14 (création des astres), pas Ga 4,10
  [4382, 'PRO.20.10'],    // « poids, nombre et mesure » = Sagesse 11,21, pas Pr 20,10
];

async function pageAll(sel, tbl, filt) {
  const o = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tbl).select(sel).order('id').range(de, de + 999);
    for (const [k, v] of Object.entries(filt || {})) q = q.eq(k, v);
    const { data } = await q; if (!data?.length) break; o.push(...data); if (data.length < 1000) break;
  }
  return o;
}
async function main() {
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XII');
  const parNum = new Map(segs.map((s) => [s.segment_numero, s.id]));
  const canon = new Set();
  for (const r of await pageAll('livre, ch_canon, v_canon', 'versets_canon')) canon.add(`${r.livre}.${r.ch_canon}.${r.v_canon}`);

  const ids = segs.map((s) => s.id);
  const existants = new Set();
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await sb.from('liens_bibliques').select('segment_id, canon_id').in('segment_id', ids.slice(i, i + 150));
    for (const l of data || []) existants.add(l.segment_id + '|' + l.canon_id);
  }

  const rows = []; const absents = []; const dup = [];
  for (const [num, cid, type] of AJOUTS) {
    const sid = parNum.get(num); if (!sid) { absents.push(`#${num} (segment)`); continue; }
    if (!canon.has(cid)) { absents.push(`#${num} ${cid} (hors canon)`); continue; }
    if (existants.has(sid + '|' + cid)) { dup.push(`#${num} ${cid}`); continue; }
    rows.push({ segment_id: sid, canon_id: cid, type, fiabilite: 'probable', motif: MOTIF, provenance: 'ia', arbitrage_requis: false });
  }
  let supp = 0; const introuv = [];
  for (const [num, cid] of RETRAITS) {
    const sid = parNum.get(num); if (!sid) { introuv.push(`#${num}`); continue; }
    const { data } = await sb.from('liens_bibliques').select('id').eq('segment_id', sid).eq('canon_id', cid);
    if (!data?.length) { introuv.push(`#${num} ${cid}`); continue; }
    if (AGIT) await sb.from('liens_bibliques').delete().in('id', data.map((x) => x.id));
    supp += data.length;
  }
  console.log(`ajouts prêts : ${rows.length}${dup.length ? ' · déjà présents : ' + dup.join(', ') : ''}`);
  if (absents.length) console.log('NON insérés :', absents.join(', '));
  console.log(`retraits faux amis : ${supp}${introuv.length ? ' · introuvables : ' + introuv.join(', ') : ''}`);
  if (AGIT && rows.length) {
    for (let j = 0; j < rows.length; j += 200) { const { error } = await sb.from('liens_bibliques').insert(rows.slice(j, j + 200)); if (error) console.error('INSERT', error.message); }
    console.log(`✓ insérés : ${rows.length}`);
  } else if (!AGIT) console.log('(simulation — ajouter --agit)');
}
main().catch((e) => { console.error(e); process.exit(1); });
