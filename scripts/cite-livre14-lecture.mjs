// Enrichissement du livre XIV de la Cité de Dieu par lecture (Corpus Scriptura).
// Vie selon la chair / selon l'esprit, les passions, la chute, la concupiscence.
// Livre exceptionnellement dense en Écriture (Paul, Genèse 2-3, Psaumes). Le matcheur a
// beaucoup capté ; nombreux ajouts et faux amis (versets voisins ou d'un autre livre
// appariés par thème — amour/joie/crainte, esprit, mâle-femelle).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XIV';

const AJOUTS = [
  [4794, 'JHN.1.14', 1],  // « le Verbe s'est fait chair »
  [4797, 'GAL.5.19', 1],  // « les œuvres de la chair sont aisées à connaître… »
  [4804, '2CO.4.16', 1],  // « quoique notre homme extérieur se corrompe »
  [4804, '2CO.5.1', 1],   // « si cette maison de terre vient à se dissoudre… »
  [4806, '2CO.5.4', 1],   // « ce qu'il y a de mortel soit absorbé par la vie »
  [4814, '2PE.2.4', 1],   // le diable précipité dans les prisons obscures
  [4819, 'JHN.8.44', 2],  // « le père du mensonge »
  [4822, 'JHN.14.6', 1],  // « Je suis la vérité »
  [4830, '1CO.2.11', 1],  // « qui connaît ce qui est en l'homme… »
  [4831, '1CO.2.12', 1],  // « nous n'avons pas reçu l'esprit du monde… »
  [4832, '1CO.2.14', 1],  // « l'homme animal ne conçoit point ce qui est de l'esprit »
  [4869, '1JN.2.15', 1],  // « celui qui chérit le monde, la dilection du Père n'est pas en lui »
  [4872, '2TI.3.2', 1],   // « amoureux d'eux-mêmes, amoureux de l'argent »
  [4874, 'PSA.118.20', 1],// « mon âme languit dans le désir pour votre loi »
  [4874, 'WIS.6.20', 1],  // « la concupiscence de la sagesse mène au royaume de Dieu »
  [4875, 'PSA.4.7', 1],   // « vous avez versé la joie dans mon cœur »
  [4876, 'PHP.2.12', 1],  // « opérez votre salut avec crainte et frayeur »
  [4876, 'ROM.11.20', 1], // « ne visez pas plus haut qu'il ne convient, et craignez »
  [4885, 'ISA.57.21', 1], // « il n'y a pas de contentement pour les impies »
  [4894, 'LUK.2.14', 1],  // « paix sur la terre aux hommes de bonne volonté »
  [4895, '1CO.13.6', 1],  // « la charité ne prend point son contentement dans le mal »
  [4904, '2CO.7.9', 1],   // « votre tristesse a été selon Dieu… repentir salutaire »
  [4918, 'JAS.1.2', 1],   // « n'ayez jamais plus de joie que lorsque vous êtes tentés »
  [4926, 'JHN.11.35', 2], // Jésus pleura (Lazare)
  [4926, 'MAT.26.38', 2], // « son âme fut triste jusqu'à la mort »
  [4931, 'PSA.68.21', 1], // « j'ai attendu quelqu'un qui prendrait part à mon affliction »
  [4931, '2TI.3.3', 1],   // hommes « sans affection »
  [4942, 'PSA.18.10', 1], // « la crainte chaste du Seigneur qui demeure dans le siècle du siècle »
  [4945, 'PSA.9.19', 1],  // « la patience des pauvres ne périra jamais »
  [4959, 'GEN.1.28', 1],  // « croissez et multipliez »
  [4977, 'EXO.32.4', 2],  // Aaron fabrique l'idole
  [4977, '1KI.11.4', 2],  // Salomon entraîné par ses concubines
  [4980, 'ROM.5.14', 1],  // « à la ressemblance de la prévarication d'Adam »
  [4991, 'SIR.10.15', 2], // « tout péché commence par l'orgueil » (reprise)
  [5004, 'PSA.72.18', 1], // « vous les avez abattus lorsqu'ils s'élevaient »
  [5007, 'GEN.3.5', 1],   // « vous serez comme des dieux »
  [5015, 'GEN.3.13', 1],  // « le serpent m'a trompée, et j'ai mangé » (Ève)
  [5026, 'PSA.143.4', 1], // « l'homme n'est que vanité »
  [5043, '1TH.4.4', 1],   // « conserver le vase de son corps saint et pur »
  [5088, 'GEN.1.28', 2],  // « croissez et multipliez, remplissez la terre » (reprise)
  [5093, 'PSA.137.3', 1], // « vous multiplierez la vertu dans mon âme »
  [5101, 'MAT.19.4', 1],  // « celui qui les créa dès le commencement les créa mâle et femelle »
  [5180, 'PSA.17.2', 1],  // « Seigneur, qui êtes ma vertu, je vous aimerai »
  [5184, 'ROM.1.25', 2],  // culte de la créature plutôt que du Créateur (reprise)
  [5185, '1CO.15.28', 1], // « Dieu tout en tous »
];
const RETRAITS = [
  [4869, 'PRO.3.12'],     // « qui chérit le monde… » = 1 Jn 2,15, pas Pr 3,12
  [4872, '1TI.6.10'],     // « amoureux d'eux-mêmes » = 2 Tm 3,2, pas 1 Tm 6,10
  [4874, 'LAM.3.20'],     // « mon âme languit… » = Ps 118,20, pas Lamentations
  [4875, 'HAB.3.18'],     // « vous avez versé la joie » = Ps 4,7, pas Habacuc
  [4876, 'ISA.8.13'],     // « avec crainte et frayeur » = Ph 2,12, pas Isaïe
  [4931, 'PHP.4.14'],     // « sans affection » / « qui prendrait part » = 2 Tm 3,3 / Ps 68,21
  [5014, 'MRK.1.36'],     // « ils chercheront votre nom » = Ps 82,17, pas Marc
  [5015, 'GEN.3.2'],      // « le serpent m'a trompée » = Gn 3,13, pas Gn 3,2
  [5098, 'GEN.1.22'],     // « il les créa mâle et femelle… » = Gn 1,28, pas 1,22 (les poissons)
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XIV');
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
