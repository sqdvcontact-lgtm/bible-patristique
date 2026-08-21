import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const OEUVRE = 'A0013O0002';
const ROOT = 'tmp/somme-liens-audit-2026-07-29';
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]));
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const must = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};
const sqlString = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sqlJson = (value) => `${sqlString(JSON.stringify(value))}::jsonb`;
const targetKey = (link) => link.canon_id ? `c:${link.canon_id}`
  : link.verset_v2_id ? `v:${link.verset_v2_id}`
    : link.livre ? `h:${link.livre}:${link.chapitre}` : 'vide';

function snapshot(label, payload) {
  mkdirSync(ROOT, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const name = `SOMME-RANDOM-AUDIT-CORRECTION-${label}-${stamp}.json`;
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  writeFileSync(`${ROOT}/${name}`, body);
  writeFileSync(`${ROOT}/${name}.sha256`, `${createHash('sha256').update(body).digest('hex')}  ${name}\n`);
  return `${ROOT}/${name}`;
}

const segments = [];
for (let from = 0; ; from += 500) {
  const page = await must(db.from('segments').select('id,segment_numero,ref_niv1,ref_niv2,ref_niv3,segment_texte,texte_original')
    .eq('id_oeuvre', OEUVRE).order('segment_numero').range(from, from + 499), `segments:${from}`);
  segments.push(...page);
  if (page.length < 500) break;
}
const segById = new Map(segments.map((segment) => [segment.id, segment]));
const segByNumber = new Map(segments.map((segment) => [segment.segment_numero, segment]));
const links = [];
for (let offset = 0; offset < segments.length; offset += 100) {
  links.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(offset, offset + 100).map((segment) => segment.id)).order('id'), `links:${offset}`));
}
links.sort((a, b) => a.id - b.id);
const before = snapshot('live-before', { segments: segments.length, links });

const t2Segments = new Set([11755, 11757, 11759, 11761, 11762, 11764, 11771, 11797, 11798, 11799,
  11801, 11811, 11812, 11814, 11815, 11816, 11817, 11818, 11819]);
const t3Segments = new Set([11767, 11768, 11769, 11772, 11776, 11777, 11778, 11779, 11781, 11782,
  11787, 11788, 11790, 11803, 11822, 11823, 11827, 11830, 11832]);
const q105Reasons = new Map([
  [11755, 'Reprise de la règle jubilaire selon laquelle le fonds aliéné revient à son détenteur initial.'],
  [11757, 'Reprise de la procédure du dépôt disparu, réglé par le serment du dépositaire.'],
  [11759, 'Reprise de la règle qui renvoie les causes difficiles au siège judiciaire central.'],
  [11761, 'Reprise narrative de la peine attachée à une transgression déterminée de la Loi.'],
  [11762, 'Reprise de la mise sous garde du transgresseur du sabbat.'],
  [11764, 'Reprise du précepte qui punit de mort l’homicide.'],
  [11767, 'Explication de l’organisation judiciaire, de l’impartialité des juges et de la preuve par témoins.'],
  [11768, 'Explication de la dévolution des héritages et de leur maintien dans chaque tribu.'],
  [11769, 'Explication des prescriptions qui organisent l’usage commun des biens et la part laissée aux pauvres.'],
  [11771, 'Reprise de l’exhortation apostolique faite aux riches de donner avec libéralité.'],
  [11772, 'Explication d’ensemble de Nombres 36 sur l’héritage des filles et le maintien des lots tribaux.'],
  [11776, 'Explication des prescriptions sur le prêt, le gage, la remise des dettes et l’assistance au pauvre.'],
  [11777, 'Explication de la responsabilité de l’emprunteur selon les circonstances de la perte de l’animal.'],
  [11778, 'Explication de la responsabilité du dépositaire selon que la perte était évitable ou non.'],
  [11779, 'Explication du paiement quotidien du journalier par son besoin immédiat de subsistance.'],
  [11781, 'Explication du contrôle et de la sanction des faux témoins.'],
  [11782, 'Explication de la règle des deux ou trois témoins.'],
  [11787, 'Explication des restitutions doubles, quadruples ou quintuples selon les circonstances du vol.'],
  [11788, 'Explication des peines du fils rebelle et du transgresseur du sabbat.'],
  [11790, 'Explication de la vente du voleur insolvable et de la fonction pénale de l’esclavage.'],
  [11797, 'Reprise de l’autorisation légale d’exiger un intérêt de l’étranger.'],
  [11798, 'Reprise des prescriptions de guerre sur les habitants et les arbres fruitiers.'],
  [11799, 'Reprise de la dispense militaire accordée à certains hommes avant le combat.'],
  [11801, 'Reprise de la dispense militaire accordée à celui dont le cœur défaille.'],
  [11803, 'Explication des prescriptions qui ordonnent la guerre juste, depuis l’offre de paix jusqu’à la modération dans la victoire.'],
  [11811, 'Reprise de la libération du serviteur hébreu à la septième année.'],
  [11812, 'Reprise de l’obligation de ramener à son propriétaire un animal égaré.'],
  [11814, 'Reprise de la règle concernant la fille vendue comme servante.'],
  [11815, 'Reprise de la procédure appliquée au fils indocile et rebelle.'],
  [11816, 'Reprise des lois sur les unions étrangères, leur rupture et le mariage d’une captive.'],
  [11817, 'Reprise de la prescription du lévirat.'],
  [11818, 'Reprise de la procédure de répudiation et de l’interdiction de reprendre la première épouse.'],
  [11819, 'Reprise de l’institution du sacrifice de jalousie.'],
  [11822, 'Explication des prescriptions qui modèrent le travail, le châtiment et la libération des esclaves.'],
  [11823, 'Explication des finalités des lois matrimoniales et domestiques.'],
  [11827, 'Explication des sanctions prévues pour les sévices infligés aux hommes libres et aux esclaves.'],
  [11830, 'Interprétation des rites imposés à la captive comme renoncement définitif à l’idolâtrie.'],
  [11832, 'Interprétation de la permission mosaïque de répudier comme concession à la dureté des cœurs.'],
]);

const q105T4 = links.filter((link) => link.type === 4 && segById.get(link.segment_id)?.ref_niv1 === 'Prima Secundae'
  && segById.get(link.segment_id)?.ref_niv2 === 'Question 105');
if (q105T4.length !== 76) throw new Error(`Q105 T4 inattendus: ${q105T4.length}/76`);
const q105Patches = q105T4.filter((link) => segById.get(link.segment_id).segment_numero !== 11805).map((link) => {
  const number = segById.get(link.segment_id).segment_numero;
  const type = t2Segments.has(number) ? 2 : t3Segments.has(number) ? 3 : null;
  if (!type || !q105Reasons.has(number)) throw new Error(`T4 Q105 non arbitré: ${link.id} segment ${number}`);
  const moved = number === 11799;
  const retargeted = number === 11755;
  return {
    id: link.id,
    expected_segment_id: link.segment_id,
    segment_id: moved ? segByNumber.get(11800).id : link.segment_id,
    expected_target: targetKey(link),
    canon_id: retargeted ? 'LEV.25.28' : link.canon_id,
    verset_v2_id: null,
    livre: retargeted ? null : link.livre,
    chapitre: retargeted ? null : link.chapitre,
    type,
    motif: `${q105Reasons.get(number)} Cible : ${retargeted ? 'LEV.25.28' : link.canon_id ?? `${link.livre}.${link.chapitre}`}.`,
  };
});
if (q105Patches.length !== 75) throw new Error(`Patches Q105 inattendus: ${q105Patches.length}/75`);

const findUnique = (number, type, canonId) => {
  const segment = segByNumber.get(number);
  const found = links.filter((link) => link.segment_id === segment.id && link.type === type && link.canon_id === canonId);
  if (found.length !== 1) throw new Error(`Lien unique absent: #${number} T${type} ${canonId} (${found.length})`);
  return found[0];
};
const isolatedPatches = [
  { ...findUnique(21271, 1, 'MAT.15.14'), type: 2,
    motif: 'Thomas reprend dans sa propre phrase l’ordre de laisser les pharisiens aveugles et applique cette conduite au scandale pharisaïque.' },
  { ...findUnique(23264, 2, 'GEN.17.10'), type: 4,
    motif: 'Rappel historique de l’alliance d’Abraham comme commencement de la circoncision, sans reprise verbale distinctive du verset.' },
].map((link) => ({ id: link.id, expected_segment_id: link.segment_id, expected_target: targetKey(link),
  segment_id: link.segment_id, canon_id: link.canon_id, verset_v2_id: link.verset_v2_id,
  livre: link.livre, chapitre: link.chapitre, type: link.type, motif: link.motif }));

const additions = [];
const add = (number, canon_id, type, motif, extra = {}) => {
  const segment = segByNumber.get(number);
  if (!segment) throw new Error(`Segment absent: ${number}`);
  additions.push({ segment_id: segment.id, segment_numero: number, canon_id: canon_id ?? null,
    verset_v2_id: extra.verset_v2_id ?? null, livre: extra.livre ?? null, chapitre: extra.chapitre ?? null,
    type, fiabilite: extra.fiabilite ?? 'probable', motif, provenance: 'lecture',
    arbitrage_requis: extra.arbitrage_requis ?? false });
};

// Oublis certains révélés par les références conservées dans le texte original.
add(76, 'HEB.10.1', 2, 'Reprise de la Loi ancienne comme figure ou ombre de la Loi nouvelle et des biens à venir ; le contenu résout en Hébreux 10,1 la référence imprimée décalée.');
add(9455, 'SIR.44.20', 2, 'Reprise liturgique développée de l’éloge de celui qui a gardé la loi du Très-Haut.');
add(12980, '1KI.5.20', 2, 'Reprise narrative de la demande adressée par Salomon à Hiram pour obtenir des ouvriers sachant travailler le bois.');
add(16741, '1TI.2.1', 4, 'Renvoi d’autorité à l’énumération paulinienne des prières, supplications, intercessions et actions de grâce.');
add(18358, 'EXO.20.3', 4, 'Renvoi d’autorité au premier commandement : ne pas avoir d’autres dieux.');
add(18370, 'EXO.20.7', 4, 'Renvoi d’autorité au commandement de ne pas prendre le nom de Dieu en vain.');
add(18370, 'DEU.5.11', 4, 'Renvoi parallèle d’autorité au commandement de ne pas prendre le nom de Dieu en vain.');
add(18381, 'EXO.20.8', 4, 'Renvoi d’autorité au commandement de sanctifier le sabbat.');
add(18399, 'EXO.20.12', 4, 'Renvoi d’autorité au commandement d’honorer son père et sa mère.');
add(18411, 'EXO.20.13', 4, 'Renvoi d’autorité au commandement de ne pas tuer.');
add(18681, '2MA.14.18', 1, 'Citation explicite de la valeur et de la grandeur d’âme des compagnons de Judas Maccabée.');
add(19253, '2MA.6.28', 1, 'Citation explicite d’Éléazar acceptant une mort honorable pour les lois saintes.');
add(20407, '2KI.3.15', 2, 'Reprise narrative de la harpe jouée devant Élisée avant que l’esprit prophétique ne vienne sur lui.');
add(21189, 'SIR.26.15', 1, 'Citation voulue littérale du texte vulgate sur le prix incomparable d’une âme continente, aligné sémantiquement sur Siracide 26,15.');
add(22346, '1PE.2.22', 1, 'Citation explicite : le Christ n’a pas commis de péché.');
add(16233, 'SIR.4.25', 1, 'Citation explicite : ne pas contredire une parole véridique.');
add(16253, 'SIR.6.1', 1, 'Citation explicite sur le pécheur à la langue double ; la cible sémantique corrige le numéro imprimé 6,2.');
add(16716, 'LUK.6.12', 2, 'Reprise, dans la citation d’Augustin, de Jésus passant la nuit en prière.');
add(30416, 'REV.14.4', 1, 'Citation explicite de ceux qui suivent l’Agneau partout où il va.');
add(30935, '2PE.3.7', 2, 'Reprise de l’annonce du feu réservé pour le jour du jugement.');
add(19252, null, 1, 'Citation manifeste « le vin fait paraître honnête tous les sentiments », attribuable à 3 Esdras, écrit non présent dans l’ossature biblique actuelle.', { fiabilite: 'à constituer', arbitrage_requis: true });
add(21409, null, 1, 'Citation explicite de l’Évangile selon les Hébreux, écrit non canonique absent des corpus bibliques actuels.', { fiabilite: 'à constituer', arbitrage_requis: true });

// Article suivi sur l’ordre et la nature des tentations du Christ (Tertia Pars, Q41, a.4).
const q41 = [
  [23924, 'MAT.4.3', 3, 'Analyse de la tentation de changer les pierres en pains.'],
  [23925, 'MAT.4.5', 3, 'Analyse de la mise du Christ sur le pinacle du Temple.'], [23925, 'MAT.4.6', 3, 'Analyse de l’invitation à se jeter du pinacle.'],
  [23926, 'MAT.4.8', 3, 'Analyse de la tentation sur la montagne et de la présentation des royaumes.'], [23926, 'MAT.4.9', 3, 'Analyse de l’exigence d’adoration jointe à l’offre des royaumes.'],
  [23927, 'MAT.4.3', 3, 'Classement de la première tentation sous la gourmandise.'], [23927, 'MAT.4.6', 3, 'Classement de la deuxième tentation sous la vaine gloire.'], [23927, 'MAT.4.9', 3, 'Classement de la troisième tentation sous la cupidité.'],
  [23928, 'MAT.4.5', 3, 'Comparaison de l’ordre matthéen des tentations.'], [23928, 'MAT.4.8', 3, 'Comparaison de l’ordre matthéen des tentations.'], [23928, 'LUK.4.5', 3, 'Comparaison de l’ordre lucanien des tentations.'], [23928, 'LUK.4.9', 3, 'Comparaison de l’ordre lucanien des tentations.'],
  [23929, 'MAT.4.10', 1, 'Citation explicite de l’ordre « Arrière, Satan ! ».'], [23929, 'MAT.4.10', 3, 'Interprétation de la sévérité de la réponse du Christ.'],
  [23930, 'MAT.4.5', 3, 'Examen réaliste du pinacle du Temple dans le récit de la tentation.'], [23930, 'MAT.4.8', 3, 'Examen réaliste de la montagne et de la vision des royaumes.'],
  [23934, 'MAT.4.3', 3, 'Interprétation de la progression des tentations, depuis le besoin de nourriture.'], [23934, 'MAT.4.6', 3, 'Interprétation de la progression des tentations vers la vaine gloire.'], [23934, 'MAT.4.9', 3, 'Interprétation de la progression des tentations vers la cupidité et l’idolâtrie.'],
  [23935, 'MAT.4.4', 3, 'Le premier refus du Christ est expliqué comme victoire obtenue par un texte de la Loi.'], [23935, 'MAT.4.7', 3, 'Le deuxième refus du Christ est expliqué comme victoire obtenue par un texte de la Loi.'], [23935, 'MAT.4.10', 3, 'Le troisième refus du Christ est expliqué comme victoire obtenue par un texte de la Loi.'],
  [23936, 'MAT.4.3', 3, 'Explication du désordre qu’aurait constitué un miracle accompli pour la seule faim corporelle.'],
  [23938, 'MAT.4.9', 1, 'Citation explicite de la proposition du démon : donner les royaumes en échange d’une prosternation.'], [23938, 'MAT.4.9', 3, 'Interprétation de la troisième tentation comme convoitise jointe à l’idolâtrie.'],
  [23939, 'MAT.4.3', 3, 'Interprétation de la première tentation comme passage de la nourriture à la vanité du miracle.'], [23939, 'MAT.4.6', 3, 'Interprétation de la deuxième tentation comme passage de la gloire à la tentation de Dieu.'],
  [23940, 'LUK.4.13', 1, 'Citation explicite du diable s’éloignant après avoir épuisé toutes les tentations.'], [23940, 'LUK.4.13', 3, 'Interprétation des trois tentations comme contenant toute la matière du péché.'],
  [23941, 'MAT.4.5', 3, 'Comparaison de l’ordre des deuxième et troisième tentations chez Matthieu.'], [23941, 'MAT.4.8', 3, 'Comparaison de l’ordre des deuxième et troisième tentations chez Matthieu.'], [23941, 'LUK.4.5', 3, 'Comparaison de l’ordre des deuxième et troisième tentations chez Luc.'], [23941, 'LUK.4.9', 3, 'Comparaison de l’ordre des deuxième et troisième tentations chez Luc.'],
  [23942, 'MAT.4.6', 1, 'Citation explicite : « Si tu es le Fils de Dieu, jette-toi en bas. »'], [23942, 'MAT.4.6', 3, 'Explication de l’absence de reproche lors de l’offense adressée au Christ.'],
  [23942, 'MAT.4.9', 1, 'Citation explicite de l’offre des royaumes contre l’adoration du démon.'], [23942, 'MAT.4.9', 3, 'Explication de l’indignation du Christ lorsque l’honneur de Dieu est usurpé.'],
  [23942, 'MAT.4.10', 1, 'Citation explicite de la réponse « Arrière, Satan ! ».'], [23942, 'MAT.4.10', 3, 'La réponse du Christ est proposée comme modèle de zèle pour l’honneur de Dieu.'],
  [23943, 'MAT.4.5', 3, 'Interprétation de la mise du Christ sur le pinacle sans être vu de la foule.'],
  [23943, 'MAT.4.8', 1, 'Citation explicite : le démon montre au Christ tous les royaumes du monde avec leur gloire.'], [23943, 'MAT.4.8', 3, 'Interprétation de la manière dont les royaumes furent montrés au Christ.'],
  [23944, 'MAT.4.8', 3, 'Interprétation origénienne des royaumes comme emprise du démon par les divers vices.'],
];
for (const row of q41) add(...row);

const existingKeys = new Set(links.map((link) => `${link.segment_id}|${link.type}|${targetKey(link)}`));
for (const addition of additions) {
  const count = [Boolean(addition.canon_id), Boolean(addition.verset_v2_id), Boolean(addition.livre && addition.chapitre != null)].filter(Boolean).length;
  if (addition.fiabilite === 'à constituer') {
    if (count !== 0 || !addition.arbitrage_requis) throw new Error(`À constituer invalide #${addition.segment_numero}`);
  } else if (count !== 1 || addition.arbitrage_requis) throw new Error(`Cible invalide #${addition.segment_numero}`);
  const key = `${addition.segment_id}|${addition.type}|${targetKey(addition)}`;
  if (existingKeys.has(key)) throw new Error(`Ajout déjà présent: ${key}`);
  existingKeys.add(key);
}
const canonTargets = [...new Set([
  ...q105Patches.map((patch) => patch.canon_id).filter(Boolean),
  ...isolatedPatches.map((patch) => patch.canon_id).filter(Boolean),
  ...additions.map((addition) => addition.canon_id).filter(Boolean),
])];
const witnessed = new Set();
for (let offset = 0; offset < canonTargets.length; offset += 100) {
  const rows = await must(db.from('versets_lecture').select('id_verset').in('id_verset', canonTargets.slice(offset, offset + 100)), `witnesses:${offset}`);
  rows.forEach((row) => witnessed.add(row.id_verset));
}
const missingWitnesses = canonTargets.filter((id) => !witnessed.has(id));
if (missingWitnesses.length) throw new Error(`Témoins absents: ${missingWitnesses.join(', ')}`);

const regularAdditions = additions.filter((addition) => addition.fiabilite === 'probable').length;
const unresolvedAdditions = additions.length - regularAdditions;
const dryResult = {
  ready: true,
  applied: false,
  before,
  links_before: links.length,
  q105_t4_audited: q105T4.length,
  q105_retyped: q105Patches.length,
  q105_true_t4_retained: 1,
  isolated_retypes: isolatedPatches.length,
  additions: additions.length,
  additions_regular: regularAdditions,
  additions_to_constitute: unresolvedAdditions,
  q41_additions: q41.length,
  links_after_expected: links.length + additions.length,
  reliability_updates_expected: links.length,
};
if (!APPLY) {
  writeFileSync(`${ROOT}/SOMME-RANDOM-AUDIT-CORRECTION-DRY-RUN.json`, `${JSON.stringify(dryResult, null, 2)}\n`);
  console.log(JSON.stringify(dryResult, null, 2));
  process.exit(0);
}

const allPatches = [...q105Patches, ...isolatedPatches];
const expectedAfter = links.length + additions.length;
const sql = `set local statement_timeout='120s';
do $audit$ declare n integer; scope_ids bigint[]; begin
  select array_agg(id order by segment_numero) into scope_ids from segments where id_oeuvre=${sqlString(OEUVRE)};
  if coalesce(array_length(scope_ids,1),0)<>32367 then raise exception 'scope segments'; end if;
  perform 1 from liens_bibliques where segment_id=any(scope_ids) for update;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids);
  if n<>${links.length} then raise exception 'préétat liens %/${links.length}',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids)
    and (fiabilite<>'vérifié' or provenance<>'lecture' or arbitrage_requis);
  if n<>0 then raise exception 'préétat métadonnées %',n; end if;

  update liens_bibliques l set segment_id=p.segment_id,canon_id=p.canon_id,verset_v2_id=p.verset_v2_id,
    livre=p.livre,chapitre=p.chapitre,type=p.type,motif=p.motif
  from jsonb_to_recordset(${sqlJson(allPatches)}) p(id bigint,expected_segment_id bigint,expected_target text,
    segment_id bigint,canon_id text,verset_v2_id uuid,livre text,chapitre integer,type integer,motif text)
  where l.id=p.id and l.segment_id=p.expected_segment_id
    and (case when l.canon_id is not null then 'c:'||l.canon_id when l.verset_v2_id is not null then 'v:'||l.verset_v2_id::text
      when l.livre is not null then 'h:'||l.livre||':'||l.chapitre::text else 'vide' end)=p.expected_target;
  get diagnostics n=row_count; if n<>${allPatches.length} then raise exception 'patches %/${allPatches.length}',n; end if;

  insert into liens_bibliques(segment_id,canon_id,verset_v2_id,livre,chapitre,type,fiabilite,motif,provenance,arbitrage_requis)
  select x.segment_id,x.canon_id,x.verset_v2_id,x.livre,x.chapitre,x.type,x.fiabilite,x.motif,x.provenance,x.arbitrage_requis
  from jsonb_to_recordset(${sqlJson(additions)}) x(segment_id bigint,segment_numero integer,canon_id text,verset_v2_id uuid,
    livre text,chapitre integer,type integer,fiabilite text,motif text,provenance text,arbitrage_requis boolean);
  get diagnostics n=row_count; if n<>${additions.length} then raise exception 'insertions %/${additions.length}',n; end if;

  update liens_bibliques set fiabilite='probable' where segment_id=any(scope_ids) and fiabilite='vérifié';
  get diagnostics n=row_count; if n<>${links.length} then raise exception 'fiabilité %/${links.length}',n; end if;

  select count(*) into n from liens_bibliques where segment_id=any(scope_ids);
  if n<>${expectedAfter} then raise exception 'postétat liens %/${expectedAfter}',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and fiabilite='probable' and provenance='lecture' and not arbitrage_requis;
  if n<>${expectedAfter - unresolvedAdditions} then raise exception 'probables %/${expectedAfter - unresolvedAdditions}',n; end if;
  select count(*) into n from liens_bibliques where segment_id=any(scope_ids) and fiabilite='à constituer'
    and provenance='lecture' and arbitrage_requis and canon_id is null and verset_v2_id is null and livre is null and chapitre is null and btrim(motif)<>'';
  if n<>${unresolvedAdditions} then raise exception 'à constituer %/${unresolvedAdditions}',n; end if;
  select count(*) into n from (select segment_id,type,canon_id,verset_v2_id,livre,chapitre,count(*)
    from liens_bibliques where segment_id=any(scope_ids) group by 1,2,3,4,5,6 having count(*)>1) d;
  if n<>0 then raise exception 'doublons %',n; end if;
  select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids)
    and ((l.canon_id is not null)::integer+(l.verset_v2_id is not null)::integer+(l.livre is not null and l.chapitre is not null)::integer)
      <> case when l.fiabilite='à constituer' then 0 else 1 end;
  if n<>0 then raise exception 'cibles invalides %',n; end if;
  select count(*) into n from liens_bibliques l where l.segment_id=any(scope_ids) and l.canon_id is not null
    and not exists(select 1 from versets_lecture v where v.id_verset=l.canon_id);
  if n<>0 then raise exception 'cibles mortes %',n; end if;
  select count(*) into n from liens_bibliques l join segments s on s.id=l.segment_id
    where s.id_oeuvre=${sqlString(OEUVRE)} and s.ref_niv1='Prima Secundae' and s.ref_niv2='Question 105' and l.type=4;
  if n<>1 then raise exception 'T4 Q105 %/1',n; end if;
end $audit$;`;
const { error } = await db.rpc('exec_sql', { sql });
if (error) throw new Error(`Transaction annulée: ${error.message}`);

const afterLinks = [];
for (let offset = 0; offset < segments.length; offset += 100) {
  afterLinks.push(...await must(db.from('liens_bibliques').select('*')
    .in('segment_id', segments.slice(offset, offset + 100).map((segment) => segment.id)).order('id'), `after:${offset}`));
}
afterLinks.sort((a, b) => a.id - b.id);
const after = snapshot('live-after', { segments: segments.length, links: afterLinks });
if (afterLinks.length !== expectedAfter) throw new Error(`Postétat divergent: ${after}`);
console.log(JSON.stringify({ ...dryResult, ready: false, applied: true, after, links_after: afterLinks.length }, null, 2));
