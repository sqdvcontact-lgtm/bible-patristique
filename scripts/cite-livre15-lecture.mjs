// Enrichissement du livre XV de la Cité de Dieu par lecture (Corpus Scriptura).
// Caïn et Abel, les deux lignées, généalogies de Gn 4-5, les géants, Noé et l'arche.
// Ajouts (récit de la Genèse abondant, Baruch, Malachie) et faux amis nombreux (versets
// d'un autre livre appariés par thème — Gn pris pour Sagesse/Job/Hébreux/Josué, etc.).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XV';

const AJOUTS = [
  [5206, 'GAL.4.27', 1],  // « réjouissez-vous, stériles qui n'enfantez point »
  [5207, 'GAL.4.30', 1],  // « chassez la servante et son fils »
  [5249, '1TH.5.14', 1],  // « reprenez ceux qui sont turbulents, consolez les affligés »
  [5250, '1TH.5.15', 1],  // « ne rendez point le mal pour le mal »
  [5259, 'GEN.4.6', 1],   // « Dieu dit à Caïn : pourquoi êtes-vous triste ? »
  [5260, 'GEN.4.7', 1],   // « quand vous faites une offrande bonne… ne péchez-vous pas ? »
  [5286, 'GEN.3.16', 1],  // « je multiplierai vos peines… il aura empire sur vous »
  [5298, 'GEN.4.25', 1],  // « elle nomma Seth » (naissance de Seth)
  [5304, 'EXO.12.37', 2], // six cent mille hommes à la sortie d'Égypte
  [5388, 'GEN.4.25', 1],  // « Dieu m'a donné un autre fils au lieu d'Abel »
  [5416, 'GEN.4.1', 1],   // « j'ai acquis un homme par la grâce de Dieu »
  [5422, 'GEN.4.19', 1],  // Lamech épouse deux femmes
  [5423, 'GEN.4.22', 1],  // Thobel, ouvrier en fer et en cuivre
  [5440, 'JER.17.5', 1],  // « maudit quiconque met son espérance en l'homme »
  [5451, 'LUK.20.34', 1], // « les enfants de ce siècle engendrent et sont engendrés »
  [5490, 'PSA.48.12', 1], // « ils ont donné leurs noms à leurs terres »
  [5492, 'PSA.39.5', 1],  // « heureux celui qui met son espérance au nom du Seigneur »
  [5508, 'PSA.103.4', 1], // « il se sert d'esprits pour ses anges »
  [5514, 'MAL.3.1', 1],   // « voilà que j'envoie mon ange devant vous »
  [5518, 'GEN.6.2', 1],   // les fils de Dieu et les filles des hommes
  [5519, 'GEN.6.4', 1],   // les géants
  [5532, 'JUD.1.14', 2],  // Jude cite Hénoch (septième depuis Adam)
  [5539, 'BAR.3.26', 1],  // « ces géants si fameux… ils ont péri »
  [5544, 'GEN.6.7', 1],   // « j'exterminerai l'homme que j'ai créé »
  [5552, 'GEN.6.15', 1],  // dimensions de l'arche (300/50/30 coudées)
  [5560, 'MAT.13.8', 2],  // trente, soixante, cent pour un
  [5579, 'GEN.6.20', 2],  // « ils viendront à vous » (les animaux)
];
const RETRAITS = [
  [5260, 'WIS.8.19'],     // « offrande bonne… » = Gn 4,7, pas Sagesse
  [5286, 'PSA.113.22'],   // « il aura empire sur vous » = Gn 3,16, pas Ps 113
  [5286, 'JOB.5.1'],      // idem = Gn 3,16, pas Job
  [5298, 'GEN.4.1'],      // « elle nomma Seth » = Gn 4,25, pas 4,1 (Caïn)
  [5307, 'LAM.5.7'],      // « à peine douze hommes… » = Virgile (Énéide), pas Lamentations
  [5388, 'HEB.2.14'],     // « un autre fils au lieu d'Abel » = Gn 4,25, pas Hébreux
  [5440, 'GAL.3.10'],     // « maudit quiconque… en l'homme » = Jr 17,5, pas Ga 3,10
  [5490, 'JOS.21.9'],     // « donné leurs noms à leurs terres » = Ps 48,12, pas Josué
  [5492, 'JER.17.7'],     // « heureux celui qui met son espérance… » = Ps 39,5, pas Jérémie
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XV');
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
