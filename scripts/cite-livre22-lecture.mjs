// Enrichissement du livre XXII de la Cité de Dieu par lecture (Corpus Scriptura).
// LE DERNIER LIVRE : la résurrection des corps, les miracles des martyrs, la béatitude
// finale et la vision de Dieu, le sabbat éternel. Dense en Écriture au début (prophéties
// de la résurrection) et à la fin (1 Co 13/15, la vision face à face). Faux amis sur des
// mots de Cicéron ou appariés par thème ; blocs (Ep 4,10-16, Is 65) non tagués.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XXII';

const AJOUTS = [
  // Volonté de Dieu, prophéties de la résurrection
  [8837, 'PHP.2.13', 1],   // « c'est Dieu qui opère en nous le vouloir » (en place de 1 Co 12,6)
  [8839, 'PSA.36.31', 1],  // « la loi de Dieu est gravée dans son cœur »
  [8841, 'GAL.4.9', 1],    // « connaissant Dieu, ou plutôt connus de Dieu » (en place de 2 Co 5,16)
  [8850, 'GEN.22.18', 1], [8850, 'ISA.26.19', 1], // promesse à Abraham ; « ceux des tombeaux » (en place de Jn 12,17)
  [8851, 'ISA.65.17', 1], [8852, 'ISA.65.18', 1], [8852, 'ISA.65.19', 1], // ciel et terre nouveaux
  [8853, 'DAN.12.1', 1],   // « tout ton peuple écrit dans le livre sera sauvé »
  [8854, 'DAN.7.27', 1],   // « et son royaume sera éternel »
  [8859, '1CO.3.20', 1],   // « le Seigneur connaît les pensées des sages, et les sait vaines »
  // Résurrection : questions et réponses
  [9128, 'EPH.4.13', 1],   // « la plénitude de l'âge du Christ » (en place de 1 Co 3,23)
  [9176, 'MAT.22.29', 1],  // « vous vous trompez, faute de connaître les Écritures »
  [9182, 'EPH.4.10', 1], [9183, 'EPH.4.11', 1], [9184, 'EPH.4.16', 1], // l'homme parfait
  [9186, 'COL.1.24', 1],   // « pour son corps qui est l'Église »
  [9191, 'EPH.1.22', 1],   // « chef de l'Église, qui est son corps et sa plénitude » (en place de Ep 5,23)
  [9192, 'PSA.111.1', 1],  // « bienheureux l'homme qui craint le Seigneur »
  [9199, 'MAT.10.30', 1],  // « tous les cheveux de votre tête sont comptés »
  [9210, 'GEN.19.11', 1],  // l'aveuglement des Sodomites cherchant la porte de Lot
  [9234, 'ROM.7.23', 1],   // « une loi qui résiste à la loi de mon esprit »
  [9283, 'MAT.6.12', 1],   // « remettez-nous nos dettes »
  [9286, 'GEN.1.28', 1],   // « croissez et multipliez et remplissez la terre »
  // La vision de Dieu, le sabbat éternel
  [9328, 'PSA.103.1', 1],  // « vous vous êtes revêtu de gloire et de splendeur »
  [9383, 'PHP.4.7', 1],    // « la paix de Dieu qui surpasse tout entendement »
  [9397, 'PSA.115.10', 1], // « j'ai cru, c'est pourquoi j'ai parlé » (Vulg 115,10)
  [9400, '2KI.5.26', 1],   // Élisée voit Giézi recevant les présents de Naaman
  [9412, 'JER.23.24', 1],  // « je remplis le ciel et la terre »
  [9416, 'JOB.42.5', 1],   // « à cette heure mon œil vous voit… je ne suis que cendre »
  [9417, 'EPH.1.18', 1],   // « qu'il éclaire les yeux de votre cœur »
  [9422, 'JOB.19.26', 1],  // « je verrai Dieu dans ma chair »
  [9451, '1CO.15.28', 1],  // « Dieu soit tout en tous » (en place de Rm 15,33)
  [9470, 'PSA.45.11', 1],  // « tenez-vous en repos, et reconnaissez que je suis Dieu »
  [9472, 'GEN.3.5', 1],    // « vous serez comme des dieux »
  [9481, 'ACT.1.7', 1],    // « ce n'est pas à vous de connaître les temps » (en place de Jb 24,1)
];
const RETRAITS = [
  [8837, '1CO.12.6'],  // « opère en nous le vouloir » = Ph 2,13
  [8841, '2CO.5.16'],  // « connus de Dieu » = Ga 4,9
  [8850, 'JHN.12.17'], // « ceux des tombeaux ressusciteront » = Is 26,19
  [8858, '1CO.15.40'], // mots de Cicéron (corps célestes/terrestres), non biblique
  [8979, 'ISA.57.12'], // reproche d'Augustin sur la publication du miracle, non biblique
  [8999, 'MRK.9.29'],  // mots du beau-frère (récit), non biblique
  [9128, '1CO.3.23'],  // « plénitude de l'âge du Christ » = Ep 4,13
  [9191, 'EPH.5.23'],  // « chef de l'Église, son corps et sa plénitude » = Ep 1,22
  [9274, 'LUK.16.26'], // la philosophie don des dieux (Cicéron), non biblique
  [9389, 'PSA.104.19'],// « nous connaissons en partie » = 1 Co 13,9-12
  [9451, 'ROM.15.33'], // « Dieu soit tout en tous » = 1 Co 15,28
  [9481, 'JOB.24.1'],  // « connaître les temps » = Ac 1,7
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XXII');
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
