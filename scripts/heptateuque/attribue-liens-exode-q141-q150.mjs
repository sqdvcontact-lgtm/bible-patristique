import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const PREMIER = 1138
const DERNIER = 1169
const NB_SEGMENTS = 32
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. CXLI-CL'
const EMPREINTE_ATTENDUE = '65b1a8e3647095be55dd98f28c17cab8896b3ccfbd8f82e6aa1fa2860942cda0'
const QUESTIONS = [
  'Question CXLI', 'Question CXLII', 'Question CXLIII', 'Question CXLIV', 'Question CXLV',
  'Question CXLVI', 'Question CXLVII', 'Question CXLVIII', 'Question CXLIX', 'Question CL',
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

// Question CXLI — le sacrifice des pendants d’oreilles pour le veau d’or.
both(1138, 'EXO.32.2', 'Aaron exige les anneaux d’or des femmes, des fils et des filles avant la fabrication du veau')
explain([1139], 'EXO.32.2', 'La privation volontaire de l’or nécessaire à l’idole est appliquée à l’effort demandé pour la vie éternelle.')

// Question CXLII — les paroles rapportées par Dieu comme expression de la pensée.
both(1140, 'EXO.32.8', 'Dieu rapporte à Moïse que le peuple a attribué au veau sa sortie d’Égypte')
explain([1141], 'EXO.32.8', 'Les paroles rapportées sont expliquées comme le sentiment intérieur du peuple connu de Dieu.')

// Question CXLIII — le mal de peine envoyé par le Dieu juste.
both(1142, 'EXO.32.14', 'Le Seigneur renonce au mal, c’est-à-dire au châtiment, annoncé contre son peuple')
both(1142, 'WIS.3.2', 'La sortie des justes de ce monde considérée comme un mal est citée pour éclairer le terme')
both(1142, 'SIR.11.14', 'Les biens et les maux venant de Dieu sont cités pour distinguer le châtiment de la malice')
explain([1143], 'EXO.32.14', 'Le mal annoncé au peuple est expliqué comme une peine juste et non comme une malice divine.')
explain([1143], 'SIR.11.14', 'Les maux venant de Dieu sont précisés comme les peines justement envoyées aux méchants.')

// Question CXLIV — tables brisées, intercession et destruction du veau.
both(1144, 'EXO.32.16', 'Les tables sont décrites comme l’ouvrage de Dieu portant son écriture')
both(1144, 'EXO.32.19', 'Moïse jette et brise les tables dans sa colère devant le veau')
explain([1145], 'EXO.32.11', 'La prière de Moïse en faveur du peuple est opposée à la sévérité de son geste.')
explain([1145], 'EXO.32.14', 'L’apaisement obtenu par l’intercession de Moïse fonde la comparaison avec sa vengeance contre l’idole.')
add(1145, 'EXO.32.20', 1, 'Le veau brûlé, réduit en poudre, mêlé à l’eau et donné à boire au peuple est intentionnellement rappelé.')

// Question CXLV — l’excuse d’Aaron.
both(1146, 'EXO.32.24', 'Aaron affirme avoir jeté l’or au feu et en avoir vu sortir le veau')
explain([1147], 'EXO.32.24', 'La réponse d’Aaron est examinée pour déterminer si elle constitue un mensonge dicté par la crainte.')

// Question CXLVI — Aaron chargé de la faute du peuple.
both(1148, 'EXO.32.25', 'Aaron est dit avoir ôté tout frein au peuple et l’avoir exposé à la risée de ses ennemis')
explain([1149], 'EXO.32.25', 'La responsabilité d’Aaron est expliquée par son consentement à la demande du peuple.')

// Question CXLVII — prière et dévouement de Moïse.
both(1150, 'EXO.32.31', 'Moïse confesse le grand péché du peuple qui s’est fait des dieux d’or')
both(1150, 'EXO.32.32', 'Moïse demande le pardon ou son propre effacement du livre de Dieu')
explain([1151], 'EXO.32.27', 'L’ordre donné aux Lévites de passer d’une porte à l’autre avec l’épée manifeste la gravité du péché.')
explain([1151], 'EXO.32.28', 'Les morts causées par l’exécution de l’ordre sont désignées comme les flots de sang expiant le péché.')
explain([1151], 'EXO.32.31', 'La confession du grand péché est rapprochée de la sévérité de son expiation.')
explain([1151], 'EXO.32.32', 'L’offre généreuse de Moïse d’être effacé du livre manifeste son amour pour les siens.')

// Question CXLVIII — Aaron épargné malgré sa responsabilité.
both(1152, 'EXO.32.25', 'Aaron est rappelé comme celui qui avait dépouillé ou livré au désordre le peuple')
both(1152, 'EXO.32.27', 'Les Lévites armés passant et repassant d’une porte à l’autre sont intentionnellement rappelés')
both(1152, 'EXO.32.28', 'La mise à mort exécutée par les Lévites fonde la question de l’impunité d’Aaron')
both(1152, 'EXO.32.35', 'Le Seigneur frappant le peuple à cause du veau fait par Aaron est cité comme objet principal de la question')
both(1153, 'EXO.32.35', 'La formule attribuant expressément le veau à Aaron est citée de nouveau et commentée')
add(1153, 'EXO.28.1', 2, 'L’établissement sacerdotal d’Aaron et de ses fils est rappelé sans citation formelle comme un ordre antérieur à la faute.')
explain([1154], 'EXO.32.35', 'L’épargne d’Aaron est interprétée dans une réflexion sur les jugements divins et la conversion.')
both(1154, 'EXO.29.4', 'La purification d’Aaron et de ses fils avant le sacerdoce est intentionnellement rappelée')
both(1154, 'ROM.11.33', 'Les jugements insondables et les voies incompréhensibles de Dieu sont cités en conclusion')

// Question CXLIX — « ton peuple » et « laisse-moi ».
both(1155, 'EXO.33.1', 'Dieu dit à Moïse de partir avec le peuple qu’il a fait monter d’Égypte, formule interprétée comme colère')
both(1155, 'EXO.32.1', 'Le peuple attribuant à Moïse sa sortie d’Égypte est cité comme première expression de sa faute')
both(1155, 'EXO.32.23', 'La même attribution à Moïse est citée dans le récit qu’Aaron fait des paroles du peuple')
both(1156, 'EXO.33.1', 'La formule ton peuple que tu as tiré d’Égypte est reprise comme rappel de la faute')
both(1156, 'EXO.32.7', 'La formule parallèle ton peuple que tu as fait monter d’Égypte est la cible sémantique ; la note imprimée Exode 32,10 est fautive')
both(1157, 'EXO.32.10', 'Laisse-moi et ma colère les consumera est cité pour introduire l’analyse de la médiation de Moïse')
explain([1158, 1159, 1160, 1161, 1162], 'EXO.32.10', 'Le commandement apparent « laisse-moi » est expliqué comme révélation de la puissance médiatrice de l’amour de Moïse.')

// Question CL — Dieu n’accompagne pas le peuple et envoie son Ange.
both(1163, 'EXO.33.1', 'Le départ de Moïse et du peuple vers la terre promise à Abraham, Isaac et Jacob est cité')
both(1164, 'EXO.33.2', 'L’envoi de l’Ange et l’expulsion des peuples du pays sont cités')
both(1164, 'EXO.33.3', 'L’entrée dans le pays où coulent le lait et le miel est citée')
both(1165, 'EXO.33.3', 'Dieu annonce qu’il ne montera pas au milieu du peuple au cou raide afin de ne pas l’exterminer')
explain([1166], 'EXO.33.1', 'La fidélité aux serments faits aux pères explique les bienfaits accordés malgré l’indignité du peuple.')
explain([1166], 'EXO.33.2', 'Le ministère de l’Ange est compris comme le moyen d’accomplir la promesse divine.')
explain([1166, 1167, 1168, 1169], 'EXO.33.3', 'L’absence annoncée de Dieu est interprétée comme une miséricorde envers le peuple au cou raide.')
both(1168, 'PSA.50.11', 'La prière de détourner le visage divin des péchés est citée comme demande de miséricorde')
both(1169, 'PSA.67.3', 'La disparition des pécheurs comme la cire devant le feu est citée pour expliquer le jugement sous le regard de Dieu')

const NON_RESOLUS = [
  [1145, 4, 'RÉFÉRENCE NON BIBLIQUE — renvoi à Augustin, Contre Fauste, livre 22, chapitre 93, sur l’interprétation de la destruction du veau d’or ; cible de corpus à constituer.'],
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

if (segments.length !== NB_SEGMENTS || segments[0]?.segment_numero !== PREMIER || segments.at(-1)?.segment_numero !== DERNIER) throw new Error('Préétat : lot inattendu')
if (segments.some((segment, index) => segment.segment_numero !== PREMIER + index || segment.ref_niv1 !== REF_NIV1 || !QUESTIONS.includes(segment.ref_niv2))) throw new Error('Préétat structurel invalide')
if ([...new Set(segments.map((segment) => segment.ref_niv2))].join('|') !== QUESTIONS.join('|')) throw new Error('Questions incomplètes ou désordonnées')
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Lot déjà relu')

const empreinte = createHash('sha256')
  .update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes])))
  .digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat modifié : ${empreinte}`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosClasses = new Set([...LIENS, ...NON_RESOLUS].map(([segmentNumero]) => segmentNumero))
const nonClasses = segments.filter((segment) => !numerosClasses.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero)}`)
if ([...SANS_LIEN].some((segmentNumero) => numerosClasses.has(segmentNumero) || !parNumero.has(segmentNumero))) throw new Error('Déclaration SANS_LIEN invalide')
if (LIENS.some(([segmentNumero, canonId, type, motif]) => !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste biblique invalide')
if (NON_RESOLUS.some(([segmentNumero, type, motif]) => !parNumero.has(segmentNumero) || type !== 4 || !motif.startsWith('RÉFÉRENCE NON BIBLIQUE'))) throw new Error('Référence sans cible invalide')

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
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero))
  return [question, [...LIENS, ...NON_RESOLUS].filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))

console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', lot: 'Exode CXLI-CL', ref_niv1: REF_NIV1,
  bornes: [PREMIER, DERNIER], segments: segments.length, liens_bibliques: LIENS.length,
  sans_cible_a_constituer: NON_RESOLUS.length, total_liens: TOTAL, sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length, types, liens_par_question: liensParQuestion, empreinte,
  avancement_actuel: '1070 / 3262 = 32,80 %',
  avancement_potentiel_apres_ecriture: '1102 / 3262 = 33,78 %',
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
  ...LIENS.map(([segmentNumero, canonId, type, motif]) => `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`),
  ...NON_RESOLUS.map(([segmentNumero, type, motif]) => `(${parNumero.get(segmentNumero).id}, null, ${type}, 'à constituer', ${quote(motif)}, 'lecture', true)`),
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
  liensApres !== TOTAL || relusApres !== NB_SEGMENTS ||
  audit.some((lien) => !lien.motif || lien.provenance !== 'lecture' ||
    (lien.canon_id
      ? (lien.fiabilite !== 'vérifié' || lien.arbitrage_requis)
      : (lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4 || !lien.motif.startsWith('RÉFÉRENCE NON BIBLIQUE')))
  )
) throw new Error('Postcontrôle invalide')
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id ?? 'sans-cible'}|${lien.type}|${lien.motif}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
