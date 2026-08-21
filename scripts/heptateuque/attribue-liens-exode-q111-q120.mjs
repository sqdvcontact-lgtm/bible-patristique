import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const PREMIER = 1035
const DERNIER = 1070
const NB_SEGMENTS = 36
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. CXI-CXX'
const EMPREINTE_ATTENDUE = '596afadb5d03a9e1422aefb7ff74068b95718140a280ad30193ec8f8d34be272'
const QUESTIONS = [
  'Question CXI', 'Question CXII', 'Question CXIII', 'Question CXIV', 'Question CXV',
  'Question CXVI', 'Question CXVII', 'Question CXVIII', 'Question CXIX', 'Question CXX',
]

const LIENS = []
const add = (segmentNumero, canonId, type, motif) => LIENS.push([segmentNumero, canonId, type, motif])
const both = (segmentNumero, canonId, motif) => {
  add(segmentNumero, canonId, 1, `${motif} — citation ou référence intentionnelle.`)
  add(segmentNumero, canonId, 3, `${motif} — passage commenté ou mobilisé dans le raisonnement.`)
}
const explain = (segmentNumeros, canonId, motif) => {
  for (const segmentNumero of segmentNumeros) add(segmentNumero, canonId, 3, motif)
}

// Question CXI — les huit colonnes/planches au fond du tabernacle.
both(1035, 'EXO.26.25', 'Les huit planches et leurs seize bases sont citées puis expliquées par les six planches et les deux angles')

// Question CXII — le Saint et le Saint des Saints.
both(1036, 'EXO.26.33', 'Le voile séparant le Saint du Saint des Saints est cité comme objet de la question')
for (const canonId of ['HEB.9.1', 'HEB.9.2', 'HEB.9.3', 'HEB.9.6', 'HEB.9.7', 'HEB.9.8', 'HEB.9.9', 'HEB.9.10', 'HEB.9.11', 'HEB.9.12']) {
  add(1036, canonId, 1, 'La note Hébreux 9,1-12 est réduite aux versets effectivement mobilisés pour distinguer les deux parties et les deux alliances.')
}
explain([1037], 'EXO.26.33', 'L’arche placée au-delà du voile dans le Saint des Saints prolonge l’explication du verset directeur.')
both(1037, 'EXO.26.35', 'La table et le chandelier placés en dehors du voile sont intentionnellement rappelés')
explain([1038, 1039], 'EXO.26.33', 'La séparation par le voile reçoit une interprétation figurative des deux Testaments.')

// Question CXIII — l’autel des holocaustes.
both(1040, 'EXO.27.1', 'La hauteur de trois coudées de l’autel en bois est citée puis interrogée')
both(1040, 'EXO.20.26', 'L’interdiction de monter à l’autel par des degrés de peur de découvrir sa nudité est citée')
explain([1041], 'EXO.27.1', 'L’autel de bois est distingué du massif de terre ou de pierre auquel auraient appartenu les degrés.')
explain([1041], 'EXO.20.26', 'La défense des degrés est expliquée comme visant ceux qui auraient fait corps avec l’autel.')
both(1042, 'EXO.27.4', 'La grille d’airain de l’autel est intentionnellement mobilisée dans la difficulté')
both(1042, 'EXO.27.5', 'La grille placée à mi-hauteur de l’autel est intentionnellement mobilisée')
both(1042, 'EXO.27.8', 'La construction creuse de l’autel en planches est intentionnellement mobilisée')
both(1043, 'EXO.27.2', 'Les cornes des quatre coins et leur revêtement d’airain sont cités puis interprétés')

// Question CXIV — l’esprit de sagesse et les vêtements sacerdotaux.
both(1044, 'EXO.28.3', 'Les hommes remplis d’un esprit de sagesse ou de sens sont cités et le terme grec est expliqué')
explain([1045], 'EXO.28.3', 'Le sens intérieur du mot grec est rapporté à l’Esprit-Saint qui remplit les artisans.')
both(1045, 'HEB.5.14', 'La nourriture solide et les sens exercés à discerner le bien du mal sont cités comme parallèle lexical')
both(1046, 'EXO.28.4', 'La nomenclature du pectoral, de l’éphod, de la robe et de la tunique est citée')
explain([1047], 'EXO.28.4', 'La traduction de l’ornement de la tunique par franges ou lierre poursuit l’examen lexical du vêtement.')

// Question CXV — particularités des vêtements sacerdotaux.
both(1048, 'EXO.28.4', 'Le terme aspidiscas appliqué aux ornements sacerdotaux est examiné à partir du lemme biblique')
both(1049, 'EXO.28.22', 'Le terme latin murænulas désignant les chaînettes sert de parallèle lexical intentionnel')
both(1049, 'EXO.28.16', 'La longueur et la largeur d’un empan du rational sont citées ; la note imprimée Exode 38,16 est une référence fautive')
both(1050, 'EXO.28.9', 'Les deux pierres d’onyx gravées des noms des enfants d’Israël sont citées')
both(1050, 'EXO.28.10', 'Les six noms sur chaque pierre selon l’ordre des naissances sont cités')
explain([1051], 'EXO.28.10', 'L’ordre des noms est explicitement interrogé comme ordre de naissance des enfants d’Israël.')

// Question CXVI — le rational.
both(1052, 'EXO.28.22', 'Les chaînettes d’or pur du rational sont citées et le nom grec du vêtement est expliqué')
both(1053, 'PSA.11.7', 'Les paroles chastes du Seigneur sont citées pour illustrer le grec logia ; la numérotation ancienne est conservée par la cible')
both(1054, 'EXO.28.15', 'La composition d’or, de pourpre, d’écarlate et de fin lin retors du rational est intentionnellement rappelée')
both(1054, 'EXO.28.16', 'La forme carrée et double du rational est intentionnellement rappelée')
explain([1054], 'EXO.28.22', 'L’analyse du nom grec logion se poursuit pour le vêtement sacerdotal désigné dans le lemme.')

// Question CXVII — l’Ourim et le Thummim.
both(1055, 'EXO.28.30', 'La Doctrine et la Vérité placées sur le rational du jugement sont citées puis interrogées')
explain([1056, 1057], 'EXO.28.30', 'L’Ourim et le Thummim sont expliqués comme moyen de manifester le jugement divin ou comme inscription sur le rational.')

// Question CXVIII — la tunique de l’éphod.
both(1058, 'EXO.28.31', 'La robe de l’éphod entièrement couleur d’hyacinthe est citée')
both(1058, 'EXO.28.32', 'L’ouverture centrale destinée au passage de la tête est citée et expliquée lexicalement')
both(1059, 'EXO.28.32', 'Le rebord tissé tout autour de l’ouverture afin qu’elle ne se déchire pas est cité puis expliqué')
explain([1060], 'EXO.28.32', 'Le rebord entrant dans la trame de la tunique conclut l’explication de la prescription.')

// Question CXIX — les sonnettes du vêtement sacerdotal.
both(1061, 'EXO.28.35', 'Le son entendu à l’entrée et à la sortie d’Aaron afin qu’il ne meure pas est cité')
explain([1062, 1063], 'EXO.28.35', 'Le retentissement des sonnettes et les termes entrée, sortie et voix sont expliqués littéralement et symboliquement.')
both(1062, 'TIT.2.7', 'L’exhortation à se montrer un modèle de bonnes œuvres est citée pour expliquer les sonnettes')
both(1062, '2TI.2.2', 'Les enseignements confiés à des hommes capables d’en instruire d’autres sont cités')

// Question CXX — la lame d’or de la tiare.
both(1064, 'EXO.28.36', 'La lame d’or portant l’inscription Sainteté du Seigneur est citée')
both(1064, 'EXO.28.38', 'La lame sur le front d’Aaron et l’expiation des fautes attachées aux choses saintes sont citées')
explain([1065, 1066], 'EXO.28.36', 'L’inscription Sainteté du Seigneur est expliquée comme un titre gravé en lettres sur l’or.')
explain([1067, 1068], 'EXO.28.38', 'Les fautes portées par le prêtre sont expliquées à partir des offrandes saintes présentées pour les péchés.')
both(1069, 'EXO.28.38', 'La lame sur le front d’Aaron afin de rendre le peuple favorable devant le Seigneur est citée puis interprétée')
explain([1070], 'EXO.28.38', 'Le prêtre qui porte les fautes d’autrui reçoit une interprétation christologique.')
add(1070, 'HEB.7.27', 2, 'Le prêtre qui n’a pas besoin d’offrir de sacrifice pour ses propres péchés reprend étroitement Hébreux 7,27 sans attribution explicite.')

const NON_RESOLUS = [
  [1056, 4, 'RÉFÉRENCE NON BIBLIQUE (commentateurs non identifiés) : opinion selon laquelle l’Ourim et le Thummim auraient été une pierre changeant de couleur ; cible de corpus à constituer.'],
  [1065, 4, 'RÉFÉRENCE NON BIBLIQUE (interprètes non identifiés) : identification de l’inscription à quatre lettres hébraïques formant le tétragramme ; cible de corpus à constituer.'],
]
const SANS_LIEN = new Set()

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
)) throw new Error('Préétat structurel invalide')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) {
  throw new Error('Questions incomplètes ou désordonnées')
}
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Lot déjà relu')

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map((segment) => [
    segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
    segment.ref_niv2_texte, segment.segment_texte, segment.notes,
  ])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) {
  throw new Error('Déclaration SANS_LIEN invalide')
}
if (LIENS.some(([segmentNumero, canonId, type, motif]) =>
  !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim()
)) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([segmentNumero, type, motif]) =>
  !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE')
)) throw new Error('Référence sans cible invalide')

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
const types = [...LIENS, ...NON_RESOLUS].reduce((compte, ligne) => {
  const type = ligne[2] && ligne.length === 4 ? ligne[2] : ligne[1]
  compte[type] = (compte[type] ?? 0) + 1
  return compte
}, {})
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))

console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Exode CXI-CXX',
  ref_niv1: REF_NIV1,
  bornes: [PREMIER, DERNIER],
  segments: segments.length,
  liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length,
  total_liens: TOTAL,
  sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length,
  types,
  liens_par_question: liensParQuestion,
  empreinte,
  avancement_actuel: '967 / 3262 = 29,64 %',
  avancement_potentiel_apres_ecriture: '1003 / 3262 = 30,75 %',
}, null, 2))

if (DETAIL) {
  for (const [segmentNumero, canonId, type, motif] of LIENS) {
    const temoin = temoinsParId.get(canonId)
    console.log({ segmentNumero, canonId, type, motif, segment: parNumero.get(segmentNumero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 })
  }
  for (const [segmentNumero, type, motif] of NON_RESOLUS) console.log({ segmentNumero, canonId: null, type, motif, fiabilite: 'à constituer' })
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
    segment_id, canon_id, type, fiabilite, motif, provenance, arbitrage_requis
  ) values
    ${valeurs};

  get diagnostics n = row_count;
  if n <> ${TOTAL} then
    raise exception 'Liens insérés : %', n;
  end if;

  update segments
  set liens_revus_le = now(), liens_revus_par = ${quote(RELECTEUR)}
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
  sb.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (liensApresError || relusApresError || auditError) throw liensApresError || relusApresError || auditError
if (
  liensApres !== TOTAL ||
  relusApres !== NB_SEGMENTS ||
  audit.some((lien) =>
    !lien.motif || lien.provenance !== 'lecture' ||
    (lien.canon_id
      ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis)
      : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))
  )
) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
