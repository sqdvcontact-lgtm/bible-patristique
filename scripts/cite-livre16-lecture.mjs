// Enrichissement du livre XVI de la Cité de Dieu par lecture (Corpus Scriptura).
// Des fils de Noé à Babel, puis les patriarches : Abraham, Isaac, Jacob, Joseph.
// Livre très dense en Genèse. Le matcheur a capté les grands récits, mais manque
// quantité de citations et confond sans cesse un verset voisin ou d'un autre livre
// apparié par thème (promesse de la terre, « trouver grâce », « père de nations »…).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const OEUVRE = 'A0010O0002';
const AGIT = process.argv.includes('--agit');
const MOTIF = 'Lecture Corpus Scriptura — Cité de Dieu, livre XVI';

const AJOUTS = [
  // Fils de Noé, Babel (Gn 9-11)
  [5596, 'GEN.9.26', 1],   // « béni soit le Seigneur Dieu de Sem »
  [5597, 'GEN.9.27', 1],   // « que Dieu dilate Japheth, et qu'il habite dans les tentes de Sem »
  [5599, 'SNG.1.3', 2],    // « votre nom est un parfum répandu »
  [5606, 'MAT.7.20', 1],   // « vous les connaîtrez à leurs fruits »
  [5613, 'ISA.5.7', 1],    // « la vigne du Seigneur, c'est la maison d'Israël »
  [5615, '2CO.13.4', 1],   // « il a été crucifié selon l'infirmité »
  [5633, 'GEN.10.8', 1],   // « Chus engendra Nemrod, qui commença à être puissant sur la terre »
  [5653, 'GEN.11.1', 1],   // « toute la terre n'avait qu'un langage »
  [5654, 'GEN.11.4', 1],   // « bâtissons-nous une ville et une tour »
  [5655, 'GEN.11.7', 1],   // « descendons et confondons leur langage »
  [5656, 'GEN.11.9', 1],   // « c'est pourquoi ce lieu fut appelé Babel »
  [5662, 'PSA.94.6', 1],   // « venez, adorons et prosternons-nous devant le Seigneur »
  [5663, 'JOB.15.13', 1],  // « pourquoi votre esprit s'enfle-t-il contre Dieu ? »
  [5673, '1CO.3.9', 1],    // « nous sommes les coopérateurs de Dieu »
  [5674, 'GEN.1.26', 1],   // « faisons l'homme à notre image »
  [5676, 'GEN.1.27', 1],   // « Dieu créa l'homme à son image »
  [5687, 'GEN.11.6', 1],   // « et ils ne cesseront pas leurs desseins »
  [5694, 'GEN.1.24', 2],   // « que la terre produise des animaux vivants »
  // Abraham (Gn 11-15)
  [5738, 'PSA.13.3', 1],   // « tous se sont détournés, ils sont devenus inutiles »
  [5781, 'JDT.5.6', 2],    // discours d'Achior sur les Hébreux (Judith)
  [5791, 'GEN.11.1', 2],   // « toute la terre parlait un même langage » (reprise)
  [5807, 'GEN.12.2', 1],   // « je ferai de vous un grand peuple, je vous bénirai »
  [5808, 'GEN.12.3', 1],   // « toutes les nations de la terre seront bénies en vous »
  [5825, 'GEN.12.7', 1],   // « le Seigneur apparut à Abram : je donnerai cette terre à votre postérité »
  [5837, 'GEN.13.16', 1],  // « je multiplierai votre postérité comme la poussière de la terre »
  [5845, 'GEN.13.15', 1],  // « je vous donnerai cette terre, à vous et à vos descendants, pour jamais »
  [5851, 'PSA.109.4', 1],  // « vous êtes prêtre pour jamais selon l'ordre de Melchisédech »
  [5859, 'GEN.15.6', 1],   // « Abraham crut Dieu, et sa foi lui fut imputée à justice »
  [5865, 'GEN.15.13', 1],  // « votre postérité sera captive quatre cents ans »
  [5868, 'GEN.15.18', 1],  // « je donnerai cette terre, du fleuve d'Égypte à l'Euphrate »
  // Agar, circoncision, Sodome (Gn 15-20)
  [5897, 'GEN.16.6', 1],   // « votre servante est en votre pouvoir, faites-en ce qu'il vous plaira »
  [5898, 'GEN.15.4', 1],   // « celui-ci ne sera pas votre héritier, mais un autre sorti de vous »
  [5899, 'GEN.17.1', 1],   // « je suis Dieu, marchez devant moi et soyez sans reproche »
  [5902, 'GEN.17.10', 1],  // « tout mâle parmi vous sera circoncis »
  [5906, 'GEN.17.19', 1],  // « Sarra vous donnera un fils que vous nommerez Isaac »
  [5915, 'GEN.17.17', 1],  // « j'aurai un fils à cent ans, et Sarra accouchera à quatre-vingt-dix ? »
  [5918, 'GEN.17.14', 1],  // « tout mâle non circoncis sera exterminé, infracteur de mon alliance »
  [5922, 'SIR.14.17', 1],  // « tout homme vieillira comme un vêtement »
  [5923, 'PSA.118.119', 1],// « j'ai regardé tous les pécheurs de la terre comme des prévaricateurs »
  [5923, 'ROM.4.15', 1],   // « où il n'y a point de loi, il n'y a point de prévarication »
  [5937, 'ROM.4.19', 1],   // « son corps était déjà amorti » (foi d'Abraham)
  [5942, 'GEN.18.2', 1],   // « il vit trois hommes… Seigneur, si j'ai trouvé grâce devant vous »
  [5946, 'GEN.19.16', 1],  // « les anges le prirent par la main, lui, sa femme et ses filles »
  [5948, 'GEN.19.19', 1],  // « Seigneur, puisque votre serviteur a trouvé grâce devant vous » (Lot)
  [5965, 'GEN.21.6', 1],   // « Dieu m'a fait rire ; quiconque le saura se réjouira avec moi »
  [5971, 'GEN.21.12', 1],  // « c'est d'Isaac que sortira votre postérité »
  [5983, 'GEN.22.12', 1],  // « ne mettez point la main sur votre fils… je connais que vous craignez Dieu »
  [5987, 'GEN.22.16', 1],  // « j'ai juré par moi-même… je multiplierai votre postérité »
  [5991, 'GEN.17.17', 2],  // « j'aurai un fils à cent ans… » (reprise)
  [5994, 'GEN.24.3', 1],   // « jurez que vous ne prendrez pas femme parmi les Chananéens »
  [6017, 'GEN.26.3', 1],   // « demeurez comme étranger, je serai avec vous et vous bénirai »
  [6018, 'GEN.26.4', 1],   // « je multiplierai votre postérité comme les étoiles du ciel »
  // Isaac, Jacob, Joseph (Gn 26-50)
  [6022, 'GEN.26.5', 1],   // « parce qu'Abraham votre père a écouté ma voix »
  [6036, 'GEN.27.28', 1],  // « que Dieu vous donne la rosée du ciel… soyez le maître de votre frère »
  [6050, 'GEN.28.3', 1],   // « que Dieu vous bénisse et vous rende père de plusieurs peuples »
  [6054, 'GEN.28.4', 1],   // « qu'il vous donne la bénédiction de votre père Abraham »
  [6056, 'GEN.28.12', 1],  // l'échelle : « les anges de Dieu montaient et descendaient »
  [6058, 'GEN.28.14', 1],  // « toutes les nations de la terre seront bénies en vous et en votre postérité »
  [6060, 'GEN.28.17', 1],  // « que ce lieu est terrible ! c'est la maison de Dieu et la porte du ciel »
  [6061, 'GEN.28.18', 1],  // « il dressa la pierre et l'oignit d'huile »
  [6064, 'JHN.1.47', 1],   // « voilà un véritable Israélite en qui il n'y a point de ruse »
  [6076, 'PSA.17.46', 1],  // « ils se sont égarés du droit chemin et ont boité »
  [6091, 'GEN.49.10', 1],  // « le sceptre ne sera point ôté de la maison de Juda »
  [6092, 'GEN.49.11', 1],  // « il lavera sa robe dans le vin, son vêtement dans le sang de la grappe »
  [6100, 'PSA.22.5', 1],   // « que votre breuvage qui enivre est excellent ! »
  [6108, 'GEN.48.19', 2],  // « l'un sera père d'un peuple, l'autre de plusieurs nations » (reprise)
  [6118, 'EXO.31.18', 2],  // « la loi écrite sur les tables par le doigt de Dieu »
  [6126, 'MAT.1.17', 1],   // « quatorze générations depuis Abraham jusqu'à David »
];
const RETRAITS = [
  [5613, 'JER.10.1'],      // « la vigne… maison d'Israël » = Is 5,7, pas Jérémie
  [5613, 'JER.32.15'],     // idem = Is 5,7
  [5671, '1CO.14.4'],      // « confondons leur langage » = Gn 11,7, pas 1 Co 14,4
  [5687, '1KI.6.14'],      // « ils ne cesseront pas leurs desseins » = Gn 11,6, pas 1 R 6,14
  [5688, 'JOS.8.16'],      // segment sur un vers de Virgile, pas Josué
  [5809, 'EPH.3.15'],      // commentaire d'Augustin (double promesse), pas Ép 3,15
  [5825, 'GEN.35.12'],     // « je donnerai cette terre à votre postérité » = Gn 12,7 (Abraham), pas 35,12 (Jacob)
  [5845, 'JER.7.7'],       // « je vous donnerai cette terre pour jamais » = Gn 13,15, pas Jérémie
  [5898, 'MAT.23.11'],     // « un autre sorti de vous » = Gn 15,4, pas Mt 23,11
  [5915, 'GEN.35.28'],     // « j'aurai un fils à cent ans » = Gn 17,17, pas 35,28 (âge d'Isaac)
  [5918, 'LEV.12.3'],      // « infracteur de mon alliance » = Gn 17,14, pas Lv 12,3
  [5942, 'GEN.6.8'],       // « si j'ai trouvé grâce » = Gn 18,3, pas 6,8 (Noé)
  [5946, 'EXO.20.2'],      // « les anges le prirent par la main » = Gn 19,16, pas Ex 20,2
  [5948, 'GEN.18.3'],      // Lot parlant = Gn 19,19, pas 18,3 (Abraham)
  [5991, 'GEN.35.28'],     // reprise « à cent ans » = Gn 17,17, pas 35,28
  [6022, 'GEN.22.18'],     // « Abraham a écouté ma voix » (à Isaac) = Gn 26,5, pas 22,18
  [6054, 'GEN.17.4'],      // « père de plusieurs peuples » (à Jacob) = Gn 28,3-4, pas 17,4 (Abraham)
  [6108, 'GEN.17.4'],      // « père d'un peuple / de plusieurs nations » = Gn 48,19, pas 17,4
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
  const segs = (await pageAll('id, segment_numero, ref_niv1', 'segments', { id_oeuvre: OEUVRE })).filter((s) => s.ref_niv1 === 'Livre XVI');
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
