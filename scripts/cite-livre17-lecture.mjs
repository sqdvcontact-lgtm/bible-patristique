// Enrichissement du livre XVII de la Cité de Dieu par lecture (Corpus Scriptura).
// L'âge des prophètes : Samuel, Saül, David, Salomon ; les Psaumes messianiques.
// Livre très dense. Schéma dominant : le matcheur a étiqueté les segments de COMMENTAIRE
// mais raté les CITATIONS-BLOCS (cantique d'Anne 1 S 2, oracle à Héli, oracle de Nathan
// 2 S 7, Ps 88, Ps 44, Ps 40…), et posé des faux amis « à corne / verge / maison / stérile »
// (Ps 88,18 ; Nb 24,11 ; 2 M 6,16 ; Mt 25,42 ; Jr 3,20…) là où le texte cite 1-2 Samuel
// ou le psaume lui-même.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XVII';

const AJOUTS = [
  [6142, 'GEN.12.1', 1],   // « allez en la terre que je vous montrerai… » (promesse à Abraham)
  // Cantique d'Anne — bloc-citation (1 S 2,1-10)
  [6172, '1SA.2.1', 1],
  [6173, '1SA.2.2', 1],
  [6174, '1SA.2.3', 1],
  [6174, '1SA.2.4', 1],
  [6175, '1SA.2.5', 1],
  [6176, '1SA.2.6', 1],
  [6177, '1SA.2.7', 1],
  [6177, '1SA.2.8', 1],
  [6178, '1SA.2.9', 1],
  [6180, '1SA.2.10', 1],
  // Cantique d'Anne — commentaire (re-citations, en place des faux amis « à corne / stérile »)
  [6187, '1SA.2.10', 1],
  [6189, '1SA.2.1', 1],
  [6190, '1SA.2.1', 1],
  [6193, '1SA.2.2', 1],
  [6199, '1SA.2.5', 1],
  [6203, '1SA.2.5', 1],
  [6208, '1SA.2.6', 1],
  [6252, '1SA.2.1', 1],
  [6222, 'MAT.19.28', 1],  // « vous serez assis sur douze trônes »
  [6223, 'MAT.19.27', 1],  // « nous avons tout quitté pour vous suivre »
  [6226, 'PSA.101.28', 1], // « vos années ne finiront point »
  [6239, '2CO.5.10', 1],   // « chacun recevra la récompense du bien et du mal fait par le corps »
  // Oracle de l'homme de Dieu à Héli — bloc (1 S 2,27-36)
  [6257, '1SA.2.27', 1],
  [6258, '1SA.2.29', 1],
  [6259, '1SA.2.30', 1],
  [6262, '1SA.2.35', 1],
  [6281, '1SA.2.35', 1],   // en place de Nb 24,11
  [6285, '1SA.2.36', 1],   // en place de Mt 10,13
  [6291, 'ROM.9.28', 1],   // « le Seigneur fera une parole courte et abrégée sur la terre »
  [6294, 'PSA.83.11', 1],  // « j'aime mieux être méprisable dans la maison du Seigneur » (en place de Jr 3,20)
  [6296, 'ROM.12.1', 1],   // « offrez vos corps comme une hostie vivante » (en place de Dt 12,14)
  [6301, '1SA.2.30', 1],   // « votre maison passera éternellement… » (en place de 1 S 22,16)
  // Saül réprouvé (1 S 15)
  [6316, '1SA.15.23', 1],  // « parce que vous avez rejeté le commandement de Dieu… »
  [6320, '1SA.15.28', 1],  // « le Seigneur a ôté aujourd'hui le royaume à Israël »
  [6331, 'GAL.4.30', 2],   // « chassez la servante avec son fils »
  // Oracle de Nathan (2 S 7)
  [6350, '2SA.7.14', 1],   // « je lui tiendrai lieu de père et l'aimerai comme mon fils »
  [6351, '2SA.7.16', 1],   // « son royaume durera autant que les siècles »
  [6352, '2SA.7.16', 1],   // en place de Ps 80,16
  // Psaume 88 (89) — bloc et commentaire
  [6368, 'PSA.88.21', 1],  // « j'ai trouvé David mon serviteur »
  [6371, 'PSA.88.28', 1],  // « je le ferai mon fils aîné »
  [6374, '2SA.7.14', 1],   // « je le châtierai par la verge des hommes » (en place de 2 M 6,16)
  [6375, 'PSA.104.15', 1], // « ne touchez pas mes christs »
  [6380, 'ACT.9.4', 1],    // « Saul, Saul, pourquoi me persécutez-vous ? »
  [6382, 'PSA.88.39', 1],  // « vous les avez rejetés et anéantis »
  [6387, 'PSA.88.40', 1],  // « vous avez rompu l'alliance… profané son temple »
  [6391, 'PSA.88.47', 1],  // « jusques à quand, Seigneur, détournerez-vous… » (en place de Jb 14,6)
  [6392, 'PSA.88.48', 1],  // « souvenez-vous quelle est ma substance » (en place de Ps 78,5)
  [6394, 'PSA.143.4', 1],  // « l'homme est devenu semblable à une chose vaine »
  [6396, 'PSA.88.49', 1],  // « quel est cet homme qui vivra et ne mourra point ? » (en place de Pr 23,14)
  [6415, 'PSA.88.53', 1],  // « que la bénédiction du Seigneur demeure éternellement » (en place de Jc 3,10)
  [6419, '2SA.7.19', 1],   // « vous avez parlé pour longtemps en faveur de la maison de David »
  [6420, '2SA.7.29', 1],   // « bénissez pour jamais la maison de votre serviteur »
  [6422, '2SA.7.27', 1],   // « vous avez révélé que vous lui bâtiriez une maison » (en place de Ps 117,26)
  // Psaume 44 (45) — bloc (le roi et la reine)
  [6452, 'PSA.44.2', 1],
  [6453, 'PSA.44.3', 1],
  [6454, 'PSA.44.5', 1],
  [6455, 'PSA.44.7', 1],
  [6456, 'PSA.44.8', 1],
  [6457, 'PSA.44.9', 1],
  [6462, 'PSA.44.11', 1],
  [6463, 'PSA.44.14', 1],
  [6465, 'PSA.44.18', 1],
  [6470, 'PSA.44.11', 1],  // « oubliez votre pays… » (en place de Si 7,27)
  // Psaume 17, Ps 109
  [6473, 'PSA.17.44', 1],  // « vous me délivrerez des révoltes de ce peuple »
  [6476, 'ROM.10.17', 1],  // « la foi vient de l'ouïe »
  [6485, 'PSA.109.4', 1],  // « vous serez le prêtre éternel selon l'ordre de Melchisédech »
  // Psaume 40 (41) — la trahison
  [6496, 'PSA.40.6', 1],   // « quand mourra-t-il, et quand sa mémoire sera-t-elle abolie ? »
  [6500, 'PSA.40.10', 1],  // « celui qui mangeait de mon pain m'a mis le pied sur la gorge »
  [6501, 'PSA.40.11', 1],  // « ayez pitié de moi, et rendez-moi la vie »
  [6503, 'JHN.13.18', 1],  // Jésus citant Ps 40,10 sur Judas (en place de Jn 6,50)
  [6505, 'MAT.25.35', 1],  // « j'ai eu faim, et vous m'avez donné à manger » (en place de Mt 25,42)
  [6506, 'MAT.25.40', 1],  // « ce que vous avez fait au plus petit… c'est à moi » (en place de Ps 30,20)
  [6510, 'PSA.15.10', 1],  // « vous ne laisserez point mon âme en enfer »
  [6517, 'MAT.27.34', 1],  // « ils m'ont donné du fiel… » accompli dans l'Évangile (en place de Mt 25,42)
  [6522, 'PSA.31.1', 1],   // « heureux ceux dont les iniquités sont pardonnées »
  // Sapientiaux (Sagesse, Ecclésiastique, Proverbes, Ecclésiaste)
  [6528, 'WIS.2.12', 1],   // « opprimons le juste, il nous est incommode »
  [6530, 'WIS.2.20', 1],   // « condamnons-le à une mort ignominieuse »
  [6531, 'SIR.36.1', 1],   // « Seigneur, maître de tous, ayez pitié de nous »
  [6534, 'PRO.1.12', 1],   // « mettons le juste au tombeau et dévorons-le tout vivant »
  [6536, 'MAT.21.38', 1],  // « voici l'héritier ; allons, tuons-le »
  [6536, 'PRO.9.1', 1],    // « la Sagesse s'est bâti une maison… sept colonnes »
  [6537, 'PRO.9.2', 1],    // « elle a immolé ses victimes, mêlé son vin »
  [6540, 'PRO.9.6', 1],    // « quittez votre folie afin de vivre » (en place de Pr 16,22)
  [6543, 'PSA.39.7', 1],   // « vous m'avez disposé un corps »
  [6546, 'ECC.10.16', 1],  // « malheur à toi, terre, dont le roi est jeune »
  [6547, 'ECC.10.17', 1],  // « bénie sois-tu, terre, dont le roi est fils des libres »
  [6551, 'ROM.5.5', 1],    // « l'espérance ne confond point »
  [6569, '1KI.19.10', 1],  // « Seigneur, ils ont égorgé vos Prophètes… je suis resté seul »
  [6569, '1KI.19.18', 1],  // « sept mille hommes qui n'ont point plié le genou devant Baal »
];
const RETRAITS = [
  [6142, 'JHN.5.20'],      // « allez en la terre… » = Gn 12,1, pas Jn 5,20
  [6187, 'PSA.88.18'],     // « il donne la force à nos rois » = 1 S 2,10
  [6189, 'PSA.88.18'],     // « mon cœur a été affermi » = 1 S 2,1
  [6190, 'LAM.3.46'],      // « ma bouche ouverte contre mes ennemis » = 1 S 2,1
  [6193, 'PSA.96.12'],     // « il n'est point de saint comme le Seigneur » = 1 S 2,2
  [6199, 'PSA.106.36'],    // « ceux qui étaient affamés se sont élevés » = 1 S 2,5
  [6203, 'PSA.112.9'],     // « la stérile est devenue mère de sept enfants » = 1 S 2,5
  [6208, 'SIR.15.17'],     // « Dieu donne la mort et redonne la vie » = 1 S 2,6
  [6239, 'EPH.6.8'],       // « la récompense du bien et du mal par le corps » = 2 Co 5,10
  [6252, 'PSA.88.18'],     // « mon Dieu a relevé ma force » = 1 S 2,1
  [6281, 'NUM.24.11'],     // « elle passera devant mon Christ » = 1 S 2,35
  [6285, 'MAT.10.13'],     // « quiconque restera viendra l'adorer » = 1 S 2,36
  [6286, 'MAT.10.13'],     // idem = 1 S 2,36
  [6291, 'JER.22.29'],     // « une parole courte et abrégée sur la terre » = Rm 9,28
  [6294, 'JER.3.20'],      // « méprisable dans la maison du Seigneur » = Ps 83,11
  [6296, 'DEU.12.14'],     // « offrez vos corps comme une hostie vivante » = Rm 12,1
  [6301, '1SA.22.16'],     // « votre maison passera éternellement » = 1 S 2,30, pas 22,16
  [6352, 'PSA.80.16'],     // « son royaume durera autant que les siècles » = 2 S 7,16
  [6374, '2MA.6.16'],      // « je le châtierai par la verge des hommes » = 2 S 7,14
  [6391, 'JOB.14.6'],      // « jusques à quand détournerez-vous » = Ps 88,47
  [6392, 'PSA.78.5'],      // « votre colère s'allumera comme un feu » = Ps 88,47-48
  [6396, 'PRO.23.14'],     // « il délivrera son âme de l'enfer » = Ps 88,49
  [6415, 'JAS.3.10'],      // « que la bénédiction demeure éternellement » = Ps 88,53
  [6422, 'PSA.117.26'],    // « vous lui bâtiriez une maison » = 2 S 7,27
  [6470, 'SIR.7.27'],      // « oubliez votre pays » = Ps 44,11
  [6503, 'JHN.6.50'],      // « celui qui mangeait mon pain… » = Jn 13,18
  [6505, 'MAT.25.42'],     // « vous m'avez donné à manger » = Mt 25,35 (positif)
  [6506, 'PSA.30.20'],     // « au plus petit… c'est à moi » = Mt 25,40
  [6517, 'MAT.25.42'],     // « du fiel à manger » = Ps 68,22 / accompli Mt 27,34
  [6540, 'PRO.16.22'],     // « quittez votre folie afin de vivre » = Pr 9,6
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XVII');
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
