// Lecture intégrale de l'Homélie VI au peuple d'Antioche (A0014O0038,
// segments 776-894). Les notes [[132]] à [[149]] sont résolues par le contenu ;
// Daniel 3, commenté aux segments 844-853 puis 855-867, reçoit une cible de
// chapitre sur chacun de ces segments ; le segment 854 est une parenthèse sur Job.
//
//   node scripts/chrysostome-antioche-hom6-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom6-lecture.mjs --write

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
  [786, '1TI.1.9', 2, 'reprise fondue : la loi n’est pas établie contre les justes ; note [[132]]'],
  [788, 'ROM.13.1', 2, 'reprise en discours indirect : toute puissance vient de Dieu et les puissances sont ordonnées ; note [[133]]'],
  [793, '1CO.10.13', 2, 'reprise fondue de Dieu fidèle, qui ne permet pas une tentation au-delà des forces ; note [[134]] déplacée'],
  [793, 'JOS.1.5', 2, 'assurance que Dieu ne délaissera pas les fidèles ; note [[135]] « Josué 1 », confirmée par la formule parallèle'],
  [795, 'GEN.4.14', 4, 'la peur de sa propre ombre est comparée au châtiment et à la crainte de Caïn'],

  [800, 'JON.1.2', 3, 'comparaison avec Jonas pressé par Dieu de partir en mission ; note [[136]]'],
  [800, 'JON.3.2', 3, 'comparaison avec le second ordre qui envoie Jonas prêcher à Ninive ; note [[137]]'],
  [801, 'JON.3.4', 3, 'commentaire de Jonas contraint d’annoncer la ruine de Ninive'],
  [802, 'JON.2.1', 3, 'commentaire du grand poisson employé pour hâter la mission de Jonas'],
  [802, 'JON.2.11', 3, 'commentaire du poisson qui rend Jonas à la terre et à sa mission'],
  [808, 'JON.3.4', 3, 'rappel de la prédication de Jonas à Ninive'],
  [808, 'JON.3.5', 3, 'mise en parallèle de la pénitence accomplie par Ninive et par Antioche'],

  [822, '1CO.9.27', 2, 'reprise fondue de Paul traitant son corps durement et le tenant en servitude ; note [[138]]'],
  [822, 'ROM.13.14', 2, 'reprise fondue de l’interdiction de flatter la chair et ses convoitises, absente de la note française'],
  [823, 'MAT.7.14', 4, 'écho de la voie resserrée conduisant à la vie dans le sentier couvert de ronces'],
  [829, 'EXO.1.14', 3, 'lecture providentielle des travaux imposés aux Israélites en Égypte ; note [[139]]'],
  [829, 'NUM.11.5', 3, 'les regrets ultérieurs de l’Égypte expliquent pourquoi l’oppression devait les en détacher ; note [[140]]'],
  [832, 'ECC.1.9', 2, 'paraphrase non annotée : le passé reviendra et les nouveautés sont anciennes'],
  [833, '1CO.15.31', 2, 'reprise de Paul exposé chaque jour à la mort, absente des notes françaises'],
  [835, 'MAT.10.28', 2, 'reprise fondue de l’enseignement du Christ sur ceux qui tuent le corps sans perdre l’âme ; note [[141]]'],
  [836, 'JOB.1.21', 1, 'citation : nu sorti du sein maternel et nu retournant à la terre ; correction de [[142]] « Job 3 »'],
  [836, '1TI.6.7', 1, 'citation composite : rien apporté dans le monde et rien à en emporter, non relevée par la note [[142]]'],
  [839, 'LUK.16.25', 2, 'paraphrase des paroles d’Abraham au riche sur les biens reçus pendant sa vie ; note [[143]]'],
  [840, 'LUK.16.25', 3, 'développement interprétatif du réconfort de Lazare après ses maux'],
  [842, 'SIR.4.3', 2, 'reprise de l’interdiction d’ajouter de la peine au cœur affligé, absente des notes françaises'],

  [844, 'DAN.3.48', 3, 'commentaire des bourreaux consumés par la flamme ; note [[144]]'],
  [844, 'DAN.3.50', 3, 'commentaire des trois jeunes gens que la flamme ne toucha pas'],
  [846, '1CO.3.12', 4, 'écho des matériaux éprouvés par le feu : paille et or'],
  [848, 'DAN.7.10', 4, 'écho du fleuve de feu au jour du jugement'],
  [848, '1CO.3.12', 4, 'écho eschatologique du bois, de la paille, de l’or et de l’argent éprouvés par le feu'],
  [850, 'DAN.3.93', 1, 'citation : serviteurs du Très-Haut, sortez ; cible locale vérifiée malgré la numérotation moderne 3,26 ; note [[145]]'],
  [850, 'DAN.3.15', 1, 'citation : quel Dieu vous sauvera de mes mains ?'],
  [851, 'DAN.3.48', 3, 'la peine préparée aux innocents retombe sur les exécuteurs'],
  [858, 'DAN.3.93', 1, 'citation répétée : serviteurs du Très-Haut, sortez et venez ici'],
  [860, 'DAN.3.95', 1, 'citation : béni soit le Dieu des trois jeunes gens, qui envoya son ange et délivra ses serviteurs ; note [[146]] déplacée'],
  [861, 'DAN.3.18', 2, 'reprise en discours indirect du refus de servir les dieux du roi ; correction de [[147]] « Dan. 1 »'],
  [865, 'DAN.3.95', 3, 'commentaire de la confiance en Dieu reconnue par Nabuchodonosor'],

  [868, 'WIS.1.3', 2, 'reprise de la séparation d’avec Dieu causée par le péché ; cible attestée par [[148]] « Sap. 1 »'],
  [868, 'ISA.59.2', 2, 'formule parallèle plus littérale : les iniquités séparent de Dieu, confirmée par l’édition grecque annotée'],
  [876, 'MAT.25.35', 3, 'application du jugement de ceux qui n’ont pas secouru le Christ dans les pauvres'],
  [876, 'MAT.25.10', 3, 'commentaire des vierges folles exclues des noces ; note [[149]]'],
]

// [segment_numero, livre, chapitre, motif]
const CHAPITRES = [
  [834, 'JOB', 1, 'commentaire synthétique des épreuves de Job suscitées par le diable et de sa constance'],
  [834, 'JOB', 2, 'commentaire synthétique des épreuves de Job suscitées par le diable et de sa constance'],
  ...Array.from({ length: 10 }, (_, i) => [844 + i, 'DAN', 3,
    'commentaire continu de Daniel 3 : fournaise, délivrance des trois jeunes gens et conversion de Nabuchodonosor']),
  ...Array.from({ length: 13 }, (_, i) => [855 + i, 'DAN', 3,
    'reprise du commentaire continu de Daniel 3 après la comparaison avec Job']),
  ...Array.from({ length: 2 }, (_, i) => [853 + i, 'JOB', 1,
    'comparaison suivie avec Job : Dieu permet au diable d’épuiser sa puissance avant de manifester la victoire']),
  ...Array.from({ length: 2 }, (_, i) => [853 + i, 'JOB', 2,
    'comparaison suivie avec Job : Dieu permet au diable d’épuiser sa puissance avant de manifester la victoire']),
]

// La formule finale est commune à Mt 3,8 et Lc 3,8 ; aucun indice interne ne
// permet d’attribuer honnêtement la reprise à l’un des deux lieux synoptiques.
const NON_RESOLUS = [[893, null, 2,
  'Formule « fruits dignes de pénitence » ; candidats Mt 3,8 et Lc 3,8, sans indice discriminant.',
  'à constituer', true]]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, segment_numero').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 776).lte('segment_numero', 894).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 119) throw new Error(`119 segments attendus, ${segments.length} trouvés`)
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
  ...NON_RESOLUS.map(([numero, canon_id, type, motif, fiabilite, arbitrage_requis]) => ({
    segment_id: parNumero.get(numero), canon_id, livre: null, chapitre: null,
    type, fiabilite, motif, provenance: 'editeur', arbitrage_requis,
  })),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const cleLien = (l) => l.canon_id
  ? `${l.segment_id}|${l.canon_id}|${l.type}`
  : (l.livre ? `${l.segment_id}|${l.livre}.${l.chapitre}|${l.type}` : `${l.segment_id}|sans-cible|${l.type}|${l.motif}`)
const cles = rows.map(cleLien)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie VI : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · ${rows.filter((l) => l.fiabilite === 'à constituer').length} à constituer · 119 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type, motif').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

if (!WRITE) {
  console.log('(--dry : rien écrit)')
  process.exit(0)
}

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie VI',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
