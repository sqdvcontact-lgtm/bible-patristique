// Enrichissement du livre X de la Cité de Dieu par lecture (Corpus Scriptura).
// Livre du VRAI SACRIFICE et des miracles de l'Ancien Testament : le plus riche en
// Écriture jusqu'ici. Beaucoup capté par le matcheur ; nombreux ajouts (prologue de Jean,
// Ps 72, Michée, Osée, geste mosaïque) et faux amis (citations classiques ou versets voisins
// mal appariés).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre X';

const AJOUTS = [
  [3317, 'JHN.1.6', 1],   // « Il y eut un homme envoyé de Dieu, Jean »
  [3318, 'JHN.1.9', 1],   // « la vraie lumière qui illumine tout homme »
  [3320, 'JHN.1.16', 1],  // « Nous avons tous reçu de sa plénitude »
  [3355, 'PSA.49.14', 1], // « Immolez à Dieu un sacrifice de louanges »
  [3358, 'MIC.6.8', 1],   // « pratique la justice, aime la miséricorde »
  [3360, 'HEB.13.16', 1], // « n'oubliez pas d'exercer la charité… par de tels sacrifices »
  [3361, 'HOS.6.6', 1],   // « j'aime mieux la miséricorde que le sacrifice »
  [3365, 'SIR.30.24', 1], // « aie pitié de son âme en te rendant agréable à Dieu »
  [3370, 'PSA.72.28', 1], // « m'attacher à Dieu, c'est mon bien »
  [3372, 'ROM.12.3', 1],  // « ne pas aspirer à être plus sages qu'il ne faut »
  [3380, 'GEN.15.17', 2], // la flamme court entre les victimes divisées (Abraham)
  [3382, 'GEN.19.26', 2], // la femme de Loth changée en statue de sel
  [3390, 'EXO.17.11', 2], // Moïse tient les bras étendus en forme de croix
  [3392, 'NUM.21.9', 2],  // le serpent d'airain élevé sur un mât
  [3393, '2KI.18.4', 2],  // Ézéchias brise le serpent d'airain
  [3463, 'EXO.33.13', 1], // Moïse : « montrez-vous vous-même à moi »
  [3473, 'MAT.6.28', 1],  // « regardez les lis des champs »
  [3533, 'ACT.14.11', 2], // Paul et Barnabé pris pour des dieux en Lycaonie
  [3583, 'JHN.1.14', 1],  // « le Verbe s'est fait chair et a habité parmi nous »
  [3584, 'JHN.6.60', 1],  // « ces paroles sont dures »
  [3586, 'JHN.8.25', 1],  // « Je suis le Principe »
  [3597, 'PSA.72.22', 1], // « je suis devenu semblable à une bête brute »
  [3600, 'PSA.72.25', 1], // « qu'y a-t-il au ciel et sur la terre que je désire, si ce n'est vous ? »
  [3602, 'PSA.72.26', 1], // « mon cœur et ma chair sont tombés en défaillance »
  [3605, 'MAT.23.26', 1], // « purifiez d'abord le dedans, et le dehors sera pur »
  [3609, 'ROM.8.24', 1],  // « lorsqu'on voit ce qu'on a espéré, ce n'est plus espérance »
];
const RETRAITS = [
  [3300, 'SIR.24.4'],     // « une antique cité habitée par des colons tyriens » = Virgile, Énéide
  [3360, 'SIR.35.9'],     // segment cité comme « épître aux Hébreux » = He 13,16, pas Siracide
  [3365, 'PSA.40.5'],     // « aie pitié de son âme… » = Siracide 30,24, pas Ps 40,5
  [3463, 'SIR.18.20'],    // « montrez-vous à moi » = Moïse, Ex 33,13, pas Siracide
  [3597, 'PSA.30.13'],    // « semblable à une bête brute… je demeure avec vous » = Ps 72,22, pas 30,13
  [3605, 'EXO.37.2'],     // « purifiez d'abord le dedans » = Mt 23,26, pas Exode
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre X');
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
