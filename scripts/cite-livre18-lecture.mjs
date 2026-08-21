// Enrichissement du livre XVIII de la Cité de Dieu par lecture (Corpus Scriptura).
// Histoire profane parallèle (Assyriens, mythes grecs) — pauvre en Écriture — puis grande
// anthologie prophétique (Osée, Amos, Isaïe, Michée, Nahum, Habacuc, Jérémie, Sophonie,
// Daniel, Ézéchiel, Aggée, Zacharie, Malachie) et l'âge de l'Église.
// Schéma dominant : le matcheur rate les CHAPITRES cités en bloc (Is 53-54, Mi 4-5, Dn 7,
// Ha 3, Ml 3-4…) et pose des faux amis par thème (« à corne », noms de rois pris dans la
// généalogie de Mt 1, versets voisins). NB : les liens {canon_id null, type 4} sont des
// marqueurs volontaires « référence non biblique » (Varron, Salluste…) — NE PAS y toucher.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XVIII';

const AJOUTS = [
  // Osée
  [6830, 'HOS.1.1', 1],    // titre du livre d'Osée (Ozias, Joathan, Achaz, Ézéchias)
  [6838, 'HOS.2.1', 1],    // « vous n'êtes point mon peuple… enfants du Dieu vivant » (Vulg 2,1)
  // Amos
  [6848, 'AMO.4.13', 1],   // « c'est moi qui annonce aux hommes leur Sauveur »
  [6849, 'AMO.9.11', 1],   // « je relèverai le pavillon de David qui est tombé »
  [6849, 'AMO.9.12', 1],   // « tout le reste des hommes me chercheront, et toutes les nations »
  // Isaïe 53 (le Serviteur souffrant) et 54
  [6852, 'ISA.52.13', 1],  // « mon fils sera comblé d'honneur et de gloire »
  [6852, 'ISA.53.1', 1],   // « qui a cru à notre parole ? »
  [6853, 'ISA.53.2', 1],   // « il n'a ni gloire ni beauté »
  [6854, 'ISA.53.4', 1],   // « il porte nos péchés, et c'est pour nous qu'il souffre »
  [6855, 'ISA.53.5', 1],   // « à cause de nos iniquités il a été couvert de blessures »
  [6856, 'ISA.53.6', 1],   // « nous étions tous comme des brebis égarées »
  [6857, 'ISA.53.7', 1],   // « mené comme une brebis à la boucherie »
  [6858, 'ISA.53.9', 1],   // « sa sépulture coûtera la vie aux méchants »
  [6859, 'ISA.53.11', 1],  // « justifier le juste qui s'est sacrifié pour plusieurs »
  [6860, 'ISA.53.12', 1],  // « il partagera les dépouilles des puissants »
  [6861, 'ISA.54.1', 1],   // « réjouissez-vous, stérile qui n'enfantez pas »
  [6862, 'ISA.54.2', 1],   // « étendez le lieu de votre demeure »
  [6862, 'ISA.54.3', 1],   // « cette postérité possédera les nations »
  [6863, 'ISA.54.5', 1],   // « le Seigneur qui vous a créée s'appelle le Dieu des armées »
  // Michée
  [6866, 'MIC.4.1', 1],    // « la montagne du Seigneur paraîtra élevée »
  [6866, 'MIC.4.2', 1],    // « la loi sortira de Sion, et la parole du Seigneur de Jérusalem »
  [6867, 'MIC.5.2', 1],    // « et toi, Bethléem… c'est de toi que sortira le prince d'Israël »
  [6868, 'MIC.5.4', 1],    // « il paîtra son troupeau par la puissance du Seigneur »
  // Nahum
  [6881, 'NAM.2.1', 1],    // « voici sur les montagnes les pieds de ceux qui annoncent la paix » (Vulg 2,1)
  // Habacuc 2
  [6884, 'HAB.2.2', 1],    // « écrivez nettement cette vision »
  [6885, 'HAB.2.3', 1],    // « cette vision s'accomplira en son temps… attendez-le »
  // Habacuc 3 (cantique)
  [6886, 'HAB.3.2', 1],    // « Seigneur, j'ai entendu ce que vous m'avez fait entendre » (en place de Ps 63,10)
  [6894, 'PSA.56.12', 1],  // « montez au-dessus des cieux, ô Dieu, et votre gloire par toute la terre »
  [6909, 'HAB.3.11', 1],   // « vous lancerez vos flèches en plein jour » (en place de Ps 76,18)
  [6913, 'PSA.115.16', 1], // « vous avez rompu mes chaînes »
  [6914, 'HAB.3.14', 1],   // « ils seront affamés comme un pauvre qui mange en cachette » (en place de Lv 11,11)
  [6917, 'HAB.3.16', 1],   // « la frayeur a pénétré jusque dans mes os » (en place de Si 51,21)
  [6919, 'HAB.3.17', 1],   // « le figuier ne portera point de fruit, ni la vigne de raisin » (en place de Si 49,14)
  [6922, 'HAB.3.18', 1],   // « mais moi je me réjouirai en mon Seigneur »
  [6923, 'HAB.3.19', 1],   // « le Seigneur mon Dieu est ma force »
  // Jérémie / Lamentations / Baruch
  [6930, 'LAM.4.20', 1],   // « le Christ par qui nous respirons a été pris pour nos péchés » (en place de Rm 4,25)
  [6931, 'BAR.3.38', 1],   // « il a été vu sur terre et a conversé parmi les hommes »
  [6934, 'JER.17.9', 1],   // « leur esprit est pesant : c'est un homme ; qui le connaîtra ? »
  // Sophonie
  [6937, 'ZEP.3.8', 1],    // « attendez que je ressuscite… j'ai résolu d'assembler les nations »
  [6938, 'ZEP.2.11', 1],   // « il exterminera tous les dieux de la terre » (en place de 2 R 18,33)
  [6939, 'ZEP.3.9', 1],    // « je ferai que tous les peuples invoqueront le nom du Seigneur »
  // Daniel / Ézéchiel
  [6944, 'DAN.7.13', 1],   // « je voyais le fils de l'homme, environné de nuées »
  [6945, 'DAN.7.14', 1],   // « son pouvoir est un pouvoir éternel »
  [6946, 'EZK.34.23', 1],  // « je susciterai un pasteur, mon serviteur David »
  // Malachie
  [6960, 'MAL.1.10', 1],   // « vous ne m'agréez point, et je ne veux point de vos présents » (en place de 1 S 12,7)
  [6964, 'MAL.3.1', 1],    // « je m'en vais envoyer mon ange pour préparer la voie »
  [6966, 'MAL.3.2', 1],    // « qui pourra supporter l'éclat de sa gloire ? » (en place de Pr 27,4)
  [6973, 'MAL.3.14', 1],   // « c'est une folie de servir Dieu »
  [6976, 'MAL.3.19', 1],   // « voici venir le jour allumé comme une fournaise » (Vulg 3,19)
  [6977, 'MAL.3.20', 1],   // « le soleil de justice se lèvera pour vous » (Vulg 3,20)
  // Âge de l'Église
  [7103, 'ISA.7.14', 1],   // « une vierge concevra un fils appelé Emmanuel »
  [7112, 'PSA.58.12', 1],  // « ne les tuez pas… dispersez-les » (en place de Ps 142,12)
  [7115, 'PSA.58.12', 1],  // idem (en place de Pr 31,5)
  [7139, 'PSA.39.6', 1],   // « j'ai annoncé partout, et ils se sont multipliés sans nombre »
  [7146, 'ISA.2.3', 1],    // « la loi sortira de Sion » (en place de Jr 29,20)
  [7166, '2TI.2.19', 1],   // « Dieu connaît ceux qui sont à lui » (en place de Ga 4,8)
  [7209, 'ISA.2.3', 1],    // « la loi sortira de Sion » (en place de Jr 29,20)
];
const RETRAITS = [
  [6830, 'MAT.1.9'],       // noms de rois pris dans la généalogie de Mt = titre d'Osée (Os 1,1)
  [6886, 'PSA.63.10'],     // « j'ai entendu… » = Ha 3,2
  [6902, 'REV.12.16'],     // « la terre s'ouvrira » = Ha 3,9, pas Ap 12,16
  [6909, 'PSA.76.18'],     // « vos flèches en plein jour » = Ha 3,11
  [6914, 'LEV.11.11'],     // « affamés… mange en cachette » = Ha 3,14
  [6917, 'SIR.51.21'],     // « la frayeur dans mes os » = Ha 3,16
  [6919, 'SIR.49.14'],     // « le figuier ne portera point de fruit » = Ha 3,17
  [6930, 'ROM.4.25'],      // « le Christ par qui nous respirons » = Lm 4,20
  [6938, '2KI.18.33'],     // « il exterminera tous les dieux » = So 2,11
  [6960, '1SA.12.7'],      // « vous ne m'agréez point » = Ml 1,10
  [6966, 'PRO.27.4'],      // « qui pourra supporter sa gloire ? » = Ml 3,2
  [7112, 'PSA.142.12'],    // « ne les tuez pas… dispersez-les » = Ps 58,12
  [7115, 'PRO.31.5'],      // idem = Ps 58,12
  [7146, 'JER.29.20'],     // « la loi sortira de Sion » = Is 2,3 / Mi 4,2
  [7166, 'GAL.4.8'],       // « Dieu connaît ceux qui sont à lui » = 2 Tm 2,19
  [7209, 'JER.29.20'],     // idem = Is 2,3 / Mi 4,2
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XVIII');
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
