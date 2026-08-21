// Lecture intégrale de l'Homélie V au peuple d'Antioche (A0014O0038,
// segments 627-775). Les notes [[112]] à [[131]] sont résolues par le contenu.
// Les commentaires continus de Job 1-2, Lc 16, Gn 4 et Jonas 1/3 reçoivent
// une cible de chapitre sur chacun des segments réellement concernés.
//
//   node scripts/chrysostome-antioche-hom5-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom5-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [627, 'DAN.3.23', 4, 'rappel des trois jeunes gens jetés dans la fournaise, exemple repris de l’homélie précédente'],
  [632, 'JOB.1.19', 2, 'rappel de tous les enfants de Job morts sous les ruines de la maison'],
  [632, 'JOB.2.7', 2, 'rappel du corps de Job couvert de plaies'],
  [635, 'JOB.1.9', 2, 'reprise en discours indirect de l’accusation : Job ne servirait Dieu que par intérêt'],
  [639, 'JOB.1.19', 2, 'rappel des enfants de Job accablés sous une même ruine'],
  [639, 'JOB.2.7', 2, 'rappel des plaies infligées au corps de Job'],
  [640, 'JOB.2.10', 3, 'commentaire de la victoire de Job : Satan n’a pu tirer de sa bouche une parole d’impatience'],

  [650, '1CO.2.9', 2, 'reprise fondue des biens que l’œil n’a pas vus, que l’oreille n’a pas entendus et que le cœur n’a pas conçus ; note [[113]]'],
  [651, 'ROM.8.22', 2, 'reprise en discours indirect de la création tout entière qui gémit ; note [[114]]'],
  [651, 'ROM.8.23', 2, 'suite fondue : ceux qui ont les prémices de l’Esprit gémissent aussi'],
  [652, '2CO.12.2', 2, 'reprise de Paul ravi jusqu’au troisième ciel ; note [[115]]'],
  [652, '2CO.12.4', 2, 'reprise de la gloire et des paroles ineffables contemplées par Paul'],
  [658, '1TI.1.13', 2, 'reprise de Paul autrefois blasphémateur et persécuteur, devenu modèle de zèle'],
  [658, '1CO.11.1', 1, 'citation : soyez mes imitateurs comme je le suis du Christ ; note [[116]] imprimée fautivement « 1 Cor. 4 »'],
  [660, '1TI.5.6', 2, 'reprise des pécheurs morts tout en vivant, absente de la note éditoriale'],
  [661, 'JHN.11.25', 1, 'citation du Christ à Marthe : celui qui croit vivra même s’il est mort ; note [[117]] déplacée'],
  [662, 'JAS.2.18', 2, 'reprise de la foi manifestée par les œuvres'],
  [663, 'MAT.14.10', 4, 'rappel narratif de la décollation de Jean Baptiste'],
  [664, 'ACT.7.58', 4, 'rappel narratif de la lapidation d’Étienne ; note [[118]]'],
  [664, 'ACT.7.59', 4, 'suite du rappel narratif : Étienne meurt pendant qu’on le lapide'],
  [666, 'PSA.33.22', 2, 'reprise fondue de la mort très mauvaise des pécheurs ; note [[119]]'],

  [669, 'LUK.16.22', 2, 'rappel de la mort du riche et de son séjour infernal ; note [[120]] déplacée depuis le segment 667'],
  [669, 'LUK.16.23', 2, 'reprise du riche soumis aux tourments après sa mort'],
  [669, 'LUK.16.24', 2, 'reprise de l’impossibilité d’obtenir le moindre soulagement dans les flammes'],
  [670, 'LUK.16.22', 2, 'reprise de Lazare reçu dans le sein d’Abraham après sa mort'],
  [674, 'GEN.4.4', 3, 'la piété et l’offrande agréée d’Abel sont présentées comme la cause de la haine de Caïn ; note [[121]]'],
  [674, 'GEN.4.8', 2, 'rappel du meurtre d’Abel par son frère'],

  [684, '1CO.14.20', 2, 'paraphrase : ne ressembler aux enfants que par l’innocence ; note [[122]] imprimée fautivement « Cor. 4 »'],
  [699, 'ISA.57.18', 1, 'citation abrégée de Dieu guérissant le pécheur après avoir vu ses voies et son repentir'],
  [699, '2CO.7.10', 2, 'paraphrase de la tristesse selon Dieu qui produit une pénitence salutaire ; note [[123]]'],
  [702, 'GEN.2.17', 1, 'citation : le jour où l’homme mangera du fruit, il mourra ; note [[124]]'],
  [702, 'GEN.3.16', 1, 'citation adressée à la femme : elle enfantera dans la douleur'],
  [703, '1CO.11.30', 1, 'citation : plusieurs sont faibles, malades et morts à cause de leurs fautes ; note [[125]]'],
  [703, '1CO.11.30', 3, 'interprétation de la maladie et de la mort comme châtiment qui délivre du péché'],
  [704, '1CO.11.30', 3, 'suite du commentaire : la mort née du péché contribue à détruire le péché'],
  [705, 'MAT.10.38', 1, 'citation : qui ne porte pas sa croix et ne suit pas le Christ n’est pas digne de lui ; note [[126]]'],
  [706, 'MAT.10.38', 3, 'explication de porter sa croix : garder toujours la mort devant les yeux'],
  [706, '1CO.15.31', 2, 'reprise de Paul qui meurt chaque jour et méprise la mort ; note [[127]]'],
  [708, 'DAN.3.50', 3, 'application de la délivrance des trois jeunes gens que le feu ne toucha pas ; note [[128]] déplacée'],
  [709, 'AMO.7.14', 2, 'reprise : je ne suis ni prophète ni fils de prophète'],

  [710, 'JON.3.4', 2, 'reprise en discours indirect de la menace selon la forme des Septante : trois jours'],
  [715, 'JER.18.7', 1, 'citation de la menace d’arracher et de détruire un royaume ; note [[129]]'],
  [715, 'JER.18.8', 1, 'suite de la citation : Dieu revient de sa colère lorsque la nation se repent'],
  [724, 'PSA.138.7', 1, 'citation : où fuir loin de la présence et de l’Esprit de Dieu ; note [[130]]'],
  [725, 'JON.3.4', 2, 'répétition fondue de la sentence sans condition : Ninive sera détruite ; note [[131]]'],
  [726, 'JON.3.9', 3, 'commentaire de l’incertitude des Ninivites quant au pardon divin'],

  [731, 'JON.1.3', 3, 'commentaire de la fuite de Jonas qui monte dans le navire'],
  [731, 'JON.1.4', 3, 'commentaire de la tempête suscitée par la désobéissance de Jonas'],
  [732, 'JON.1.15', 3, 'commentaire : les matelots jettent Jonas à la mer et ramènent le calme'],
  [734, 'JON.1.3', 3, 'commentaire de l’inutilité de la fuite de Jonas loin de Dieu'],
  [734, 'JON.1.4', 3, 'commentaire du péril trouvé sur mer par celui qui fuyait sur terre'],
  [736, 'JON.1.15', 3, 'rappel de Jonas jeté dans la mer'],
  [736, 'JON.2.1', 3, 'commentaire du grand poisson qui engloutit Jonas et lui sert de refuge'],
  [737, 'JON.2.1', 3, 'commentaire du poisson qui engloutit Jonas sans le détruire'],
  [738, 'JON.2.11', 3, 'commentaire de la mer et du poisson rendant intact à Dieu le dépôt confié'],
  [739, 'JON.1.13', 3, 'commentaire de l’humanité des matelots qui résistèrent avant de jeter Jonas'],
  [740, 'JON.3.4', 3, 'commentaire de l’unique prédication par laquelle Jonas menaça Ninive'],
  [740, 'JON.3.5', 3, 'commentaire de la conversion produite par la prédication de Jonas'],
]

// [segment_numero, livre, chapitre, motif]
const CHAPITRES = [
  ...Array.from({ length: 20 }, (_, i) => [627 + i, 'JOB', 1,
    'commentaire continu des épreuves de Job : pertes, accusation de Satan, plaies et victoire de la patience']),
  ...Array.from({ length: 20 }, (_, i) => [627 + i, 'JOB', 2,
    'commentaire continu des épreuves de Job : dépouillement, maladie et fidélité sans blasphème']),
  ...Array.from({ length: 3 }, (_, i) => [669 + i, 'LUK', 16,
    'commentaire continu de la mort du riche et de Lazare dans la parabole de Luc 16']),
  ...Array.from({ length: 3 }, (_, i) => [674 + i, 'GEN', 4,
    'commentaire continu de la mort injuste d’Abel et de la survie tourmentée de Caïn']),
  ...Array.from({ length: 21 }, (_, i) => [710 + i, 'JON', 3,
    'commentaire continu de la menace, de la pénitence et du pardon de Ninive en Jonas 3']),
  [740, 'JON', 3, 'reprise du commentaire de Jonas 3 : la prédication et la conversion de Ninive'],
  [741, 'JON', 3, 'synthèse du trajet par lequel Dieu ramène Jonas à Ninive pour la convertir'],
  ...Array.from({ length: 9 }, (_, i) => [731 + i, 'JON', 1,
    'commentaire continu de la fuite de Jonas, de la tempête et de son rejet dans la mer en Jonas 1']),
  [741, 'JON', 1, 'synthèse du circuit de Jonas par le navire, la mer et les matelots avant Ninive'],
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 627).lte('segment_numero', 775).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 149) throw new Error(`149 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s.id]))

const cibles = [...new Set(VERSETS.map((l) => l[1]))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const chapitresPresents = new Set()
for (const [, livre, chapitre] of CHAPITRES) {
  const cle = `${livre}.${chapitre}`
  if (chapitresPresents.has(cle)) continue
  const { count, error } = await sb.from('versets_canon').select('id', { count: 'exact', head: true })
    .eq('livre', livre).eq('ch_canon', chapitre)
  if (error) throw error
  if (!count) throw new Error(`Chapitre cible absent : ${cle}`)
  chapitresPresents.add(cle)
}

const rows = [
  ...VERSETS.map(([numero, canon_id, type, motif]) => ({
    segment_id: parNumero.get(numero), canon_id, livre: null, chapitre: null,
    type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...CHAPITRES.map(([numero, livre, chapitre, motif]) => ({
    segment_id: parNumero.get(numero), canon_id: null, livre, chapitre,
    type: 3, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? `${l.livre}.${l.chapitre}`}|${l.type}`
const cles = rows.map(cleLien)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie V : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 149 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

if (!WRITE) {
  console.log('(--dry : rien écrit)')
  process.exit(0)
}

// Le contrôle exhaustif des types 1 a montré que ces six formulations sont
// absorbées dans la syntaxe française de Chrysostome : la note atteste la cible,
// mais le rapport est une reprise (type 2), non une citation autonome (type 1).
const anciensTypes1 = [
  [650, '1CO.2.9'], [651, 'ROM.8.22'], [651, 'ROM.8.23'],
  [666, 'PSA.33.22'], [710, 'JON.3.4'], [725, 'JON.3.4'],
]
for (const [numero, canonId] of anciensTypes1) {
  const { error } = await sb.from('liens_bibliques').delete()
    .eq('segment_id', parNumero.get(numero)).eq('canon_id', canonId)
    .eq('type', 1).eq('provenance', 'lecture')
  if (error) throw error
}

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie V',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
