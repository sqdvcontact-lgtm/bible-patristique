// Enrichissement du livre XX de la Cité de Dieu par lecture (Corpus Scriptura).
// Le Jugement dernier : exégèse serrée d'Apocalypse 20-21, Matthieu 25, 2 Pierre 3,
// 2 Thessaloniciens 2, Isaïe (26, 42, 48, 65, 66), Daniel 7 et 12, Malachie 3, Zacharie 12,
// Psaume 49. Le plus dense du livre. Schéma dominant : le matcheur tague le commentaire mais
// rate les CHAPITRES cités en bloc, et pose des faux amis par thème (Ecclésiaste pris pour
// Lévitique/Deutéronome/Jean ; « anciens jours » Ps 76,6 pour Malachie ; etc.).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XX';

const AJOUTS = [
  // Ecclésiaste (ouverture et clôture)
  [7701, 'ECC.1.2', 1], [7701, 'ECC.1.3', 1],   // « vanité des vanités… que revient-il à l'homme ? »
  [7704, 'ECC.8.14', 1],                         // « des justes traités comme des impies… »
  [7709, 'ECC.12.13', 1], [7709, 'ECC.12.14', 1],// « craignez Dieu… Dieu jugera toute œuvre »
  [7710, 'ECC.12.13', 1],                        // « craignez Dieu… là est tout l'homme » (en place de Dt 8,6)
  [7711, 'ECC.12.14', 1],                        // « Dieu jugera toute œuvre » (en place de Jn 12,48)
  // Romains
  [7685, 'ROM.9.14', 1],                         // « il n'y a point d'injustice en Dieu » (en place de 1 Co 13,6)
  [7716, 'ROM.3.21', 1],                         // « la justice de Dieu révélée sans la loi »
  // Matthieu — paraboles et jugement
  [7725, 'MAT.13.37', 1], [7726, 'MAT.13.41', 1], [7727, 'MAT.13.43', 1], // l'ivraie expliquée
  [7734, '1CO.6.3', 1],                          // « nous jugerons les anges »
  [7740, 'MAT.25.31', 1], [7741, 'MAT.25.34', 1], [7741, 'MAT.25.35', 1],
  [7742, 'MAT.25.36', 1], [7744, 'MAT.25.40', 1], [7745, 'MAT.25.41', 1], [7746, 'MAT.25.45', 1], // brebis/boucs
  [7748, 'JHN.5.22', 1],                         // « le Père a donné au Fils tout pouvoir de juger »
  // Apocalypse 20 (premier bloc)
  [7779, 'REV.20.1', 1], [7779, 'REV.20.2', 1], [7781, 'REV.20.4', 1], [7782, 'REV.20.5', 1], [7783, 'REV.20.6', 1],
  [7795, 'MRK.10.30', 1], [7795, 'PSA.104.8', 1],// « le centuple » ; « pour mille générations »
  [7804, '2TI.2.19', 1],                         // « le Seigneur connaît ceux qui sont à lui »
  // Chapitre IX
  [7846, 'MAT.28.20', 1],                        // « je suis avec vous jusqu'à la fin du monde »
  [7847, 'MAT.13.52', 1],                        // « de nouvelles et de vieilles choses » (en place de Mt 12,35)
  [7854, 'MAT.23.3', 1],                         // « ils disent et ne font pas »
  [7858, 'PHP.3.20', 1],                         // « leur conversation est dans le ciel »
  [7862, 'REV.20.4', 1],                         // « je vis des trônes… le pouvoir de juger »
  [7888, 'COL.3.1', 1],                          // « si vous êtes ressuscités avec le Christ » (en place de Ep 2,6)
  [7891, 'ROM.14.4', 1],                         // « s'il tombe ou demeure debout, c'est pour son maître »
  [7894, '1PE.2.9', 1],                          // « le peuple saint et le sacerdoce royal »
  [7911, 'ISA.26.11', 1],                        // « le zèle saisit un peuple ignorant… le feu » (en place de Za 9,4)
  // Apocalypse 21
  [7966, 'REV.21.2', 1], [7966, 'REV.21.3', 1], [7966, 'REV.21.5', 1],
  [7973, 'PSA.37.10', 1],                        // « mes gémissements ne vous sont point cachés »
  [7976, 'ROM.8.23', 1],                         // « soupirent en attendant la rédemption de leur corps »
  // 2 Pierre 3
  [7984, '2PE.3.3', 1], [7985, '2PE.3.8', 1], [7987, '2PE.3.10', 1], [7989, '2PE.3.13', 1],
  // 2 Thessaloniciens 2
  [8001, '2TH.2.1', 1], [8002, '2TH.2.3', 1], [8002, '2TH.2.4', 1], [8005, '2TH.2.8', 1],
  // 1 Jean 2 (les antéchrists)
  [8023, '1JN.2.18', 1], [8024, '1JN.2.19', 1],
  // 1 Thessaloniciens 4
  [8038, '1TH.4.13', 1], [8039, '1TH.4.16', 1],
  // 1 Corinthiens 15 / Genèse
  [8045, '1CO.15.22', 1], [8046, '1CO.15.36', 1], [8047, 'GEN.3.19', 1], [8050, '1CO.15.51', 1],
  // Isaïe 26 / 65 / 66
  [8062, 'ISA.26.19', 1], [8064, 'ISA.26.19', 1],// « les morts ressusciteront » (en place de 1 Th 4,14)
  [8067, 'ISA.66.12', 1], [8069, 'ISA.66.15', 1],
  [8079, 'ISA.65.17', 1], [8079, 'ISA.65.19', 1],
  [8086, 'GEN.6.3', 1],                          // « mon esprit ne demeurera plus… ils ne sont que chair » (en place de Ps 67,7)
  [8088, 'LUK.12.49', 1], [8088, 'MAT.10.34', 1],// « le feu sur la terre » ; « non la paix mais le glaive »
  [8089, 'HEB.4.12', 1], [8089, 'SNG.2.5', 1],   // « glaive à deux tranchants » ; « blessée d'amour »
  [8093, 'ROM.3.23', 1],                         // « tous ont péché et ont besoin de la gloire de Dieu »
  [8098, 'ISA.66.22', 1], [8099, 'ISA.66.24', 1],// « leur ver ne mourra point… »
  [8106, 'MAT.25.21', 1],                        // « entre dans la joie de ton Seigneur »
  [8111, '1JN.3.9', 1],                          // « la semence de Dieu demeure en lui »
  [8112, 'ISA.56.5', 1],                         // « je leur donnerai un nom éternel »
  // Daniel 7 et 12
  [8118, 'DAN.7.17', 1], [8119, 'DAN.7.19', 1], [8120, 'DAN.7.21', 1],
  [8121, 'DAN.7.23', 1], [8122, 'DAN.7.25', 1], [8124, 'DAN.7.27', 1],
  [8131, 'DAN.12.1', 1], [8132, 'DAN.12.2', 1], [8133, 'DAN.12.3', 1],
  [8138, 'GEN.17.5', 1],                         // « je vous établirai père de plusieurs nations »
  [8139, 'DAN.12.13', 1],                        // « venez et reposez… vous ressusciterez » (en place de Dt 12,9)
  // Psaume 101 (fin du monde)
  [8141, 'PSA.101.26', 1],                       // « les cieux périront, mais vous resterez »
  // Psaume 49
  [8161, 'PSA.49.3', 1], [8162, 'PSA.49.4', 1], [8162, 'PSA.49.5', 1],
  [8175, 'HOS.6.6', 1],                          // « j'aime mieux la miséricorde que le sacrifice »
  // Malachie
  [8180, 'MAL.3.2', 1], [8180, 'MAL.3.3', 1], [8181, 'MAL.3.4', 1],
  [8199, 'JOB.14.4', 1],                         // « nul n'est exempt de péché, pas même l'enfant d'un jour »
  [8204, 'ISA.65.22', 1],                        // « les jours de mon peuple seront comme l'arbre de vie »
  [8213, 'MAL.3.6', 1],                          // « je suis le Seigneur, et je ne change point » (en place de Ga 4,20)
  [8219, 'MAL.3.17', 1], [8220, 'MAL.3.19', 1], [8221, 'MAL.3.20', 1],
  [8228, 'MAL.3.14', 1], [8229, 'MAL.3.15', 1],
  [8231, 'MAL.2.17', 1],                         // « tout homme qui fait le mal est bon devant Dieu » (en place de Ps 5,5)
  [8237, 'MAL.3.23', 1], [8237, 'MAL.3.24', 1],  // « je vous enverrai Élie… »
  // Isaïe 48 / 42, Zacharie 12
  [8254, 'ISA.48.12', 1], [8255, 'ISA.48.15', 1],
  [8258, 'ISA.53.7', 1],                         // « comme une brebis menée à la boucherie » (en place de Ps 43,12)
  [8266, 'MAT.4.19', 1], [8267, 'LUK.5.10', 1],  // « pêcheurs d'hommes »
  [8269, 'ZEC.12.9', 1], [8269, 'ZEC.12.10', 1],
  [8279, 'ZEC.12.10', 1],                        // « ceux qu'ils ont percé » (en place de Si 43,18)
  [8285, 'ISA.42.1', 1], [8286, 'ISA.42.3', 1], [8287, 'ISA.42.4', 1],
  [8296, 'PSA.40.6', 1],                         // « quand périra son nom ? » (en place de 1 M 3,9)
];
const RETRAITS = [
  [7685, '1CO.13.6'],  // « point d'injustice en Dieu » = Rm 9,14
  [7701, 'ECC.4.7'],   // « vanité des vanités » = Ec 1,2
  [7709, 'LEV.27.12'], // « Dieu jugera toute œuvre » = Ec 12,13-14
  [7710, 'DEU.8.6'],   // « craignez Dieu… tout l'homme » = Ec 12,13
  [7711, 'JHN.12.48'], // « Dieu jugera toute œuvre » = Ec 12,14
  [7847, 'MAT.12.35'], // « nouvelles et vieilles choses » = Mt 13,52
  [7865, '1CO.1.6'],   // « juges de ceux du dedans » = 1 Co 5,12
  [7884, 'PRO.18.21'], // « la seconde mort n'a point de pouvoir » = Ap 20,6
  [7888, 'EPH.2.6'],   // « ressuscités avec le Christ… choses du ciel » = Col 3,1
  [7911, 'ZEC.9.4'],   // « le zèle… le feu » = Is 26,11
  [7964, 'EXO.14.30'], // « la mer présenta ses morts » = Ap 20,13
  [8064, '1TH.4.14'],  // « les morts ressusciteront » = Is 26,19
  [8086, 'PSA.67.7'],  // « ils ne sont que chair » = Gn 6,3
  [8139, 'DEU.12.9'],  // « venez et reposez » = Dn 12,13
  [8197, 'PSA.76.6'],  // « aux anciens jours, premières années » = Ml 3,4
  [8207, 'PSA.76.6'],  // idem = Ml 3,4
  [8213, 'GAL.4.20'],  // « je ne change point » = Ml 3,6
  [8231, 'PSA.5.5'],   // « le méchant est bon devant Dieu » = Ml 2,17
  [8258, 'PSA.43.12'], // « brebis menée à la boucherie » = Is 53,7
  [8279, 'SIR.43.18'], // « ceux qu'ils ont percé » = Za 12,10
  [8296, '1MA.3.9'],   // « quand périra son nom ? » = Ps 40,6
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XX');
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
