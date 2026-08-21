import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const PREMIER = 801
const DERNIER = 852
const NB_SEGMENTS = 52
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. LXI-LXX'
const EMPREINTE_ATTENDUE = 'bf8c8d5a3e833db16037cbb99b8daea790682d285cb4a979c8b286c9877d44af'
const QUESTIONS = [
  'Question LXI', 'Question LXII', 'Question LXIII', 'Question LXIV', 'Question LXV',
  'Question LXVI', 'Question LXVII', 'Question LXVIII', 'Question LXIX', 'Question LXX',
]
const SANS_LIEN = new Set()
const NON_RESOLUS = [
  [826, 4, 'RÉFÉRENCE NON BIBLIQUE — renvoi interne à la Question LXI de la présente œuvre sur la manne placée devant Dieu.'],
  [852, 4, 'RÉFÉRENCE NON BIBLIQUE — renvoi interne à la Question XXV de la présente œuvre sur le doigt de Dieu et le Saint-Esprit.'],
]
const LIENS = []

const add = (segmentNumero, canonId, type, motif) => {
  LIENS.push([segmentNumero, canonId, type, motif])
}
const many = (segmentNumero, canonIds, types, motif) => {
  for (const canonId of canonIds) {
    for (const type of types) {
      add(segmentNumero, canonId, type, `${motif} (${canonId}).`)
    }
  }
}

// Question LXI — vase de manne placé devant Dieu.
many(801, ['EXO.16.33'], [1, 3], 'La prescription du vase de manne conservé devant Dieu est citée puis interrogée')
many(802, ['EXO.16.33'], [1, 3], 'Le futur « tu placeras » et le sens de « devant Dieu » sont cités puis expliqués')
many(803, ['EXO.16.33'], [3], 'La prescription est comprise comme une anticipation de la construction du tabernacle')
many(803, ['EXO.16.34'], [1, 3], 'Aaron déposant le vase devant le témoignage est cité comme preuve de l’anticipation')

// Question LXII — durée de la manne et désir de viande.
many(804, ['EXO.16.35'], [1, 3], 'Les quarante années de manne jusqu’à la terre habitée sont citées comme objet de la question')
many(805, ['EXO.16.35'], [1, 3], 'La formule « jusqu’à la terre habitée » est citée et expliquée comme anticipation narrative')
many(806, ['EXO.16.35'], [3], 'La borne donnée par l’Exode est précisée par la cessation effective de la manne')
many(806, ['JOS.5.11', 'JOS.5.12'], [1, 3], 'Les pains du pays et la cessation de la manne après le Jourdain sont intentionnellement rappelés')
many(807, ['EXO.16.35'], [3], 'La terre habitable est distinguée du moment exact où la manne cessa')
many(807, ['JOS.5.12'], [1, 3], 'La cessation de la manne après le passage du Jourdain est invoquée comme donnée décisive')
many(808, ['EXO.16.3', 'EXO.12.38'], [1, 3], 'Le désir de viande dans le désert est confronté aux troupeaux emmenés hors d’Égypte')
many(809, ['EXO.16.3', 'EXO.12.38'], [3], 'La conservation des troupeaux pour leur fécondité et les sacrifices est proposée comme solution')
many(810, ['EXO.16.3', 'EXO.12.38'], [3], 'La recherche d’une autre explication prolonge la difficulté des viandes malgré les troupeaux')
many(811, ['EXO.16.3'], [3], 'Le désir de viande est interprété comme visant une chair absente des troupeaux')
many(811, ['EXO.16.13'], [1, 3], 'L’envoi des oiseaux traduits comme râles ou cailles est intentionnellement rappelé et expliqué')
many(812, ['EXO.16.3'], [1, 3], 'L’indétermination scripturaire de la sorte de viande désirée est explicitement relevée')
many(812, ['EXO.16.13'], [3], 'Le don divin des oiseaux est compris comme une réponse adaptée au désir du peuple')

// Question LXIII — « Phénicie » dans la variante d’Exode 16,35.
many(813, ['EXO.16.35'], [1, 3], 'La variante des confins de la Phénicie est citée et rapprochée de la terre habitée')
for (const segmentNumero of [814, 815]) {
  many(segmentNumero, ['EXO.16.35'], [3], 'Le nom ancien de Phénicie et son éventuelle étymologie par les palmiers sont examinés')
}
many(816, ['EXO.16.35'], [3], 'La limite de la région habitée est recherchée à partir du parcours dans le désert')
many(816, ['EXO.15.27', 'EXO.16.1'], [1, 3], 'Les douze sources et soixante-dix palmiers d’Élim puis le départ vers le désert de Sin sont rappelés')
many(817, ['EXO.16.35'], [3], 'Le changement historique des noms de pays soutient l’identification de la Phénicie')

// Question LXIV — la verge ayant frappé le fleuve.
many(818, ['EXO.17.5', 'EXO.7.20'], [1, 3], 'La verge attribuée à Moïse est confrontée au récit où Aaron frappe effectivement le fleuve')
many(819, ['EXO.17.5', 'EXO.14.16'], [1, 3], 'La verge du fleuve est citée et comparée à la verge par laquelle Moïse divise la mer')
many(820, ['EXO.17.5', 'EXO.7.19', 'EXO.7.20'], [3], 'L’action d’Aaron est attribuée à Moïse parce que celui-ci transmet l’ordre divin')
many(821, ['EXO.17.5'], [3], 'La supériorité de commandement de Moïse résout l’attribution de l’action')
many(821, ['EXO.4.16'], [1, 3], 'Aaron bouche de Moïse auprès du peuple est cité comme preuve du rapport entre ordre et exécution')

// Question LXV — les différents possesseurs de la verge.
many(822, ['EXO.17.9'], [1, 3], 'Moïse tenant la verge de Dieu au sommet de la colline est cité puis interrogé')
many(823, ['EXO.17.9'], [3], 'Le nom de verge de Dieu est expliqué par la participation de ses serviteurs')
many(823, ['EXO.7.9', 'EXO.4.17', 'EXO.4.20'], [1, 3], 'Les désignations successives verge d’Aaron, de Moïse et de Dieu sont intentionnellement comparées')
many(823, ['LUK.1.17'], [1, 3], 'L’esprit et la puissance d’Élie servent de parallèle explicite à l’attribution de la verge')
many(824, ['EXO.17.9'], [3], 'La verge de Dieu est éclairée par l’analogie d’un don divin reçu par l’homme')
many(824, ['ROM.10.3', '1CO.4.7'], [1, 3], 'La justice reçue de Dieu et la question « qu’as-tu que tu n’aies reçu » sont citées et appliquées')

// Question LXVI — repas « devant Dieu ».
many(825, ['EXO.18.12'], [1, 3], 'Le repas de Jéthro, Aaron et des anciens devant Dieu est cité et son expression est analysée')
many(826, ['EXO.18.12'], [3], 'L’absence encore du tabernacle empêche une interprétation purement locale de « devant Dieu »')
many(826, ['EXO.16.33'], [1, 3], 'Le vase de manne est intentionnellement rappelé comme cas différent expliqué à la Question LXI')
many(827, ['EXO.18.12'], [3], 'Ce qui est fait pour la gloire de Dieu est proposé comme sens de l’expression « devant Dieu »')

// Question LXVII — loi éternelle avant sa mise par écrit.
many(828, ['EXO.18.15', 'EXO.18.16'], [1, 3], 'Moïse consultant Dieu et enseignant ses ordonnances avant la Loi écrite est cité puis interrogé')
for (const segmentNumero of [829, 830, 831]) {
  many(segmentNumero, ['EXO.18.15', 'EXO.18.16'], [3], 'La loi éternelle consultée dans l’immuable vérité explique les jugements de Moïse avant le Sinaï')
}

// Question LXVIII — conseil de Jéthro et pluralité des tâches.
many(832, ['EXO.18.18', 'EXO.18.19'], [1, 3], 'Le conseil d’éviter l’épuisement de Moïse et du peuple est référencé et interrogé')
many(833, ['EXO.18.18', 'EXO.18.19'], [3], 'L’accueil d’un bon conseil étranger et le risque d’orgueil sont tirés de l’avis de Jéthro')
many(833, ['EXO.18.21'], [1, 3], 'Le choix de juges ennemis du vice est intentionnellement invoqué comme indice contre l’orgueil')
many(834, ['EXO.18.18', 'EXO.18.19'], [3], 'La délégation conseillée à Moïse est rapprochée du danger de la multiplicité des actions')
many(834, ['EXO.18.21', 'SIR.11.10'], [1, 3], 'Le choix des juges et l’avertissement de ne pas multiplier les actions sont cités et appliqués')
many(835, ['EXO.18.19'], [1, 3], 'La promesse que Dieu sera avec Moïse s’il écoute le conseil est citée et mise en relief')
many(836, ['EXO.18.18', 'EXO.18.19'], [3], 'Le conseil est interprété comme libération de l’esprit pour les réalités divines')

// Question LXIX — répartition des causes et qualité religieuse de Jéthro.
many(837, ['EXO.18.19', 'EXO.18.20'], [1, 3], 'La mission collective de Moïse devant Dieu et l’enseignement des voies sont cités puis expliqués')
many(838, ['EXO.18.19', 'EXO.18.20'], [1, 3], 'Les pluriels « leurs paroles » et « le peuple » sont cités comme preuve du sens collectif')
many(839, ['EXO.18.21'], [1, 3], 'La sélection des chefs de mille, cent, cinquante et dix est citée et décrite')
many(840, ['EXO.18.21', 'EXO.18.25'], [3], 'La hiérarchie proposée puis établie est analysée comme un allègement gradué des causes')
many(841, ['EXO.18.24'], [1, 3], 'L’acceptation du conseil par Moïse est intentionnellement rappelée comme exemple d’humilité')
many(842, ['EXO.18.10', 'EXO.18.11', 'EXO.18.12'], [3], 'La bénédiction, la confession et le sacrifice de Jéthro fondent la question de sa foi au vrai Dieu')
many(842, ['JOB.1.1'], [1, 4], 'Job, étranger craignant Dieu, est explicitement rapproché de Jéthro')
many(843, ['EXO.18.7', 'EXO.18.12'], [1, 3], 'La prosternation de Moïse et le sacrifice de Jéthro sont distingués pour résoudre l’ambiguïté')
many(843, ['GEN.23.7'], [1, 3], 'La prosternation d’Abraham devant les fils de Heth est citée comme parallèle de respect humain')
many(844, ['EXO.18.25'], [1, 3], 'Le terme grec désignant des introducteurs aux lettres dans la variante septantante est cité et interrogé')
many(845, ['EXO.18.25'], [3], 'L’étymologie du terme grec sert à inférer une culture écrite antérieure à la Loi')
many(846, ['EXO.18.25'], [3], 'Les hypothèses sur l’ancienneté des lettres prolongent l’explication du terme septantiste')

// Question LXX — cinquante jours entre la Pâque et la Loi, puis la Pentecôte.
many(847, ['EXO.19.1'], [1, 3], 'Le troisième jour du troisième mois est cité comme point final du calcul des cinquante jours')
many(847, ['EXO.19.2', 'EXO.19.3'], [1], 'L’arrivée au Sinaï et la montée de Moïse sont citées dans le lemme introductif')
many(848, ['EXO.19.10', 'EXO.19.11'], [1, 3], 'La purification de deux jours et la descente divine au troisième sont citées pour dater la Loi')
many(849, ['EXO.19.1', 'EXO.19.10', 'EXO.19.11'], [3], 'La chronologie du troisième mois est reliée au jour de la promulgation de la Loi')
many(849, ['EXO.20.1', 'EXO.31.18'], [1, 3], 'La promulgation des paroles et les tables de pierre écrites du doigt de Dieu sont intentionnellement invoquées')
many(850, ['EXO.12.6', 'EXO.12.8'], [1, 3], 'Le quatorzième jour, l’immolation et la manducation de l’agneau pascal fournissent le départ du calcul')
many(850, ['EXO.19.1', 'EXO.19.10', 'EXO.19.11'], [3], 'Les jours du troisième mois achèvent le calcul jusqu’à la manifestation au Sinaï')
many(851, ['EXO.19.1', 'EXO.19.10', 'EXO.19.11', 'EXO.31.18'], [3], 'Les cinquante jours jusqu’à la Loi écrite du doigt de Dieu reçoivent une interprétation typologique')
many(851, ['ACT.2.1', 'ACT.2.2', 'ACT.2.4'], [1, 4], 'La Pentecôte, le signe venu du ciel et la venue du Saint-Esprit sont cités et rapprochés du Sinaï')
many(851, ['1CO.5.7', '1PE.1.19'], [2], 'Le Christ immolé comme Pâque et agneau immaculé est repris sans attribution explicite')
many(852, ['EXO.31.18'], [3], 'Le doigt de Dieu écrivant les tables est interprété comme désignation du Saint-Esprit')
many(852, ['LUK.11.20', 'MAT.12.28'], [1, 3], 'Le parallèle évangélique entre doigt de Dieu et Esprit de Dieu est intentionnellement invoqué et expliqué')

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error } = await sb
  .from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE)
  .eq('ref_niv1', REF_NIV1)
  .in('ref_niv2', QUESTIONS)
  .order('segment_numero')
if (error) throw error

if (segments.length !== NB_SEGMENTS || segments[0]?.segment_numero !== PREMIER || segments.at(-1)?.segment_numero !== DERNIER) {
  throw new Error('Préétat : lot inattendu')
}
if (segments.some((segment, index) =>
  segment.segment_numero !== PREMIER + index ||
  segment.ref_niv1 !== REF_NIV1 ||
  !QUESTIONS.includes(segment.ref_niv2)
)) {
  throw new Error('Préétat structurel invalide')
}
const questionsLive = new Set(segments.map((segment) => segment.ref_niv2))
if (questionsLive.size !== QUESTIONS.length || QUESTIONS.some((question) => !questionsLive.has(question))) {
  throw new Error('Questions incomplètes ou libellés modifiés')
}
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) {
  throw new Error('Lot déjà relu')
}

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map((segment) => [
    segment.id,
    segment.segment_numero,
    segment.ref_niv1,
    segment.ref_niv2,
    segment.ref_niv2_texte,
    segment.segment_texte,
    segment.notes,
  ])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) =>
  !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero)
)
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) {
  throw new Error('Déclaration SANS_LIEN invalide')
}
if (LIENS.some(([segmentNumero, canonId, type, motif]) =>
  !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim()
)) {
  throw new Error('Manifeste biblique invalide')
}
if (NON_RESOLUS.some(([segmentNumero, type, motif]) =>
  !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE')
)) {
  throw new Error('Référence sans cible invalide')
}

const cles = LIENS.map(([segmentNumero, canonId, type]) => `${segmentNumero}|${canonId}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne')

const cibles = [...new Set(LIENS.map(([, canonId]) => canonId))]
const { data: temoins, error: temoinsError } = await sb
  .from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"')
  .in('id_verset', cibles)
if (temoinsError) throw temoinsError
const temoinsParId = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const ciblesInvalides = cibles.filter((canonId) => {
  const temoin = temoinsParId.get(canonId)
  return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004)
})
if (ciblesInvalides.length) throw new Error(`Cibles invalides : ${ciblesInvalides.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { count: liensExistants, error: liensError } = await sb
  .from('liens_bibliques')
  .select('id', { count: 'exact', head: true })
  .in('segment_id', ids)
if (liensError) throw liensError
if (liensExistants) throw new Error(`${liensExistants} liens existent déjà dans le lot`)

const TOTAL = LIENS.length + NON_RESOLUS.length
const types = LIENS.reduce((compte, [, , type]) => {
  compte[type] = (compte[type] ?? 0) + 1
  return compte
}, {})
for (const [, type] of NON_RESOLUS) types[type] = (types[type] ?? 0) + 1
const segmentsParQuestion = Object.fromEntries(QUESTIONS.map((question) => [
  question,
  segments.filter((segment) => segment.ref_niv2 === question).length,
]))
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(
    segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero),
  )
  return [question, [
    ...LIENS.filter(([segmentNumero]) => numeros.has(segmentNumero)),
    ...NON_RESOLUS.filter(([segmentNumero]) => numeros.has(segmentNumero)),
  ].length]
}))

console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Exode LXI-LXX',
  ref_niv1: REF_NIV1,
  bornes: [PREMIER, DERNIER],
  segments: segments.length,
  liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length,
  total_liens: TOTAL,
  sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length,
  types,
  segments_par_question: segmentsParQuestion,
  liens_par_question: liensParQuestion,
  empreinte,
  avancement_actuel: '705 / 3262 = 21,61 %',
}, null, 2))

if (DETAIL) {
  for (const [segmentNumero, canonId, type, motif] of LIENS) {
    const temoin = temoinsParId.get(canonId)
    console.log({
      segmentNumero,
      canonId,
      type,
      motif,
      segment: parNumero.get(segmentNumero).segment_texte,
      temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004,
    })
  }
  for (const [segmentNumero, type, motif] of NON_RESOLUS) {
    console.log({ segmentNumero, canonId: null, type, motif, fiabilite: 'à constituer' })
  }
}
if (!WRITE) process.exit(0)

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = [
  ...LIENS.map(([segmentNumero, canonId, type, motif]) =>
    `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`
  ),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) =>
    `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`
  ),
].join(',\n    ')
const idSql = ids.join(', ')

const sql = `
do $p$
declare
  n integer;
begin
  if exists (
    select 1
    from liens_bibliques
    where segment_id in (${idSql})
  ) then
    raise exception 'Liens présents';
  end if;

  if exists (
    select 1
    from segments
    where id in (${idSql})
      and (liens_revus_le is not null or liens_revus_par is not null)
  ) then
    raise exception 'Déjà relu';
  end if;

  insert into liens_bibliques (
    segment_id,
    canon_id,
    type,
    fiabilite,
    motif,
    provenance,
    arbitrage_requis
  ) values
    ${valeurs};

  get diagnostics n = row_count;
  if n <> ${TOTAL} then
    raise exception 'Liens insérés : %', n;
  end if;

  update segments
  set
    liens_revus_le = now(),
    liens_revus_par = ${quote(RELECTEUR)}
  where id in (${idSql});

  get diagnostics n = row_count;
  if n <> ${NB_SEGMENTS} then
    raise exception 'Segments relus : %', n;
  end if;
end
$p$;
`

const { error: writeError } = await sb.rpc('exec_sql', { sql })
if (writeError) throw writeError

const [
  { count: liensApres, error: liensApresError },
  { count: relusApres, error: relusApresError },
  { data: audit, error: auditError },
] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  sb.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  sb.from('liens_bibliques')
    .select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis')
    .in('segment_id', ids),
])
if (liensApresError || relusApresError || auditError) {
  throw liensApresError || relusApresError || auditError
}
if (
  liensApres !== TOTAL ||
  relusApres !== NB_SEGMENTS ||
  audit.some((lien) =>
    !lien.motif ||
    lien.provenance !== 'lecture' ||
    (lien.canon_id
      ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis)
      : (
          lien.fiabilite !== 'à constituer' ||
          !lien.arbitrage_requis ||
          lien.type !== 4 ||
          !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')
        ))
  )
) {
  throw new Error('Postcontrôle invalide')
}
const clesApres = audit.map((lien) =>
  `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`
)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
