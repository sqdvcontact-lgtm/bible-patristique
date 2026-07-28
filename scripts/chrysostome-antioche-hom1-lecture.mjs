// Lecture intégrale de l'Homélie I au peuple d'Antioche (A0014O0038,
// segments 63-225). Les appels [[3]] à [[35]] ont été confrontés au texte,
// à l'ossature biblique et à une édition moderne annotée de l'homélie.
//
// Le relevé corrige notamment trois références trompeuses de l'édition de 1671 :
// « Cor. 7 » = 1 Co 4,17 ; « Ibid. 14 » = 1 Co 16,10 ; « Dan. 5 » = Dn 3,17-18.
// Les types 2 et 3 ci-dessous sont affirmés par lecture, jamais par mécanique.
//
//   node scripts/chrysostome-antioche-hom1-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom1-lecture.mjs --write

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
const L = [
  [64, '1TI.5.22', 2, 'reprise de l’avertissement de ne pas imposer les mains avec précipitation'],
  [65, '1TI.5.23', 2, 'annonce du conseil donné à Timothée pour ses fréquentes infirmités'],
  [66, '1TI.6.1', 3, 'rappel du développement de l’épître sur le devoir des serviteurs'],
  [66, '1TI.6.9', 3, 'rappel du développement de l’épître sur la folie des avares'],
  [66, '1TI.6.17', 3, 'rappel du développement de l’épître sur l’orgueil des riches'],
  [68, '1TI.5.23', 1, 'citation du texte de l’homélie, confirmée par la note [[3]]'],
  [82, '1TI.5.23', 3, 'commentaire du pluriel « fréquentes maladies »'],
  [92, '1TI.5.23', 3, 'commentaire de « ne continuez plus de ne boire que de l’eau », note [[4]]'],
  [93, '1CO.4.17', 2, 'Timothée, fils bien-aimé et fidèle ; note [[5]] imprimée fautivement « Cor. 7 »'],
  [95, '1CO.16.10', 2, 'Timothée travaille à l’œuvre du Seigneur comme Paul ; note [[6]] « Ibid. 14 »'],
  [97, 'PHP.2.22', 2, 'vertu éprouvée de Timothée au service de l’Évangile ; note [[7]]'],
  [101, '2CO.12.2', 3, 'rappel du ravissement de Paul au troisième ciel'],
  [101, '2CO.12.4', 3, 'rappel des mystères et paroles ineffables entendus au paradis'],
  [102, '1CO.9.27', 2, 'crainte de Paul d’être réprouvé après avoir prêché aux autres ; note [[8]]'],
  [103, 'GAL.6.14', 1, 'citation : le monde crucifié pour Paul et Paul pour le monde ; note [[9]]'],
  [117, 'PSA.103.15', 2, 'reprise du vin qui réjouit le cœur de l’homme'],
  [123, '1CO.6.10', 3, 'commentaire : l’ivrognerie ferme l’accès au royaume de Dieu'],
  [137, 'PSA.118.71', 1, 'citation : l’humiliation apprend les commandements ; note [[10]]'],
  [138, '2CO.12.7', 2, 'reprise de l’aiguillon et de l’ange de Satan ; note [[11]]'],
  [142, '2CO.12.8', 2, 'Paul prie trois fois d’être délivré ; note [[12]]'],
  [143, '2CO.12.9', 1, 'citation : la grâce suffit et la puissance s’accomplit dans la faiblesse'],
  [143, 'ACT.16.24', 3, 'Paul et Silas enfermés et entravés ; note [[13]]'],
  [144, 'ACT.16.25', 3, 'prière et hymnes de Paul et Silas au milieu de la nuit'],
  [144, 'ACT.16.26', 3, 'la prison s’ouvre et les liens sont rompus'],
  [146, '2CO.12.9', 2, 'reprise : la puissance de Dieu paraît dans la faiblesse ; note [[14]]'],
  [147, '2CO.12.6', 2, 'Paul s’abstient de se glorifier pour ne pas être estimé au-dessus de ce qu’il est'],
  [149, 'ACT.3.12', 3, 'Pierre refuse d’attribuer à sa puissance la guérison du boiteux ; note [[15]]'],
  [149, 'ACT.14.13', 3, 'les habitants de Lystres veulent sacrifier des taureaux à Paul et Barnabé ; note [[16]]'],
  [155, 'JOB.1.9', 2, 'Satan soupçonne Job de servir Dieu par intérêt ; note [[17]] imprimée « Job 2 »'],
  [155, 'JOB.1.10', 2, 'Satan attribue la piété de Job à la protection et aux biens reçus'],
  [157, 'JOB.2.3', 3, 'Job conserve son innocence dans la pauvreté et la maladie ; note [[18]]'],
  [158, 'JOB.2.5', 2, 'Satan demande que la main de Dieu atteigne la chair de Job'],
  [158, 'JOB.2.6', 2, 'Dieu livre Job au pouvoir de Satan en épargnant sa vie'],
  [160, 'JOB.1.21', 3, 'Job dépouillé de ses biens demeure fidèle et bénit Dieu'],
  [162, 'MAT.5.11', 1, 'citation de la béatitude des persécutés'],
  [163, 'MAT.5.12', 1, 'citation : récompense dans le ciel et persécution des prophètes'],
  [163, '1TH.2.14', 3, 'Paul console les Macédoniens par l’exemple des Églises de Judée'],
  [164, 'HEB.11.34', 3, 'énumération des justes éprouvés par le feu ; note [[19]]'],
  [164, 'HEB.11.35', 3, 'énumération des justes morts dans les tourments'],
  [164, 'HEB.11.37', 3, 'justes errants, dénués et persécutés'],
  [164, 'HEB.11.38', 3, 'justes réfugiés dans les montagnes et les cavernes'],
  [166, '1CO.15.32', 2, 'combat de Paul contre les bêtes à Éphèse si les morts ne ressuscitent pas ; note [[20]]'],
  [167, '1CO.15.19', 1, 'citation : sans espérance future, les apôtres sont les plus malheureux ; note [[21]]'],
  [171, 'JAS.5.17', 1, 'citation : Élie était un homme soumis aux mêmes misères que nous'],
  [172, '1CO.4.11', 2, 'Paul souffre faim, soif, nudité et opprobres ; note [[22]]'],
  [173, 'HEB.12.6', 1, 'citation : le châtiment de Dieu est une marque de son amour ; note [[23]] au segment suivant'],
  [175, 'PSA.143.8', 2, 'la droite des injustes est pleine d’iniquité ; note [[24]]'],
  [175, 'PSA.143.12', 2, 'leurs filles sont parées comme des temples'],
  [176, 'PSA.143.13', 2, 'greniers pleins et troupeaux innombrables'],
  [176, 'PSA.143.14', 2, 'troupeaux gras et absence de plainte dans les rues'],
  [177, 'PSA.143.15', 2, 'heureux le peuple dont le Seigneur est le Dieu'],
  [178, 'ROM.5.3', 3, 'commentaire de l’affliction qui produit la patience ; note [[25]]'],
  [178, 'ROM.5.4', 3, 'commentaire de l’épreuve qui produit l’espérance'],
  [178, 'ROM.5.5', 3, 'commentaire de l’espérance qui ne trompe pas'],
  [179, 'SIR.2.5', 1, 'citation : l’homme éprouvé comme l’or dans la fournaise ; note [[26]]'],
  [188, 'JOB.31.20', 2, 'Job vêt les pauvres de la toison de ses troupeaux ; note [[27]]'],
  [195, 'LUK.16.20', 3, 'rappel du pauvre Lazare couvert d’ulcères ; note [[28]]'],
  [195, 'LUK.16.21', 3, 'rappel de la faim et de l’abandon de Lazare'],
  [195, 'LUK.16.25', 3, 'Lazare reçoit les maux dans cette vie puis la consolation'],
  [199, 'GEN.4.4', 3, 'Abel offre son sacrifice ; note [[29]]'],
  [199, 'GEN.4.8', 3, 'Abel est tué par son frère'],
  [200, 'EXO.2.11', 3, 'Moïse voit un Israélite opprimé ; note [[30]]'],
  [200, 'EXO.2.12', 3, 'Moïse intervient contre l’Égyptien'],
  [200, 'EXO.2.15', 3, 'Pharaon cherche à faire mourir Moïse'],
  [202, 'DAN.3.17', 1, 'citation des trois jeunes gens : Dieu peut les délivrer ; note [[31]] imprimée fautivement « Dan. 5 »'],
  [202, 'DAN.3.18', 1, 'citation : même sans délivrance, ils n’adoreront pas la statue'],
  [204, 'SIR.2.1', 1, 'citation : se préparer à l’épreuve en entrant au service de Dieu ; note [[32]]'],
  [206, 'ACT.27.22', 3, 'Paul annonce et exhorte au milieu de la tempête ; note [[33]]'],
  [206, 'ACT.27.23', 3, 'Paul rapporte l’apparition de l’ange pendant la traversée'],
  [206, 'ACT.27.24', 3, 'Paul doit comparaître devant César et ses compagnons seront sauvés'],
  [206, 'ACT.27.25', 3, 'Paul exhorte ses compagnons au courage pendant la tempête'],
  [207, '1TH.2.18', 2, 'Satan empêche Paul de visiter les Thessaloniciens ; note [[34]]'],
  [217, 'MAT.14.4', 2, 'Jean reproche à Hérode son union interdite ; note [[35]]'],
]

// Commentaire suivi de 1 Tm 5,23. Le lemme est choisi au segment 68 ; tout le
// développement qui suit en examine la présence dans l'épître, les maladies de
// Timothée, le recours au vin, puis les raisons pour lesquelles Dieu laisse ses
// saints dans l'affliction. Le commentaire s'achève au segment 212 ; le segment
// 213 ouvre une exhortation autonome contre le blasphème.
const dejaCommentaireLemme = new Set(L
  .filter((l) => l[1] === '1TI.5.23' && l[2] === 3)
  .map((l) => l[0]))
for (let numero = 68; numero <= 212; numero++) {
  if (dejaCommentaireLemme.has(numero)) continue
  let motif
  if (numero <= 80) motif = 'commentaire suivi de 1 Tm 5,23 : choix du lemme et nécessité de l’expliquer'
  else if (numero <= 92) motif = 'commentaire suivi de 1 Tm 5,23 : maladies de Timothée et recours au vin malgré les miracles'
  else if (numero <= 112) motif = 'commentaire suivi de 1 Tm 5,23 : vertu et austérité de Timothée rendent sa maladie plus étonnante'
  else if (numero <= 124) motif = 'commentaire suivi de 1 Tm 5,23 : « un peu de vin » comme remède et règle de sobriété'
  else if (numero <= 136) motif = 'commentaire suivi de 1 Tm 5,23 : pourquoi Timothée reste malade et n’est pas guéri miraculeusement'
  else if (numero <= 180) motif = 'commentaire suivi de 1 Tm 5,23 : raisons pour lesquelles Dieu laisse ses saints dans l’affliction'
  else motif = 'commentaire suivi de 1 Tm 5,23 : application pastorale de la réponse aux adversités des fidèles'
  L.push([numero, '1TI.5.23', 3, motif])
}

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, id_oeuvre, segment_numero').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 63).lte('segment_numero', 225).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 163) throw new Error(`163 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s.id]))

const cibles = [...new Set(L.map((l) => l[1]))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const liens = L.map(([numero, canon_id, type, motif]) => ({
  segment_id: parNumero.get(numero), canon_id, type, fiabilite: P, motif,
  provenance: 'lecture', arbitrage_requis: false,
}))
if (liens.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const parType = liens.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie I : ${liens.length} liens de lecture sur ${new Set(liens.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 163 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, type').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map((l) => `${l.segment_id}|${l.canon_id}|${l.type}`))
const aEcrire = liens.filter((l) => !deja.has(`${l.segment_id}|${l.canon_id}|${l.type}`))
console.log(`${aEcrire.length} à écrire ; ${liens.length - aEcrire.length} déjà présents`)

if (!WRITE) {
  console.log('(--dry : rien écrit)')
  process.exit(0)
}

if (aEcrire.length) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire)
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie I',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
