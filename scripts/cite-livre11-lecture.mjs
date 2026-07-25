// Enrichissement du livre XI de la Cité de Dieu par lecture (Corpus Scriptura).
// Cœur doctrinal : les deux cités, la création, les anges, la Genèse. Très riche.
// Le matcheur a bien travaillé sur Gn 1 ; ajouts (Benedicite, Ps 148, Jn 8,44, 1 Jn 3,8,
// Jb 40,19) et faux amis subtils (versets voisins ou d'un autre livre mal appariés).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XI';

const AJOUTS = [
  [3861, 'DAN.3.57', 1],  // « Ouvrages du Seigneur, bénissez tous le Seigneur » (Benedicite)
  [3862, 'PSA.148.1', 1], // « Louez le Seigneur dans les cieux… ses anges »
  [3863, 'PSA.148.5', 1], // « il a dit et toutes choses ont été faites »
  [3865, 'JOB.38.7', 1],  // « quand les astres ont été créés, tous mes anges m'ont béni »
  [3873, 'JHN.1.9', 2],   // « la vraie lumière qui éclaire tout homme »
  [3922, 'LUK.20.36', 2], // « semblables aux anges de Dieu »
  [3926, 'JHN.8.44', 1],  // « homicide dès le commencement… n'est point demeuré dans la vérité »
  [3927, '1JN.3.8', 1],   // « le diable pèche dès le commencement »
  [3931, 'PSA.16.6', 1],  // « j'ai crié, mon Dieu, parce que vous m'avez exaucé »
  [3935, 'EZK.28.13', 1], // « tu as joui des délices du paradis… pierres précieuses »
  [3935, 'EZK.28.15', 1], // « tu as marché pur de souillure en tes jours »
  [3938, 'JOB.40.19', 1], // « il est le commencement de l'ouvrage de Dieu »
  [3938, 'PSA.103.26', 1],// « ce dragon que vous avez formé pour servir de jouet »
  [3950, 'JOB.40.19', 2], // reprise « le commencement de l'ouvrage de Dieu »
  [3955, 'PSA.103.26', 1],// « ce dragon… servir de jouet à vos anges » (dit par le Psalmiste)
  [3959, '2CO.6.8', 1],   // « par la gloire et l'infamie… n'ayant rien et possédant tout »
  [3962, 'GEN.1.5', 1],   // « nomma la lumière jour et les ténèbres nuit »
  [4083, 'LUK.15.18', 2], // l'enfant prodigue rentre en lui-même
];
const RETRAITS = [
  [3865, 'PSA.27.6'],     // « quand les astres… mes anges m'ont béni » = Job 38,7 (LXX), pas Ps 27,6
  [3931, 'BAR.3.12'],     // « j'ai crié parce que vous m'avez exaucé » = Ps 16,6, pas Baruch
  [3935, 'SIR.50.9'],     // « délices du paradis… » = Ézéchiel 28,13, pas Siracide
  [3955, 'JOB.40.29'],    // « ce dragon… jouet » = Ps 103,26 (le Psalmiste), pas Job 40,29
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XI');
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
