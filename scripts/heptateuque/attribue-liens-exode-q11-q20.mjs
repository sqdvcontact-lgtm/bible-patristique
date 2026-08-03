import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre deuxième'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Exode Q. XI-XX'
const EMPREINTE_ATTENDUE = 'ad55bc1d6cf5849a35d39dbef3b944ad42e5b91b677bc7e43416a7ac02961291'
const QUESTIONS = [
  'Question XI', 'Question XII', 'Question XII [<i>sic</i>]', 'Question XIV', 'Question XV',
  'Question XVI', 'Question XVII', 'Question XVIII', 'Question XIX', 'Question XX',
]
const SANS_LIEN = new Set()
const NON_RESOLUS = []
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
const plage = (livre, chapitre, debut, fin) =>
  Array.from({ length: fin - debut + 1 }, (_, index) => `${livre}.${chapitre}.${debut + index}`)

// Question XI — Exode 4,24-26 et les parallèles grammaticaux des Psaumes.
many(602, ['EXO.4.24', 'EXO.4.25'], [1], 'Citation de la rencontre nocturne et de la circoncision accomplie par Séphora')
many(603, ['EXO.4.24', 'EXO.4.26'], [1, 3], 'La retraite de l’Ange et l’identité de celui qu’il voulait tuer sont citées puis examinées')
many(603, ['EXO.4.25'], [3], 'La circoncision du fils sert à déterminer la personne menacée par l’Ange')
many(604, ['EXO.4.24', 'EXO.4.25'], [3], 'L’alternative entre Moïse et l’enfant commente la menace et la circoncision')
many(605, ['EXO.4.24', 'EXO.4.25'], [3], 'La menace de mort est expliquée par l’absence de circoncision de l’enfant')
many(605, ['GEN.17.14'], [2], 'La sanction de l’incirconcision prescrite à Abraham est reprise sans référence imprimée')
many(606, ['EXO.4.24'], [3], 'La difficulté du pronom sans antécédent est examinée dans la menace de mort')
many(606, ['PSA.86.1', 'PSA.86.2'], [1, 3], 'La formule des fondements sur les montagnes et des portes de Sion est citée comme parallèle grammatical')
many(607, ['PSA.86.1'], [3], 'Le début absolu du psaume et l’absence d’antécédent sont analysés')
many(608, ['PSA.86.1', 'PSA.86.2'], [3], 'Les portes de Sion éclairent rétrospectivement le possesseur des fondements')
many(609, ['PSA.86.1', 'PSA.86.2'], [3], 'Le genre du pronom grec et le contexte de Sion servent à résoudre l’antécédent')
many(609, ['PSA.146.2'], [1, 3], 'La citation du Seigneur bâtissant Jérusalem confirme l’interprétation des fondements')
many(610, ['EXO.4.24', 'PSA.86.1'], [1, 3], 'Les deux locutions sans antécédent exprimé sont citées et comparées')
many(611, ['EXO.4.24', 'EXO.4.25', 'EXO.4.26'], [3], 'La menace, la circoncision et le retrait de l’Ange sont examinés comme une seule séquence')
many(611, ['EXO.4.25', 'EXO.4.26'], [1], 'La parole sur le sang de la circoncision et son effet est explicitement reprise')
many(612, ['EXO.4.25', 'EXO.4.26'], [1, 3], 'L’arrêt du sang et le retrait de l’Ange sont cités puis interprétés comme un mystère')

// Question XII — départ de la famille de Moïse et retour auprès de lui.
many(613, ['EXO.4.20'], [1, 3], 'Le départ de Moïse avec sa femme et ses fils est cité puis confronté à leur retour')
many(613, ['EXO.18.1', 'EXO.18.2', 'EXO.18.5'], [1, 3], 'Le retour de Jéthro avec Séphora et les fils de Moïse est référencé verset par verset')
many(614, ['EXO.4.24', 'EXO.4.25', 'EXO.4.26'], [3], 'La menace de l’Ange est proposée comme cause du renvoi de Séphora et des enfants')
many(614, ['EXO.18.2', 'EXO.18.5'], [3], 'Le renvoi puis le retour de Séphora et des enfants fondent la solution narrative')

// Question XIII, conservée sous le libellé live fautif « Question XII [sic] ».
many(615, ['EXO.3.17', 'EXO.3.18', 'EXO.5.1', 'EXO.5.3'], [1, 3], 'La sortie vers Chanaan est confrontée à l’ordre des trois journées de marche et du sacrifice')
many(616, ['EXO.3.17', 'EXO.3.18', 'EXO.5.1', 'EXO.5.3'], [3], 'Les premiers ordres divins sont expliqués comme des ordres sincèrement exécutables')
many(616, ['EXO.3.19', 'EXO.5.2'], [2, 3], 'La prescience puis le refus de Pharaon sont repris et intégrés à la solution')
many(617, ['EXO.3.17', 'EXO.3.18', 'EXO.5.1', 'EXO.5.3'], [3], 'L’obstination de Pharaon explique le changement entre l’ordre initial et la suite des événements')
many(617, ['EXO.3.19', 'EXO.5.2'], [3], 'Le refus annoncé et réalisé fonde la responsabilité de Pharaon')

// Question XIV — plainte et prière de Moïse.
many(618, ['EXO.5.22', 'EXO.5.23'], [1, 3], 'La plainte de Moïse est citée intégralement et interprétée comme une prière')
many(619, ['EXO.5.22', 'EXO.5.23'], [3], 'L’absence de reproche divin confirme que les paroles de Moïse étaient une prière')
many(619, ['EXO.6.1'], [1, 3], 'La réponse annonçant l’action future de Dieu est intentionnellement invoquée comme preuve')

// Question XV — structure de la généalogie de Moïse.
many(620, plage('EXO', 6, 14, 26), [1, 3], 'La généalogie de Ruben à Lévi, jusqu’à l’identification d’Aaron et de Moïse, est commentée comme une unité structurée')
many(621, ['EXO.6.14', 'EXO.6.15', 'EXO.6.16'], [3], 'L’ordre Ruben, Siméon, Lévi et le rang de la troisième tribu sont expliqués')
many(621, ['GEN.46.8', 'GEN.46.9', 'GEN.46.10', 'GEN.46.11'], [1, 3], 'La liste antérieure de l’entrée en Égypte est intentionnellement rappelée et comparée')
many(621, ['GEN.46.27'], [1, 3], 'Le total septantiste de soixante-quinze personnes est rattaché au dénombrement canonique de la maison de Jacob')

// Questions XVI-XVII — parole de Moïse et fonction prophétique d’Aaron.
many(622, ['EXO.6.30'], [1, 3], 'La parole difficile de Moïse devant Pharaon est citée et examinée')
many(623, ['EXO.6.30'], [3], 'L’éloignement protocolaire de Pharaon est proposé comme explication de la difficulté de Moïse')
many(623, ['EXO.7.1'], [1, 3], 'Moïse dieu de Pharaon et Aaron son prophète sont cités puis rapprochés de la difficulté de parole')
many(624, ['EXO.4.16', 'EXO.7.1'], [1, 3], 'Les fonctions d’Aaron auprès du peuple et de Pharaon sont citées et distinguées')
many(625, ['EXO.7.1'], [3], 'La fonction d’Aaron prophète de Moïse fonde une définition du prophète comme organe de Dieu')

// Question XVIII — endurcissement du cœur de Pharaon.
many(626, ['EXO.7.3'], [1, 3], 'L’endurcissement de Pharaon et la multiplication des prodiges sont cités puis mis en rapport')
for (const segmentNumero of [627, 628, 629, 630, 631]) {
  many(segmentNumero, ['EXO.7.3'], [3], 'Le libre choix mauvais et les circonstances providentielles approfondissent l’endurcissement de Pharaon')
}

// Question XIX — rôle d’Aaron dans le signe de la verge.
many(632, ['EXO.7.9'], [1, 3], 'L’ordre donné à Aaron de jeter la verge devant Pharaon est cité et interrogé')
many(633, ['EXO.7.9'], [3], 'Le recours à Aaron pour un geste sans parole est opposé à son ministère oratoire')
many(633, ['EXO.4.14', 'EXO.4.15', 'EXO.4.16'], [3], 'Le ministère de parole confié à Aaron pour suppléer Moïse est précisément comparé au geste de la verge')
many(634, ['EXO.7.9'], [3], 'La médiation gestuelle d’Aaron est interprétée comme une figure')
many(634, ['EXO.7.1'], [3], 'La médiation entre Moïse et Pharaon prolonge la fonction prophétique attribuée à Aaron')

// Question XX — attribution de la verge à Aaron.
many(635, ['EXO.7.10'], [1, 3], 'Aaron jetant sa propre verge devant Pharaon est cité et la valeur du possessif est examinée')
many(636, ['EXO.7.10'], [3], 'La verge est envisagée comme un bien commun à Moïse et Aaron')

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

if (segments.length !== 35 || segments[0]?.segment_numero !== 602 || segments.at(-1)?.segment_numero !== 636) {
  throw new Error('Préétat : lot inattendu')
}
if (segments.some((segment, index) =>
  segment.segment_numero !== 602 + index ||
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
  !parNumero.has(segmentNumero) || !canonId || ![1, 2, 3, 4].includes(type) || !motif
)) {
  throw new Error('Manifeste invalide')
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

const types = LIENS.reduce((compte, [, , type]) => {
  compte[type] = (compte[type] ?? 0) + 1
  return compte
}, {})
const segmentsParQuestion = Object.fromEntries(QUESTIONS.map((question) => [
  question,
  segments.filter((segment) => segment.ref_niv2 === question).length,
]))
const liensParQuestion = Object.fromEntries(QUESTIONS.map((question) => {
  const numeros = new Set(
    segments.filter((segment) => segment.ref_niv2 === question).map((segment) => segment.segment_numero),
  )
  return [question, LIENS.filter(([segmentNumero]) => numeros.has(segmentNumero)).length]
}))
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  lot: 'Exode XI-XX',
  ref_niv1: REF_NIV1,
  bornes: [602, 636],
  segments: segments.length,
  liens: LIENS.length,
  sans_lien: [...SANS_LIEN],
  sans_cible_a_constituer: NON_RESOLUS.length,
  cibles_distinctes: cibles.length,
  types,
  segments_par_question: segmentsParQuestion,
  liens_par_question: liensParQuestion,
  empreinte,
}, null, 2))

if (!WRITE) process.exit(0)

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = LIENS
  .map(([segmentNumero, canonId, type, motif]) =>
    `(${parNumero.get(segmentNumero).id}, ${quote(canonId)}, ${type}, 'vérifié', ${quote(motif)}, 'lecture', false)`
  )
  .join(',\n    ')

const sql = `
do $p$
declare
  n integer;
begin
  if exists (
    select 1
    from liens_bibliques
    where segment_id in (${ids.join(', ')})
  ) then
    raise exception 'Liens présents';
  end if;

  if exists (
    select 1
    from segments
    where id in (${ids.join(', ')})
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
  if n <> ${LIENS.length} then
    raise exception 'Liens insérés : %', n;
  end if;

  update segments
  set
    liens_revus_le = now(),
    liens_revus_par = ${quote(RELECTEUR)}
  where id in (${ids.join(', ')});

  get diagnostics n = row_count;
  if n <> 35 then
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
  liensApres !== LIENS.length ||
  relusApres !== 35 ||
  audit.some((lien) =>
    !lien.canon_id ||
    !lien.motif ||
    lien.fiabilite !== 'vérifié' ||
    lien.provenance !== 'lecture' ||
    lien.arbitrage_requis
  )
) {
  throw new Error('Postcontrôle invalide')
}
const clesApres = audit.map((lien) => `${lien.segment_id}|${lien.canon_id}|${lien.type}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Doublon dans le postétat')
console.log(`✓ ${liensApres} liens ; ${relusApres} segments relus`)
